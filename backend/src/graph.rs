use petgraph::graph::{NodeIndex, UnGraph};
use petgraph::algo::dijkstra;
use std::collections::HashMap;
use geo::algorithm::haversine_distance::HaversineDistance;
use geo::Point;

use crate::models::{CandidateHub, TransportMode};

#[derive(Debug, Clone)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub coordinates: [f64; 2], // [lng, lat]
    pub is_hub: bool,
    pub category: String,
    pub description: String,
    pub metro_zone: String,
    pub transit_connections: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct GraphEdge {
    pub id: String,
    pub name: String,
    pub distance_km: f64,
    pub driving_time_mins: f64,
    pub commute_time_mins: f64,
    pub bottleneck: Option<String>,
    pub waypoints: Vec<[f64; 2]>,
}

#[derive(Clone)]
pub struct TransitNetwork {
    pub graph: UnGraph<GraphNode, GraphEdge>,
    pub node_indices: HashMap<String, NodeIndex>,
}

impl TransitNetwork {
    pub fn new() -> Self {
        let mut graph = UnGraph::<GraphNode, GraphEdge>::new_undirected();
        let mut node_indices = HashMap::new();

        // ---------------------------------------------------------
        // 1. DEFINE NODES
        // ---------------------------------------------------------
        let nodes = vec![
            // North Region (Bulacan / North NCR)
            GraphNode {
                id: "malolos".to_string(),
                name: "Malolos (Bulacan Capital)".to_string(),
                coordinates: [120.8113, 14.8527],
                is_hub: false,
                category: "Provincial Capital".to_string(),
                description: "Bulacan gateway via McArthur Hwy & NLEX Tabang".to_string(),
                metro_zone: "Bulacan".to_string(),
                transit_connections: vec!["P2P Bus to Trinoma".to_string(), "Provincial Bus".to_string()],
            },
            GraphNode {
                id: "bocaue".to_string(),
                name: "Bocaue / Marilao (NLEX Toll)".to_string(),
                coordinates: [120.9482, 14.7736],
                is_hub: false,
                category: "Expressway Node".to_string(),
                description: "NLEX Southbound toll corridor".to_string(),
                metro_zone: "Bulacan".to_string(),
                transit_connections: vec!["NLEX Express Bus".to_string()],
            },
            GraphNode {
                id: "balintawak".to_string(),
                name: "Balintawak (NLEX Cloverleaf)".to_string(),
                coordinates: [120.9995, 14.6575],
                is_hub: false,
                category: "North Transit Gateway".to_string(),
                description: "LRT-1 Balintawak station & NLEX North Entry".to_string(),
                metro_zone: "North NCR".to_string(),
                transit_connections: vec!["LRT-1".to_string(), "EDSA Carousel".to_string(), "Jeepney/FX".to_string()],
            },
            GraphNode {
                id: "monumento".to_string(),
                name: "Monumento (Caloocan)".to_string(),
                coordinates: [120.9837, 14.6542],
                is_hub: false,
                category: "CAMANAVA Terminal".to_string(),
                description: "Historic Bonifacio Monument, LRT-1 & Northern Carousel".to_string(),
                metro_zone: "North NCR".to_string(),
                transit_connections: vec!["LRT-1".to_string(), "EDSA Carousel".to_string()],
            },
            GraphNode {
                id: "mindanao_ave".to_string(),
                name: "Mindanao Ave (NLEX Segment 8.1)".to_string(),
                coordinates: [121.0336, 14.6853],
                is_hub: false,
                category: "Expressway Connector".to_string(),
                description: "Segment 8.1 bypass connecting North Luzon to QC".to_string(),
                metro_zone: "North NCR".to_string(),
                transit_connections: vec!["NLEX Smart Connect".to_string()],
            },

            // Central / North-EDSA Hubs
            GraphNode {
                id: "sm_north".to_string(),
                name: "SM North EDSA / TriNoma".to_string(),
                coordinates: [121.0333, 14.6538],
                is_hub: true,
                category: "North EDSA Mega Hub".to_string(),
                description: "Major northern terminal: MRT-3 North Ave, EDSA Carousel, P2P Bulacan routes".to_string(),
                metro_zone: "North EDSA".to_string(),
                transit_connections: vec!["MRT-3".to_string(), "LRT-1 Unified Grand Station".to_string(), "EDSA Carousel".to_string(), "P2P Bulacan".to_string()],
            },
            GraphNode {
                id: "qmc".to_string(),
                name: "Quezon Memorial Circle / Philcoa".to_string(),
                coordinates: [121.0494, 14.6515],
                is_hub: true,
                category: "Government & Transit Circle".to_string(),
                description: "Commonwealth Ave convergence & Philcoa UV Express terminal".to_string(),
                metro_zone: "Quezon City".to_string(),
                transit_connections: vec!["MRT-7 Hub".to_string(), "Commonwealth UV Hub".to_string()],
            },
            GraphNode {
                id: "up_town_center".to_string(),
                name: "UP Town Center / Katipunan".to_string(),
                coordinates: [121.0747, 14.6508],
                is_hub: true,
                category: "East QC Lifestyle Hub".to_string(),
                description: "Katipunan student & dining belt with C5 connections".to_string(),
                metro_zone: "Katipunan".to_string(),
                transit_connections: vec!["Katipunan Jeepney".to_string(), "C5 Bus".to_string()],
            },
            GraphNode {
                id: "cubao".to_string(),
                name: "Gateway Cubao / Araneta City".to_string(),
                coordinates: [121.0531, 14.6200],
                is_hub: true,
                category: "Dual MRT/LRT Interchange".to_string(),
                description: "Key intersection connecting MRT-3 and LRT-2 line to East NCR & Manila".to_string(),
                metro_zone: "Cubao".to_string(),
                transit_connections: vec!["MRT-3 Cubao".to_string(), "LRT-2 Araneta-Cubao".to_string(), "EDSA Carousel".to_string(), "Provincial Terminals".to_string()],
            },
            GraphNode {
                id: "eastwood".to_string(),
                name: "Eastwood City (Libis C5)".to_string(),
                coordinates: [121.0805, 14.6094],
                is_hub: true,
                category: "IT & Commercial Enclave".to_string(),
                description: "Pioneering cyberpark on C5 Corridor with high car/Grab accessibility".to_string(),
                metro_zone: "C5 Libis".to_string(),
                transit_connections: vec!["C5 City Bus".to_string(), "BGC-Eastwood P2P".to_string()],
            },
            GraphNode {
                id: "ortigas".to_string(),
                name: "Ortigas Center / SM Megamall".to_string(),
                coordinates: [121.0572, 14.5843],
                is_hub: true,
                category: "Midway Commercial District".to_string(),
                description: "Geographic central business district: MRT-3 Ortigas/Shaw & EDSA Carousel".to_string(),
                metro_zone: "Ortigas CBD".to_string(),
                transit_connections: vec!["MRT-3 Shaw & Ortigas".to_string(), "EDSA Carousel".to_string(), "Rizal UV Terminals".to_string()],
            },

            // Central / South Hubs
            GraphNode {
                id: "robinsons_manila".to_string(),
                name: "Robinsons Place Manila (Ermita)".to_string(),
                coordinates: [120.9850, 14.5772],
                is_hub: true,
                category: "Historic Capital Commercial Hub".to_string(),
                description: "Manila university/hospital belt; LRT-1 Pedro Gil & Taft Ave jeepneys".to_string(),
                metro_zone: "City of Manila".to_string(),
                transit_connections: vec!["LRT-1 Pedro Gil".to_string(), "Taft UV & Jeep".to_string()],
            },
            GraphNode {
                id: "intramuros".to_string(),
                name: "Intramuros / Rizal Park".to_string(),
                coordinates: [120.9762, 14.5878],
                is_hub: true,
                category: "Heritage & Cultural District".to_string(),
                description: "Historic Walled City and national park overlooking Roxas Boulevard".to_string(),
                metro_zone: "City of Manila".to_string(),
                transit_connections: vec!["LRT-1 Central".to_string(), "Roxas Blvd Coastal Bus".to_string()],
            },
            GraphNode {
                id: "bgc".to_string(),
                name: "BGC Bonifacio High Street".to_string(),
                coordinates: [121.0509, 14.5507],
                is_hub: true,
                category: "Premier Pedestrian District".to_string(),
                description: "Walkable retail boulevard, C5 & Kalayaan Flyover access via BGC Bus".to_string(),
                metro_zone: "Taguig BGC".to_string(),
                transit_connections: vec!["BGC Bus".to_string(), "Guadalupe Jeepney".to_string(), "Kalayaan Skyway Ramp".to_string()],
            },
            GraphNode {
                id: "ayala_makati".to_string(),
                name: "Ayala Center / One Ayala (Makati)".to_string(),
                coordinates: [121.0286, 14.5503],
                is_hub: true,
                category: "Premier Intermodal CBD Hub".to_string(),
                description: "Multi-tiered transit terminal: MRT-3 Ayala, EDSA Carousel, P2P Cavite/Laguna/Bulacan".to_string(),
                metro_zone: "Makati CBD".to_string(),
                transit_connections: vec!["One Ayala Terminal".to_string(), "MRT-3 Ayala".to_string(), "EDSA Carousel".to_string(), "P2P Express Cavite/South".to_string()],
            },

            // Bay Area & South NCR Nodes
            GraphNode {
                id: "moa".to_string(),
                name: "SM Mall of Asia (MOA Bay Area)".to_string(),
                coordinates: [120.9822, 14.5354],
                is_hub: true,
                category: "Bay Area Mega Complex".to_string(),
                description: "Seaside complex at EDSA & Roxas Blvd terminus; EDSA Carousel Southern Loop".to_string(),
                metro_zone: "Bay Area".to_string(),
                transit_connections: vec!["EDSA Carousel MOA Terminal".to_string(), "PITX Shuttle".to_string(), "UV Express Cavite".to_string()],
            },
            GraphNode {
                id: "ayala_manila_bay".to_string(),
                name: "Ayala Malls Manila Bay (Aseana)".to_string(),
                coordinates: [120.9897, 14.5240],
                is_hub: true,
                category: "Entertainment City Hub".to_string(),
                description: "Direct neighbor to PITX & CAVITEX, ideal balanced spot with high parking & dining".to_string(),
                metro_zone: "Bay Area / Aseana".to_string(),
                transit_connections: vec!["PITX Connector Bus".to_string(), "Aseana Shuttle".to_string(), "Macapagal Blvd Jeeps".to_string()],
            },
            GraphNode {
                id: "pitx".to_string(),
                name: "PITX (Parañaque Integrated Terminal)".to_string(),
                coordinates: [120.9922, 14.5100],
                is_hub: true,
                category: "National South Megaterminal".to_string(),
                description: "Primary transfer terminal connecting Cavite/Batangas express buses to NCR EDSA Carousel & LRT-1 Extension".to_string(),
                metro_zone: "South Gateway".to_string(),
                transit_connections: vec!["Cavite Express Buses".to_string(), "EDSA Carousel Starting Point".to_string(), "LRT-1 Extension".to_string()],
            },
            GraphNode {
                id: "alabang".to_string(),
                name: "Filinvest City / ATC (Alabang)".to_string(),
                coordinates: [121.0422, 14.4234],
                is_hub: true,
                category: "South CBD & SLEX Terminal".to_string(),
                description: "Alabang Town Center, Festival Mall & South Station at SLEX / Skyway terminus".to_string(),
                metro_zone: "Muntinlupa Alabang".to_string(),
                transit_connections: vec!["P2P South Hub".to_string(), "SLEX Provincial Bus".to_string(), "Daang Hari Express".to_string()],
            },

            // Cavite Nodes (South Region)
            GraphNode {
                id: "bacoor".to_string(),
                name: "Bacoor Longos (CAVITEX Entry)".to_string(),
                coordinates: [120.9427, 14.4642],
                is_hub: false,
                category: "Cavite Gateway Tollway".to_string(),
                description: "CAVITEX Northbound entry and Zapote junction".to_string(),
                metro_zone: "Cavite".to_string(),
                transit_connections: vec!["CAVITEX Express Bus".to_string(), "St. Dominic UV".to_string()],
            },
            GraphNode {
                id: "imus".to_string(),
                name: "Imus (Aguinaldo Highway)".to_string(),
                coordinates: [120.9405, 14.4296],
                is_hub: false,
                category: "Central Cavite Corridor".to_string(),
                description: "Aguinaldo Highway junction with Daang Hari bypass to SLEX".to_string(),
                metro_zone: "Cavite".to_string(),
                transit_connections: vec!["Aguinaldo Provincial Bus".to_string(), "PITX Direct Van".to_string()],
            },
            GraphNode {
                id: "gen_trias".to_string(),
                name: "General Trias (Lancaster / Tejero)".to_string(),
                coordinates: [120.8808, 14.3879],
                is_hub: false,
                category: "Cavite Suburban Hub".to_string(),
                description: "Fast-growing residential center connecting via CAVITEX Centennial / Open Canal".to_string(),
                metro_zone: "Cavite".to_string(),
                transit_connections: vec!["Lancaster PITX Bus".to_string(), "Tejero Cavite City Bus".to_string()],
            },
            GraphNode {
                id: "dasmarinas".to_string(),
                name: "Dasmariñas (Pala-Pala / SM Dasma)".to_string(),
                coordinates: [120.9367, 14.3294],
                is_hub: false,
                category: "Cavite University & Transit City".to_string(),
                description: "Major hub along Aguinaldo Hwy and Governor's Drive to SLEX Carmona".to_string(),
                metro_zone: "Cavite".to_string(),
                transit_connections: vec!["Governor's Drive Bus".to_string(), "PITX Express Bus".to_string()],
            },
        ];

        for node in nodes {
            let id = node.id.clone();
            let idx = graph.add_node(node);
            node_indices.insert(id, idx);
        }

        // ---------------------------------------------------------
        // 2. DEFINE EDGES WITH REALISTIC DRIVING & COMMUTE WEIGHTS
        // ---------------------------------------------------------
        // Format: (from_id, to_id, name, dist_km, drive_min, commute_min, bottleneck)
        let edges = vec![
            // Bulacan - NLEX Corridor
            ("malolos", "bocaue", "McArthur Highway / NLEX Tabang", 18.0, 22.0, 30.0, Some("Tabang Tollgate & Guiguinto choke".into())),
            ("bocaue", "balintawak", "NLEX Main Expressway", 16.5, 18.0, 26.0, Some("Balintawak Toll Plaza merge".into())),
            ("bocaue", "mindanao_ave", "NLEX Smart Connect (Segment 8.1)", 15.0, 16.0, 24.0, None),
            ("mindanao_ave", "sm_north", "Mindanao Avenue Expressway Extension", 4.5, 12.0, 18.0, Some("Quirino Hwy / Congressional signal lights".into())),
            ("balintawak", "monumento", "Samson Road / Rizal Ave Extension", 3.2, 10.0, 12.0, Some("Monumento Circle congestion".into())),
            ("balintawak", "sm_north", "EDSA North (Balintawak to North Ave)", 3.8, 11.0, 14.0, Some("MRT-3 Grand Station construction".into())),

            // North EDSA & East QC Connections
            ("sm_north", "qmc", "North Avenue to Quezon Circle", 2.5, 8.0, 12.0, Some("QMC Elliptical Road merge".into())),
            ("qmc", "up_town_center", "University Avenue to Katipunan C5", 3.8, 12.0, 18.0, Some("Katipunan Ateneo/Miriam school rush".into())),
            ("sm_north", "cubao", "EDSA Central (North Ave to Cubao)", 4.6, 18.0, 20.0, Some("EDSA Kamuning flyover & MRT queue".into())),
            ("up_town_center", "eastwood", "Katipunan Avenue to C5 Libis", 5.2, 15.0, 25.0, Some("C5 Libis flyover bottle-neck".into())),
            ("cubao", "eastwood", "Aurora Blvd & C5 Link", 4.0, 16.0, 22.0, Some("Katipunan Aurora junction".into())),
            ("cubao", "ortigas", "EDSA Central (Cubao to Ortigas/Megamall)", 4.2, 16.0, 18.0, Some("Santolan & Annapolis EDSA bottleneck".into())),
            ("eastwood", "ortigas", "C5 Corridor to Ortigas Center", 4.0, 15.0, 22.0, Some("IPI intersection C5".into())),

            // Central to Capital & South CBD
            ("balintawak", "intramuros", "LRT-1 / Rizal Ave to Manila", 8.5, 25.0, 32.0, Some("Avenida & Carriedo narrow avenues".into())),
            ("intramuros", "robinsons_manila", "Roxas Boulevard to Pedro Gil", 2.1, 7.0, 10.0, Some("Luneta Park pedestrian crossings".into())),
            ("ortigas", "bgc", "C5 / Kalayaan Bridge to BGC High Street", 5.0, 18.0, 25.0, Some("Kalayaan / C5 elevated merge".into())),
            ("ortigas", "ayala_makati", "EDSA South (Megamall to One Ayala)", 4.8, 18.0, 20.0, Some("Guadalupe Bridge EDSA choke point".into())),
            ("bgc", "ayala_makati", "McKinley Road / Kalayaan Flyover", 3.0, 12.0, 18.0, Some("McKinley Forbes Park entry checkpoints".into())),
            ("robinsons_manila", "ayala_makati", "Quirino Ave to Buendia / Ayala", 6.5, 22.0, 28.0, Some("Buendia LRT / Osmeña Hwy interchange".into())),
            ("robinsons_manila", "moa", "Roxas Blvd Coastal Road to MOA", 5.5, 16.0, 22.0, Some("Roxas Blvd CCP harbor drive".into())),

            // South EDSA to Bay Area & Airport Corridor
            ("ayala_makati", "moa", "EDSA South Extension to Mall of Asia", 5.8, 18.0, 22.0, Some("EDSA Taft LRT/MRT interchange chaos".into())),
            ("moa", "ayala_manila_bay", "Aseana & Macapagal Boulevard", 1.8, 5.0, 8.0, None),
            ("ayala_manila_bay", "pitx", "Diosdado Macapagal Blvd Extension", 2.0, 5.0, 8.0, None),
            ("moa", "pitx", "Macapagal to PITX Transport Terminal", 3.2, 8.0, 12.0, None),

            // South Gateway & Cavite Corridor (CAVITEX & Aguinaldo Hwy)
            ("pitx", "bacoor", "CAVITEX Express Highway (Pacific Drive)", 7.8, 10.0, 15.0, Some("Bacoor Longos toll barrier".into())),
            ("bacoor", "gen_trias", "CAVITEX Centennial Road / Kawit Bypass", 12.5, 18.0, 28.0, Some("Tejero roundabout & Tanza junction".into())),
            ("bacoor", "imus", "Aguinaldo Highway North", 4.5, 14.0, 22.0, Some("Niog & St. Dominic gridlock".into())),
            ("imus", "dasmarinas", "Aguinaldo Highway South", 10.0, 22.0, 32.0, Some("Salitran & Central Mall pedestrian bottleneck".into())),
            ("gen_trias", "dasmarinas", "Governor's Drive / Open Canal Road", 9.2, 18.0, 26.0, Some("Pala-Pala SM junction".into())),

            // SLEX / Alabang Connections
            ("ayala_makati", "alabang", "Skyway Stage 1/2 to Alabang Filinvest", 18.5, 22.0, 35.0, Some("Magallanes & Bicutan entry ramps".into())),
            ("bgc", "alabang", "C5 / SLEX to Filinvest Alabang", 17.0, 24.0, 38.0, Some("FTI Taguig & Sucat merge".into())),
            ("pitx", "alabang", "Dr. A. Santos (Sucat) / Alabang-Zapote Rd", 13.5, 28.0, 45.0, Some("Alabang-Zapote Road extreme congestion".into())),
            ("imus", "alabang", "Daang Hari Road Express Bypass", 11.0, 16.0, 25.0, Some("Molino Flyover & Evia roundabout".into())),
        ];

        for (u, v, name, dist, drive, commute, bottleneck) in edges {
            let u_idx = *node_indices.get(u).expect("Node u exists");
            let v_idx = *node_indices.get(v).expect("Node v exists");
            let u_coord = graph[u_idx].coordinates;
            let v_coord = graph[v_idx].coordinates;

            graph.add_edge(
                u_idx,
                v_idx,
                GraphEdge {
                    id: format!("{}_{}", u, v),
                    name: name.to_string(),
                    distance_km: dist,
                    driving_time_mins: drive,
                    commute_time_mins: commute,
                    bottleneck,
                    waypoints: vec![u_coord, v_coord],
                },
            );
        }

        Self {
            graph,
            node_indices,
        }
    }

