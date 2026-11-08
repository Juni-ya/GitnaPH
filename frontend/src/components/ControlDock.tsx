import React from 'react';
import {
  Route,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  ChevronLeft,
} from 'lucide-react';
import { CalculationWeights, CategoryFilter, Participant } from '../types';
import { TownAutocomplete } from './TownAutocomplete';

interface ControlDockProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  weights: CalculationWeights;
  setWeights: React.Dispatch<React.SetStateAction<CalculationWeights>>;
  onRunEngine: () => void;
  onReset: () => void;
  onBackToLanding?: () => void;
  isCalculating: boolean;
  isConnected: boolean;
  categoryFilter?: CategoryFilter;
  onCategoryFilterChange?: (filter: CategoryFilter) => void;
}

const PARTICIPANT_COLORS = ['#38bdf8', '#f43f5e', '#fbbf24', '#a855f7', '#34d399', '#f97316'];

export const ControlDock: React.FC<ControlDockProps> = ({
  participants,
  setParticipants,
  weights,
  setWeights,
  onRunEngine,
  onReset,
  onBackToLanding,
  isCalculating,
  isConnected,
}) => {
  const handleUpdateTown = (index: number, townName: string, coords: [number, number]) => {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        name: townName,
        town_name: townName,
        coordinates: coords,
      };
      return next;
    });
  };

  const handleAddParticipant = () => {
    if (participants.length >= 6) return;
    const newIdx = participants.length;
    const color = PARTICIPANT_COLORS[newIdx % PARTICIPANT_COLORS.length];
    setParticipants((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}`,
        name: 'Quezon City',
        town_name: 'Quezon City',
        coordinates: [121.0495, 14.6465],
        color,
      },
    ]);
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 2) return;
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <aside className="absolute top-4 left-4 z-20 w-80 sm:w-88 max-h-[calc(100vh-2rem)] flex flex-col font-sans select-none pointer-events-auto">
      <div className="panel rounded-2xl border border-zinc-800 p-4 shadow-xl flex flex-col gap-4 overflow-y-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          {onBackToLanding ? (
            <button
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition py-1 px-1.5 -ml-1 rounded-lg hover:bg-zinc-800/60 active:scale-[0.98]"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
              <span className="font-medium">Back to Search</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-zinc-300">Luzon Road Midpoint</span>
          )}

          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition active:scale-[0.98]"
            title="Reset calculation"
          >
            <RotateCcw size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Traveler Town Centers List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-300">Traveler Towns</span>
            <span className="text-zinc-500 tabular-nums font-mono text-[11px]">
              {participants.length} locations
            </span>
          </div>

          <div className="space-y-2">
            {participants.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <TownAutocomplete
                    value={p.town_name || p.name}
                    placeholder={`Traveler ${idx + 1}...`}
                    colorDot={p.color}
                    onSelectTown={(name, coords) => handleUpdateTown(idx, name, coords)}
                  />
                </div>

                {participants.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(idx)}
                    className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-rose-400 transition active:scale-[0.98] shrink-0"
                    title="Remove town"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {participants.length < 6 && (
            <button
              type="button"
              onClick={handleAddParticipant}
              className="w-full py-2 px-3 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/60 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={1.75} />
              <span>Add Another Town</span>
            </button>
          )}
        </div>

        {/* Fairness Weight Sliders */}
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Sliders size={14} strokeWidth={1.75} className="text-zinc-400" />
              <span>Fairness Balance</span>
            </span>
            <span className="tabular-nums font-mono text-zinc-400 text-[11px]">
              {Math.round(weights.beta * 100)}% equal
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Fastest aggregate</span>
              <span>Equal driving time</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={weights.beta}
              onChange={(e) => {
                const b = parseFloat(e.target.value);
                setWeights({ alpha: parseFloat((1 - b).toFixed(2)), beta: b });
              }}
              className="w-full accent-lime-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            type="button"
            onClick={onRunEngine}
            disabled={isCalculating || !isConnected}
            className="w-full h-11 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold text-xs transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isCalculating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Tracing Road Network...</span>
              </>
            ) : (
              <>
                <Route size={16} strokeWidth={2} />
                <span>Trace Road Midpoint</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
