use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use tracing::{info, warn};

use crate::models::{CategorizedPois, PoiItem};

pub struct PoiService {
    client: Client,
}

impl PoiService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(4))
            .user_agent("GitnaRoadEngine/2.0 (Philippine Venue Explorer; contact@gitna.ph)")
            .build()
            .unwrap_or_else(|_| Client::new());
        Self { client }
    }

    /// Fetch real POIs near a hub coordinate using Overpass API, with rich curated fallback
    pub async fn fetch_pois_for_hub(&self, hub_id: &str, coord: [f64; 2]) -> CategorizedPois {
        let mut categorized = CategorizedPois::default();

        // 1. First attempt to query Overpass API within 800m
        let overpass_url = "https://overpass-api.de/api/interpreter";
        let query = format!(
            "[out:json][timeout:3];\
            (\
              node[\"amenity\"=\"cafe\"](around:800,{lat},{lon});\
              node[\"leisure\"=\"park\"](around:800,{lat},{lon});\
              node[\"shop\"=\"mall\"](around:800,{lat},{lon});\
            );\
            out 15;",
            lat = coord[1],
            lon = coord[0]
        );

        let overpass_success = match self.client.post(overpass_url).body(query).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        self.parse_overpass_response(&json, &mut categorized, coord);
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
            Err(e) => {
                warn!("Overpass request failed: {e}. Using curated Metro Manila POIs.");
                false
            }
        };

        // 2. If Overpass is offline or returned insufficient items, enrich with curated venues
        self.enrich_with_curated(hub_id, coord, &mut categorized);

        info!(
            "POIs for hub {}: {} cafes, {} parks, {} malls (Overpass API used: {})",
            hub_id,
            categorized.cafes.len(),
            categorized.parks.len(),
            categorized.malls.len(),
            overpass_success
        );

        categorized
    }

    fn parse_overpass_response(
        &self,
        json: &Value,
        categorized: &mut CategorizedPois,
        hub_coord: [f64; 2],
    ) {
        if let Some(elements) = json["elements"].as_array() {
            for el in elements {
                let tags = &el["tags"];
                let name = tags["name"].as_str().unwrap_or("").to_string();
                if name.is_empty() {
                    continue;
                }

                let lat = el["lat"].as_f64().unwrap_or(0.0);
                let lon = el["lon"].as_f64().unwrap_or(0.0);
                let dist_m = approx_distance(hub_coord, [lon, lat]);
                let walking_mins = ((dist_m / 75.0).ceil() as u32).max(1);

                let poi = PoiItem {
                    id: format!("osm_{}", el["id"].as_i64().unwrap_or(0)),
                    name: name.clone(),
                    category: String::new(),
                    coordinates: [lon, lat],
                    walking_minutes: walking_mins,
                    address: tags["addr:street"].as_str().map(|s| s.to_string()),
                    highlight: tags["brand"].as_str().map(|s| format!("Brand: {}", s)),
                };

                if tags["amenity"].as_str() == Some("cafe") && categorized.cafes.len() < 5 {
                    let mut p = poi;
                    p.category = "cafe".to_string();
                    categorized.cafes.push(p);
                } else if tags["leisure"].as_str() == Some("park") && categorized.parks.len() < 5 {
                    let mut p = poi;
                    p.category = "park".to_string();
                    categorized.parks.push(p);
                } else if tags["shop"].as_str() == Some("mall") && categorized.malls.len() < 5 {
                    let mut p = poi;
                    p.category = "mall".to_string();
                    categorized.malls.push(p);
                }
            }
        }
    }

    fn enrich_with_curated(
        &self,
        hub_id: &str,
        hub_coord: [f64; 2],
        categorized: &mut CategorizedPois,
    ) {
        let (cafes, parks, malls) = match hub_id {
            "moa" => (
                vec![
                    ("% Arabica Manila Bay", [120.9818, 14.5360], 3, "S Maison seaside terrace with sunset view"),
                    ("Yardstick Coffee MOA Square", [120.9840, 14.5342], 4, "Artisanal specialty single-origin roast"),
                    ("Starbucks Reserve Seaside Blvd", [120.9810, 14.5375], 5, "Nitro cold brew & outdoor baywalk seating"),
                    ("UCC Clockwork Blue Bay Walk", [120.9912, 14.5385], 8, "Japanese siphon brew & quiet booth seating"),
                ],
                vec![
                    ("MOA Seaside Promenade & Baywalk", [120.9798, 14.5362], 2, "1.5km ocean breeze sunset walkway"),
                    ("SM By the Bay Plaza", [120.9805, 14.5340], 4, "Open-air sea-view plaza & Ferris wheel lights"),
                    ("Aseana Central Green Park", [120.9880, 14.5265], 9, "Landscaped urban pocket green with jogging paths"),
                ],
                vec![
                    ("SM Mall of Asia (Main Complex)", [120.9822, 14.5354], 1, "400,000 sqm flagship mall & transit terminal"),
                    ("S Maison at Conrad Manila", [120.9815, 14.5370], 3, "High-end dining, boutique cinema & sunset deck"),
                    ("MOA Square / IKEA Philippines", [120.9845, 14.5338], 4, "World's largest IKEA store & Swedish bistro"),
                ],
            ),
            "ayala_manila_bay" => (
                vec![
                    ("Toby's Estate Aseana", [120.9895, 14.5242], 2, "Australian flat white & spacious coworking tables"),
                    ("Dot Coffee Bradco Ave", [120.9910, 14.5235], 4, "Grab-and-go specialty iced pour overs"),
                    ("Tim Hortons Macapagal", [120.9885, 14.5250], 5, "French vanilla & Canadian baked goods"),
                    ("Highlands Coffee Belle Ave", [120.9920, 14.5228], 6, "Authentic Vietnamese Phin drip with condensed milk"),
                ],
                vec![
                    ("Parqal Central Canopy Walk", [120.9890, 14.5220], 3, "Weather-protected, air-conditioned green canopy walk"),
                    ("Aseana City Linear Park", [120.9882, 14.5245], 5, "Modern pedestrianized boulevard with public art"),
                    ("City of Dreams Fountain Park", [120.9930, 14.5215], 8, "Illuminated water installations and promenade"),
                ],
                vec![
                    ("Ayala Malls Manila Bay", [120.9897, 14.5240], 1, "4-level lifestyle mall with Filipino cultural village"),
                    ("Parqal Retail Spine", [120.9892, 14.5218], 3, "Street retail promenade with alfresco restaurants"),
                    ("Blue Bay Walk", [120.9915, 14.5380], 10, "Low-rise open courtyard lifestyle strip"),
                ],
            ),
            "ayala_makati" => (
                vec![
                    ("Yardstick Coffee Legazpi Village", [121.0185, 14.5532], 7, "Pioneer Philippine specialty roastery"),
                    ("Toby's Estate Glorietta 2", [121.0268, 14.5515], 2, "Directly connected to One Ayala transport deck"),
                    ("% Arabica Greenbelt 4", [121.0225, 14.5528], 6, "Minimalist Kyoto-style espresso bar"),
                    ("UCC Park Cafe Glorietta", [121.0255, 14.5522], 3, "Charcoal-roasted Sumiyaki coffee"),
                ],
                vec![
                    ("Ayala Triangle Gardens", [121.0228, 14.5570], 6, "Lush 2-hectare CBD central park with heritage trees"),
                    ("Greenbelt Park & Zen Chapel", [121.0215, 14.5520], 5, "Koi ponds, tropical flora & tranquil outdoor seating"),
                    ("Legazpi Active Park", [121.0175, 14.5540], 9, "Jogging track & Sunday artisanal market venue"),
                ],
                vec![
                    ("One Ayala Mall & Terminal", [121.0286, 14.5503], 1, "Intermodal transit mall with bus, MRT & food hall"),
                    ("Glorietta Complex (1 to 5)", [121.0260, 14.5518], 2, "Massive connected shopping & entertainment complex"),
                    ("Greenbelt Luxury Malls", [121.0220, 14.5525], 5, "Indoor/outdoor lifestyle shopping surrounded by gardens"),
                ],
            ),
            "sm_north" => (
                vec![
                    ("Bo's Coffee The Block", [121.0325, 14.6548], 2, "Philippine highland origin Sagada & Benguet roasts"),
                    ("Craft Coffee Revolution North Towers", [121.0345, 14.6532], 3, "Third-wave hand-poured specialty coffee"),
                    ("Starbucks Reserve TriNoma Level 4", [121.0350, 14.6528], 4, "Rooftop garden seating overlooking North Ave"),
                    ("J.CO Donuts & Cafe SM North", [121.0315, 14.6540], 3, "Italian espresso & handcrafted glazed donuts"),
                ],
                vec![
                    ("Sky Garden SM North EDSA", [121.0328, 14.6542], 1, "Elevated 400m linear landscaped green canopy park"),
                    ("TriNoma Rooftop Garden", [121.0352, 14.6525], 3, "Waterfalls, lagoon and alfresco dining terrace"),
                    ("Ninoy Aquino Parks and Wildlife", [121.0440, 14.6505], 10, "Protected natural lagoon & forest reserve"),
                ],
                vec![
                    ("SM City North EDSA", [121.0333, 14.6538], 1, "World's 8th largest mall with The Block & North Towers"),
                    ("TriNoma Mall", [121.0355, 14.6530], 2, "Ayala-developed major transit nexus linked to MRT-3"),
                    ("Ayala Malls Vertis North", [121.0375, 14.6515], 5, "Modern dining avenue with the Philippines' largest screen"),
                ],
            ),
            _ => (
                vec![
                    ("Highland Roast & Co.", [hub_coord[0] + 0.0015, hub_coord[1] + 0.0010], 3, "Single origin Philippine Cordillera beans"),
                    ("Artisan Pour Over Lounge", [hub_coord[0] - 0.0012, hub_coord[1] + 0.0018], 4, "Cozy coworking spaces with power outlets"),
                    ("Brew & Social Terrace", [hub_coord[0] + 0.0020, hub_coord[1] - 0.0015], 6, "Alfresco patio seating with Wi-Fi"),
                ],
                vec![
                    ("Community Central Green", [hub_coord[0] + 0.0025, hub_coord[1] + 0.0020], 4, "Open lawn with shaded benches and walking path"),
                    ("Civic Promenade Plaza", [hub_coord[0] - 0.0018, hub_coord[1] - 0.0022], 6, "Fountain centerpiece and landscaped shrubbery"),
                ],
                vec![
                    ("Transit Galleria Mall", [hub_coord[0] + 0.0010, hub_coord[1] - 0.0010], 2, "Directly connected shopping center and food court"),
                    ("Commercial Hub Central", [hub_coord[0] - 0.0020, hub_coord[1] + 0.0008], 4, "Department stores, groceries and entertainment"),
                ],
            ),
        };

        for (name, pos, walk, hl) in cafes {
            if categorized.cafes.len() < 5 && !categorized.cafes.iter().any(|c| c.name == name) {
                categorized.cafes.push(PoiItem {
                    id: format!("{}_cafe_{}", hub_id, categorized.cafes.len()),
                    name: name.to_string(),
                    category: "cafe".to_string(),
                    coordinates: pos,
                    walking_minutes: walk,
                    address: Some("Metro Manila Transit Zone".to_string()),
                    highlight: Some(hl.to_string()),
                });
            }
        }

        for (name, pos, walk, hl) in parks {
            if categorized.parks.len() < 4 && !categorized.parks.iter().any(|c| c.name == name) {
                categorized.parks.push(PoiItem {
                    id: format!("{}_park_{}", hub_id, categorized.parks.len()),
                    name: name.to_string(),
                    category: "park".to_string(),
                    coordinates: pos,
                    walking_minutes: walk,
                    address: Some("Metro Manila Green Zone".to_string()),
                    highlight: Some(hl.to_string()),
                });
            }
        }

        for (name, pos, walk, hl) in malls {
            if categorized.malls.len() < 4 && !categorized.malls.iter().any(|c| c.name == name) {
                categorized.malls.push(PoiItem {
                    id: format!("{}_mall_{}", hub_id, categorized.malls.len()),
                    name: name.to_string(),
                    category: "mall".to_string(),
                    coordinates: pos,
                    walking_minutes: walk,
                    address: Some("Metro Manila Commercial Hub".to_string()),
                    highlight: Some(hl.to_string()),
                });
            }
        }
    }
}

/// Approximate distance between two [lng, lat] coordinates in meters
fn approx_distance(a: [f64; 2], b: [f64; 2]) -> f64 {
    let d_lng = (a[0] - b[0]) * 111_000.0 * (a[1].to_radians()).cos();
    let d_lat = (a[1] - b[1]) * 111_000.0;
    (d_lng * d_lng + d_lat * d_lat).sqrt()
}
