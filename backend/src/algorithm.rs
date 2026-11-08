use std::time::Instant;
use tokio::sync::mpsc::Sender;
use tokio::time::sleep;
use std::time::Duration;
use tracing::info;

use crate::models::{
    CalculationWeights, CandidateHub, PartialPolyline, Participant,
    RoadCandidateVerdict, StreamEvent, UserRoadMetric, UserRoadRoute,
};
use crate::osrm::OsrmClient;
use crate::poi::PoiService;

pub async fn run_true_road_engine(
    osrm_client: &OsrmClient,
    poi_service: &PoiService,
    participants: Vec<Participant>,
    weights: CalculationWeights,
    tx: Sender<StreamEvent>,
) {
    let start_time = Instant::now();
    let n_users = participants.len();
    if n_users == 0 {
        let _ = tx
            .send(StreamEvent::Error {
                message: "No participants provided for calculation".to_string(),
            })
            .await;
        return;
    }

    info!(
        "Starting True Road-Path Midpoint Engine for {} participants (alpha={:.2}, beta={:.2})",
        n_users, weights.alpha, weights.beta
    );

    // -------------------------------------------------------------
    // STEP 1: Direct Highway Slicing & Candidate Road Hub Selection
    // -------------------------------------------------------------
    let mut candidate_hubs: Vec<CandidateHub> = Vec::new();
    let mut direct_road_midpoint_hub: Option<CandidateHub> = None;

    if n_users >= 2 {
        let u1 = &participants[0];
        let u2 = &participants[1];
        info!(
            "Querying direct highway route between {} and {}...",
            u1.name, u2.name
        );

        let direct_route = osrm_client.fetch_route(u1.coordinates, u2.coordinates).await;
        if direct_route.coordinates.len() >= 2 {
            // Slicing highway path at 40%, 45%, 50%, 55%, 60%
            let fractions = [0.40, 0.45, 0.50, 0.55, 0.60];
            let samples = OsrmClient::sample_polyline_at_fractions(&direct_route.coordinates, &fractions);

            for (_idx, (&frac, &coord)) in fractions.iter().zip(samples.iter()).enumerate() {
                let pct = (frac * 100.0).round() as u32;
                let is_exact_half = pct == 50;
                let hub_id = if is_exact_half {
                    "direct_road_midpoint".to_string()
                } else {
                    format!("highway_slice_{}", pct)
                };

                let hub_name = if is_exact_half {
                    "Exact Highway Path Midpoint (50% Road Distance)".to_string()
                } else {
                    format!("Highway Convergence Node ({}% Road Distance)", pct)
                };

                let hub = CandidateHub {
                    id: hub_id,
                    name: hub_name,
                    coordinates: coord,
                    category: if is_exact_half {
                        "Expressway Midpoint Pin".to_string()
                    } else {
                        "Highway Route Sample".to_string()
                    },
                    description: format!(
                        "{}% road distance milestone along the highway connecting {} and {}",
                        pct, u1.name, u2.name
                    ),
                    metro_zone: "Active Highway Corridor".to_string(),
                };

                if is_exact_half {
                    direct_road_midpoint_hub = Some(hub.clone());
                }
                candidate_hubs.push(hub);
            }
        }
    }

    // Add curated regional Luzon highway convergence hubs
    let curated_hubs = get_luzon_corridor_hubs();
    for hub in curated_hubs {
        if !candidate_hubs.iter().any(|h| h.id == hub.id) {
            candidate_hubs.push(hub);
        }
    }

    // Broadcast Initial State
    let _ = tx
        .send(StreamEvent::InitialCandidates {
            hubs: candidate_hubs.clone(),
            direct_midpoint: direct_road_midpoint_hub.clone(),
        })
        .await;

    // -------------------------------------------------------------
    // STEP 2: Real Road Matrix Querying (OSRM Table / Route API)
    // -------------------------------------------------------------
    let user_coords: Vec<[f64; 2]> = participants.iter().map(|p| p.coordinates).collect();
    let hub_coords: Vec<[f64; 2]> = candidate_hubs.iter().map(|h| h.coordinates).collect();

    // Query OSRM Table API in a single request
    let table_result = osrm_client.fetch_table(&user_coords, &hub_coords).await;

    struct EvaluatedCandidate {
        hub: CandidateHub,
        times_min: Vec<f64>,
        distances_km: Vec<f64>,
        total_time_min: f64,
        delta_min: f64,
        cost_score: f64,
        fairness_score: f64,
    }

    let mut evaluated_list: Vec<EvaluatedCandidate> = Vec::new();

    for (h_idx, hub) in candidate_hubs.iter().enumerate() {
        let mut times_min = Vec::with_capacity(n_users);
        let mut distances_km = Vec::with_capacity(n_users);

        for u_idx in 0..n_users {
            let (dur_sec, dist_m) = if let Some(table) = &table_result {
                let d_sec = table
                    .durations_secs
                    .get(u_idx)
                    .and_then(|r| r.get(h_idx))
                    .copied()
                    .unwrap_or(3600.0);
                let d_m = table
                    .distances_meters
                    .get(u_idx)
                    .and_then(|r| r.get(h_idx))
                    .copied()
                    .unwrap_or(40_000.0);
                (d_sec, d_m)
            } else {
                let r = osrm_client.fetch_route(user_coords[u_idx], hub.coordinates).await;
                (r.duration_secs, r.distance_meters)
            };

            let t_min = (dur_sec / 60.0 * 10.0).round() / 10.0;
            let d_km = (dist_m / 1000.0 * 10.0).round() / 10.0;
            times_min.push(t_min);
            distances_km.push(d_km);
        }

        let total_time_min: f64 = times_min.iter().sum();
        let min_t = times_min.iter().copied().fold(f64::INFINITY, f64::min);
        let max_t = times_min.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let delta_min = ((max_t - min_t) * 10.0).round() / 10.0;

        // Minimax Road Cost Formula: (0.45 * Total) + (0.55 * N * Delta)
        let cost_score =
            (weights.alpha * total_time_min + weights.beta * (n_users as f64) * delta_min).round();

        // Fairness Percentage: max(0, 100 - (Delta / Max_Time * 100))
        let fairness_score = if max_t > 0.0 {
            (100.0 - (delta_min / max_t * 100.0)).clamp(0.0, 100.0).round()
        } else {
            100.0
        };

        evaluated_list.push(EvaluatedCandidate {
            hub: hub.clone(),
            times_min,
            distances_km,
            total_time_min,
            delta_min,
            cost_score,
            fairness_score,
        });
    }

    // Sort by Cost ascending (Lowest Cost = Fairest / Optimal)
    evaluated_list.sort_by(|a, b| a.cost_score.partial_cmp(&b.cost_score).unwrap());

    // -------------------------------------------------------------
    // STEP 3: Visual Highway Crawl (15 Progressive Frames)
    // -------------------------------------------------------------
    let top_hub = &evaluated_list[0].hub;
    let mut user_lead_routes: Vec<Vec<[f64; 2]>> = Vec::new();

    for p in &participants {
        let route = osrm_client.fetch_route(p.coordinates, top_hub.coordinates).await;
        user_lead_routes.push(route.coordinates);
    }

    let crawl_frames = 15;
    for frame in 1..=crawl_frames {
        let progress_pct = (frame as f64) / (crawl_frames as f64);
        let mut partials = Vec::new();

        for (u_idx, p) in participants.iter().enumerate() {
            let full_coords = &user_lead_routes[u_idx];
            let sliced = OsrmClient::slice_polyline_by_distance(full_coords, progress_pct);

            partials.push(PartialPolyline {
                participant_id: p.id.clone(),
                coordinates: sliced,
                color: p.color.clone(),
            });
        }

        let telemetry_note = format!(
            "Tracing highway network ({:.0}%) along Luzon corridors",
            progress_pct * 100.0
        );

        let _ = tx
            .send(StreamEvent::HighwayCrawl {
                progress_pct: (progress_pct * 100.0).round() as u32,
                partial_polylines: partials,
                telemetry_note,
            })
            .await;

        sleep(Duration::from_millis(70)).await;
    }

    // -------------------------------------------------------------
    // STEP 4: Candidate Road Testing (Top 5 Contenders)
    // -------------------------------------------------------------
    let top_5_count = evaluated_list.len().min(5);
    let mut top_verdicts: Vec<RoadCandidateVerdict> = Vec::new();

    for rank_idx in 0..top_5_count {
        let cand = &evaluated_list[rank_idx];

        let mut user_road_routes = Vec::new();
        let mut user_metrics = Vec::new();

        for (u_idx, p) in participants.iter().enumerate() {
            let route = osrm_client.fetch_route(p.coordinates, cand.hub.coordinates).await;
            let time_m = cand.times_min[u_idx];
            let dist_k = cand.distances_km[u_idx];

            user_road_routes.push(UserRoadRoute {
                participant_id: p.id.clone(),
                participant_name: p.name.clone(),
                coordinates: route.coordinates,
                road_time_mins: time_m,
                road_distance_km: dist_k,
                color: p.color.clone(),
            });

            user_metrics.push(UserRoadMetric {
                participant_id: p.id.clone(),
                participant_name: p.name.clone(),
                road_time_mins: time_m,
                road_distance_km: dist_k,
                color: p.color.clone(),
            });
        }

        let (status, reason) = if rank_idx == 0 {
            (
                "WINNER".to_string(),
                format!(
                    "Optimal midpoint: {:.0}% road fairness with delta {:.1} min across participants.",
                    cand.fairness_score, cand.delta_min
                ),
            )
        } else if cand.fairness_score >= 70.0 {
            (
                "CONTENDER".to_string(),
                format!(
                    "Viable alternative: {:.0}% road fairness with delta {:.1} min.",
                    cand.fairness_score, cand.delta_min
                ),
            )
        } else {
            (
                "REJECTED".to_string(),
                format!(
                    "High travel disparity: delta {:.1} min disparity ({:.0}% fair).",
                    cand.delta_min, cand.fairness_score
                ),
            )
        };

        let verdict = RoadCandidateVerdict {
            hub_name: cand.hub.name.clone(),
            hub_id: cand.hub.id.clone(),
            hub_coords: cand.hub.coordinates,
            user_road_routes: user_road_routes.clone(),
            user_metrics: user_metrics.clone(),
            total_road_time_mins: cand.total_time_min,
            delta_road_mins: cand.delta_min,
            cost_score: cand.cost_score,
            fairness_score: cand.fairness_score,
            status: status.clone(),
            reason: reason.clone(),
            rank: rank_idx + 1,
            area_name: None,
        };

        top_verdicts.push(verdict);

        let _ = tx
            .send(StreamEvent::CandidateRoadTest {
                hub_name: cand.hub.name.clone(),
                hub_id: cand.hub.id.clone(),
                hub_coords: cand.hub.coordinates,
                user_road_routes,
                fairness_score: cand.fairness_score,
                cost_score: cand.cost_score,
                delta_mins: cand.delta_min,
                road_times_min: cand.times_min.clone(),
                road_distances_km: cand.distances_km.clone(),
                status,
                reason,
            })
            .await;

        sleep(Duration::from_millis(350)).await;
    }

    // -------------------------------------------------------------
    // STEP 5: Final Verdict & Accurate Nearby Spot Query (1500m)
    // -------------------------------------------------------------
    let mut winner = top_verdicts.remove(0);
    let alternatives = top_verdicts;

    // Reverse geocode winning coordinate for human-readable neighborhood/road
    let area_name = poi_service.reverse_geocode(winner.hub_coords).await;
    winner.area_name = area_name;

    info!(
        "Querying Overpass spots around winning coordinate [{:.5}, {:.5}] for '{}'...",
        winner.hub_coords[0], winner.hub_coords[1], winner.hub_name
    );

    let pois = poi_service
        .fetch_pois_for_midpoint(winner.hub_coords, &winner.hub_name)
        .await;

    let analysis_commentary = format!(
        "This highway midpoint balances the commute across all {} travelers with only {:.1} min disparity ({}% fairness score). Total driving time is {:.0} min across the group.",
        n_users,
        winner.delta_road_mins,
        winner.fairness_score,
        winner.total_road_time_mins
    );

    let total_calc_time_ms = start_time.elapsed().as_millis() as u64;

    info!(
        "Final Road Winner: {} (Fairness: {}%, Delta: {}m, Calc: {}ms)",
        winner.hub_name, winner.fairness_score, winner.delta_road_mins, total_calc_time_ms
    );

    let _ = tx
        .send(StreamEvent::FinalRoadVerdict {
            winner,
            alternatives,
            pois,
            analysis_commentary,
            total_calc_time_ms,
        })
        .await;
}

