import React, { useState } from 'react';
import {
  Route,
  RotateCcw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Loader2,
} from 'lucide-react';
import { CalculationWeights, Participant } from '../types';
import { PRESET_SCENARIOS, PHILIPPINE_LOCATIONS } from '../presets';

interface ControlDockProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  weights: CalculationWeights;
  setWeights: React.Dispatch<React.SetStateAction<CalculationWeights>>;
  onRunEngine: () => void;
  onReset: () => void;
  isCalculating: boolean;
  isConnected: boolean;
}

const COLOR_PALETTE = ['#38bdf8', '#f43f5e', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];

export const ControlDock: React.FC<ControlDockProps> = ({
  participants,
  setParticipants,
  weights,
  setWeights,
  onRunEngine,
  onReset,
  isCalculating,
  isConnected,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('classic_debate');

  const handleApplyPreset = (presetId: string) => {
    const found = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (found) {
      setActivePresetId(presetId);
      setParticipants(JSON.parse(JSON.stringify(found.participants)));
      setWeights(JSON.parse(JSON.stringify(found.weights)));
    }
  };

  const handleAddParticipant = () => {
    if (participants.length >= 5) return;
    const newIndex = participants.length + 1;
    const color = COLOR_PALETTE[participants.length % COLOR_PALETTE.length];
    const defaultLoc = PHILIPPINE_LOCATIONS[(participants.length * 3) % PHILIPPINE_LOCATIONS.length];

    setParticipants((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}`,
        name: defaultLoc.name,
        coordinates: defaultLoc.coords,
        color,
      },
    ]);
  };

  const handleRemoveParticipant = (id: string) => {
    if (participants.length <= 2) return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleLocationSelect = (id: string, locName: string) => {
    const found = PHILIPPINE_LOCATIONS.find((l) => l.name === locName);
    if (found) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name: found.name,
                coordinates: found.coords,
              }
            : p
        )
      );
    }
  };

  return (
    <aside
      className={`absolute left-4 top-4 z-20 w-80 sm:w-88 transition-all duration-200 pointer-events-auto ${
        isCollapsed ? 'h-14 overflow-hidden' : 'max-h-[calc(100vh-32px)] flex flex-col'
      }`}
    >
      <div className="panel rounded-2xl flex flex-col max-h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-100">
              <Route size={16} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">Gitna</h1>
              <p className="text-xs text-zinc-400">Road Midpoint Finder</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition"
            aria-label="Toggle panel collapse"
          >
            {isCollapsed ? <ChevronDown size={16} strokeWidth={1.75} /> : <ChevronUp size={16} strokeWidth={1.75} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-4 space-y-5 overflow-y-auto flex-1">
            {/* Presets */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400">Quick Presets</span>
              <div className="space-y-1.5">
                {PRESET_SCENARIOS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${
                        isSelected
                          ? 'bg-zinc-800/90 border-zinc-700 text-zinc-100'
                          : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="font-medium text-zinc-100 text-balance">{preset.title}</div>
                      <div className="text-xs text-zinc-400 text-pretty mt-0.5">{preset.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starting Points */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">
                  Starting Points ({participants.length})
                </span>
                {participants.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="text-xs font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 transition"
                  >
                    <Plus size={14} strokeWidth={1.75} /> Add Point
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParticipants((prev) =>
                              prev.map((item) => (item.id === p.id ? { ...item, name: val } : item))
                            );
                          }}
                          className="bg-transparent text-xs font-medium text-zinc-100 border-b border-transparent hover:border-zinc-700 focus:border-zinc-400 focus:outline-none truncate w-full"
                          aria-label="Participant name"
                        />
                      </div>

                      {participants.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.id)}
                          className="text-zinc-500 hover:text-rose-400 p-0.5 transition"
                          title="Remove traveler"
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} strokeWidth={1.75} className="text-zinc-500 shrink-0" />
                      <select
                        onChange={(e) => handleLocationSelect(p.id, e.target.value)}
                        value={p.name}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 truncate"
                      >
                        {PHILIPPINE_LOCATIONS.map((loc) => (
                          <option key={loc.name} value={loc.name}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fairness vs Shortest Drive Slider */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300">Fairness Balance</span>
                <span className="tabular-nums font-mono text-zinc-100">
                  {Math.round(weights.beta * 100)}% equal drive
                </span>
              </div>

              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.05"
                value={weights.beta}
                onChange={(e) => {
                  const betaVal = parseFloat(e.target.value);
                  setWeights({
                    alpha: +(1.0 - betaVal).toFixed(2),
                    beta: +betaVal.toFixed(2),
                  });
                }}
                className="w-full accent-lime-400 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Fastest drive</span>
                <span>Equal travel times</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onRunEngine}
                disabled={isCalculating || !isConnected}
                className="h-11 w-full rounded-xl font-medium text-sm bg-lime-400 hover:bg-lime-300 text-zinc-950 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {isCalculating ? (
                  <>
                    <Loader2 size={16} strokeWidth={1.75} className="animate-spin text-zinc-950" />
                    <span>Tracing road paths...</span>
                  </>
                ) : (
                  <>
                    <Route size={16} strokeWidth={1.75} />
                    <span>Trace Road Midpoint</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onReset}
                className="h-9 w-full rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <RotateCcw size={14} strokeWidth={1.75} />
                <span>Reset Map</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
