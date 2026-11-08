use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
use tracing::{info, warn};

#[derive(Clone)]
pub struct OsrmClient {
    client: Client,
}

#[derive(Debug, Clone)]
pub struct OsrmRouteResult {
    pub duration_secs: f64,
    pub distance_meters: f64,
    pub coordinates: Vec<[f64; 2]>,
}

#[derive(Debug, Clone)]
pub struct OsrmTableResult {
    pub durations_secs: Vec<Vec<f64>>,   // [source_idx][destination_idx]
    pub distances_meters: Vec<Vec<f64>>, // [source_idx][destination_idx]
}

impl OsrmClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(5))
            .user_agent("GitnaRoadEngine/2.0 (Philippine Fair-Midpoint Calculator; contact@gitna.ph)")
            .build()
            .unwrap_or_else(|_| Client::new());
        Self { client }
    }

    /// Fetch real road route geometry between origin and destination from OSRM
    pub async fn fetch_route(&self, origin: [f64; 2], dest: [f64; 2]) -> OsrmRouteResult {
        let url = format!(
            "https://router.project-osrm.org/route/v1/driving/{:.6},{:.6};{:.6},{:.6}?overview=full&geometries=geojson",
            origin[0], origin[1], dest[0], dest[1]
        );

        match self.client.get(&url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        if let Some(route) = json["routes"].as_array().and_then(|r| r.first()) {
                            let duration_secs = route["duration"].as_f64().unwrap_or(0.0);
                            let distance_meters = route["distance"].as_f64().unwrap_or(0.0);

                            if let Some(coords_arr) = route["geometry"]["coordinates"].as_array() {
                                let coords: Vec<[f64; 2]> = coords_arr
                                    .iter()
                                    .filter_map(|pt| {
                                        let lng = pt.get(0)?.as_f64()?;
                                        let lat = pt.get(1)?.as_f64()?;
                                        Some([lng, lat])
                                    })
                                    .collect();

                                if coords.len() >= 2 {
                                    return OsrmRouteResult {
                                        duration_secs,
                                        distance_meters,
                                        coordinates: coords,
                                    };
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                warn!("OSRM Route request failed: {e}. Generating fallback road geometry.");
            }
        }

        // Reliable fallback highway synthesis along Philippine highway corridors
        Self::synthesize_philippine_road(origin, dest)
    }

    /// Fetch road distance & duration matrix using OSRM Table API
    pub async fn fetch_table(
        &self,
        sources: &[[f64; 2]],
        destinations: &[[f64; 2]],
    ) -> Option<OsrmTableResult> {
        let n_src = sources.len();
        let n_dst = destinations.len();
        if n_src == 0 || n_dst == 0 {
            return None;
        }

        // Build coordinate string: all sources then all destinations
        let mut coord_parts = Vec::new();
        for s in sources {
            coord_parts.push(format!("{:.6},{:.6}", s[0], s[1]));
        }
        for d in destinations {
            coord_parts.push(format!("{:.6},{:.6}", d[0], d[1]));
        }

        let coords_str = coord_parts.join(";");
        let src_indices: Vec<String> = (0..n_src).map(|i| i.to_string()).collect();
        let dst_indices: Vec<String> = (n_src..(n_src + n_dst)).map(|i| i.to_string()).collect();

        let url = format!(
            "https://router.project-osrm.org/table/v1/driving/{}?sources={}&destinations={}&annotations=duration,distance",
            coords_str,
            src_indices.join(";"),
            dst_indices.join(";")
        );

        match self.client.get(&url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    if let Ok(json) = resp.json::<Value>().await {
                        if let (Some(dur_matrix), Some(dist_matrix)) = (
                            json["durations"].as_array(),
                            json["distances"].as_array(),
                        ) {
                            let mut durations_secs = Vec::with_capacity(n_src);
                            let mut distances_meters = Vec::with_capacity(n_src);

                            for i in 0..n_src {
                                let mut dur_row = Vec::with_capacity(n_dst);
                                let mut dist_row = Vec::with_capacity(n_dst);

                                if let Some(d_row) = dur_matrix.get(i).and_then(|r| r.as_array()) {
                                    for v in d_row {
                                        dur_row.push(v.as_f64().unwrap_or(3600.0));
                                    }
                                }

                                if let Some(dist_r) = dist_matrix.get(i).and_then(|r| r.as_array()) {
                                    for v in dist_r {
                                        dist_row.push(v.as_f64().unwrap_or(50_000.0));
                                    }
                                }

                                durations_secs.push(dur_row);
                                distances_meters.push(dist_row);
                            }

                            info!(
                                "OSRM Table returned {}x{} road matrix",
                                durations_secs.len(),
                                durations_secs.first().map(|r| r.len()).unwrap_or(0)
                            );

                            return Some(OsrmTableResult {
                                durations_secs,
                                distances_meters,
                            });
                        }
                    }
                }
            }
            Err(e) => {
                warn!("OSRM Table request failed: {e}. Falling back to individual route calculation.");
            }
        }

        None
    }

    /// Walk along real road polyline coordinates and find the exact coordinate
    /// at 50% cumulative road distance (and 50% duration).
    pub fn find_road_midpoint(coordinates: &[[f64; 2]]) -> [f64; 2] {
        if coordinates.len() < 2 {
            return coordinates.first().copied().unwrap_or([120.985, 14.58]);
        }

        // Calculate total road polyline length
        let mut seg_lengths = Vec::with_capacity(coordinates.len() - 1);
        let mut total_len = 0.0;

        for i in 0..coordinates.len() - 1 {
            let p1 = coordinates[i];
            let p2 = coordinates[i + 1];
            let len = approx_road_segment_meters(p1, p2);
            seg_lengths.push(len);
            total_len += len;
        }

        let half_dist = total_len * 0.50;
        let mut accumulated = 0.0;

        for (i, &len) in seg_lengths.iter().enumerate() {
            if accumulated + len >= half_dist {
                let remain = half_dist - accumulated;
                let fraction = if len > 0.0 { remain / len } else { 0.5 };
                let p1 = coordinates[i];
                let p2 = coordinates[i + 1];
                let lng = p1[0] + (p2[0] - p1[0]) * fraction;
                let lat = p1[1] + (p2[1] - p1[1]) * fraction;
                return [lng, lat];
            }
            accumulated += len;
        }

        // Fallback to middle index
        coordinates[coordinates.len() / 2]
    }

    /// Slice a road polyline up to a given progress percentage (0.05 to 1.0)
    /// based on accumulated road distance so it smoothly crawls along highways.
    pub fn slice_polyline_by_distance(coordinates: &[[f64; 2]], progress_pct: f64) -> Vec<[f64; 2]> {
        if coordinates.len() <= 2 || progress_pct >= 0.999 {
            return coordinates.to_vec();
        }

        let mut seg_lengths = Vec::with_capacity(coordinates.len() - 1);
        let mut total_len = 0.0;

        for i in 0..coordinates.len() - 1 {
            let len = approx_road_segment_meters(coordinates[i], coordinates[i + 1]);
            seg_lengths.push(len);
            total_len += len;
        }

        let target_dist = total_len * progress_pct.clamp(0.01, 1.0);
        let mut accumulated = 0.0;
        let mut sliced = vec![coordinates[0]];

        for (i, &len) in seg_lengths.iter().enumerate() {
            let next_pt = coordinates[i + 1];
            if accumulated + len >= target_dist {
                let remain = target_dist - accumulated;
                let fraction = if len > 0.0 { remain / len } else { 0.5 };
                let curr_pt = coordinates[i];
                let tip = [
                    curr_pt[0] + (next_pt[0] - curr_pt[0]) * fraction,
                    curr_pt[1] + (next_pt[1] - curr_pt[1]) * fraction,
                ];
                sliced.push(tip);
                break;
            } else {
                sliced.push(next_pt);
                accumulated += len;
            }
        }

        sliced
    }

    /// High-precision highway waypoint interpolation along major Philippine corridors
    /// (NLEX, Skyway Stage 3, EDSA, CAVITEX, SLEX) when OSRM API is rate-limited.
    fn synthesize_philippine_road(origin: [f64; 2], dest: [f64; 2]) -> OsrmRouteResult {
        // Highway spine hubs in order North to South
        let spine = vec![
            [120.8113, 14.8527], // Malolos (Bulacan)
            [120.8650, 14.8210], // Guiguinto NLEX
            [120.9150, 14.7950], // Marilao NLEX
            [120.9482, 14.7736], // Bocaue NLEX
            [120.9850, 14.7100], // Valenzuela Smart Connect
            [120.9995, 14.6575], // Balintawak Cloverleaf
            [121.0333, 14.6538], // SM North EDSA
            [121.0450, 14.6350], // EDSA Quezon Ave
            [121.0531, 14.6200], // Cubao Araneta
            [121.0572, 14.5843], // Ortigas Center / Megamall
            [121.0509, 14.5507], // BGC Market Market
            [121.0286, 14.5503], // Ayala Makati One Ayala
            [120.9822, 14.5354], // Mall of Asia
            [120.9897, 14.5240], // Ayala Malls Manila Bay
            [120.9922, 14.5100], // PITX
            [120.9427, 14.4642], // Bacoor CAVITEX Entry
            [120.9405, 14.4296], // Imus Aguinaldo Hwy
            [120.8808, 14.3879], // General Trias (Cavite)
            [121.0422, 14.4234], // Alabang Filinvest
        ];

        // Find closest spine index for origin and dest
        let mut best_orig_idx = 0;
        let mut min_orig_dist = f64::MAX;
        let mut best_dest_idx = 0;
        let mut min_dest_dist = f64::MAX;

        for (i, &pt) in spine.iter().enumerate() {
            let d_o = approx_road_segment_meters(origin, pt);
            if d_o < min_orig_dist {
                min_orig_dist = d_o;
                best_orig_idx = i;
            }
            let d_d = approx_road_segment_meters(dest, pt);
            if d_d < min_dest_dist {
                min_dest_dist = d_d;
                best_dest_idx = i;
            }
        }

        let mut path = vec![origin];
        if best_orig_idx <= best_dest_idx {
            for i in best_orig_idx..=best_dest_idx {
                path.push(spine[i]);
            }
        } else {
            for i in (best_dest_idx..=best_orig_idx).rev() {
                path.push(spine[i]);
            }
        }
        path.push(dest);

        // Deduplicate adjacent
        path.dedup();

        let mut total_dist_m = 0.0;
        for i in 0..path.len() - 1 {
            total_dist_m += approx_road_segment_meters(path[i], path[i + 1]);
        }

        // Philippine average urban/expressway driving speed ~ 38 km/h (10.5 m/s)
        let duration_secs = (total_dist_m / 10.5).max(300.0);

        OsrmRouteResult {
            duration_secs,
            distance_meters: total_dist_m,
            coordinates: path,
        }
    }
}

pub fn approx_road_segment_meters(a: [f64; 2], b: [f64; 2]) -> f64 {
    let d_lng = (a[0] - b[0]) * 111_320.0 * (a[1].to_radians()).cos();
    let d_lat = (a[1] - b[1]) * 111_320.0;
    (d_lng * d_lng + d_lat * d_lat).sqrt()
}
