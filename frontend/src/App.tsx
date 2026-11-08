import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { PRESET_SCENARIOS } from './presets';
import { CalculationWeights, Participant, PoiItem } from './types';
import { MapCanvas } from './components/MapCanvas';
import { TelemetryBanner } from './components/TelemetryBanner';
import { ControlDock } from './components/ControlDock';
import { VerdictDrawer } from './components/VerdictDrawer';

export const App: React.FC = () => {
  const defaultPreset = PRESET_SCENARIOS[0]; // Bulacan vs Cavite
  const [participants, setParticipants] = useState<Participant[]>(
    JSON.parse(JSON.stringify(defaultPreset.participants))
  );
  const [weights, setWeights] = useState<CalculationWeights>(
    JSON.parse(JSON.stringify(defaultPreset.weights))
  );
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

  const handleRunEngine = () => {
    setSelectedPoi(null);
    startCalculation(participants, weights);
  };

  const handleReset = () => {
    setSelectedPoi(null);
    resetCalculation();
  };

  const allPois = verdict
    ? [...verdict.pois.cafes, ...verdict.pois.parks, ...verdict.pois.malls]
    : [];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none">
      {/* 1. Deck.gl + MapLibre Fullscreen Highway Canvas */}
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
      />

      {/* 2. Top-Center Live Telemetry Indicator */}
      <TelemetryBanner
        isConnected={isConnected}
        phase={phase}
        statusMessage={statusMessage}
        currentCandidate={currentCandidate}
        crawlProgress={crawlProgress}
        fps={fps}
      />

      {/* 3. Floating Left Control Panel */}
      <ControlDock
        participants={participants}
        setParticipants={setParticipants}
        weights={weights}
        setWeights={setWeights}
        onRunEngine={handleRunEngine}
        onReset={handleReset}
        isCalculating={isCalculating}
        isConnected={isConnected}
      />

      {/* 4. Floating Verdict Drawer */}
      {verdict && (
        <VerdictDrawer
          verdict={verdict}
          selectedPoiId={selectedPoi ? selectedPoi.id : null}
          onSelectPoi={(poi) => setSelectedPoi(poi)}
        />
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
