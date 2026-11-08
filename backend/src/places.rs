use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use tracing::{info, warn};

use crate::models::{CategorizedPois, PoiItem};

pub struct PlacesService {
    client: Client,
}

impl PlacesService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(6))
            .user_agent("GitnaRoadEngine/4.0 (Philippine 2D Real Radius Place Finder; contact@gitna.ph)")
            .build()
            .unwrap_or_else(|_| Client::new());
        Self { client }
    }

    /// Reverse geocode coordinates to obtain the town/city or road corridor name
    pub async fn reverse_geocode(&self, coord: [f64; 2]) -> Option<String> {
        let url = format!(
            "https://nominatim.openstreetmap.org/reverse?format=json&lat={:.6}&lon={:.6}&zoom=14",
            coord[1], coord[0]
        );

        match self.client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(json) = resp.json::<Value>().await {
                    let addr = &json["address"];
                    let road = addr["road"].as_str().or(addr["highway"].as_str());
                    let town = addr["city"]
                        .as_str()
                        .or(addr["town"].as_str())
                        .or(addr["municipality"].as_str())
                        .or(addr["suburb"].as_str());
                    let province = addr["province"].as_str().or(addr["state"].as_str());

                    match (road, town, province) {
                        (Some(r), Some(t), _) => Some(format!("{} in {}", r, t)),
                        (None, Some(t), Some(p)) => Some(format!("{}, {}", t, p)),
                        (_, Some(t), None) => Some(t.to_string()),
                        _ => json["display_name"]
                            .as_str()
                            .map(|d| d.split(',').take(2).collect::<Vec<_>>().join(",")),
                    }
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    /// Search real places within a 2000m-5000m radius around the road anchor [lng, lat]
    /// ZERO FAKE PLACES: Uses Google Places API (New) when key is present,
    /// or real OpenStreetMap Overpass radius queries.
    pub async fn search_places_around_anchor(
        &self,
        anchor_coord: [f64; 2], // [lng, lat]
        api_key_override: Option<&str>,
    ) -> CategorizedPois {
        let mut categorized = CategorizedPois::default();
        let mid_lng = anchor_coord[0];
        let mid_lat = anchor_coord[1];
        categorized.search_anchor = Some(anchor_coord);

        // Check for Google Maps / Places API key
        let google_key = api_key_override
            .map(|s| s.to_string())
            .or_else(|| std::env::var("GOOGLE_MAPS_API_KEY").ok())
            .or_else(|| std::env::var("GOOGLE_PLACES_API_KEY").ok());

        let mut used_google = false;
        if let Some(key) = &google_key {
            if !key.trim().is_empty() {
                info!("Querying Google Places API (New) within 3500m of [{:.5}, {:.5}]", mid_lng, mid_lat);
                if self.search_google_places(anchor_coord, key, &mut categorized).await {
                    used_google = true;
                }
            }
        }

        // If Google Places wasn't used or returned 0 results, use real OSM places (Nominatim bounded search + Overpass)
        if !used_google || (categorized.cafes.is_empty() && categorized.malls.is_empty() && categorized.restaurants.is_empty()) {
            info!("Querying OpenStreetMap for real places within radius of [{:.5}, {:.5}]", mid_lng, mid_lat);
            let mut radius = 3500.0;
            self.search_nominatim_places(anchor_coord, radius, &mut categorized).await;

            let total_found = categorized.cafes.len() + categorized.malls.len() + categorized.parks.len() + categorized.restaurants.len();
            if total_found < 3 {
                // Auto-expand to 5000m for sparse rural/expressway areas
                radius = 5000.0;
                info!("Sparse area ({} venues found). Expanding search radius to 5000m...", total_found);
                self.search_nominatim_places(anchor_coord, radius, &mut categorized).await;
                if categorized.cafes.is_empty() && categorized.malls.is_empty() {
                    self.search_osm_overpass(anchor_coord, radius, &mut categorized).await;
                }
            }
            categorized.search_radius_meters = Some(radius);
        } else {
            categorized.search_radius_meters = Some(3500.0);
        }

        // Snap to recommended real meeting place (best real venue found within radius)
        self.select_recommended_place(&mut categorized);

        info!(
            "Real places found around anchor [{:.5}, {:.5}]: {} cafes, {} malls, {} parks, {} restaurants",
            mid_lng,
            mid_lat,
            categorized.cafes.len(),
            categorized.malls.len(),
            categorized.parks.len(),
            categorized.restaurants.len()
        );

        categorized
    }

    /// Engine 1: Google Places API (New) - POST places:searchNearby
    async fn search_google_places(
        &self,
        anchor: [f64; 2],
        api_key: &str,
        categorized: &mut CategorizedPois,
    ) -> bool {
        let url = "https://places.googleapis.com/v1/places:searchNearby";
        let body = json!({
            "includedTypes": ["cafe", "shopping_mall", "park", "restaurant"],
            "maxResultCount": 20,
            "rankPreference": "POPULARITY",
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": anchor[1],
                        "longitude": anchor[0]
                    },
                    "radius": 3500.0
                }
            }
        });

        let resp = self.client
            .post(url)
            .header("Content-Type", "application/json")
            .header("X-Goog-Api-Key", api_key)
            .header("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.googleMapsUri")
            .json(&body)
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => {
                if let Ok(json_val) = r.json::<Value>().await {
                    if let Some(places_arr) = json_val["places"].as_array() {
                        for p in places_arr {
                            let name = p["displayName"]["text"].as_str().unwrap_or("").trim().to_string();
                            if name.is_empty() {
                                continue;
                            }

                            let lat = p["location"]["latitude"].as_f64().unwrap_or(0.0);
                            let lng = p["location"]["longitude"].as_f64().unwrap_or(0.0);
                            if lat == 0.0 || lng == 0.0 {
                                continue;
                            }

                            let dist_m = approx_distance(anchor, [lng, lat]);
                            let walking_mins = ((dist_m / 80.0).ceil() as u32).max(1);
                            let primary_type = p["primaryType"].as_str().unwrap_or("");
                            let types: Vec<&str> = p["types"].as_array().map(|arr| arr.iter().filter_map(|t| t.as_str()).collect()).unwrap_or_default();

                            let category = if primary_type == "cafe" || types.contains(&"coffee_shop") || types.contains(&"cafe") {
                                "cafe"
                            } else if primary_type == "shopping_mall" || types.contains(&"shopping_mall") || types.contains(&"department_store") {
                                "mall"
                            } else if primary_type == "park" || types.contains(&"park") || types.contains(&"national_park") {
                                "park"
                            } else {
                                "restaurant"
                            };

                            let rating = p["rating"].as_f64();
                            let user_rating_count = p["userRatingCount"].as_u64().map(|c| c as u32);
                            let google_maps_uri = p["googleMapsUri"].as_str().map(|s| s.to_string());
                            let address = p["formattedAddress"].as_str().map(|s| s.to_string());

                            let highlight = if let Some(r) = rating {
                                format!("{:.1} stars ({} reviews)", r, user_rating_count.unwrap_or(0))
                            } else {
                                primary_type.replace('_', " ")
                            };

                            let item = PoiItem {
                                id: p["id"].as_str().unwrap_or(&format!("gp_{}", name)).to_string(),
                                name,
                                category: category.to_string(),
                                coordinates: [lng, lat],
                                distance_meters: dist_m.round(),
                                walking_minutes: walking_mins,
                                address,
                                highlight: Some(highlight),
                                rating,
                                user_rating_count,
                                google_maps_uri,
                                source: Some("google_places".to_string()),
                            };

                            match category {
                                "cafe" if categorized.cafes.len() < 6 => categorized.cafes.push(item),
                                "mall" if categorized.malls.len() < 5 => categorized.malls.push(item),
                                "park" if categorized.parks.len() < 5 => categorized.parks.push(item),
                                "restaurant" if categorized.restaurants.len() < 6 => categorized.restaurants.push(item),
                                _ => {}
                            }
                        }
                        return true;
                    }
                }
                false
            }
            Err(e) => {
                warn!("Google Places searchNearby failed: {e}. Falling back to OpenStreetMap Overpass.");
                false
            }
            _ => false,
        }
    }

    /// Engine 2: Live OpenStreetMap Overpass API radius query (real places only)
    async fn search_osm_overpass(
        &self,
        anchor: [f64; 2],
        radius_meters: f64,
        categorized: &mut CategorizedPois,
    ) {
        let overpass_url = "https://overpass-api.de/api/interpreter";
        let query = format!(
            "[out:json][timeout:5];\
            (\
              node[\"amenity\"=\"cafe\"](around:{radius:.0},{lat:.6},{lon:.6});\
              node[\"shop\"=\"mall\"](around:{radius:.0},{lat:.6},{lon:.6});\
              way[\"shop\"=\"mall\"](around:{radius:.0},{lat:.6},{lon:.6});\
              node[\"leisure\"=\"park\"](around:{radius:.0},{lat:.6},{lon:.6});\
              way[\"leisure\"=\"park\"](around:{radius:.0},{lat:.6},{lon:.6});\
              node[\"amenity\"=\"restaurant\"](around:{radius:.0},{lat:.6},{lon:.6});\
            );\
            out center 35;",
            radius = radius_meters,
            lat = anchor[1],
            lon = anchor[0]
        );

        match self.client.post(overpass_url).form(&[("data", &query)]).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(json) = resp.json::<Value>().await {
                    if let Some(elements) = json["elements"].as_array() {
                        for el in elements {
                            let tags = &el["tags"];
                            let name = tags["name"].as_str().unwrap_or("").trim().to_string();
                            if name.is_empty() {
                                continue;
                            }

                            // Coordinates from node lat/lon or way center
                            let lat = el["lat"]
                                .as_f64()
                                .or_else(|| el["center"]["lat"].as_f64())
                                .unwrap_or(0.0);
                            let lon = el["lon"]
                                .as_f64()
                                .or_else(|| el["center"]["lon"].as_f64())
                                .unwrap_or(0.0);

                            if lat == 0.0 || lon == 0.0 {
                                continue;
                            }

                            let dist_m = approx_distance(anchor, [lon, lat]);
                            let walking_mins = ((dist_m / 80.0).ceil() as u32).max(1);

                            let address = tags["addr:street"]
                                .as_str()
                                .or_else(|| tags["addr:city"].as_str())
                                .map(|s| s.to_string());

                            let highlight = tags["cuisine"]
                                .as_str()
                                .map(|c| format!("Cuisine: {}", c))
                                .or_else(|| tags["brand"].as_str().map(|b| format!("Brand: {}", b)));

                            let item = PoiItem {
                                id: format!("osm_{}", el["id"].as_i64().unwrap_or(0)),
                                name: name.clone(),
                                category: String::new(),
                                coordinates: [lon, lat],
                                distance_meters: dist_m.round(),
                                walking_minutes: walking_mins,
                                address,
                                highlight,
                                rating: None,
                                user_rating_count: None,
                                google_maps_uri: None,
                                source: Some("osm".to_string()),
                            };

                            if tags["amenity"].as_str() == Some("cafe") && categorized.cafes.len() < 6 && !categorized.cafes.iter().any(|c| c.name == name) {
                                let mut it = item;
                                it.category = "cafe".to_string();
                                categorized.cafes.push(it);
                            } else if tags["shop"].as_str() == Some("mall") && categorized.malls.len() < 5 && !categorized.malls.iter().any(|m| m.name == name) {
                                let mut it = item;
                                it.category = "mall".to_string();
                                categorized.malls.push(it);
                            } else if tags["leisure"].as_str() == Some("park") && categorized.parks.len() < 5 && !categorized.parks.iter().any(|p| p.name == name) {
                                let mut it = item;
                                it.category = "park".to_string();
                                categorized.parks.push(it);
                            } else if tags["amenity"].as_str() == Some("restaurant") && categorized.restaurants.len() < 6 && !categorized.restaurants.iter().any(|r| r.name == name) {
                                let mut it = item;
                                it.category = "restaurant".to_string();
                                categorized.restaurants.push(it);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                warn!("Overpass API request failed: {e}. Only returning verified real places.");
            }
            _ => {}
        }
    }

    /// Engine 3: Bounded Nominatim Search Fallback (100% real verified places)
    async fn search_nominatim_places(
        &self,
        anchor: [f64; 2],
        radius_meters: f64,
        categorized: &mut CategorizedPois,
    ) {
        let delta_deg = radius_meters / 111_000.0;
        let left = anchor[0] - delta_deg;
        let right = anchor[0] + delta_deg;
        let top = anchor[1] + delta_deg;
        let bottom = anchor[1] - delta_deg;
        let viewbox = format!("{:.6},{:.6},{:.6},{:.6}", left, top, right, bottom);

        let queries = [
            ("mall", "mall"),
            ("cafe", "cafe"),
            ("restaurant", "restaurant"),
            ("park", "park"),
        ];

        for (q, category) in queries {
            let url = format!(
                "https://nominatim.openstreetmap.org/search?format=json&q={}&viewbox={}&bounded=1&limit=6",
                q, viewbox
            );

            if let Ok(resp) = self.client.get(&url).send().await {
                if let Ok(items) = resp.json::<Vec<Value>>().await {
                    for item in items {
                        let full_name = item["display_name"].as_str().unwrap_or("").trim();
                        if full_name.is_empty() {
                            continue;
                        }
                        let short_name = full_name.split(',').next().unwrap_or("").trim().to_string();
                        if short_name.is_empty() {
                            continue;
                        }

                        let lat = item["lat"].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                        let lon = item["lon"].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
                        if lat == 0.0 || lon == 0.0 {
                            continue;
                        }

                        let dist_m = approx_distance(anchor, [lon, lat]);
                        let walking_mins = ((dist_m / 80.0).ceil() as u32).max(1);
                        let address = full_name.split(',').skip(1).take(2).collect::<Vec<_>>().join(",").trim().to_string();

                        let poi = PoiItem {
                            id: format!("osm_nom_{}", item["osm_id"].as_i64().unwrap_or(0)),
                            name: short_name.clone(),
                            category: category.to_string(),
                            coordinates: [lon, lat],
                            distance_meters: dist_m.round(),
                            walking_minutes: walking_mins,
                            address: if address.is_empty() { None } else { Some(address) },
                            highlight: Some(format!("Real OSM {}", category)),
                            rating: None,
                            user_rating_count: None,
                            google_maps_uri: Some(format!("https://www.google.com/maps/search/?api=1&query={:.6},{:.6}", lat, lon)),
                            source: Some("osm".to_string()),
                        };

                        match category {
                            "cafe" if categorized.cafes.len() < 6 && !categorized.cafes.iter().any(|c| c.name == short_name) => categorized.cafes.push(poi),
                            "mall" if categorized.malls.len() < 5 && !categorized.malls.iter().any(|m| m.name == short_name) => categorized.malls.push(poi),
                            "park" if categorized.parks.len() < 5 && !categorized.parks.iter().any(|p| p.name == short_name) => categorized.parks.push(poi),
                            "restaurant" if categorized.restaurants.len() < 6 && !categorized.restaurants.iter().any(|r| r.name == short_name) => categorized.restaurants.push(poi),
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    /// Select the most prominent real place within the search radius to snap the recommended meeting spot
    fn select_recommended_place(&self, categorized: &mut CategorizedPois) {
        // Priority 1: A major shopping mall or commercial complex
        if let Some(mall) = categorized.malls.first() {
            categorized.recommended_place = Some(mall.clone());
            return;
        }

        // Priority 2: Highest rated restaurant or cafe
        let mut candidates: Vec<&PoiItem> = categorized.cafes.iter()
            .chain(categorized.restaurants.iter())
            .chain(categorized.parks.iter())
            .collect();

        candidates.sort_by(|a, b| {
            let r_a = a.rating.unwrap_or(0.0);
            let r_b = b.rating.unwrap_or(0.0);
            r_b.partial_cmp(&r_a).unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.distance_meters.partial_cmp(&b.distance_meters).unwrap_or(std::cmp::Ordering::Equal))
        });

        if let Some(&best) = candidates.first() {
            categorized.recommended_place = Some(best.clone());
        }
    }
}

/// Approximate distance between two [lng, lat] coordinates in meters
pub fn approx_distance(a: [f64; 2], b: [f64; 2]) -> f64 {
    let d_lng = (a[0] - b[0]) * 111_320.0 * (a[1].to_radians()).cos();
    let d_lat = (a[1] - b[1]) * 111_320.0;
    (d_lng * d_lng + d_lat * d_lat).sqrt()
}