    /// Snap a custom coordinate [lng, lat] to nearest graph node using Haversine distance.
    /// Returns (NodeIndex, distance_km, estimated_feeder_time_mins)
    pub fn snap_coordinate(&self, coord: [f64; 2], mode: TransportMode) -> (NodeIndex, f64, f64) {
        let p_user = Point::new(coord[0], coord[1]);
        let mut best_node = NodeIndex::new(0);
        let mut min_dist_m = f64::MAX;

        for node_idx in self.graph.node_indices() {
            let node_coord = self.graph[node_idx].coordinates;
            let p_node = Point::new(node_coord[0], node_coord[1]);
            let dist_m = p_user.haversine_distance(&p_node);
            if dist_m < min_dist_m {
                min_dist_m = dist_m;
                best_node = node_idx;
            }
        }

        let dist_km = min_dist_m / 1000.0;
        // Estimated feeder speed:
        // Driving: ~30 km/h in suburban/feeder roads
        // Commute: ~18 km/h (tricycle, walking, jeep waiting time) + 5 mins initial buffer
        let feeder_time_mins = match mode {
            TransportMode::Driving => (dist_km / 30.0) * 60.0,
            TransportMode::Commute => (dist_km / 18.0) * 60.0 + 5.0,
        };

        (best_node, dist_km, feeder_time_mins)
    }

