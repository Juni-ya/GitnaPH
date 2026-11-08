import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';

import {
  CandidateHub,
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
}

const INITIAL_VIEW_STATE = {
  longitude: 120.985,
  latitude: 14.58,
  zoom: 10.4,
  pitch: 36,
  bearing: -6,
  maxZoom: 18,
  minZoom: 8,
};

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
  directMidpoint,
  crawlingPolylines,
  currentCandidate,
  winnerVerdict,
  pois,
  selectedPoi,
  onSelectPoi,
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

  // Smooth camera flyTo when winner is determined
  useEffect(() => {
    if (winnerVerdict) {
      setViewState((prev) => ({
        ...prev,
        longitude: winnerVerdict.hub_coords[0],
        latitude: winnerVerdict.hub_coords[1],
        zoom: 12.2,
        pitch: 42,
        transitionDuration: 1800,
      }));
    }
  }, [winnerVerdict]);

  // Deck.gl Layers (STRICTLY REAL ROAD PATHS - ZERO STRAIGHT LINES)
  const layers = useMemo(() => {
    const list: any[] = [];

    // 1. Stage 1: Highway Crawl Sliced Polylines (Real OSRM LineStrings)
    if (crawlingPolylines.length > 0 && phase === 'HIGHWAY_CRAWL') {
      list.push(
        new PathLayer({
          id: 'highway-crawl-glow-layer',
          data: crawlingPolylines,
          getPath: (d: PartialPolyline) => d.coordinates,
          getColor: (d: PartialPolyline) => hexToRgba(d.color, 70),
          getWidth: 60,
          widthMinPixels: 5,
          widthMaxPixels: 12,
          pickable: false,
        }),
        new PathLayer({
          id: 'highway-crawl-core-layer',
          data: crawlingPolylines,
          getPath: (d: PartialPolyline) => d.coordinates,
          getColor: (d: PartialPolyline) => hexToRgba(d.color, 255),
          getWidth: 24,
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
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 80),
          getWidth: 55,
          widthMinPixels: 4,
          widthMaxPixels: 10,
          pickable: false,
        }),
        new PathLayer({
          id: 'candidate-tested-roads-core',
          data: currentCandidate.user_road_routes,
          getPath: (d: UserRoadRoute) => d.coordinates,
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 240),
          getWidth: 22,
          widthMinPixels: 2,
          widthMaxPixels: 4.5,
          pickable: false,
        })
      );

      // Dynamic pin on candidate currently being tested
      list.push(
        new ScatterplotLayer({
          id: 'tested-hub-pin-pulse',
          data: [currentCandidate],
          getPosition: (d: TestedCandidateFrame) => d.hub_coords,
          getRadius: 600 + Math.sin(pulseTime * 2.5) * 150,
          radiusMinPixels: 12,
          radiusMaxPixels: 24,
          getFillColor: [251, 191, 36, 50],
          stroked: true,
          getLineColor: [251, 191, 36, 230],
          lineWidthMinPixels: 2.5,
        }),
        new ScatterplotLayer({
          id: 'tested-hub-pin-core',
          data: [currentCandidate],
          getPosition: (d: TestedCandidateFrame) => d.hub_coords,
          getRadius: 180,
          radiusMinPixels: 5,
          radiusMaxPixels: 9,
          getFillColor: [255, 255, 255, 255],
        })
      );
    }

    // 3. Stage 3: Final Winner Road Polylines (OSRM Highway Traces)
    if (winnerVerdict && winnerVerdict.user_road_routes.length > 0) {
      list.push(
        new PathLayer({
          id: 'winner-road-routes-glow',
          data: winnerVerdict.user_road_routes,
          getPath: (d: UserRoadRoute) => d.coordinates,
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 90),
          getWidth: 70,
          widthMinPixels: 5,
          widthMaxPixels: 14,
          pickable: true,
        }),
        new PathLayer({
          id: 'winner-road-routes-core',
          data: winnerVerdict.user_road_routes,
          getPath: (d: UserRoadRoute) => d.coordinates,
          getColor: (d: UserRoadRoute) => hexToRgba(d.color, 255),
          getWidth: 28,
          widthMinPixels: 2.5,
          widthMaxPixels: 6,
          pickable: true,
        })
      );

      // Winner Beacon with Electric Lime Accent [204, 255, 0] (#CCFF00)
      const haloRadius = 750 + Math.sin(pulseTime * 3) * 200;
      list.push(
        new ScatterplotLayer({
          id: 'winner-halo-layer',
          data: [winnerVerdict],
          getPosition: (d: RoadCandidateVerdict) => d.hub_coords,
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
          data: [winnerVerdict],
          getPosition: (d: RoadCandidateVerdict) => d.hub_coords,
          getRadius: 240,
          radiusMinPixels: 7,
          radiusMaxPixels: 12,
          getFillColor: [255, 255, 255, 255],
        })
      );
    }

    // 4. Candidate Hubs Markers (including Direct Highway Midpoint Pin)
    if (hubs.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: 'candidate-hubs-layer',
          data: hubs,
          getPosition: (d: CandidateHub) => d.coordinates,
          getRadius: 240,
          radiusMinPixels: 5,
          radiusMaxPixels: 8,
          getFillColor: (d: CandidateHub) => {
            if (winnerVerdict && d.id === winnerVerdict.hub_id) return [204, 255, 0, 255];
            if (currentCandidate && d.id === currentCandidate.hub_id) return [251, 191, 36, 255];
            if (d.id === 'direct_road_midpoint') return [244, 63, 94, 240];
            return [113, 113, 122, 200];
          },
          stroked: true,
          getLineColor: [24, 24, 27, 255],
          lineWidthMinPixels: 2,
          pickable: true,
        })
      );
    }

    // 5. POIs Pins (Cafes, Parks, Malls) near winning road coordinate
    if (pois.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: 'pois-layer',
          data: pois,
          getPosition: (d: PoiItem) => d.coordinates,
          getRadius: 130,
          radiusMinPixels: 4,
          radiusMaxPixels: 8,
          getFillColor: (d: PoiItem) => {
            if (selectedPoi && d.id === selectedPoi.id) return [204, 255, 0, 255];
            if (d.category === 'cafe') return [245, 158, 11, 220];
            if (d.category === 'park') return [16, 185, 129, 220];
            return [56, 189, 248, 220];
          },
          stroked: true,
          getLineColor: [255, 255, 255, 200],
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

    // 6. Participant Origin Beacons
    if (participants.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: 'participants-beacon-layer',
          data: participants,
          getPosition: (d: Participant) => d.coordinates,
          getRadius: 550 + Math.sin(pulseTime * 2.5) * 120,
          radiusMinPixels: 10,
          radiusMaxPixels: 20,
          getFillColor: (d: Participant) => hexToRgba(d.color, 50),
          stroked: true,
          getLineColor: (d: Participant) => hexToRgba(d.color, 230),
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new ScatterplotLayer({
          id: 'participants-core-layer',
          data: participants,
          getPosition: (d: Participant) => d.coordinates,
          getRadius: 200,
          radiusMinPixels: 5,
          radiusMaxPixels: 9,
          getFillColor: (d: Participant) => hexToRgba(d.color, 255),
        })
      );
    }

    return list;
  }, [
    crawlingPolylines,
    phase,
    currentCandidate,
    winnerVerdict,
    hubs,
    pois,
    selectedPoi,
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
    if (obj.name && !obj.category) {
      return {
        html: `<div style="${baseStyle}">
          <div style="font-weight: 600; color: ${obj.color};">${obj.name}</div>
          <div style="font-size: 11px; color: #a1a1aa;">Origin point</div>
        </div>`,
      };
    }

    // Candidate Hub tooltip
    if (obj.name && obj.category) {
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

    // POI tooltip
    if (obj.category && obj.walking_minutes !== undefined) {
      return {
        html: `<div style="${baseStyle}">
          <div style="font-weight: 600; color: #f4f4f5;">${obj.name}</div>
          <div style="font-size: 11px; color: #a1a1aa;">
            ${obj.category} • <span style="font-family: JetBrains Mono, monospace; font-variant-numeric: tabular-nums; color: #e4e4e7;">${obj.walking_minutes}</span> min walk
          </div>
          ${obj.highlight ? `<div style="font-size: 11px; color: #71717a; margin-top: 2px;">${obj.highlight}</div>` : ''}
        </div>`,
      };
    }

    return null;
  };

  return (
    <div className="relative w-full h-full bg-zinc-950">
      <DeckGL
        viewState={viewState as any}
        onViewStateChange={({ viewState: newViewState }: any) => setViewState(newViewState)}
        controller={{ doubleClickZoom: false, dragRotate: true }}
        layers={layers}
        getTooltip={getTooltip}
      >
        <Map
          mapLib={maplibregl}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
        />
      </DeckGL>
    </div>
  );
};
