"use client";
import { useState } from "react";
import { COLORS, isSetComplete } from "@/lib/cards";
import Card from "./Card";

const COLOR_DOT_HEX = {
  brown: "#92400e", lightblue: "#0ea5e9", pink: "#ec4899", orange: "#f97316",
  red: "#ef4444",   yellow: "#eab308",   green: "#22c55e", blue: "#3b82f6",
  railroad: "#6b7280", utility: "#14b8a6",
};

/**
 * Multi-purpose modal for card interactions.
 *
 * modes:
 *  "confirm"         — simple play confirmation
 *  "pick-color"      — choose which color to charge rent for
 *  "pick-wild-color" — choose which color to place a wild property in
 *  "pick-property"   — choose opponent property to steal (Sly Deal)
 *  "pick-set"        — choose opponent complete set (Deal Breaker / Wrecking Ball)
 *  "pick-force-deal" — choose your prop + opponent prop to swap (Force Deal)
 *  "respond"         — target player responds to incoming action
 *  "discard"         — player selects cards to discard (hand > 7 at end of turn)
 *  "flip-wild"       — player picks new color for a wild card already on the table
 */
export default function ActionModal({
  mode,
  card,
  myAssets = {},
  myHand = [],
  fromColor = null,   // for flip-wild: the current color of the wild card
  opponentAssets = {},
  opponentName = "Opponent",
  myName = "You",
  pendingAction = null,
  onConfirm,    // (params) => void
  onCancel,
  hasJustSayNo = false,
}) {
  if (!mode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md bg-slate-800 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-8 animate-card-deal">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {mode === "confirm" && card && (
          <ConfirmPlay card={card} onConfirm={() => onConfirm({})} onCancel={onCancel} />
        )}

        {mode === "pick-color" && card && (
          <PickColor
            card={card}
            myAssets={myAssets}
            onConfirm={(color) => onConfirm({ color })}
            onCancel={onCancel}
          />
        )}

        {mode === "pick-wild-color" && card && (
          <PickWildColor
            card={card}
            onConfirm={(chosenColor) => onConfirm({ chosenColor })}
            onCancel={onCancel}
          />
        )}

        {mode === "pick-property" && (
          <PickProperty
            opponentAssets={opponentAssets}
            opponentName={opponentName}
            onConfirm={({ color, cardId }) => onConfirm({ targetColor: color, targetCardId: cardId })}
            onCancel={onCancel}
          />
        )}

        {mode === "pick-set" && (
          <PickSet
            card={card}
            opponentAssets={opponentAssets}
            opponentName={opponentName}
            onConfirm={(color) => onConfirm({ targetColor: color })}
            onCancel={onCancel}
          />
        )}

        {mode === "pick-force-deal" && (
          <PickForceDeal
            opponentAssets={opponentAssets}
            opponentName={opponentName}
            myAssets={myAssets}
            myName={myName}
            onConfirm={({ targetColor, targetCardId, myColor, myCardId }) =>
              onConfirm({ targetColor, targetCardId, myColor, myCardId })}
            onCancel={onCancel}
          />
        )}

        {mode === "flip-wild" && card && (
          <FlipWild
            card={card}
            fromColor={fromColor}
            onConfirm={(toColor) => onConfirm({ toColor })}
            onCancel={onCancel}
          />
        )}

        {mode === "discard" && pendingAction && (
          <DiscardCards
            pendingAction={pendingAction}
            myHand={myHand}
            onConfirm={(cardIds) => onConfirm({ cardIds })}
          />
        )}

        {mode === "pay-assets" && pendingAction && (
          <PayWithAssets
            pendingAction={pendingAction}
            attackerName={pendingAction.attackerName ?? "Opponent"}
            myAssets={myAssets}
            onConfirm={(cards) => onConfirm({ response: "pay-assets", cards })}
          />
        )}

        {mode === "respond" && pendingAction && (
          <RespondToAction
            pendingAction={pendingAction}
            attackerName={pendingAction.attackerName ?? "Opponent"}
            hasJustSayNo={hasJustSayNo}
            onAccept={() => onConfirm({ response: "accept" })}
            onBlock={() => onConfirm({ response: "block" })}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfirmPlay({ card, onConfirm, onCancel }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-white font-bold text-lg">Play this card?</h3>
      <Card card={card} />
      <div className="flex gap-3 w-full">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">
          Play ✓
        </button>
      </div>
    </div>
  );
}

function PickColor({ card, myAssets, onConfirm, onCancel }) {
  const eligible = card.colors
    ? card.colors.filter((c) => (myAssets[c]?.length ?? 0) > 0)
    : Object.keys(COLORS).filter((c) => (myAssets[c]?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-white font-bold text-lg">Charge Rent</h3>
        <p className="text-slate-400 text-sm mt-1">Choose which color to charge rent for</p>
      </div>

      {eligible.length === 0 ? (
        <p className="text-red-400 text-center text-sm">
          You don't have any matching properties to charge rent for!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {eligible.map((color) => {
            const meta  = COLORS[color];
            const count = myAssets[color]?.length ?? 0;
            const rent  = meta.rents[Math.min(count, meta.rents.length - 1)];
            return (
              <button
                key={color}
                onClick={() => onConfirm(color)}
                className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <ColorDot color={color} />
                <div className="text-left">
                  <div className="text-white font-semibold text-sm">{meta.label}</div>
                  <div className="text-slate-400 text-xs">{count}/{meta.setSize} cards · ${rent}M rent</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function PickWildColor({ card, onConfirm, onCancel }) {
  const eligible = card.colors ?? Object.keys(COLORS);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-white font-bold text-lg">Place Wild Property</h3>
        <p className="text-slate-400 text-sm mt-1">
          {card.colors
            ? `Choose: ${card.colors.map((c) => COLORS[c]?.label).join(" or ")}`
            : "Place in any color group"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {eligible.map((color) => {
          const meta = COLORS[color];
          return (
            <button
              key={color}
              onClick={() => onConfirm(color)}
              className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ColorDot color={color} />
              <div className="text-left">
                <div className="text-white font-semibold text-sm">{meta.label}</div>
                <div className="text-slate-400 text-xs">Set of {meta.setSize}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function PickProperty({ opponentAssets, opponentName, onConfirm, onCancel }) {
  const stealable = Object.entries(opponentAssets).filter(
    ([color, cards]) => cards.length > 0 && !isSetComplete(opponentAssets, color)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-white font-bold text-lg">Sly Deal</h3>
        <p className="text-slate-400 text-sm mt-1">
          Steal 1 property from {opponentName}'s incomplete sets
        </p>
      </div>

      {stealable.length === 0 ? (
        <p className="text-red-400 text-center text-sm">
          {opponentName} has no stealable properties!
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {stealable.map(([color, cards]) => (
            <div key={color}>
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <ColorDot color={color} />
                <span className="text-white/70 text-xs font-semibold">{COLORS[color].label}</span>
              </div>
              <div className="flex gap-2 flex-wrap pl-5">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => onConfirm({ color, cardId: card.id })}
                    className="cursor-pointer"
                  >
                    <Card card={card} small />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function PickSet({ card, opponentAssets, opponentName, onConfirm, onCancel }) {
  const completeSets = Object.entries(opponentAssets).filter(([color]) =>
    isSetComplete(opponentAssets, color)
  );
  const isWrecking = card?.action === "wreckingball";

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-white font-bold text-lg">{isWrecking ? "Wrecking Ball 💥" : "Deal Breaker"}</h3>
        <p className="text-slate-400 text-sm mt-1">
          {isWrecking
            ? `Demolish one of ${opponentName}'s complete sets (goes to discard!)`
            : `Steal a complete set from ${opponentName}`}
        </p>
      </div>

      {completeSets.length === 0 ? (
        <p className="text-red-400 text-center text-sm">
          {opponentName} has no complete sets!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {completeSets.map(([color, cards]) => (
            <button
              key={color}
              onClick={() => onConfirm(color)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ColorDot color={color} />
              <div className="text-left flex-1">
                <div className="text-white font-bold">{COLORS[color].label} Set</div>
                <div className="text-slate-400 text-xs">{cards.length} cards · complete ✦</div>
              </div>
              <div className="flex gap-1">
                {cards.map((c) => (
                  <Card key={c.id} card={c} small />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function PickForceDeal({ opponentAssets, opponentName, myAssets, myName, onConfirm, onCancel }) {
  const [myPick,   setMyPick]   = useState(null);   // { color, cardId }
  const [oppPick,  setOppPick]  = useState(null);   // { color, cardId }

  const myStealable  = Object.entries(myAssets).filter(([c, cards]) => cards.length > 0 && !isSetComplete(myAssets, c));
  const oppStealable = Object.entries(opponentAssets).filter(([c, cards]) => cards.length > 0 && !isSetComplete(opponentAssets, c));

  const ready = myPick && oppPick;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-white font-bold text-lg">Force Deal 🔄</h3>
        <p className="text-slate-400 text-sm mt-1">Pick one of your properties to give, and one of theirs to take</p>
      </div>

      {/* My property to give */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
          You give ({myName}) {myPick ? <span className="text-emerald-400">✓ selected</span> : "— pick one"}
        </div>
        {myStealable.length === 0 ? (
          <p className="text-red-400 text-xs">You have no incomplete-set properties to give!</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {myStealable.flatMap(([color, cards]) =>
              cards.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setMyPick({ color, cardId: c.id })}
                  className={`cursor-pointer rounded-lg ${myPick?.cardId === c.id ? "ring-2 ring-emerald-400" : ""}`}
                >
                  <Card card={c} small />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Opponent property to take */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
          You take ({opponentName}) {oppPick ? <span className="text-emerald-400">✓ selected</span> : "— pick one"}
        </div>
        {oppStealable.length === 0 ? (
          <p className="text-red-400 text-xs">{opponentName} has no incomplete-set properties!</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {oppStealable.flatMap(([color, cards]) =>
              cards.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setOppPick({ color, cardId: c.id })}
                  className={`cursor-pointer rounded-lg ${oppPick?.cardId === c.id ? "ring-2 ring-indigo-400" : ""}`}
                >
                  <Card card={c} small />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => ready && onConfirm({ myColor: myPick.color, myCardId: myPick.cardId, targetColor: oppPick.color, targetCardId: oppPick.cardId })}
          disabled={!ready}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold transition-colors"
        >
          Swap ↔
        </button>
      </div>
    </div>
  );
}

function PayWithAssets({ pendingAction, attackerName, myAssets, onConfirm }) {
  const [selected, setSelected] = useState([]); // [{ color, cardId }]
  const remaining = pendingAction.params?.remaining ?? 0;

  const allCards = Object.entries(myAssets).flatMap(([color, cards]) =>
    cards.map((c) => ({ ...c, assetColor: color }))
  );
  const totalAssetValue = allCards.reduce((s, c) => s + (c.value ?? 0), 0);

  const selectedValue = selected.reduce((s, sel) => {
    const card = allCards.find((c) => c.id === sel.cardId);
    return s + (card?.value ?? 0);
  }, 0);

  const isSelected = (id) => selected.some((s) => s.cardId === id);

  const toggle = (color, cardId) => {
    setSelected((prev) =>
      prev.some((s) => s.cardId === cardId)
        ? prev.filter((s) => s.cardId !== cardId)
        : [...prev, { color, cardId }]
    );
  };

  const canConfirm = selectedValue >= remaining || selected.length === allCards.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-3xl mb-2">💸</div>
        <h3 className="text-white font-bold text-lg">Pay with Properties</h3>
        <p className="text-slate-300 text-sm mt-1">
          You owe <span className="text-red-400 font-bold">${remaining}M</span> more to {attackerName}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">
          Your bank couldn't cover it — select properties to give
        </p>
      </div>

      {/* Running counter */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-xl border ${
        selectedValue >= remaining ? "border-emerald-500/40 bg-emerald-900/20" : "border-white/10 bg-white/5"
      }`}>
        <span className="text-slate-400 text-sm">Selected value</span>
        <span className={`font-bold text-lg ${selectedValue >= remaining ? "text-emerald-400" : "text-white"}`}>
          ${selectedValue}M / ${remaining}M
        </span>
      </div>

      {allCards.length === 0 ? (
        <p className="text-slate-400 text-center text-sm italic">You have no properties — debt forgiven!</p>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {allCards.map((c) => (
            <div
              key={c.id}
              onClick={() => toggle(c.assetColor, c.id)}
              className={`cursor-pointer rounded-xl border-2 p-1.5 transition-all ${
                isSelected(c.id)
                  ? "border-emerald-400 bg-emerald-900/30 scale-105"
                  : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <Card card={c} small />
              <div className="text-center text-white/70 mt-0.5" style={{ fontSize: 9 }}>
                ${c.value}M
              </div>
            </div>
          ))}
        </div>
      )}

      {totalAssetValue < remaining && (
        <p className="text-yellow-400 text-xs text-center">
          You can't cover the full debt — select all your properties to pay what you can.
        </p>
      )}

      <button
        onClick={() => onConfirm(allCards.length === 0 ? [] : selected)}
        disabled={!canConfirm && allCards.length > 0}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold transition-colors"
      >
        {allCards.length === 0 ? "OK — Nothing to Give" : `Pay ${selected.length} Card${selected.length !== 1 ? "s" : ""} ($${selectedValue}M)`}
      </button>
    </div>
  );
}

function RespondToAction({ pendingAction, attackerName, hasJustSayNo, onAccept, onBlock }) {
  const color = pendingAction.params?.targetColor ?? "";
  const actionLabels = {
    debtcollector: `${attackerName} wants you to pay $${pendingAction.params?.amount}M!`,
    birthday:      `${attackerName} is celebrating — you must pay $${pendingAction.params?.amount}M!`,
    slydeal:       `${attackerName} is using Sly Deal to steal your property!`,
    dealbreaker:   `${attackerName} played Deal Breaker on your ${color} set!`,
    rent:          `${attackerName} is charging you $${pendingAction.params?.amount}M rent!`,
    identityswap:  `${attackerName} wants to swap ALL your properties with theirs! 🔀`,
    taxtherich:    `${attackerName} wants to take half your bank ($${pendingAction.params?.amount}M)! 💸`,
    wreckingball:  `${attackerName} wants to demolish your ${color} property set! 💥`,
    forceddeal:    `${attackerName} wants to force-swap one of your properties! 🔄`,
    propertytax:   `${attackerName} declared Property Tax — you owe $1M per complete set!`,
  };

  const label = actionLabels[pendingAction.type] ?? "Opponent played an action against you!";
  const isPayment = ["debtcollector", "rent", "birthday", "propertytax"].includes(pendingAction.type);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-white font-bold text-lg">Incoming Action!</h3>
        <p className="text-slate-300 text-sm mt-2">{label}</p>
        {isPayment && (
          <p className="text-slate-500 text-xs mt-1">
            Your cash will be taken first — if short, you'll choose properties to cover the rest.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {hasJustSayNo && (
          <button
            onClick={onBlock}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span>🚫</span>
            <span>Just Say No!</span>
          </button>
        )}
        <button
          onClick={onAccept}
          className="w-full py-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function FlipWild({ card, fromColor, onConfirm, onCancel }) {
  const eligible = (card.colors ?? Object.keys(COLORS)).filter((c) => c !== fromColor);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-3xl mb-2">🔀</div>
        <h3 className="text-white font-bold text-lg">Move Wild Property</h3>
        <p className="text-slate-400 text-sm mt-1">
          Currently in <strong className="text-white">{COLORS[fromColor]?.label}</strong> — choose a new color group
        </p>
        <p className="text-slate-500 text-xs mt-0.5">Free move · doesn't cost a play</p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {eligible.map((color) => {
          const meta = COLORS[color];
          return (
            <button
              key={color}
              onClick={() => onConfirm(color)}
              className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ColorDot color={color} />
              <div className="text-left">
                <div className="text-white font-semibold text-sm">{meta.label}</div>
                <div className="text-slate-400 text-xs">Set of {meta.setSize}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
        Cancel
      </button>
    </div>
  );
}

function DiscardCards({ pendingAction, myHand, onConfirm }) {
  const [selected, setSelected] = useState([]);
  const needed = pendingAction.params?.count ?? 1;

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < needed
          ? [...prev, id]
          : [...prev.slice(1), id]   // replace oldest selection when at limit
    );
  };

  const visibleHand = myHand.filter((c) => c.type !== "hidden");

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-3xl mb-2">🃏</div>
        <h3 className="text-white font-bold text-lg">Discard Down to 7</h3>
        <p className="text-slate-300 text-sm mt-1">
          Select <span className="text-red-400 font-bold">{needed}</span> card{needed > 1 ? "s" : ""} to discard
        </p>
        <p className="text-slate-500 text-xs mt-0.5">({selected.length}/{needed} selected)</p>
      </div>

      <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
        {visibleHand.map((c) => (
          <div
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${
              selected.includes(c.id)
                ? "border-red-400 bg-red-900/30 scale-105"
                : "border-white/10 bg-white/5 hover:border-white/30"
            }`}
          >
            <Card card={c} small />
          </div>
        ))}
      </div>

      <button
        onClick={() => onConfirm(selected)}
        disabled={selected.length !== needed}
        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold transition-colors"
      >
        Discard {selected.length} Card{selected.length !== 1 ? "s" : ""}
      </button>
    </div>
  );
}

function ColorDot({ color }) {
  const hex = COLOR_DOT_HEX[color];
  if (hex) {
    return <span className="w-3 h-3 rounded-full flex-shrink-0 border border-white/30" style={{ backgroundColor: hex }} />;
  }
  return <span className="w-3 h-3 rounded-full flex-shrink-0 bg-slate-400" />;
}
