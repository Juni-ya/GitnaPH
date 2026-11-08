export interface Participant {
  id: string;
  name: string;
  town_name?: string;
  coordinates: [number, number]; // [lng, lat]
  color: string;
}

export interface CalculationWeights {
  alpha: number; // default 0.45 (shortest road time)
  beta: number;  // default 0.55 (strictest equal drive time)
}

export interface CandidateHub {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  category: string;
  description: string;
  metro_zone: string;
}

export interface PartialPolyline {
  participant_id: string;
  coordinates: [number, number][];
  color: string;
}

export interface UserRoadMetric {
  participant_id: string;
  participant_name: string;
  road_time_mins: number;
  road_distance_km: number;
  color: string;
}

export interface UserRoadRoute {
  participant_id: string;
  participant_name: string;
  coordinates: [number, number][];
  road_time_mins: number;
  road_distance_km: number;
  color: string;
}

export interface RoadCandidateVerdict {
  hub_name: string;
  hub_id: string;
  hub_coords: [number, number];
  user_road_routes: UserRoadRoute[];
  user_metrics: UserRoadMetric[];
  total_road_time_mins: number;
  delta_road_mins: number;
  cost_score: number;
  fairness_score: number;
  status: string;
  reason: string;
  rank: number;
  area_name?: string;
}

export type SpotCategory = 'cafe' | 'mall' | 'park' | 'restaurant';

export interface PoiItem {
  id: string;
  name: string;
  category: SpotCategory;
  coordinates: [number, number];
  distance_meters: number;
  walking_minutes: number;
  address?: string;
  highlight?: string;
}

export interface CategorizedPois {
  cafes: PoiItem[];
  malls: PoiItem[];
  parks: PoiItem[];
  restaurants: PoiItem[];
}

export interface TestedCandidateFrame {
  hub_name: string;
  hub_id: string;
  hub_coords: [number, number];
  user_road_routes: UserRoadRoute[];
  fairness_score: number;
  cost_score: number;
  delta_mins: number;
  road_times_min: number[];
  road_distances_km: number[];
  status: string;
  reason: string;
}

export interface FinalRoadVerdictPayload {
  winner: RoadCandidateVerdict;
  alternatives: RoadCandidateVerdict[];
  pois: CategorizedPois;
  analysis_commentary: string;
  total_calc_time_ms: number;
}

export type StreamEvent =
  | { type: 'INITIAL_CANDIDATES'; hubs: CandidateHub[]; direct_midpoint: CandidateHub | null }
  | { type: 'HIGHWAY_CRAWL'; progress_pct: number; partial_polylines: PartialPolyline[]; telemetry_note: string }
  | ({ type: 'CANDIDATE_ROAD_TEST' } & TestedCandidateFrame)
  | ({ type: 'FINAL_ROAD_VERDICT' } & FinalRoadVerdictPayload)
  | { type: 'ERROR'; message: string };

export type EnginePhase = 'IDLE' | 'HIGHWAY_CRAWL' | 'CANDIDATE_ROAD_TEST' | 'VERDICT' | 'ERROR';

export type CategoryFilter = 'all' | 'cafe' | 'mall' | 'park' | 'restaurant';
