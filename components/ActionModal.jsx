"use client";
import { COLORS, isSetComplete } from "@/lib/cards";
import Card from "./Card";

/**
 * Multi-purpose modal for card interactions.
 *
 * modes:
 *  "confirm"       — simple play confirmation
 *  "pick-color"    — choose which color to charge rent for
 *  "pick-property" — choose opponent property to steal (Sly Deal)
 *  "pick-set"      — choose opponent complete set (Deal Breaker)
 *  "respond"       — target player responds to incoming action
 */
export default function ActionModal({
  mode,
  card,
  myAssets = {},
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
            opponentAssets={opponentAssets}
            opponentName={opponentName}
            onConfirm={(color) => onConfirm({ targetColor: color })}
            onCancel={onCancel}
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

function PickSet({ opponentAssets, opponentName, onConfirm, onCancel }) {
  const completeSets = Object.entries(opponentAssets).filter(([color, cards]) =>
    isSetComplete(opponentAssets, color)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-white font-bold text-lg">Deal Breaker</h3>
        <p className="text-slate-400 text-sm mt-1">
          Steal a complete set from {opponentName}
        </p>
      </div>

      {completeSets.length === 0 ? (
        <p className="text-red-400 text-center text-sm">
          {opponentName} has no complete sets to steal!
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

function RespondToAction({ pendingAction, attackerName, hasJustSayNo, onAccept, onBlock }) {
  const actionLabels = {
    debtcollector: `${attackerName} wants you to pay $${pendingAction.params?.amount}M!`,
    birthday:      `${attackerName} is celebrating — you must pay $${pendingAction.params?.amount}M!`,
    slydeal:       `${attackerName} is using Sly Deal to steal your property!`,
    dealbreaker:   `${attackerName} played Deal Breaker on your ${pendingAction.params?.targetColor ?? ""} set!`,
    rent:          `${attackerName} is charging you $${pendingAction.params?.amount}M rent!`,
  };

  const label = actionLabels[pendingAction.type] ?? "Opponent played an action against you!";

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-white font-bold text-lg">Incoming Action!</h3>
        <p className="text-slate-300 text-sm mt-2">{label}</p>
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

function ColorDot({ color }) {
  const dotColors = {
    brown:  "bg-amber-700",  blue: "bg-blue-500",
    red:    "bg-red-500",    green: "bg-green-500",
    yellow: "bg-yellow-400", orange: "bg-orange-500",
  };
  return <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColors[color] ?? "bg-slate-400"}`} />;
}
