import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { CalculationWeights, CategoryFilter, Participant, PoiItem, SpotCategory } from './types';
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

  // Pre-selected spot categories on Landing Page
  const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>([
    'cafe',
    'mall',
    'park',
    'restaurant',
  ]);

  // Live filter on Map View ('all', 'cafe', 'mall', 'park', 'restaurant')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const [selectedPoi, setSelectedPoi] = useState<PoiItem | null>(null);

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
    setActiveView('map');
    startCalculation(participants, weights);
  };

  const handleReset = () => {
    setSelectedPoi(null);
    resetCalculation();
  };

  const handleBackToLanding = () => {
    setActiveView('landing');
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
      {/* 1. Deck.gl + MapLibre Fullscreen Luzon Highway Canvas */}
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
          onSelectPoi={(poi) => setSelectedPoi(poi)}
          categoryFilter={categoryFilter}
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
        />
      )}

      {/* 3. View 2: Full-Viewport Luzon Road Tracer Map Elements */}
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

          {/* Floating Verdict Drawer & Nearby Venue Explorer */}
          {verdict && (
            <VerdictDrawer
              verdict={verdict}
              selectedPoiId={selectedPoi ? selectedPoi.id : null}
              onSelectPoi={(poi) => setSelectedPoi(poi)}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
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