fn get_luzon_corridor_hubs() -> Vec<CandidateHub> {
    vec![
        CandidateHub {
            id: "sm_north".to_string(),
            name: "SM North EDSA / TriNoma (Quezon City)".to_string(),
            coordinates: [121.0333, 14.6538],
            category: "North Road Nexus".to_string(),
            description: "NLEX Mindanao Ave & EDSA North junction".to_string(),
            metro_zone: "North EDSA".to_string(),
        },
        CandidateHub {
            id: "quezon_ave".to_string(),
            name: "EDSA Quezon Avenue (Quezon City)".to_string(),
            coordinates: [121.0400, 14.6420],
            category: "Quezon City Central".to_string(),
            description: "EDSA & Quezon Ave interchange".to_string(),
            metro_zone: "Quezon City".to_string(),
        },
        CandidateHub {
            id: "cubao".to_string(),
            name: "Gateway Cubao / Araneta City".to_string(),
            coordinates: [121.0531, 14.6200],
            category: "Central Highway Crossroad".to_string(),
            description: "Aurora Blvd & EDSA central arterial intersection".to_string(),
            metro_zone: "Cubao".to_string(),
        },
        CandidateHub {
            id: "ortigas".to_string(),
            name: "Ortigas Center / SM Megamall".to_string(),
            coordinates: [121.0572, 14.5843],
            category: "Central Commercial Corridor".to_string(),
            description: "EDSA & Shaw Blvd midway business belt".to_string(),
            metro_zone: "Ortigas CBD".to_string(),
        },
        CandidateHub {
            id: "bgc".to_string(),
            name: "BGC Market! Market! / High Street".to_string(),
            coordinates: [121.0550, 14.5490],
            category: "East Expressway Corridor".to_string(),
            description: "C5 highway arterial & elevated flyover access".to_string(),
            metro_zone: "Taguig BGC".to_string(),
        },
        CandidateHub {
            id: "ayala_makati".to_string(),
            name: "Ayala Center / One Ayala (Makati)".to_string(),
            coordinates: [121.0286, 14.5503],
            category: "Premier Intermodal CBD".to_string(),
            description: "Skyway Stage 3 / Osmena Highway & EDSA South nexus".to_string(),
            metro_zone: "Makati CBD".to_string(),
        },
        CandidateHub {
            id: "robinsons_manila".to_string(),
            name: "Robinsons Place Manila (Ermita)".to_string(),
            coordinates: [120.9850, 14.5772],
            category: "Capital Road Belt".to_string(),
            description: "Taft Ave, Roxas Blvd & Padre Faura connector".to_string(),
            metro_zone: "City of Manila".to_string(),
        },
        CandidateHub {
            id: "moa".to_string(),
            name: "SM Mall of Asia (Bay Area)".to_string(),
            coordinates: [120.9822, 14.5354],
            category: "Coastal Expressway Nexus".to_string(),
            description: "CAVITEX Pacific Drive & EDSA South terminus".to_string(),
            metro_zone: "Bay Area".to_string(),
        },
        CandidateHub {
            id: "ayala_manila_bay".to_string(),
            name: "Ayala Malls Manila Bay (Aseana)".to_string(),
            coordinates: [120.9897, 14.5240],
            category: "Entertainment City Arterial".to_string(),
            description: "Macapagal Blvd & NAIA Expressway link to CAVITEX".to_string(),
            metro_zone: "Aseana / Paranaque".to_string(),
        },
        CandidateHub {
            id: "alabang".to_string(),
            name: "Alabang Town Center (Filinvest)".to_string(),
            coordinates: [121.0422, 14.4234],
            category: "South Expressway Gateway".to_string(),
            description: "SLEX, Skyway South terminus & Daang Hari link".to_string(),
            metro_zone: "Muntinlupa Alabang".to_string(),
        },
        CandidateHub {
            id: "monumento".to_string(),
            name: "Monumento Circle (Caloocan)".to_string(),
            coordinates: [120.9837, 14.6542],
            category: "CAMANAVA Road Gateway".to_string(),
            description: "Samson Road, Rizal Ave & McArthur Hwy confluence".to_string(),
            metro_zone: "North CAMANAVA".to_string(),
        },
        CandidateHub {
            id: "san_fernando_pampanga".to_string(),
            name: "SM City Pampanga / San Fernando Interchange".to_string(),
            coordinates: [120.6970, 15.0480],
            category: "Central Luzon Expressway Node".to_string(),
            description: "NLEX San Fernando Exit & Jose Abad Santos Ave".to_string(),
            metro_zone: "Pampanga".to_string(),
        },
        CandidateHub {
            id: "bocaue_bulacan".to_string(),
            name: "Bocaue NLEX Interchange / Philippine Arena".to_string(),
            coordinates: [120.9482, 14.7736],
            category: "Bulacan Arterial Gateway".to_string(),
            description: "NLEX Bocaue Tollgate & McArthur Highway link".to_string(),
            metro_zone: "Bulacan".to_string(),
        },
        CandidateHub {
            id: "bacoor_cavite".to_string(),
            name: "SM City Bacoor / CAVITEX Junction".to_string(),
            coordinates: [120.9427, 14.4642],
            category: "Cavite Coastal Gate".to_string(),
            description: "CAVITEX Longos Exit & Tirona Highway".to_string(),
            metro_zone: "Cavite".to_string(),
        },
        CandidateHub {
            id: "santa_rosa_laguna".to_string(),
            name: "Nuvali / Santa Rosa SLEX Exit".to_string(),
            coordinates: [121.0650, 14.2880],
            category: "Laguna Growth Corridor".to_string(),
            description: "SLEX Santa Rosa Exit & Tagaytay road connector".to_string(),
            metro_zone: "Laguna".to_string(),
        },
    ]
}
