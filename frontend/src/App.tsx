import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import {
  CalculationWeights,
  CategoryFilter,
  Participant,
  PoiItem,
  RoadCandidateVerdict,
  RouteToPointResponse,
  SpotCategory,
  UserRoadMetric,
  UserRoadRoute,
} from './types';
import { MapCanvas } from './components/MapCanvas';
import { TelemetryBanner } from './components/TelemetryBanner';
import { ControlDock } from './components/ControlDock';
import { VerdictDrawer } from './components/VerdictDrawer';
import { LandingPage } from './components/LandingPage';

export const App: React.FC = () => {
  // View mode: 'landing' (initial search setup) or 'map' (live road trace canvas)
  const [activeView, setActiveView] = useState<'landing' | 'map'>('landing');

  // Default participants: Bulacan vs Cavite
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'user_malolos',
      name: 'Malolos City',
      town_name: 'Malolos City, Bulacan',
      coordinates: [120.8113, 14.8527],
      color: '#38bdf8',
    },
    {
      id: 'user_gentri',
      name: 'General Trias City',
      town_name: 'General Trias, Cavite',
      coordinates: [120.8808, 14.3879],
      color: '#f43f5e',
    },
  ]);

  const [weights, setWeights] = useState<CalculationWeights>({
    alpha: 0.45,
    beta: 0.55,
  });

  // Optional Google Places API key
  const [googleApiKey, setGoogleApiKey] = useState<string>('');

  // Pre-selected spot categories on Landing Page
  const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>([
    'cafe',
    'mall',
    'park',
    'restaurant',
  ]);

  // Live filter on Map View ('all', 'cafe', 'mall', 'park', 'restaurant')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Interactive Alternative & Venue Sync State (Rule 3)
  const [selectedPoi, setSelectedPoi] = useState<PoiItem | null>(null);
  const [selectedTargetCoords, setSelectedTargetCoords] = useState<[number, number] | null>(null);
  const [activeRoutes, setActiveRoutes] = useState<UserRoadRoute[] | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<UserRoadMetric[] | null>(null);
  const [activeDeltaMins, setActiveDeltaMins] = useState<number | null>(null);
  const [activeFairnessScore, setActiveFairnessScore] = useState<number | null>(null);
  const [activeTargetName, setActiveTargetName] = useState<string | null>(null);
  const [_isReRouting, setIsReRouting] = useState(false);

  const {
    isConnected,
    isCalculating,
    phase,
    hubs,
    directMidpoint,
    crawlingPolylines,
    crawlProgress,
    currentCandidate,
    verdict,
    errorMessage,
    fps,
    statusMessage,
    startCalculation,
    resetCalculation,
  } = useWebSocket();

  const handleLaunchCalculation = () => {
    setSelectedPoi(null);
    setSelectedTargetCoords(null);
    setActiveRoutes(null);
    setActiveMetrics(null);
    setActiveDeltaMins(null);
    setActiveFairnessScore(null);
    setActiveTargetName(null);
    setActiveView('map');
    startCalculation(participants, weights, googleApiKey);
  };

  const handleReset = () => {
    setSelectedPoi(null);
    setSelectedTargetCoords(null);
    setActiveRoutes(null);
    setActiveMetrics(null);
    setActiveDeltaMins(null);
    setActiveFairnessScore(null);
    setActiveTargetName(null);
    resetCalculation();
  };

  const handleBackToLanding = () => {
    setActiveView('landing');
  };

  // Rule 3: Dynamic Re-routing when clicking an Alternative Midpoint Zone or Venue Card
  const handleSelectTarget = async (
    targetName: string,
    targetCoords: [number, number],
    venue?: PoiItem | null
  ) => {
    setSelectedTargetCoords(targetCoords);
    setSelectedPoi(venue || null);
    setActiveTargetName(targetName);

    try {
      setIsReRouting(true);
      const res = await fetch('http://localhost:4000/api/route-to-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_name: targetName,
          target_coords: targetCoords,
          participants,
        }),
      });

      if (res.ok) {
        const data: RouteToPointResponse = await res.json();
        setActiveRoutes(data.user_road_routes);
        setActiveMetrics(data.user_metrics);
        setActiveDeltaMins(data.delta_road_mins);
        setActiveFairnessScore(data.fairness_score);
      }
    } catch (err) {
      console.error('Failed to dynamically re-route to selected target', err);
    } finally {
      setIsReRouting(false);
    }
  };

  const handleSelectAlternativeHub = (hub: RoadCandidateVerdict) => {
    handleSelectTarget(hub.hub_name, hub.hub_coords, null);
  };

  const handleSelectVenue = (poi: PoiItem) => {
    handleSelectTarget(poi.name, poi.coordinates, poi);
  };

  const allPois: PoiItem[] = verdict
    ? [
        ...(verdict.pois.cafes || []),
        ...(verdict.pois.malls || []),
        ...(verdict.pois.parks || []),
        ...(verdict.pois.restaurants || []),
      ]
    : [];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none">
      {/* 1. Deck.gl + MapLibre Fullscreen 2D Luzon Highway Canvas (Rule 1: Strictly 2D) */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${activeView === 'landing' ? 'opacity-40 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
        <MapCanvas
          phase={phase}
          participants={participants}
          hubs={hubs}
          directMidpoint={directMidpoint}
          crawlingPolylines={crawlingPolylines}
          currentCandidate={currentCandidate}
          winnerVerdict={verdict ? verdict.winner : null}
          pois={allPois}
          selectedPoi={selectedPoi}
          onSelectPoi={handleSelectVenue}
          categoryFilter={categoryFilter}
          activeRoutes={activeRoutes}
          selectedTargetCoords={selectedTargetCoords}
        />
      </div>

      {/* 2. View 1: The Landing Page (Initial Setup Screen) */}
      {activeView === 'landing' && (
        <LandingPage
          participants={participants}
          setParticipants={setParticipants}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          onSubmit={handleLaunchCalculation}
          isCalculating={isCalculating}
          googleApiKey={googleApiKey}
          setGoogleApiKey={setGoogleApiKey}
        />
      )}

      {/* 3. View 2: Full-Viewport 2D Luzon Road Tracer Map Elements */}
      {activeView === 'map' && (
        <>
          {/* Top-Center Live Telemetry Indicator */}
          <TelemetryBanner
            isConnected={isConnected}
            phase={phase}
            statusMessage={statusMessage}
            currentCandidate={currentCandidate}
            crawlProgress={crawlProgress}
            fps={fps}
          />

          {/* Floating Left Control Sidebar */}
          <ControlDock
            participants={participants}
            setParticipants={setParticipants}
            weights={weights}
            setWeights={setWeights}
            onRunEngine={handleLaunchCalculation}
            onReset={handleReset}
            onBackToLanding={handleBackToLanding}
            isCalculating={isCalculating}
            isConnected={isConnected}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
          />

          {/* Floating Verdict Drawer & Real Radius Venue Explorer */}
          {verdict && (
            <VerdictDrawer
              verdict={verdict}
              selectedPoiId={selectedPoi ? selectedPoi.id : null}
              onSelectPoi={handleSelectVenue}
              onSelectAlternative={handleSelectAlternativeHub}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              activeMetrics={activeMetrics}
              activeDeltaMins={activeDeltaMins}
              activeFairnessScore={activeFairnessScore}
              activeTargetName={activeTargetName}
            />
          )}
        </>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl panel border border-zinc-800 bg-zinc-900/95 text-zinc-200 text-xs font-sans shadow-xl flex items-center gap-2">
          <AlertCircle size={16} strokeWidth={1.75} className="text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </main>
  );
};

export default App;
