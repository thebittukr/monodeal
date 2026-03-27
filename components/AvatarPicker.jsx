"use client";
import { useState } from "react";
import { AVATARS } from "@/lib/avatars";

const CATEGORIES = [
  { label: "Casino",   ids: [15, 18, 87, 88, 89, 86, 1, 3, 20, 60] },
  { label: "Action",   ids: [5, 6, 14, 17, 34, 52, 91, 92, 13, 43] },
  { label: "Fantasy",  ids: [69, 70, 71, 72, 73, 78, 68, 95, 37, 26] },
  { label: "Tech",     ids: [4, 25, 45, 67, 75, 77, 12, 40, 46, 74] },
  { label: "Style",    ids: [2, 7, 16, 27, 33, 50, 51, 28, 84, 85] },
  { label: "All",      ids: null }, // all 100
];

export default function AvatarPicker({ selected, onSelect }) {
  const [category, setCategory] = useState("Casino");

  const cat = CATEGORIES.find(c => c.label === category);
  const list = cat?.ids ? AVATARS.filter(a => cat.ids.includes(a.id)) : AVATARS;
  const selectedAvatar = AVATARS.find(a => a.id === selected) ?? AVATARS[14];

  return (
    <div className="w-full">
      {/* Current selection */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border border-white/20 flex-shrink-0"
          style={{ background: selectedAvatar.color, boxShadow: `0 0 12px ${selectedAvatar.accent}55` }}
        >
          {selectedAvatar.emoji}
        </div>
        <div>
          <div className="text-white font-semibold text-sm">{selectedAvatar.name}</div>
          <div className="text-slate-500 text-xs">Your avatar</div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c.label}
            onClick={() => setCategory(c.label)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-all ${
              category === c.label
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
        {list.map(avatar => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.id)}
            title={avatar.name}
            className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all border ${
              selected === avatar.id
                ? "border-indigo-400 scale-105"
                : "border-white/10 hover:border-white/30 hover:scale-105"
            }`}
            style={{
              background: avatar.color,
              boxShadow: selected === avatar.id ? `0 0 14px ${avatar.accent}88` : "none",
            }}
          >
            {avatar.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
