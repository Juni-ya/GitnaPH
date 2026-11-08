import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search } from 'lucide-react';
import { LUZON_TOWNS, LuzonTown } from '../data/luzonTowns';

interface TownAutocompleteProps {
  value: string;
  placeholder?: string;
  onSelectTown: (name: string, coordinates: [number, number]) => void;
  colorDot?: string;
}

export const TownAutocomplete: React.FC<TownAutocompleteProps> = ({
  value,
  placeholder = 'Search town or city in Luzon...',
  onSelectTown,
  colorDot,
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredTowns, setFilteredTowns] = useState<LuzonTown[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setFilteredTowns(LUZON_TOWNS.slice(0, 8));
      return;
    }

    const matches = LUZON_TOWNS.filter(
      (t) =>
        t.name.toLowerCase().includes(trimmed) ||
        t.province.toLowerCase().includes(trimmed) ||
        t.label.toLowerCase().includes(trimmed)
    );

    setFilteredTowns(matches.slice(0, 8));
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (town: LuzonTown) => {
    setQuery(town.name);
    setIsOpen(false);
    onSelectTown(town.name, town.coordinates);
  };

  return (
    <div ref={containerRef} className="relative w-full font-sans">
      <div className="relative flex items-center">
        {colorDot ? (
          <span
            className="absolute left-3 w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colorDot }}
          />
        ) : (
          <Search size={16} strokeWidth={1.75} className="absolute left-3 text-zinc-500 shrink-0" />
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-11 pl-8 pr-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-400/80 transition"
        />
      </div>

      {isOpen && filteredTowns.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto p-1">
          {filteredTowns.map((town, idx) => (
            <button
              key={`${town.name}-${idx}`}
              type="button"
              onClick={() => handleSelect(town)}
              className="w-full px-3 py-2 text-left rounded-lg hover:bg-zinc-800/80 transition flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin size={14} strokeWidth={1.75} className="text-zinc-500 shrink-0" />
                <span className="font-medium text-zinc-200 truncate">{town.name}</span>
                <span className="text-zinc-500 text-[11px] truncate">({town.province})</span>
              </div>
              <span className="text-[10px] text-zinc-500 tabular-nums font-mono shrink-0">
                Town Center
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
