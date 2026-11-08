import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Route, Coffee, ShoppingBag, Trees, UtensilsCrossed, Compass, Key } from 'lucide-react';
import { Participant, SpotCategory } from '../types';
import { TownAutocomplete } from './TownAutocomplete';

interface LandingPageProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  selectedCategories: SpotCategory[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<SpotCategory[]>>;
  onSubmit: () => void;
  isCalculating: boolean;
  googleApiKey?: string;
  setGoogleApiKey?: React.Dispatch<React.SetStateAction<string>>;
}

const PARTICIPANT_COLORS = ['#38bdf8', '#f43f5e', '#fbbf24', '#a855f7', '#34d399', '#f97316'];

export const LandingPage: React.FC<LandingPageProps> = ({
  participants,
  setParticipants,
  selectedCategories,
  setSelectedCategories,
  onSubmit,
  isCalculating,
  googleApiKey = '',
  setGoogleApiKey,
}) => {
  const [showKeyInput, setShowKeyInput] = useState(false);

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

  const handleLoadExample = () => {
    setParticipants([
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
  };

  const toggleCategory = (cat: SpotCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-xl panel rounded-2xl border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6 relative z-10"
      >
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Compass size={16} strokeWidth={1.75} className="text-lime-400" />
            <span className="font-semibold text-zinc-300">Gitna Luzon</span>
            <span className="text-zinc-600">•</span>
            <span>2D Road Network & Real Radius Finder</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 text-balance">
            Find the Fairest Road Midpoint in Luzon
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed text-pretty">
            Enter two or more Luzon towns to trace the real highway network and discover verified meetup places within radius.
          </p>
        </div>

        {/* Participant Towns Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-300">Traveler Town Centers</span>
            <button
              type="button"
              onClick={handleLoadExample}
              className="text-zinc-400 hover:text-lime-400 transition underline underline-offset-4 active:scale-[0.98]"
            >
              Load Example: Malolos vs. General Trias
            </button>
          </div>

          <div className="space-y-2.5">
            {participants.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <TownAutocomplete
                    value={p.town_name || p.name}
                    placeholder={`Traveler ${idx + 1} town or city...`}
                    colorDot={p.color}
                    onSelectTown={(name, coords) => handleUpdateTown(idx, name, coords)}
                  />
                </div>

                {participants.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(idx)}
                    className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 transition active:scale-[0.98] shrink-0"
                    title="Remove traveler"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {participants.length < 6 && (
            <button
              type="button"
              onClick={handleAddParticipant}
              className="w-full py-2.5 px-3 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/60 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={1.75} />
              <span>Add Another Town</span>
            </button>
          )}
        </div>

        {/* Spot Filter Pre-selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-300">
            Real Places to Search (Within 2.5 - 5.0 km Radius)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => toggleCategory('cafe')}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                selectedCategories.includes('cafe')
                  ? 'bg-zinc-800 border-lime-400/80 text-zinc-100 ring-1 ring-lime-400/40'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <Coffee size={16} strokeWidth={1.75} className={selectedCategories.includes('cafe') ? 'text-amber-400' : 'text-zinc-500'} />
              <span>Cafes</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('mall')}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                selectedCategories.includes('mall')
                  ? 'bg-zinc-800 border-lime-400/80 text-zinc-100 ring-1 ring-lime-400/40'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <ShoppingBag size={16} strokeWidth={1.75} className={selectedCategories.includes('mall') ? 'text-cyan-400' : 'text-zinc-500'} />
              <span>Malls</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('park')}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                selectedCategories.includes('park')
                  ? 'bg-zinc-800 border-lime-400/80 text-zinc-100 ring-1 ring-lime-400/40'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <Trees size={16} strokeWidth={1.75} className={selectedCategories.includes('park') ? 'text-emerald-400' : 'text-zinc-500'} />
              <span>Parks</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('restaurant')}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                selectedCategories.includes('restaurant')
                  ? 'bg-zinc-800 border-lime-400/80 text-zinc-100 ring-1 ring-lime-400/40'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <UtensilsCrossed size={16} strokeWidth={1.75} className={selectedCategories.includes('restaurant') ? 'text-rose-400' : 'text-zinc-500'} />
              <span>Restaurants</span>
            </button>
          </div>
        </div>

        {/* Optional Google Places API Key */}
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition"
          >
            <Key size={13} strokeWidth={1.75} className="text-zinc-500" />
            <span>{showKeyInput ? 'Hide API key options' : 'Optional: Connect Google Places API key (uses OSM Overpass by default)'}</span>
          </button>

          {showKeyInput && (
            <input
              type="password"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey && setGoogleApiKey(e.target.value)}
              placeholder="Enter Google Maps / Places API key..."
              className="w-full h-10 px-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-lime-400/80 transition"
            />
          )}
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isCalculating}
            className="w-full h-12 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold text-sm transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Route size={18} strokeWidth={2} />
            <span>Trace 2D Luzon Road Midpoint</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
