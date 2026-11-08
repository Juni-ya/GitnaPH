import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { ScatterplotLayer, PathLayer, PolygonLayer } from '@deck.gl/layers';

import {
  CandidateHub,
  CategoryFilter,
  EnginePhase,
  PartialPolyline,
  Participant,
  PoiItem,
  RoadCandidateVerdict,
  TestedCandidateFrame,
  UserRoadRoute,
} from '../types';

interface MapCanvasProps {
  phase: EnginePhase;
  participants: Participant[];
  hubs: CandidateHub[];
  directMidpoint: CandidateHub | null;
  crawlingPolylines: PartialPolyline[];
  currentCandidate: TestedCandidateFrame | null;
  winnerVerdict: RoadCandidateVerdict | null;
  pois: PoiItem[];
  selectedPoi: PoiItem | null;
  onSelectPoi?: (poi: PoiItem) => void;
  categoryFilter?: CategoryFilter;
  activeRoutes?: UserRoadRoute[] | null;
  selectedTargetCoords?: [number, number] | null;
}

// Luzon Philippines Bounding Envelope: [[119.40, 12.40], [124.60, 18.75]]
const LUZON_BOUNDS: [[number, number], [number, number]] = [
  [119.40, 12.40],
  [124.60, 18.75],
];

// STRICT 2D MAP PLANE ONLY: pitch: 0, bearing: 0
const INITIAL_VIEW_STATE = {
  longitude: 121.00,
  latitude: 14.65,
  zoom: 8.8,
  pitch: 0,
  bearing: 0,
  maxPitch: 0,
  minPitch: 0,
  maxZoom: 18,
  minZoom: 6.8,
};

// Inverted mask polygon: dark fill covering area outside Luzon
const LUZON_INVERSE_MASK = [
  {
    polygon: [
      [
        [-180, -90],
        [180, -90],
        [180, 90],
        [-180, 90],
        [-180, -90],
      ],
      [
        [119.40, 12.40],
        [124.60, 12.40],
        [124.60, 18.75],
        [119.40, 18.75],
        [119.40, 12.40],
      ],
    ],
  },
];

