"use client";
import { useState, useCallback } from "react";
import Card from "./Card";
import AssetDisplay from "./AssetDisplay";
import ActionModal from "./ActionModal";
import { COLORS, countCompletedSets } from "@/lib/cards";

const AVATAR_COLORS = [
  "bg-rose-600/70",
  "bg-indigo-600/70",
  "bg-amber-600/70",
  "bg-emerald-600/70",
];

function bankTotal(bank = []) {
  return bank.reduce((s, c) => s + (c.value ?? 0), 0);
}

// Cards that require selecting a target player before anything else
const NEEDS_TARGET_PLAYER = new Set(["debtcollector", "identityswap", "taxtherich", "slydeal", "dealbreaker"]);

// Cards that then need further input after player selection
const NEEDS_FURTHER_INPUT = { slydeal: "pick-property", dealbreaker: "pick-set" };

export default function GameBoard({ state, myId, onMove, error }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalMode,    setModalMode]    = useState(null);   // 'confirm' | 'pick-color' | 'pick-player' | 'pick-property' | 'pick-set' | 'respond'
  const [targetPlayer, setTargetPlayer] = useState(null);   // player object after player is picked
  const [actionError,  setActionError]  = useState(null);

  if (!state) return <LoadingScreen />;

  const myIdx    = state.players.findIndex((p) => p.id === myId);
  const me       = state.players[myIdx];
  const opponents = state.players.filter((p) => p.id !== myId);

  const isMyTurn  = state.turnIndex === myIdx;
  const playsLeft = state.maxPlays - state.playsThisTurn;
  const myCompletedSets = countCompletedSets(me?.assets ?? {});

  // Pending action I must respond to (single-target)
  const pendingForMe     = state.pendingAction && state.pendingAction.toIdx === myIdx;
  // Pending action I must respond to (multi-target: birthday/rent)
  const pendingMultiForMe = state.pendingAction &&
    Array.isArray(state.pendingAction.toIdxList) &&
    state.pendingAction.toIdxList.includes(myIdx) &&
    !state.pendingAction.respondedList?.includes(myIdx);

  const mustRespond   = pendingForMe || pendingMultiForMe;
  const isWaiting     = state.pendingAction && !mustRespond;
  const hasJSN        = (me?.hand ?? []).some((c) => c.action === "justsayno");

  // ── Card click ────────────────────────────────────────────────────────────
  const handleCardClick = useCallback((card) => {
    if (!isMyTurn || state.phase !== "playing" || state.pendingAction) return;
    if (playsLeft <= 0) { setActionError("No plays remaining — end your turn"); return; }
    setActionError(null);

    if (selectedCard?.id === card.id) {
      setSelectedCard(null); setModalMode(null); setTargetPlayer(null); return;
    }

    setSelectedCard(card);
    setTargetPlayer(null);

    if (card.type === "property" || card.type === "money") {
      setModalMode("confirm");
    } else if (card.type === "rent") {
      setModalMode("pick-color");
    } else if (card.type === "action") {
      if (card.action === "justsayno") {
        setActionError("Just Say No can only be played when targeted by an action");
        setSelectedCard(null); return;
      }
      if (NEEDS_TARGET_PLAYER.has(card.action)) {
        setModalMode("pick-player");
      } else {
        setModalMode("confirm");
      }
    }
  }, [isMyTurn, state, playsLeft, selectedCard]);

  // ── Player selected (for targeted actions) ────────────────────────────────
  const handlePlayerSelected = useCallback((player, playerIdx) => {
    setTargetPlayer({ player, playerIdx });
    const further = NEEDS_FURTHER_INPUT[selectedCard?.action];
    if (further) {
      setModalMode(further);
    } else {
      setModalMode("confirm-targeted");
    }
  }, [selectedCard]);

  // ── Modal confirm ─────────────────────────────────────────────────────────
  const handleModalConfirm = useCallback(async (params) => {
    if (!selectedCard) return;
    const move = {
      cardId: selectedCard.id,
      type: "play",
      ...(targetPlayer ? { targetPlayerIdx: targetPlayer.playerIdx } : {}),
      ...params,
    };
    setSelectedCard(null); setModalMode(null); setTargetPlayer(null);
    await onMove(move);
  }, [selectedCard, targetPlayer, onMove]);

  const handleModalCancel = useCallback(() => {
    setSelectedCard(null); setModalMode(null); setTargetPlayer(null); setActionError(null);
  }, []);

  // ── Respond to pending action ─────────────────────────────────────────────
  const handleRespond = useCallback(async (response) => {
    await onMove({ type: "respond", response });
  }, [onMove]);

  const handleEndTurn = useCallback(async () => {
    if (!isMyTurn || state.pendingAction) return;
    setSelectedCard(null); setModalMode(null);
    await onMove({ type: "endTurn" });
  }, [isMyTurn, state, onMove]);

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto overflow-hidden">

      {/* ── Game Over Overlay ──────────────────────────────────────────────── */}
      {state.phase === "ended" && (
        <WinnerOverlay
          winnerName={state.winner}
          isMe={state.winnerId === myId}
          onRestart={() => { window.location.href = "/"; }}
        />
      )}

      {/* ── Pending action response modal ──────────────────────────────────── */}
      {mustRespond && state.pendingAction && (
        <ActionModal
          mode="respond"
          pendingAction={{
            ...state.pendingAction,
            attackerName: state.players[state.pendingAction.fromIdx]?.name ?? "Opponent",
          }}
          hasJustSayNo={hasJSN}
          onConfirm={({ response }) => handleRespond(response)}
          onCancel={() => {}}
        />
      )}

      {/* ── Waiting banner ────────────────────────────────────────────────── */}
      {isWaiting && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-800/95 border border-yellow-400/40 rounded-2xl px-5 py-3 shadow-2xl text-center pointer-events-none">
          <div className="text-yellow-300 text-xs font-semibold uppercase tracking-wide">Waiting…</div>
          <div className="text-white font-bold mt-0.5 text-sm">Opponent is responding</div>
        </div>
      )}

      {/* ── Card action modals ────────────────────────────────────────────── */}
      {modalMode && selectedCard && !mustRespond && (
        <>
          {modalMode === "pick-player" && (
            <PickPlayerModal
              opponents={opponents}
              opponentIndices={state.players
                .map((p, i) => ({ player: p, i }))
                .filter(({ player }) => player.id !== myId)}
              onPick={handlePlayerSelected}
              onCancel={handleModalCancel}
              card={selectedCard}
            />
          )}
          {(modalMode === "confirm" || modalMode === "confirm-targeted") && (
            <ActionModal
              mode="confirm"
              card={selectedCard}
              targetPlayerName={targetPlayer?.player?.name}
              onConfirm={handleModalConfirm}
              onCancel={handleModalCancel}
            />
          )}
          {modalMode === "pick-color" && (
            <ActionModal
              mode="pick-color"
              card={selectedCard}
              myAssets={me?.assets ?? {}}
              onConfirm={handleModalConfirm}
              onCancel={handleModalCancel}
            />
          )}
          {modalMode === "pick-property" && targetPlayer && (
            <ActionModal
              mode="pick-property"
              opponentAssets={targetPlayer.player.assets ?? {}}
              opponentName={targetPlayer.player.name}
              onConfirm={handleModalConfirm}
              onCancel={handleModalCancel}
            />
          )}
          {modalMode === "pick-set" && targetPlayer && (
            <ActionModal
              mode="pick-set"
              opponentAssets={targetPlayer.player.assets ?? {}}
              opponentName={targetPlayer.player.name}
              onConfirm={handleModalConfirm}
              onCancel={handleModalCancel}
            />
          )}
        </>
      )}

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xl">💰</span>
          <div>
            <div className="text-white font-black text-sm leading-none">${state.pot}M Pot</div>
            <div className="text-slate-500 text-xs">Turn {state.turnCount + 1}</div>
          </div>
        </div>

        <div className={`
          px-3 py-1.5 rounded-full text-xs font-bold
          ${isMyTurn
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 turn-pulse"
            : "bg-slate-700 text-slate-400"
          }
        `}>
          {isMyTurn
            ? "Your Turn ▶"
            : `${state.players[state.turnIndex]?.name ?? "…"}'s Turn`
          }
        </div>

        <div className="text-slate-500 text-xs text-right">
          <div>Deck: {state.deck?.length ?? 0}</div>
        </div>
      </div>

      {/* ══ OPPONENTS ═════════════════════════════════════════════════════════ */}
      <div className="bg-slate-800/30 border-b border-white/5 flex-shrink-0 max-h-48 overflow-y-auto">
        {opponents.map((opp, i) => {
          const oppIdx = state.players.findIndex((p) => p.id === opp.id);
          const isOppTurn = state.turnIndex === oppIdx;
          const oppSets   = countCompletedSets(opp.assets ?? {});
          return (
            <div key={opp.id} className={`px-3 py-2 ${i > 0 ? "border-t border-white/5" : ""}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${AVATAR_COLORS[oppIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-xs ${isOppTurn ? "ring-2 ring-emerald-400" : ""}`}>
                    {opp.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <span className="text-white text-xs font-semibold">{opp.name}</span>
                    {isOppTurn && <span className="ml-1 text-emerald-400 text-xs">▶</span>}
                  </div>
                </div>
                <div className="flex gap-2 text-xs text-slate-400">
                  <span>🃏 {opp.hand?.length ?? 0}</span>
                  <span>🏦 ${bankTotal(opp.bank)}M</span>
                  <span>🏠 {oppSets}/3</span>
                </div>
              </div>
              <AssetDisplay assets={opp.assets ?? {}} small />
            </div>
          );
        })}
      </div>

      {/* ══ GAME LOG ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {[...(state.log ?? [])].reverse().map((entry, i) => (
          <div key={i} className={`text-xs leading-relaxed ${i === 0 ? "text-white/80" : "text-slate-600"}`}>
            {i === 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 mb-0.5" />}
            {entry}
          </div>
        ))}
      </div>

      {/* ══ MY ZONE ═══════════════════════════════════════════════════════════ */}
      <div className="bg-slate-800/60 border-t border-white/5 flex-shrink-0">
        {/* My header */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[myIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-xs ${isMyTurn ? "ring-2 ring-emerald-400 turn-pulse" : ""}`}>
              {me?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{me?.name}</div>
              <div className="text-slate-400 text-xs">{myCompletedSets}/3 sets</div>
            </div>
          </div>
          <div className="text-slate-400 text-xs">🏦 ${bankTotal(me?.bank)}M</div>
        </div>

        {/* My assets */}
        <div className="px-1 pb-1">
          <AssetDisplay assets={me?.assets ?? {}} />
        </div>

        {/* Errors */}
        {(error || actionError) && (
          <div className="mx-3 mb-1 px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/30 text-red-300 text-xs">
            ⚠ {error || actionError}
          </div>
        )}

        {/* Plays + End Turn */}
        {isMyTurn && state.phase === "playing" && !state.pendingAction && (
          <div className="flex items-center justify-between px-3 pb-1.5">
            <div className="flex items-center gap-1">
              {Array.from({ length: state.maxPlays }).map((_, i) => (
                <div key={i} className={`w-5 h-1.5 rounded-full ${i < state.playsThisTurn ? "bg-slate-600" : "bg-emerald-400"}`} />
              ))}
              <span className="text-slate-400 text-xs ml-1.5">{playsLeft} left</span>
            </div>
            <button onClick={handleEndTurn} className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors">
              End Turn →
            </button>
          </div>
        )}

        {/* Hand */}
        <div className="px-2 pb-3 pt-0.5">
          <div className="text-slate-500 text-xs px-1 mb-1">Hand ({me?.hand?.length ?? 0})</div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(me?.hand ?? []).map((card) => (
              <Card
                key={card.id}
                card={card}
                selected={selectedCard?.id === card.id}
                onClick={() => handleCardClick(card)}
                dimmed={
                  (!isMyTurn || state.phase !== "playing" || !!state.pendingAction || playsLeft <= 0)
                  && selectedCard?.id !== card.id
                }
              />
            ))}
            {!me?.hand?.length && (
              <div className="text-slate-500 text-xs italic py-4">No cards</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pick Player Modal ────────────────────────────────────────────────────────
function PickPlayerModal({ opponentIndices, card, onPick, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-slate-800 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-8 animate-card-deal">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <div className="text-center mb-4">
          <h3 className="text-white font-bold text-lg">Choose Target</h3>
          <p className="text-slate-400 text-sm mt-1">Who do you want to play <strong className="text-white">{card?.name}</strong> on?</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {opponentIndices.map(({ player: opp, i }) => (
            <button
              key={opp.id}
              onClick={() => onPick(opp, i)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold`}>
                {opp.name[0]?.toUpperCase()}
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold">{opp.name}</div>
                <div className="text-slate-400 text-xs">
                  🏦 ${opp.bank?.reduce((s, c) => s + (c.value ?? 0), 0) ?? 0}M ·
                  🏠 {countCompletedSets(opp.assets ?? {})}/3 sets
                </div>
              </div>
              <span className="text-slate-400 text-lg">›</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 font-semibold hover:bg-white/5 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce-sm">🃏</div>
        <div className="text-white/60 text-sm">Loading game…</div>
      </div>
    </div>
  );
}

// ─── Winner Overlay ───────────────────────────────────────────────────────────
function WinnerOverlay({ winnerName, isMe, onRestart }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
        <div className="text-6xl mb-4">{isMe ? "🏆" : "💔"}</div>
        <h2 className="text-white font-black text-3xl mb-2">{isMe ? "You Win!" : "Game Over"}</h2>
        <p className="text-slate-300 text-sm mb-6">
          {isMe
            ? "You completed 3 property sets first! Incredible!"
            : `${winnerName} won this round. Better luck next time!`}
        </p>
        <button onClick={onRestart} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-colors">
          Play Again
        </button>
      </div>
    </div>
  );
}
