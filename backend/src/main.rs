use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::mpsc;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod algorithm;
mod models;
mod osrm;
mod poi;

use algorithm::run_true_road_engine;
use models::{CalculationRequest, CandidateHub, StreamEvent};
use osrm::OsrmClient;
use poi::PoiService;

#[derive(Clone)]
struct AppState {
    osrm_client: Arc<OsrmClient>,
    poi_service: Arc<PoiService>,
}

#[derive(Deserialize)]
struct GeocodeQuery {
    q: String,
}

#[derive(Serialize, Deserialize)]
struct GeocodeResult {
    name: String,
    display_name: String,
    lat: f64,
    lon: f64,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "gitna_backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Initializing Gitna True Road-Pathing & OSRM Engine...");
    let osrm_client = Arc::new(OsrmClient::new());
    let poi_service = Arc::new(PoiService::new());

    let state = AppState {
        osrm_client,
        poi_service,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health_handler))
        .route("/api/hubs", get(get_hubs_handler))
        .route("/api/presets", get(get_presets_handler))
        .route("/api/geocode", get(geocode_handler))
        .route("/ws/calculate", get(ws_calculate_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 4000));
    info!("🚀 Gitna V2 True Road Engine listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind TCP listener on port 4000");

    axum::serve(listener, app)
        .await
        .expect("Server encountered an error while running");
}

async fn health_handler() -> impl IntoResponse {
    Json(json!({
        "status": "online",
        "service": "Gitna True Road-Path Midpoint Engine (V2)",
        "version": "2.0.0",
        "routing_engine": "OSRM Routing Engine + Overpass API",
        "unified_mode": "Real Road Highway Network (100% GeoJSON Polylines)",
    }))
}

async fn get_hubs_handler() -> Json<Vec<CandidateHub>> {
    Json(vec![
        CandidateHub {
            id: "sm_north".to_string(),
            name: "SM North EDSA / TriNoma".to_string(),
            coordinates: [121.0333, 14.6538],
            category: "North Road Nexus".to_string(),
            description: "NLEX Mindanao Ave & EDSA North junction".to_string(),
            metro_zone: "North EDSA".to_string(),
        },
        CandidateHub {
            id: "quezon_ave".to_string(),
            name: "EDSA Quezon Avenue".to_string(),
            coordinates: [121.0400, 14.6420],
            category: "Quezon City Central".to_string(),
            description: "EDSA & Quezon Ave flyover interchange".to_string(),
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
            description: "C5 highway arterial & Kalayaan elevated flyover access".to_string(),
            metro_zone: "Taguig BGC".to_string(),
        },
        CandidateHub {
            id: "ayala_makati".to_string(),
            name: "Ayala Center / One Ayala (Makati)".to_string(),
            coordinates: [121.0286, 14.5503],
            category: "Premier Intermodal CBD".to_string(),
            description: "Skyway Stage 3 / Osmeña Highway & EDSA South nexus".to_string(),
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
            name: "SM Mall of Asia (MOA Bay Area)".to_string(),
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
            metro_zone: "Aseana / Parañaque".to_string(),
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
            id: "intramuros".to_string(),
            name: "Intramuros / Rizal Park".to_string(),
            coordinates: [120.9762, 14.5878],
            category: "Historic Capital Nexus".to_string(),
            description: "Roxas Boulevard & Bonifacio Drive coastal corridor".to_string(),
            metro_zone: "City of Manila".to_string(),
        },
    ])
}