function hexToRgba(hex: string, alpha: number = 255): [number, number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 240;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
  return [r, g, b, alpha];
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  phase,
  participants,
  hubs,
  directMidpoint: _directMidpoint,
  crawlingPolylines,
  currentCandidate,
  winnerVerdict,
  pois,
  selectedPoi,
  onSelectPoi,
  categoryFilter = 'all',
  activeRoutes,
  selectedTargetCoords,
}) => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [pulseTime, setPulseTime] = useState(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setPulseTime((prev) => (prev + 0.04) % (Math.PI * 2));
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Smooth 2D camera pan to zoom 14.5 when winner midpoint is determined (Rule 1: STRICT 2D PLANE)
  useEffect(() => {
    if (winnerVerdict) {
      const targetCoords = winnerVerdict.snapped_venue
        ? winnerVerdict.snapped_venue.coordinates
        : winnerVerdict.hub_coords;

      setViewState((prev) => ({
        ...prev,
        longitude: targetCoords[0],
        latitude: targetCoords[1],
        zoom: 14.2,
        pitch: 0,
        bearing: 0,
        transitionDuration: 1600,
      }));
    }
  }, [winnerVerdict]);

  // Smooth 2D pan/zoom when user clicks an alternative zone or venue card (Rule 3)
  useEffect(() => {
    if (selectedTargetCoords) {
      setViewState((prev) => ({
        ...prev,
        longitude: selectedTargetCoords[0],
        latitude: selectedTargetCoords[1],
        zoom: 14.5,
        pitch: 0,
        bearing: 0,
        transitionDuration: 1000,
      }));
    }
  }, [selectedTargetCoords]);

  // Filter POIs by active category filter without re-running calculation
  const filteredPois = useMemo(() => {
    if (categoryFilter === 'all') return pois;
    return pois.filter((p) => p.category === categoryFilter);
  }, [pois, categoryFilter]);

  // Which routes are active on the map: dynamically updated routes or verdict routes
  const currentRenderRoutes = useMemo(() => {
    if (activeRoutes && activeRoutes.length > 0) return activeRoutes;
    if (winnerVerdict && winnerVerdict.user_road_routes.length > 0) return winnerVerdict.user_road_routes;
    return [];
  }, [activeRoutes, winnerVerdict]);

  // Deck.gl 2D Layers (STRICT 2D PLANE ONLY - Zero 3D ArcLayer, Zero 3D Buildings)
  const layers = useMemo(() => {
    const list: any[] = [];

    // 0. Luzon Dark Inverse Mask Polygon (Rule 4)
    list.push(
      new PolygonLayer({
        id: 'luzon-inverse-mask',
        data: LUZON_INVERSE_MASK,
        getPolygon: (d: any) => d.polygon,
        getFillColor: [9, 9, 11, 242], // 95% opacity dark zinc #09090b
        stroked: true,
        getLineColor: [39, 39, 42, 220],
        lineWidthMinPixels: 1,
        pickable: false,
      })
    );

    // 1. Stage 1: Highway Crawl Sliced Polylines (Real OSRM LineStrings)
    if (crawlingPolylines.length > 0 && phase === 'HIGHWAY_CRAWL') {
      list.push(
        new PathLayer({
          id: 'highway-crawl-glow-layer',
          data: crawlingPolylines,
          getPath: (d: PartialPolyline) => d.coordinates,
          getColor: (d: PartialPolyline) => hexToRgba(d.color, 70),
          getWidth: 55,
          widthMinPixels: 4,
          widthMaxPixels: 11,
          pickable: false,
        }),
        new PathLayer({
          id: 'highway-crawl-core-layer',
          data: crawlingPolylines,
          getPath: (d: PartialPolyline) => d.coordinates,
          getColor: (d: PartialPolyline) => hexToRgba(d.color, 255),
          getWidth: 22,
          widthMinPixels: 2.5,
          widthMaxPixels: 5,
          pickable: false,
        })
      );
    }

    // 2. Stage 2: Tested Candidate Road Polylines from each user
    if (currentCandidate && currentCandidate.user_road_routes.length > 0 && phase === 'CANDIDATE_ROAD_TEST') {
      list.push(
        new PathLayer({
          id: 'candidate-tested-roads-glow',
          data: currentCandidate.user_road_routes,
          getPath: (d: UserRoadRoute) => d.coordinates,
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 75),
          getWidth: 50,
          widthMinPixels: 4,
          widthMaxPixels: 9,
          pickable: false,
        }),
        new PathLayer({
          id: 'candidate-tested-roads-core',
          data: currentCandidate.user_road_routes,
          getPath: (d: UserRoadRoute) => d.coordinates,
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 240),
          getWidth: 20,
          widthMinPixels: 2,
          widthMaxPixels: 4,
          pickable: false,
        })
      );

      // Testing pin pulse
      list.push(
        new ScatterplotLayer({
          id: 'tested-hub-pin-pulse',
          data: [currentCandidate],
          getPosition: (d: TestedCandidateFrame) => d.hub_coords,
          getRadius: 550 + Math.sin(pulseTime * 2.5) * 140,
          radiusMinPixels: 12,
          radiusMaxPixels: 24,
          getFillColor: [251, 191, 36, 45],
          stroked: true,
          getLineColor: [251, 191, 36, 220],
          lineWidthMinPixels: 2,
        }),
        new ScatterplotLayer({
          id: 'tested-hub-pin-core',
          data: [currentCandidate],
          getPosition: (d: TestedCandidateFrame) => d.hub_coords,
          getRadius: 160,
          radiusMinPixels: 5,
          radiusMaxPixels: 9,
          getFillColor: [255, 255, 255, 255],
        })
      );
    }

    // 3. Stage 3 & Dynamic Re-Routing: Active Road Routes (OSRM Highway Traces to winning place or selected venue)
    if (currentRenderRoutes.length > 0) {
      list.push(
        new PathLayer({
          id: 'winner-road-routes-glow',
          data: currentRenderRoutes,
          getPath: (d: UserRoadRoute) => d.coordinates,
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 85),
          getWidth: 65,
          widthMinPixels: 5,
          widthMaxPixels: 13,
          pickable: true,
        }),
        new PathLayer({
          id: 'winner-road-routes-core',
          data: currentRenderRoutes,
          getPath: (d: UserRoadRoute) => d.coordinates,
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 255),
          getWidth: 26,
          widthMinPixels: 2.5,
          widthMaxPixels: 5.5,
          pickable: true,
        })
      );
    }

    // 4. Winning Midpoint Beacon with Electric Lime Accent [204, 255, 0] (#CCFF00)
    if (winnerVerdict) {
      const activeMidpointPos = selectedTargetCoords || (winnerVerdict.snapped_venue ? winnerVerdict.snapped_venue.coordinates : winnerVerdict.hub_coords);
      const haloRadius = 700 + Math.sin(pulseTime * 3) * 180;
      list.push(
        new ScatterplotLayer({
          id: 'winner-halo-layer',
          data: [{ coords: activeMidpointPos }],
          getPosition: (d: any) => d.coords,
          getRadius: haloRadius,
          radiusMinPixels: 16,
          radiusMaxPixels: 32,
          getFillColor: [204, 255, 0, 45],
          stroked: true,
          getLineColor: [204, 255, 0, 240],
          lineWidthMinPixels: 3,
        }),
        new ScatterplotLayer({
          id: 'winner-core-layer',
          data: [{ coords: activeMidpointPos }],
          getPosition: (d: any) => d.coords,
          getRadius: 220,
          radiusMinPixels: 7,
          radiusMaxPixels: 12,
          getFillColor: [255, 255, 255, 255],
        })
      );
    }

    // 5. Candidate Hubs Markers
    if (hubs.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: 'candidate-hubs-layer',
          data: hubs,
          getPosition: (d: CandidateHub) => d.coordinates,
          getRadius: 220,
          radiusMinPixels: 5,
          radiusMaxPixels: 8,
          getFillColor: (d: CandidateHub) => {
            if (winnerVerdict && d.id === winnerVerdict.hub_id) return [204, 255, 0, 255];
            if (currentCandidate && d.id === currentCandidate.hub_id) return [251, 191, 36, 255];
            if (d.id === 'direct_road_midpoint') return [244, 63, 94, 240];
            return [113, 113, 122, 190];
          },
          stroked: true,
          getLineColor: [24, 24, 27, 255],
          lineWidthMinPixels: 1.5,
          pickable: true,
        })
      );
    }

    // 6. Real POIs Pins (Cafes, Malls, Parks, Restaurants - REAL API LOOKUP ONLY)
    if (filteredPois.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: 'pois-layer',
          data: filteredPois,
          getPosition: (d: PoiItem) => d.coordinates,
          getRadius: 120,
          radiusMinPixels: 5,
          radiusMaxPixels: 10,
          getFillColor: (d: PoiItem) => {
            if (selectedPoi && d.id === selectedPoi.id) return [204, 255, 0, 255];
            if (d.category === 'cafe') return [245, 158, 11, 230];
            if (d.category === 'mall') return [56, 189, 248, 230];
            if (d.category === 'park') return [16, 185, 129, 230];
            return [244, 63, 94, 230]; // restaurant
          },
          stroked: true,
          getLineColor: [255, 255, 255, 220],
          lineWidthMinPixels: 1.5,
          pickable: true,
          onClick: (info: any) => {
            if (info.object && onSelectPoi) {
              onSelectPoi(info.object as PoiItem);
            }
          },
        })
      );
    }

    // 7. Participant Origin Pins
    if (participants.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: 'participants-beacon-layer',
          data: participants,
          getPosition: (d: Participant) => d.coordinates,
          getRadius: 500 + Math.sin(pulseTime * 2.5) * 100,
          radiusMinPixels: 10,
          radiusMaxPixels: 20,
          getFillColor: (d: Participant) => hexToRgba(d.color, 45),
          stroked: true,
          getLineColor: (d: Participant) => hexToRgba(d.color, 230),
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new ScatterplotLayer({
          id: 'participants-core-layer',
          data: participants,
          getPosition: (d: Participant) => d.coordinates,
          getRadius: 180,
          radiusMinPixels: 5,
          radiusMaxPixels: 8,
          getFillColor: (d: Participant) => hexToRgba(d.color, 255),
        })
      );
    }

    return list;
  }, [
    crawlingPolylines,
    phase,
    currentCandidate,
    currentRenderRoutes,
    winnerVerdict,
    hubs,
    filteredPois,
    selectedPoi,
    selectedTargetCoords,
    onSelectPoi,
    participants,
    pulseTime,
  ]);

  const getTooltip = (info: any) => {
    if (!info.object) return null;
    const obj = info.object;

    const baseStyle =
      'padding: 8px 12px; background: rgba(24, 24, 27, 0.96); border: 1px solid #3f3f46; border-radius: 8px; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #f4f4f5; box-shadow: 0 4px 16px rgba(0,0,0,0.4); line-height: 1.4;';

    // Participant tooltip
    if (obj.name && !obj.category && obj.color) {
      return {
        html: `<div style="${baseStyle}">
          <div style="font-weight: 600; color: ${obj.color};">${obj.name}</div>
          <div style="font-size: 11px; color: #a1a1aa;">Town Center Origin</div>
        </div>`,
      };
    }

    // Candidate Hub tooltip
    if (obj.name && obj.category && !obj.walking_minutes) {
      return {
        html: `<div style="${baseStyle}">
          <div style="font-weight: 600; color: #f4f4f5;">${obj.name}</div>
          <div style="font-size: 11px; color: #a1a1aa;">${obj.category} • ${obj.metro_zone}</div>
          <div style="font-size: 11px; color: #71717a; margin-top: 2px;">${obj.description}</div>
        </div>`,
      };
    }

    // Road Route Tooltip
    if (obj.participant_name && obj.road_time_mins !== undefined) {
      return {
        html: `<div style="${baseStyle}">
          <div style="font-weight: 600; color: ${obj.color};">${obj.participant_name}</div>
          <div style="font-size: 11px; color: #d4d4d8; margin-top: 2px;">
            Drive time: <strong style="font-family: JetBrains Mono, monospace; font-variant-numeric: tabular-nums; color: #fff;">${obj.road_time_mins}</strong> min
            <span style="color: #71717a;">(<span style="font-family: JetBrains Mono, monospace; font-variant-numeric: tabular-nums;">${obj.road_distance_km}</span> km)</span>
          </div>
        </div>`,
      };
    }

    // Real POI Tooltip
    if (obj.category && obj.walking_minutes !== undefined) {
      const catLabel = obj.category.charAt(0).toUpperCase() + obj.category.slice(1);
      const ratingInfo = obj.rating ? ` • <span style="color: #fbbf24;">${obj.rating} stars</span> (${obj.user_rating_count || 0})` : '';
      return {
        html: `<div style="${baseStyle}">
          <div style="font-weight: 600; color: #f4f4f5;">${obj.name}</div>
          <div style="font-size: 11px; color: #a1a1aa;">
            ${catLabel} • <span style="font-family: JetBrains Mono, monospace; font-variant-numeric: tabular-nums; color: #e4e4e7;">${obj.distance_meters || 300}m</span> (<span style="font-family: JetBrains Mono, monospace; font-variant-numeric: tabular-nums; color: #e4e4e7;">${obj.walking_minutes}</span> min walk)${ratingInfo}
          </div>
          ${obj.address ? `<div style="font-size: 11px; color: #71717a; margin-top: 2px;">${obj.address}</div>` : ''}
          ${obj.highlight ? `<div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">${obj.highlight}</div>` : ''}
        </div>`,
      };
    }

    return null;
  };

  return (
    <div className="relative w-full h-full bg-zinc-950">
      <DeckGL
        viewState={viewState as any}
        onViewStateChange={({ viewState: newViewState }: any) => {
          // Strictly lock pitch and bearing to 0 (Rule 1)
          setViewState({
            ...newViewState,
            pitch: 0,
            bearing: 0,
            maxPitch: 0,
            minPitch: 0,
          });
        }}
        controller={{
          doubleClickZoom: false,
          dragRotate: false,
          touchRotate: false,
        }}
        layers={layers}
        getTooltip={getTooltip}
      >
        <Map
          mapLib={maplibregl}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          pitch={0}
          bearing={0}
          maxPitch={0}
          minPitch={0}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          maxBounds={LUZON_BOUNDS}
          minZoom={6.8}
          reuseMaps
        />
      </DeckGL>
    </div>
  );
};
