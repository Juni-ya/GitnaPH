import React, { useState } from 'react';
import { Coffee, Trees, ShoppingBag, MapPin, Footprints } from 'lucide-react';
import { CategorizedPois, PoiItem } from '../types';

interface VenueExplorerProps {
  pois: CategorizedPois;
  onSelectPoi?: (poi: PoiItem) => void;
  selectedPoiId?: string | null;
  isLoading?: boolean;
}

export const VenueExplorer: React.FC<VenueExplorerProps> = ({
  pois,
  onSelectPoi,
  selectedPoiId,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'cafes' | 'parks' | 'malls'>('cafes');

  const items = activeTab === 'cafes' ? pois.cafes : activeTab === 'parks' ? pois.parks : pois.malls;

  return (
    <div className="space-y-3 font-sans">
      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('cafes')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
            activeTab === 'cafes'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Coffee size={16} strokeWidth={1.75} className={activeTab === 'cafes' ? 'text-amber-400' : 'text-zinc-500'} />
          <span>Cafes</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[11px]">({pois.cafes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parks')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
            activeTab === 'parks'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Trees size={16} strokeWidth={1.75} className={activeTab === 'parks' ? 'text-emerald-400' : 'text-zinc-500'} />
          <span>Parks</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[11px]">({pois.parks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('malls')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
            activeTab === 'malls'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingBag size={16} strokeWidth={1.75} className={activeTab === 'malls' ? 'text-cyan-400' : 'text-zinc-500'} />
          <span>Malls</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[11px]">({pois.malls.length})</span>
        </button>
      </div>

      {/* Venues Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {isLoading ? (
          <>
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 skeleton-shimmer h-20" />
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 skeleton-shimmer h-20" />
          </>
        ) : items.length === 0 ? (
          <div className="col-span-2 py-6 text-center text-xs text-zinc-500">
            No venues found in this category within 800m.
          </div>
        ) : (
          items.map((poi) => {
            const isSelected = selectedPoiId === poi.id;
            return (
              <div
                key={poi.id}
                onClick={() => onSelectPoi && onSelectPoi(poi)}
                className={`p-3 rounded-xl border transition cursor-pointer text-left flex flex-col justify-between active:scale-[0.98] ${
                  isSelected
                    ? 'bg-zinc-800 border-lime-400/80 ring-1 ring-lime-400/50'
                    : 'bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-zinc-100 truncate flex items-center gap-1.5">
                      <MapPin size={16} strokeWidth={1.75} className="text-zinc-400 shrink-0" />
                      <span className="truncate">{poi.name}</span>
                    </h4>
                    {poi.highlight && (
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 text-pretty leading-relaxed">
                        {poi.highlight}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 px-2 py-0.5 rounded-lg text-[11px] bg-zinc-950/80 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                    <Footprints size={14} strokeWidth={1.75} className="text-zinc-400" />
                    <span>
                      <span className="tabular-nums font-mono text-zinc-200">{poi.walking_minutes}</span> min walk
                    </span>
                  </span>
                </div>

                {poi.address && (
                  <p className="text-[11px] text-zinc-500 mt-2 truncate flex items-center gap-1">
                    <span className="truncate">{poi.address}</span>
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