async fn get_presets_handler() -> impl IntoResponse {
    Json(json!([
        {
            "id": "classic_debate",
            "name": "Classic Debate: Malolos vs. Gen Tri Cavite",
            "description": "Person A in Malolos, Bulacan vs Person B in Gen Trias, Cavite arguing between SM North and Mall of Asia.",
            "participants": [
                {
                    "id": "user_bulacan",
                    "name": "Person A (Malolos, Bulacan)",
                    "coordinates": [120.8113, 14.8527],
                    "color": "#00f0ff"
                },
                {
                    "id": "user_cavite",
                    "name": "Person B (Gen. Trias, Cavite)",
                    "coordinates": [120.8808, 14.3879],
                    "color": "#ff007f"
                }
            ],
            "weights": {
                "alpha": 0.45,
                "beta": 0.55
            }
        },
        {
            "id": "tri_corridor_meetup",
            "name": "Tri-Corridor Meetup: Bulacan + Cavite + Rizal",
            "description": "North (Bocaue), South (Bacoor), and East (Antipolo/C5 Libis) highway convergence.",
            "participants": [
                {
                    "id": "user_bulacan",
                    "name": "North (Bocaue, Bulacan)",
                    "coordinates": [120.9482, 14.7736],
                    "color": "#00f0ff"
                },
                {
                    "id": "user_cavite",
                    "name": "South (Bacoor, Cavite)",
                    "coordinates": [120.9427, 14.4642],
                    "color": "#ff007f"
                },
                {
                    "id": "user_rizal",
                    "name": "East (Eastwood / C5 Libis)",
                    "coordinates": [121.0805, 14.6094],
                    "color": "#ffb800"
                }
            ],
            "weights": {
                "alpha": 0.40,
                "beta": 0.60
            }
        }
    ]))
}

async fn geocode_handler(Query(query): Query<GeocodeQuery>) -> impl IntoResponse {
    let client = reqwest::Client::builder()
        .user_agent("GitnaRoadEngine/2.0 (contact@gitna.ph)")
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let url = format!(
        "https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&limit=5&q={}",
        urlencoding(&query.q)
    );

    match client.get(&url).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                if let Ok(json_val) = resp.json::<serde_json::Value>().await {
                    let mut results = Vec::new();
                    if let Some(arr) = json_val.as_array() {
                        for item in arr {
                            if let (Some(name), Some(display), Some(lat_str), Some(lon_str)) = (
                                item["name"].as_str().or(item["display_name"].as_str()),
                                item["display_name"].as_str(),
                                item["lat"].as_str(),
                                item["lon"].as_str(),
                            ) {
                                if let (Ok(lat), Ok(lon)) = (lat_str.parse::<f64>(), lon_str.parse::<f64>()) {
                                    results.push(GeocodeResult {
                                        name: name.to_string(),
                                        display_name: display.to_string(),
                                        lat,
                                        lon,
                                    });
                                }
                            }
                        }
                    }
                    return Json(json!({ "results": results })).into_response();
                }
            }
            Json(json!({ "results": [] })).into_response()
        }
        Err(_) => Json(json!({ "results": [] })).into_response(),
    }
}

fn urlencoding(s: &str) -> String {
    let mut encoded = String::new();
    for b in s.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            b' ' => encoded.push_str("%20"),
            _ => encoded.push_str(&format!("%{:02X}", b)),
        }
    }
    encoded
}

async fn ws_calculate_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_ws_socket(socket, state))
}

async fn handle_ws_socket(socket: WebSocket, state: AppState) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    while let Some(msg_result) = ws_receiver.next().await {
        match msg_result {
            Ok(Message::Text(text)) => {
                info!("Received WS calculate text payload: {}", text);
                match serde_json::from_str::<CalculationRequest>(&text) {
                    Ok(req) => {
                        if req.action == "START_CALCULATION" {
                            let (tx, mut rx) = mpsc::channel::<StreamEvent>(32);
                            let osrm_clone = state.osrm_client.clone();
                            let poi_service_clone = state.poi_service.clone();
                            let participants = req.participants;
                            let weights = req.weights.unwrap_or_default();

                            // Spawn the computation engine task
                            tokio::spawn(async move {
                                run_true_road_engine(
                                    &osrm_clone,
                                    &poi_service_clone,
                                    participants,
                                    weights,
                                    tx,
                                )
                                .await;
                            });

                            // Stream events to WebSocket client
                            while let Some(event) = rx.recv().await {
                                if let Ok(json_str) = serde_json::to_string(&event) {
                                    if ws_sender.send(Message::Text(json_str)).await.is_err() {
                                        error!("Client disconnected during streaming");
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to parse calculation request: {}", e);
                        let err_event = StreamEvent::Error {
                            message: format!("Invalid calculation payload: {}", e),
                        };
                        if let Ok(err_str) = serde_json::to_string(&err_event) {
                            let _ = ws_sender.send(Message::Text(err_str)).await;
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => {
                info!("WebSocket client initiated close");
                break;
            }
            Err(e) => {
                error!("WebSocket receiver error: {}", e);
                break;
            }
            _ => {}
        }
    }
}
