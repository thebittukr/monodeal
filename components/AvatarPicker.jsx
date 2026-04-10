"use client";
import { useState, useEffect } from "react";

const CATEGORIES = ["All", "Casino", "Action", "Fantasy", "Tech", "Style"];

export default function AvatarPicker({ selected, onSelect }) {
  const [avatars, setAvatars] = useState([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/avatars")
      .then(r => r.json())
      .then(d => { setAvatars(d.avatars || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = category === "All"
    ? avatars
    : avatars.filter(a => a.category === category.toLowerCase());

  const selectedAvatar = avatars.find(a => a.id === selected) || avatars[0];

  if (loading) return <div className="text-slate-600 text-xs py-4">Loading avatars...</div>;

  return (
    <div className="w-full">
      {/* Current selection */}
      {selectedAvatar && (
        <div className="flex items-center gap-2 mb-2">
          <img
            src={selectedAvatar.imageUrl}
            alt={selectedAvatar.name}
            className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
          />
          <div>
            <div className="text-white font-semibold text-sm">{selectedAvatar.name}</div>
            <div className="text-slate-500 text-xs">
              {selectedAvatar.isFree ? "Free" : `${selectedAvatar.priceCredits} credits`}
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-all ${
              category === c
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-5 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
        {filtered.map(avatar => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.id)}
            title={`${avatar.name}${avatar.isFree ? " (Free)" : ` (${avatar.priceCredits}cr)`}`}
            className={`w-full aspect-square rounded-xl overflow-hidden transition-all border relative ${
              selected === avatar.id
                ? "border-indigo-400 scale-105 ring-2 ring-indigo-500/40"
                : "border-white/10 hover:border-white/30 hover:scale-105"
            }`}
          >
            <img
              src={avatar.imageUrl}
              alt={avatar.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {!avatar.isFree && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-amber-400 font-bold text-center py-0.5">
                {avatar.priceCredits}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
