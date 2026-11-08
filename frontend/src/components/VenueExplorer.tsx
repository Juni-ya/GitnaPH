import React, { useState } from 'react';
import { Coffee, Trees, ShoppingBag, UtensilsCrossed, MapPin, Footprints, Layers } from 'lucide-react';
import { CategorizedPois, CategoryFilter, PoiItem } from '../types';

interface VenueExplorerProps {
  pois: CategorizedPois;
  onSelectPoi?: (poi: PoiItem) => void;
  selectedPoiId?: string | null;
  isLoading?: boolean;
  activeFilter?: CategoryFilter;
  onFilterChange?: (filter: CategoryFilter) => void;
}

export const VenueExplorer: React.FC<VenueExplorerProps> = ({
  pois,
  onSelectPoi,
  selectedPoiId,
  isLoading = false,
  activeFilter,
  onFilterChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<CategoryFilter>('all');
  const currentFilter = activeFilter !== undefined ? activeFilter : internalFilter;

  const handleFilterClick = (filter: CategoryFilter) => {
    if (onFilterChange) {
      onFilterChange(filter);
    } else {
      setInternalFilter(filter);
    }
  };

  const allItems: PoiItem[] = [
    ...(pois.cafes || []),
    ...(pois.malls || []),
    ...(pois.parks || []),
    ...(pois.restaurants || []),
  ];

  const filteredItems = currentFilter === 'all'
    ? allItems
    : currentFilter === 'cafe'
    ? pois.cafes || []
    : currentFilter === 'mall'
    ? pois.malls || []
    : currentFilter === 'park'
    ? pois.parks || []
    : pois.restaurants || [];

  return (
    <div className="space-y-3 font-sans">
      {/* Category Tabs: All, Cafes, Malls, Parks, Restaurants */}
      <div className="flex gap-1 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleFilterClick('all')}
          className={`flex-1 min-w-[55px] py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition active:scale-[0.98] ${
            currentFilter === 'all'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers size={14} strokeWidth={1.75} className={currentFilter === 'all' ? 'text-lime-400' : 'text-zinc-500'} />
          <span>All</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[10px]">({allItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('cafe')}
          className={`flex-1 min-w-[65px] py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition active:scale-[0.98] ${
            currentFilter === 'cafe'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Coffee size={14} strokeWidth={1.75} className={currentFilter === 'cafe' ? 'text-amber-400' : 'text-zinc-500'} />
          <span>Cafes</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[10px]">({(pois.cafes || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('mall')}
          className={`flex-1 min-w-[60px] py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition active:scale-[0.98] ${
            currentFilter === 'mall'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingBag size={14} strokeWidth={1.75} className={currentFilter === 'mall' ? 'text-cyan-400' : 'text-zinc-500'} />
          <span>Malls</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[10px]">({(pois.malls || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('park')}
          className={`flex-1 min-w-[60px] py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition active:scale-[0.98] ${
            currentFilter === 'park'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Trees size={14} strokeWidth={1.75} className={currentFilter === 'park' ? 'text-emerald-400' : 'text-zinc-500'} />
          <span>Parks</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[10px]">({(pois.parks || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('restaurant')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition active:scale-[0.98] ${
            currentFilter === 'restaurant'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UtensilsCrossed size={14} strokeWidth={1.75} className={currentFilter === 'restaurant' ? 'text-rose-400' : 'text-zinc-500'} />
          <span>Food</span>
          <span className="text-zinc-500 tabular-nums font-mono text-[10px]">({(pois.restaurants || []).length})</span>
        </button>
      </div>

      {/* Venues Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
        {isLoading ? (
          <>
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 skeleton-shimmer h-20" />
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 skeleton-shimmer h-20" />
          </>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-2 py-6 text-center text-xs text-zinc-500">
            No venues found in this category within 1.5 km of the midpoint.
          </div>
        ) : (
          filteredItems.map((poi) => {
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
                      <MapPin size={15} strokeWidth={1.75} className="text-zinc-400 shrink-0" />
                      <span className="truncate">{poi.name}</span>
                    </h4>
                    {poi.highlight && (
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 text-pretty leading-relaxed">
                        {poi.highlight}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 px-2 py-0.5 rounded-lg text-[11px] bg-zinc-950/80 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                    <Footprints size={13} strokeWidth={1.75} className="text-zinc-400" />
                    <span>
                      <span className="tabular-nums font-mono text-zinc-200">{poi.walking_minutes}</span> min
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                  <span className="truncate max-w-[170px]">{poi.address || 'Midpoint Zone'}</span>
                  <span className="tabular-nums font-mono text-zinc-400 shrink-0">
                    {poi.distance_meters}m
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
