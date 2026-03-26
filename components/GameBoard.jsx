"use client";
import { useState, useCallback } from "react";
import Card from "./Card";
import AssetDisplay from "./AssetDisplay";
import ActionModal from "./ActionModal";
import { COLORS, countCompletedSets } from "@/lib/cards";

const AVATAR_COLORS = ["bg-rose-600/70","bg-indigo-600/70","bg-amber-600/70","bg-emerald-600/70"];

function bankTotal(bank = []) { return bank.reduce((s, c) => s + (c.value ?? 0), 0); }

const NEEDS_TARGET_PLAYER  = new Set(["debtcollector","identityswap","taxtherich","slydeal","dealbreaker","wreckingball","forceddeal"]);
const NEEDS_FURTHER_INPUT  = { slydeal: "pick-property", dealbreaker: "pick-set", wreckingball: "pick-set", forceddeal: "pick-force-deal" };

export default function GameBoard({ state, myId, onMove, error }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [modalMode,    setModalMode]    = useState(null);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [actionError,  setActionError]  = useState(null);

  if (!state) return <LoadingScreen />;

  const myIdx     = state.players.findIndex((p) => p.id === myId);
  const me        = state.players[myIdx];
  const opponents = state.players.filter((p) => p.id !== myId);
  const isMyTurn  = state.turnIndex === myIdx;
  const playsLeft = state.maxPlays - state.playsThisTurn;
  const myCompletedSets = countCompletedSets(me?.assets ?? {});

  const pendingForMe      = state.pendingAction && state.pendingAction.toIdx === myIdx;
  const pendingMultiForMe = state.pendingAction &&
    Array.isArray(state.pendingAction.toIdxList) &&
    state.pendingAction.toIdxList.includes(myIdx) &&
    !state.pendingAction.respondedList?.includes(myIdx);
  const mustRespond = pendingForMe || pendingMultiForMe;
  const isWaiting   = state.pendingAction && !mustRespond;
  const hasJSN      = (me?.hand ?? []).some((c) => c.action === "justsayno");

  const handleCardClick = useCallback((card) => {
    if (!isMyTurn || state.phase !== "playing" || state.pendingAction) return;
    if (playsLeft <= 0) { setActionError("No plays remaining — end your turn"); return; }
    setActionError(null);
    if (selectedCard?.id === card.id) { setSelectedCard(null); setModalMode(null); setTargetPlayer(null); return; }
    setSelectedCard(card); setTargetPlayer(null);
    if (card.type === "property" || card.type === "money") setModalMode("confirm");
    else if (card.type === "wildproperty") setModalMode("pick-wild-color");
    else if (card.type === "rent") setModalMode("pick-color");
    else if (card.type === "action") {
      if (card.action === "justsayno") { setActionError("Just Say No can only be played when targeted"); setSelectedCard(null); return; }
      if (NEEDS_TARGET_PLAYER.has(card.action)) setModalMode("pick-player");
      else setModalMode("confirm");
    }
  }, [isMyTurn, state, playsLeft, selectedCard]);

  const handlePlayerSelected = useCallback((player, playerIdx) => {
    setTargetPlayer({ player, playerIdx });
    setModalMode(NEEDS_FURTHER_INPUT[selectedCard?.action] ?? "confirm-targeted");
  }, [selectedCard]);

  const handleModalConfirm = useCallback(async (params) => {
    if (!selectedCard) return;
    const move = { cardId: selectedCard.id, type: "play", ...(targetPlayer ? { targetPlayerIdx: targetPlayer.playerIdx } : {}), ...params };
    setSelectedCard(null); setModalMode(null); setTargetPlayer(null);
    await onMove(move);
  }, [selectedCard, targetPlayer, onMove]);

  const handleModalCancel = useCallback(() => {
    setSelectedCard(null); setModalMode(null); setTargetPlayer(null); setActionError(null);
  }, []);

  const handleRespond    = useCallback(async (response) => { await onMove({ type: "respond", response }); }, [onMove]);
  const handleEndTurn    = useCallback(async () => { if (!isMyTurn || state.pendingAction) return; setSelectedCard(null); setModalMode(null); await onMove({ type: "endTurn" }); }, [isMyTurn, state, onMove]);

  const opponentIndices = state.players.map((p, i) => ({ player: p, i })).filter(({ player }) => player.id !== myId);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">

      {/* ── Overlays ──────────────────────────────────────────────────────── */}
      {state.phase === "ended" && <WinnerOverlay winnerName={state.winner} isMe={state.winnerId === myId} onRestart={() => { window.location.href = "/"; }} />}

      {mustRespond && state.pendingAction && (
        <ActionModal mode="respond"
          pendingAction={{ ...state.pendingAction, attackerName: state.players[state.pendingAction.fromIdx]?.name ?? "Opponent" }}
          hasJustSayNo={hasJSN}
          onConfirm={({ response }) => handleRespond(response)}
          onCancel={() => {}} />
      )}

      {isWaiting && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-800/95 border border-yellow-400/40 rounded-2xl px-5 py-3 shadow-2xl text-center pointer-events-none">
          <div className="text-yellow-300 text-xs font-bold uppercase tracking-wide">Waiting…</div>
          <div className="text-white text-sm font-bold mt-0.5">Opponent is responding</div>
        </div>
      )}

      {modalMode && selectedCard && !mustRespond && (
        <>
          {modalMode === "pick-player" && (
            <PickPlayerModal opponentIndices={opponentIndices} card={selectedCard} onPick={handlePlayerSelected} onCancel={handleModalCancel} />
          )}
          {(modalMode === "confirm" || modalMode === "confirm-targeted") && (
            <ActionModal mode="confirm" card={selectedCard} targetPlayerName={targetPlayer?.player?.name} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
          )}
          {modalMode === "pick-color" && (
            <ActionModal mode="pick-color" card={selectedCard} myAssets={me?.assets ?? {}} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
          )}
          {modalMode === "pick-wild-color" && (
            <ActionModal mode="pick-wild-color" card={selectedCard} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
          )}
          {modalMode === "pick-property" && targetPlayer && (
            <ActionModal mode="pick-property" opponentAssets={targetPlayer.player.assets ?? {}} opponentName={targetPlayer.player.name} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
          )}
          {modalMode === "pick-set" && targetPlayer && (
            <ActionModal mode="pick-set" card={selectedCard} opponentAssets={targetPlayer.player.assets ?? {}} opponentName={targetPlayer.player.name} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
          )}
          {modalMode === "pick-force-deal" && targetPlayer && (
            <ActionModal mode="pick-force-deal" opponentAssets={targetPlayer.player.assets ?? {}} opponentName={targetPlayer.player.name} myAssets={me?.assets ?? {}} myName={me?.name ?? "You"} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RESPONSIVE LAYOUT
          Mobile:  flex-col (opponents top → log → my zone bottom)
          Desktop: grid — opponents row | log/center | my zone bottom
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <div className="text-white font-black text-sm leading-none">${state.pot}M Pot</div>
            <div className="text-slate-500 text-xs">Turn {state.turnCount + 1} · Deck {state.deck?.length ?? 0}</div>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
          isMyTurn
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 turn-pulse"
            : "bg-slate-700 text-slate-400"
        }`}>
          {isMyTurn ? "Your Turn ▶" : `${state.players[state.turnIndex]?.name ?? "…"}'s Turn`}
        </div>

        {/* Plays (desktop visible here) */}
        {isMyTurn && state.phase === "playing" && !state.pendingAction && (
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: state.maxPlays }).map((_, i) => (
                <div key={i} className={`w-4 h-1.5 rounded-full ${i < state.playsThisTurn ? "bg-slate-600" : "bg-emerald-400"}`} />
              ))}
              <span className="text-slate-400 text-xs ml-1">{playsLeft} plays</span>
            </div>
            <button onClick={handleEndTurn} className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors">
              End Turn →
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      {/* Mobile: flex-col | Desktop: 3-row grid inside 2-col grid */}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[1fr_340px] md:grid-rows-[1fr_auto]">

        {/* ── LEFT / TOP: ALL PLAYERS ON TABLE ───────────────────────── */}
        <div className="md:row-span-2 md:border-r border-white/5 overflow-y-auto min-h-0 flex flex-col">

          {/* OPPONENTS — visible on the "table" */}
          <div className="flex-shrink-0">
            <div className="px-3 pt-2 pb-1 text-slate-500 text-xs font-bold uppercase tracking-widest">
              Players on Table
            </div>

            {/* On mobile: horizontal scroll. On desktop: vertical list */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-2 px-2 pb-2">
              {opponents.map((opp) => {
                const oppIdx    = state.players.findIndex((p) => p.id === opp.id);
                const isOppTurn = state.turnIndex === oppIdx;
                const oppSets   = countCompletedSets(opp.assets ?? {});

                return (
                  <div
                    key={opp.id}
                    className="flex-shrink-0 md:flex-shrink bg-white/5 rounded-2xl p-3 border border-white/5"
                    style={{ minWidth: 220 }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 ${AVATAR_COLORS[oppIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-black text-sm ${isOppTurn ? "ring-2 ring-emerald-400 turn-pulse" : ""}`}>
                        {opp.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-white font-bold text-sm truncate">{opp.name}</span>
                          {isOppTurn && <span className="text-emerald-400 text-xs flex-shrink-0">▶</span>}
                        </div>
                        <div className="flex gap-2 text-slate-400" style={{ fontSize: 10 }}>
                          <span>🃏 {opp.hand?.length ?? 0} cards</span>
                          <span>💰 ${bankTotal(opp.bank)}M</span>
                          <span>🏠 {oppSets}/3 sets</span>
                        </div>
                      </div>
                    </div>

                    {/* Properties — full-sized mini cards for readability */}
                    <AssetDisplay assets={opp.assets ?? {}} small />
                  </div>
                );
              })}
            </div>
          </div>

          {/* MY ASSETS — visible on table for all to see */}
          <div className="flex-1 p-3">
            <div className="bg-indigo-900/20 rounded-2xl p-3 border border-indigo-500/20 h-full">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-full flex-shrink-0 ${AVATAR_COLORS[myIdx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-black text-sm ${isMyTurn ? "ring-2 ring-emerald-400 turn-pulse" : ""}`}>
                  {me?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{me?.name} <span className="text-indigo-400 text-xs">(You)</span></div>
                  <div className="text-slate-400" style={{ fontSize: 10 }}>
                    💰 ${bankTotal(me?.bank)}M bank · 🏠 {myCompletedSets}/3 sets
                  </div>
                </div>
              </div>
              <AssetDisplay assets={me?.assets ?? {}} />
            </div>
          </div>
        </div>

        {/* ── RIGHT / BOTTOM: GAME LOG + MY HAND ─────────────────────── */}
        <div className="flex flex-col min-h-0 md:row-span-2">

          {/* Game Log */}
          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0 border-b border-white/5">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Game Log</div>
            {[...(state.log ?? [])].reverse().map((entry, i) => (
              <div key={i} className={`text-xs leading-relaxed ${i === 0 ? "text-white/80" : "text-slate-600"}`}>
                {i === 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 mb-0.5" />}
                {entry}
              </div>
            ))}
          </div>

          {/* MY HAND ZONE */}
          <div className="bg-slate-900/60 flex-shrink-0">
            {/* Errors */}
            {(error || actionError) && (
              <div className="mx-3 mt-2 px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/30 text-red-300 text-xs">
                ⚠ {error || actionError}
              </div>
            )}

            {/* Mobile plays + end turn */}
            {isMyTurn && state.phase === "playing" && !state.pendingAction && (
              <div className="flex md:hidden items-center justify-between px-3 py-2">
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

            {/* Hand label */}
            <div className="px-3 pt-2 pb-1 text-slate-500 text-xs font-bold uppercase tracking-widest">
              Your Hand ({me?.hand?.length ?? 0})
              {!isMyTurn && <span className="ml-2 text-slate-600 normal-case font-normal">waiting for your turn…</span>}
            </div>

            {/* Cards */}
            <div className="card-hand-scroll flex gap-2 px-3 pb-4">
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
                <div className="text-slate-600 text-xs italic py-4 pl-1">No cards in hand</div>
              )}
            </div>
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
      <div className="relative z-10 w-full max-w-md bg-slate-800 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-8">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <div className="text-center mb-4">
          <h3 className="text-white font-bold text-lg">Choose Target</h3>
          <p className="text-slate-400 text-sm mt-1">Who do you want to play <strong className="text-white">{card?.name}</strong> on?</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {opponentIndices.map(({ player: opp, i }) => (
            <button key={opp.id} onClick={() => onPick(opp, i)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
              <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold`}>
                {opp.name[0]?.toUpperCase()}
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold">{opp.name}</div>
                <div className="text-slate-400 text-xs">💰 ${bankTotal(opp.bank)}M · 🏠 {countCompletedSets(opp.assets ?? {})}/3</div>
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

function WinnerOverlay({ winnerName, isMe, onRestart }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
        <div className="text-6xl mb-4">{isMe ? "🏆" : "💔"}</div>
        <h2 className="text-white font-black text-3xl mb-2">{isMe ? "You Win!" : "Game Over"}</h2>
        <p className="text-slate-300 text-sm mb-6">
          {isMe ? "You completed 3 property sets first!" : `${winnerName} won this round.`}
        </p>
        <button onClick={onRestart} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-colors">
          Play Again
        </button>
      </div>
    </div>
  );
}
