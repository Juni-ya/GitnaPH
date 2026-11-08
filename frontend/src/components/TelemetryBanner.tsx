import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, Radio, AlertCircle, Route } from 'lucide-react';
import { EnginePhase, TestedCandidateFrame } from '../types';

interface TelemetryBannerProps {
  isConnected: boolean;
  phase: EnginePhase;
  statusMessage: string;
  currentCandidate: TestedCandidateFrame | null;
  crawlProgress: number;
  fps: number;
}

export const TelemetryBanner: React.FC<TelemetryBannerProps> = ({
  isConnected,
  phase,
  statusMessage,
  currentCandidate,
  crawlProgress,
  fps,
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-3xl pointer-events-none">
      <div className="panel px-3.5 py-2 rounded-xl border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-sans pointer-events-auto">
        {/* Left: Engine connection & status */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-zinc-200 tracking-tight">
              Gitna Engine
            </span>
          </div>

          <div className="h-3.5 w-px bg-zinc-800 hidden sm:block" />

          {/* Phase Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300">
            {phase === 'IDLE' && <Radio size={16} strokeWidth={1.75} className="text-zinc-500" />}
            {phase === 'HIGHWAY_CRAWL' && <Activity size={16} strokeWidth={1.75} className="text-lime-400" />}
            {phase === 'CANDIDATE_ROAD_TEST' && <Route size={16} strokeWidth={1.75} className="text-cyan-400" />}
            {phase === 'VERDICT' && <ShieldCheck size={16} strokeWidth={1.75} className="text-emerald-400" />}
            {phase === 'ERROR' && <AlertCircle size={16} strokeWidth={1.75} className="text-rose-400" />}
            <span className="text-[11px] font-medium text-zinc-300">
              {phase === 'HIGHWAY_CRAWL' ? (
                <>
                  Tracing highway (<span className="tabular-nums font-mono text-lime-400">{crawlProgress}%</span>)
                </>
              ) : phase === 'CANDIDATE_ROAD_TEST' ? (
                'Testing candidate road matrix'
              ) : phase === 'VERDICT' ? (
                'Midpoint calculated'
              ) : phase === 'ERROR' ? (
                'Calculation error'
              ) : (
                'Ready'
              )}
            </span>
          </div>
        </div>

        {/* Center: Live Ticker */}
        <div className="flex-1 text-center truncate max-w-sm w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusMessage}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ duration: 0.12 }}
              className="text-zinc-400 text-xs truncate"
            >
              {statusMessage}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Live Telemetry Metrics */}
        <div className="flex items-center gap-2">
          {currentCandidate && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                Δ <span className="tabular-nums font-mono">{currentCandidate.delta_mins}</span> min
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                <span className="tabular-nums font-mono text-lime-400 font-medium">
                  {currentCandidate.fairness_score}%
                </span>{' '}
                fair
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-400 text-[11px]">
            <span className="tabular-nums font-mono text-zinc-300 font-medium">{fps}</span>
            <span>fps</span>
          </div>
        </div>
      </div>
    </div>
  );
};
