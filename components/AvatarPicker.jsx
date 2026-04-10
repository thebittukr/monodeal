"use client";
import { useState, useEffect } from "react";

export default function AvatarPicker({ selected, onSelect }) {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaid, setShowPaid] = useState(false);

  useEffect(() => {
    fetch("/api/avatars")
      .then(r => r.json())
      .then(d => { setAvatars(d.avatars || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const freeAvatars = avatars.filter(a => a.isFree);
  const paidAvatars = avatars.filter(a => !a.isFree);
  const selectedAvatar = avatars.find(a => a.id === selected) || freeAvatars[0];

  if (loading) return <div className="text-slate-600 text-xs py-4">Loading avatars...</div>;

  return (
    <div className="w-full">
      {/* Current selection */}
      {selectedAvatar && (
        <div className="flex items-center gap-2 mb-3">
          <img
            src={selectedAvatar.imageUrl}
            alt={selectedAvatar.name}
            className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
          />
          <div>
            <div className="text-white font-semibold text-sm">{selectedAvatar.name}</div>
            <div className={`text-xs font-medium ${selectedAvatar.isFree ? "text-emerald-400" : "text-amber-400"}`}>
              {selectedAvatar.isFree ? "Free Avatar" : `${selectedAvatar.priceCredits} credits`}
            </div>
          </div>
        </div>
      )}

      {/* Free Avatars Section */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Free</span>
          <div className="flex-1 h-px bg-emerald-500/20" />
          <span className="text-[9px] text-slate-600">{freeAvatars.length} avatars</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {freeAvatars.map(avatar => (
            <AvatarButton key={avatar.id} avatar={avatar} selected={selected === avatar.id} onSelect={onSelect} />
          ))}
        </div>
      </div>

      {/* Paid Avatars Section */}
      <div>
        <button
          onClick={() => setShowPaid(!showPaid)}
          className="flex items-center gap-2 w-full mb-1.5 group"
        >
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Premium</span>
          <div className="flex-1 h-px bg-amber-500/20" />
          <span className="text-[9px] text-slate-600">{paidAvatars.length} avatars</span>
          <span className={`text-slate-600 text-[10px] transition-transform ${showPaid ? "rotate-180" : ""}`}>▼</span>
        </button>

        {showPaid && (
          <div className="grid grid-cols-5 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
            {paidAvatars.map(avatar => (
              <AvatarButton key={avatar.id} avatar={avatar} selected={selected === avatar.id} onSelect={onSelect} />
            ))}
          </div>
        )}

        {!showPaid && (
          <div className="grid grid-cols-5 gap-1.5">
            {paidAvatars.slice(0, 5).map(avatar => (
              <AvatarButton key={avatar.id} avatar={avatar} selected={selected === avatar.id} onSelect={onSelect} dimmed />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarButton({ avatar, selected, onSelect, dimmed }) {
  return (
    <button
      onClick={() => onSelect(avatar.id)}
      title={`${avatar.name}${avatar.isFree ? " (Free)" : ` (${avatar.priceCredits}cr)`}`}
      className={`w-full aspect-square rounded-xl overflow-hidden transition-all border relative ${
        selected
          ? "border-indigo-400 scale-105 ring-2 ring-indigo-500/40"
          : "border-white/10 hover:border-white/30 hover:scale-105"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      <img
        src={avatar.imageUrl}
        alt={avatar.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {!avatar.isFree && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[7px] text-amber-400 font-bold text-center py-0.5">
          {avatar.priceCredits} cr
        </div>
      )}
    </button>
  );
}