    /// Calculate shortest path using Dijkstra algorithm for a specific TransportMode
    pub fn shortest_path(
        &self,
        from: NodeIndex,
        to: NodeIndex,
        mode: TransportMode,
    ) -> (f64, f64, Vec<[f64; 2]>, Vec<String>) {
        if from == to {
            let coord = self.graph[from].coordinates;
            return (0.0, 0.0, vec![coord], vec![]);
        }

        // Run Dijkstra with custom edge weight depending on transport mode
        let res = dijkstra(
            &self.graph,
            from,
            Some(to),
            |edge_ref| {
                let edge = edge_ref.weight();
                match mode {
                    TransportMode::Driving => edge.driving_time_mins,
                    TransportMode::Commute => edge.commute_time_mins,
                }
            },
        );

        let total_time = *res.get(&to).unwrap_or(&180.0);

        // Reconstruct path nodes from target back to start
        let mut current = to;
        let mut path_nodes = vec![current];
        let mut total_dist = 0.0;
        let mut bottlenecks = Vec::new();

        while current != from {
            let mut best_prev = None;
            let mut best_prev_time = f64::MAX;

            for neighbor in self.graph.neighbors(current) {
                if let Some(&neighbor_time) = res.get(&neighbor) {
                    if neighbor_time < best_prev_time {
                        best_prev_time = neighbor_time;
                        best_prev = Some(neighbor);
                    }
                }
            }

            if let Some(prev) = best_prev {
                if let Some(edge_idx) = self.graph.find_edge(prev, current) {
                    let edge = &self.graph[edge_idx];
                    total_dist += edge.distance_km;
                    if let Some(b) = &edge.bottleneck {
                        if !bottlenecks.contains(b) {
                            bottlenecks.push(b.clone());
                        }
                    }
                }
                path_nodes.push(prev);
                current = prev;
            } else {
                break;
            }
        }

        path_nodes.reverse();
        let waypoints: Vec<[f64; 2]> = path_nodes.iter().map(|&idx| self.graph[idx].coordinates).collect();

        (total_time, total_dist, waypoints, bottlenecks)
    }

    /// Return all candidate meetup hubs
    pub fn get_candidate_hubs(&self) -> Vec<CandidateHub> {
        self.graph
            .node_indices()
            .filter(|&idx| self.graph[idx].is_hub)
            .map(|idx| {
                let n = &self.graph[idx];
                CandidateHub {
                    id: n.id.clone(),
                    name: n.name.clone(),
                    coordinates: n.coordinates,
                    category: n.category.clone(),
                    description: n.description.clone(),
                    metro_zone: n.metro_zone.clone(),
                    transit_connections: n.transit_connections.clone(),
                }
            })
            .collect()
    }

    /// Return all network edges geometry for initial background rendering
    pub fn get_all_edges_geometry(&self) -> Vec<Vec<[f64; 2]>> {
        self.graph
            .edge_indices()
            .map(|edge_idx| {
                let edge = &self.graph[edge_idx];
                edge.waypoints.clone()
            })
            .collect()
    }
}
