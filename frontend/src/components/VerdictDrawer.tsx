import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Award,
  ChevronDown,
  ChevronUp,
  MapPin,
  Share2,
  Check,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FinalRoadVerdictPayload, PoiItem } from '../types';
import { VenueExplorer } from './VenueExplorer';

interface VerdictDrawerProps {
  verdict: FinalRoadVerdictPayload | null;
  onSelectPoi?: (poi: PoiItem) => void;
  selectedPoiId?: string | null;
}

export const VerdictDrawer: React.FC<VerdictDrawerProps> = ({
  verdict,
  onSelectPoi,
  selectedPoiId,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedHubIndex, setSelectedHubIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (verdict) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#ccff00', '#38bdf8', '#f43f5e', '#ffffff'],
        });
      } catch {
        // Safe fallback if canvas is unavailable
      }
    }
  }, [verdict]);

  if (!verdict) return null;

  const currentHubVerdict =
    selectedHubIndex === 0
      ? verdict.winner
      : verdict.alternatives[selectedHubIndex - 1] || verdict.winner;

  const maxRoadTime = Math.max(
    ...currentHubVerdict.user_metrics.map((ut) => ut.road_time_mins),
    1
  );

  const handleShare = () => {
    const text = `Gitna Road Midpoint: ${verdict.winner.hub_name} (Fairness: ${verdict.winner.fairness_score}%, Travel Disparity: ${verdict.winner.delta_road_mins} min). Calculated using real road network.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute bottom-4 right-4 z-20 w-[94vw] sm:w-[500px] pointer-events-auto font-sans"
      >
        <div className="panel rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col max-h-[85vh]">
          {/* Drawer Header */}
          <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/30 flex items-center justify-center shrink-0">
                <Trophy size={16} strokeWidth={1.75} className="text-lime-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-baseline gap-2 truncate">
                  <span className="truncate">{currentHubVerdict.hub_name}</span>
                  <span className="shrink-0 text-xs px-2 py-0.5 rounded-md bg-lime-400/10 border border-lime-400/30 text-lime-400 font-medium">
                    <span className="tabular-nums font-mono">{currentHubVerdict.fairness_score}%</span> fair
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 truncate">
                  {selectedHubIndex === 0 ? 'Optimal road midpoint convergence' : 'Alternative meetup option'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              <button
                type="button"
                onClick={handleShare}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition active:scale-[0.98]"
                title="Copy road midpoint summary"
              >
                {copied ? <Check size={16} strokeWidth={1.75} className="text-lime-400" /> : <Share2 size={16} strokeWidth={1.75} />}
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition active:scale-[0.98]"
                aria-label={isMinimized ? 'Expand panel' : 'Collapse panel'}
              >
                {isMinimized ? <ChevronUp size={16} strokeWidth={1.75} /> : <ChevronDown size={16} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-60px)]">
              {/* Podium Selectors: Winner & Alternatives */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHubIndex(0)}
                  className={`p-2.5 rounded-xl border text-left transition active:scale-[0.98] ${
                    selectedHubIndex === 0
                      ? 'bg-zinc-800 border-lime-400/70 text-zinc-100 ring-1 ring-lime-400/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-medium text-lime-400">
                    <Trophy size={14} strokeWidth={1.75} />
                    <span>Optimal</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 truncate mt-1">
                    {verdict.winner.hub_name.split('(')[0]}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Δ <span className="tabular-nums font-mono">{verdict.winner.delta_road_mins}</span>m • <span className="tabular-nums font-mono">{verdict.winner.fairness_score}%</span>
                  </div>
                </button>

                {verdict.alternatives.slice(0, 2).map((alt, idx) => (
                  <button
                    key={alt.hub_id}
                    type="button"
                    onClick={() => setSelectedHubIndex(idx + 1)}
                    className={`p-2.5 rounded-xl border text-left transition active:scale-[0.98] ${
                      selectedHubIndex === idx + 1
                        ? 'bg-zinc-800 border-cyan-400/70 text-zinc-100 ring-1 ring-cyan-400/40'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-medium text-cyan-400">
                      <Award size={14} strokeWidth={1.75} />
                      <span>Option {idx + 2}</span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-200 truncate mt-1">
                      {alt.hub_name.split('(')[0]}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Δ <span className="tabular-nums font-mono">{alt.delta_road_mins}</span>m • <span className="tabular-nums font-mono">{alt.fairness_score}%</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Side-by-Side Commute Breakdown (The "Road Receipt") */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 font-sans">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-semibold text-zinc-200">Drive time comparison</span>
                  <span className="text-zinc-400">
                    Disparity: <span className="tabular-nums font-mono text-zinc-200 font-medium">{currentHubVerdict.delta_road_mins}</span> min
                  </span>
                </div>

                <div className="space-y-3">
                  {currentHubVerdict.user_metrics.map((ut) => {
                    const pct = Math.round((ut.road_time_mins / maxRoadTime) * 100);
                    return (
                      <div key={ut.participant_id} className="space-y-1.5">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-medium text-zinc-200 flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ut.color }}
                            />
                            <span className="truncate">{ut.participant_name}</span>
                          </span>
                          <span className="text-zinc-200 shrink-0 flex items-baseline gap-1">
                            <span className="tabular-nums font-mono font-semibold text-zinc-100">{ut.road_time_mins}</span>
                            <span className="text-zinc-400">min</span>
                            <span className="text-zinc-500 ml-1">
                              (<span className="tabular-nums font-mono">{ut.road_distance_km}</span> km)
                            </span>
                          </span>
                        </div>

                        {/* Relative Drive Time Bar */}
                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-lime-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Road-Path Fairness Analysis Commentary */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <Compass size={16} strokeWidth={1.75} className="text-zinc-400" />
                  <span>Fairness analysis</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed text-pretty">
                  {verdict.analysis_commentary}
                </p>
              </div>

              {/* Meetup Venues near winning road coordinate */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <MapPin size={16} strokeWidth={1.75} className="text-zinc-400" />
                  <span>Nearby meetup venues (within 800m)</span>
                </div>
                <VenueExplorer
                  pois={verdict.pois}
                  onSelectPoi={onSelectPoi}
                  selectedPoiId={selectedPoiId}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
