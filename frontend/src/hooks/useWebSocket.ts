import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CalculationWeights,
  CandidateHub,
  EnginePhase,
  FinalRoadVerdictPayload,
  PartialPolyline,
  Participant,
  StreamEvent,
  TestedCandidateFrame,
} from '../types';

export function useWebSocket(url: string = 'ws://localhost:4000/ws/calculate') {
  const [isConnected, setIsConnected] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [phase, setPhase] = useState<EnginePhase>('IDLE');

  // Network & Candidate State
  const [hubs, setHubs] = useState<CandidateHub[]>([]);
  const [directMidpoint, setDirectMidpoint] = useState<CandidateHub | null>(null);

  // Stage 1: Highway Crawl
  const [crawlingPolylines, setCrawlingPolylines] = useState<PartialPolyline[]>([]);
  const [crawlProgress, setCrawlProgress] = useState<number>(0);

  // Stage 2: Road Candidate Testing
  const [currentCandidate, setCurrentCandidate] = useState<TestedCandidateFrame | null>(null);
  const [testHistory, setTestHistory] = useState<TestedCandidateFrame[]>([]);

  // Stage 3: Final Road Verdict
  const [verdict, setVerdict] = useState<FinalRoadVerdictPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Telemetry
  const [fps, setFps] = useState<number>(60);
  const [statusMessage, setStatusMessage] = useState<string>('ROAD ENGINE READY • STANDBY');

  const wsRef = useRef<WebSocket | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setErrorMessage(null);
        setStatusMessage('HIGHWAY TRACER LINK ESTABLISHED • AWAITING TARGETS');
      };

      ws.onmessage = (event) => {
        const now = Date.now();
        const deltaMs = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;
        if (deltaMs > 0) {
          const instantFps = Math.min(60, Math.round(1000 / deltaMs));
          setFps((prev) => Math.round(prev * 0.8 + instantFps * 0.2));
        }

        try {
          const data: StreamEvent = JSON.parse(event.data);

          switch (data.type) {
            case 'INITIAL_CANDIDATES':
              setHubs(data.hubs);
              setDirectMidpoint(data.direct_midpoint);
              setStatusMessage(
                `LOADED ${data.hubs.length} REGIONAL HIGHWAY NEXUSES • DIRECT ROAD PIN SNAPPED`
              );
              break;

            case 'HIGHWAY_CRAWL':
              setPhase('HIGHWAY_CRAWL');
              setCrawlProgress(data.progress_pct);
              setCrawlingPolylines(data.partial_polylines);
              setStatusMessage(data.telemetry_note);
              break;

            case 'CANDIDATE_ROAD_TEST':
              setPhase('CANDIDATE_ROAD_TEST');
              setCurrentCandidate(data);
              setTestHistory((prev) => [...prev, data]);
              setStatusMessage(
                `TESTING ${data.hub_name.toUpperCase()} • FAIRNESS ${data.fairness_score}% • Δ ${data.delta_mins}m [${data.status}]`
              );
              break;

            case 'FINAL_ROAD_VERDICT':
              setPhase('VERDICT');
              setIsCalculating(false);
              setVerdict(data);
              setStatusMessage(
                `TRUE ROAD MIDPOINT LOCKED: ${data.winner.hub_name.toUpperCase()} (FAIRNESS: ${data.winner.fairness_score}%, DISPARITY: ${data.winner.delta_road_mins}m)`
              );
              break;

            case 'ERROR':
              setPhase('ERROR');
              setIsCalculating(false);
              setErrorMessage(data.message);
              setStatusMessage(`ROAD ENGINE ERROR: ${data.message}`);
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        setStatusMessage('OFFLINE • RUST ROAD BACKEND NOT DETECTED (RECONNECTING...)');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = window.setTimeout(connect, 2500);
      };
    } catch {
      setIsConnected(false);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const startCalculation = useCallback(
    (participants: Participant[], weights: CalculationWeights, googleApiKey?: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setErrorMessage('Road Engine WebSocket is currently offline.');
        return;
      }

      setIsCalculating(true);
      setPhase('HIGHWAY_CRAWL');
      setCrawlingPolylines([]);
      setCrawlProgress(0);
      setCurrentCandidate(null);
      setTestHistory([]);
      setVerdict(null);
      setErrorMessage(null);
      setStatusMessage('INITIALIZING TRUE ROAD-PATH TRACER...');

      const payload = {
        action: 'START_CALCULATION',
        participants,
        weights,
        google_api_key: googleApiKey || undefined,
      };

      wsRef.current.send(JSON.stringify(payload));
    },
    []
  );

  const resetCalculation = useCallback(() => {
    setIsCalculating(false);
    setPhase('IDLE');
    setCrawlingPolylines([]);
    setCrawlProgress(0);
    setCurrentCandidate(null);
    setTestHistory([]);
    setVerdict(null);
    setErrorMessage(null);
    setStatusMessage('ROAD ENGINE READY • STANDBY');
  }, []);

  return {
    isConnected,
    isCalculating,
    phase,
    hubs,
    directMidpoint,
    crawlingPolylines,
    crawlProgress,
    currentCandidate,
    testHistory,
    verdict,
    errorMessage,
    fps,
    statusMessage,
    startCalculation,
    resetCalculation,
  };
}
