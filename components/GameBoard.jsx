"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Card from "./Card";
import AssetDisplay from "./AssetDisplay";
import ActionModal from "./ActionModal";
import { COLORS, countCompletedSets } from "@/lib/cards";
import { narrateYourTurn, narrateWin, narrateSpeak, narrateCardPlay, narrateJustSayNo } from "@/lib/narrator";

// ── Constants ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["bg-rose-600","bg-indigo-600","bg-amber-600","bg-emerald-600"];
const AVATAR_RING   = ["ring-rose-400","ring-indigo-400","ring-amber-400","ring-emerald-400"];
const AVATAR_BG_HEX = ["#e11d48","#4f46e5","#d97706","#059669"];

function bankTotal(bank = []) { return bank.reduce((s, c) => s + (c.value ?? 0), 0); }

const NEEDS_TARGET_PLAYER = new Set(["debtcollector","identityswap","taxtherich","slydeal","dealbreaker","wreckingball","forceddeal"]);
const NEEDS_FURTHER_INPUT = { slydeal: "pick-property", dealbreaker: "pick-set", wreckingball: "pick-set", forceddeal: "pick-force-deal" };

// ── Country flag from code ───────────────────────────────────────────────────
function countryFlag(code) {
  if (!code) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function GameBoard({ state, myId, onMove, error }) {
  const [selectedCard,   setSelectedCard]   = useState(null);
  const [modalMode,      setModalMode]      = useState(null);
  const [targetPlayer,   setTargetPlayer]   = useState(null);
  const [actionError,    setActionError]    = useState(null);
  const [flipWildCard,   setFlipWildCard]   = useState(null);
  const [showFullLog,    setShowFullLog]    = useState(false);
  const [cheering,       setCheering]       = useState(false);
  const prevTurnRef = useRef(null);

  // ── Effects (narration) ────────────────────────────────────────────────────
  useEffect(() => {
    if (state?.phase === "ended") {
      setCheering(true);
      narrateWin(state.winnerId === myId ? "You" : (state.winner ?? "Someone"));
    }
  }, [state?.phase]); // eslint-disable-line

  useEffect(() => {
    if (!state) return;
    const cur = state.turnIndex;
    if (cur !== prevTurnRef.current) {
      prevTurnRef.current = cur;
      const myIdx2 = state.players?.findIndex((p) => p.id === myId) ?? -1;
      if (cur === myIdx2 && state.phase === "playing") narrateYourTurn();
    }
  }, [state?.turnIndex]); // eslint-disable-line

  useEffect(() => {
    if (!state?.pendingAction) return;
    const myIdx2 = state.players?.findIndex((p) => p.id === myId) ?? -1;
    const pa = state.pendingAction;
    const targetsMe = pa.toIdx === myIdx2 || (Array.isArray(pa.toIdxList) && pa.toIdxList.includes(myIdx2));
    if (targetsMe && pa.type !== "pay-choice") {
      const phrases = { debtcollector: "Debt Collector!", birthday: "Pay up!", slydeal: "Stealing your property!", dealbreaker: "Your set is being taken!", rent: "Rent is due!", forceddeal: "Forced Deal!", wreckingball: "Wrecking Ball!" };
      if (phrases[pa.type]) narrateSpeak(phrases[pa.type], 0.9, 1.2);
    }
  }, [state?.pendingAction?.id]); // eslint-disable-line

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (!state) return <LoadingScreen />;

  const myIdx = state.players.findIndex((p) => p.id === myId);
  if (myIdx === -1 && state.phase === "playing") {
    return (
      <div className="flex items-center justify-center h-full text-white text-center p-8">
        <div>
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold mb-2">Session expired</h2>
          <p className="text-slate-400 text-sm mb-4">The game is in progress but your session was lost.</p>
          <button onClick={() => window.location.href = "/"} className="px-6 py-2 bg-violet-600 rounded-xl font-bold text-sm">Back to Lobby</button>
        </div>
      </div>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const me        = state.players[myIdx];
  const opponents = state.players.filter((p) => p.id !== myId);
  const isMyTurn  = state.turnIndex === myIdx;
  const playsLeft = state.maxPlays - state.playsThisTurn;
  const myCompletedSets = countCompletedSets(me?.assets ?? {});

  const pendingForMe      = state.pendingAction && state.pendingAction.toIdx === myIdx;
  const pendingMultiForMe = state.pendingAction && Array.isArray(state.pendingAction.toIdxList) && state.pendingAction.toIdxList.includes(myIdx) && !state.pendingAction.respondedList?.includes(myIdx);
  const mustRespond       = pendingForMe || pendingMultiForMe;
  const mustPayAssets     = pendingForMe && state.pendingAction?.type === "pay-choice";
  const mustDiscard       = pendingForMe && state.pendingAction?.type === "discard";
  const mustCounterJsn    = state.pendingAction?.jsnChain?.waitingForIdx === myIdx;
  const isWaiting         = state.pendingAction && !mustRespond && !mustCounterJsn;
  const hasJSN            = (me?.hand ?? []).some((c) => c.action === "justsayno");
  const opponentIndices   = state.players.map((p, i) => ({ player: p, i })).filter(({ player }) => player.id !== myId);

  // ── Handlers (unchanged logic) ─────────────────────────────────────────────
  const handleCardClick = useCallback((card) => {
    if (!isMyTurn || state.phase !== "playing" || state.pendingAction) return;
    if (playsLeft <= 0) { setActionError("No plays left — end your turn"); return; }
    setActionError(null);
    if (selectedCard?.id === card.id) { setSelectedCard(null); setModalMode(null); setTargetPlayer(null); return; }
    setSelectedCard(card); setTargetPlayer(null);
    if (card.type === "property" || card.type === "money") setModalMode("confirm");
    else if (card.type === "wildproperty") setModalMode("pick-wild-color");
    else if (card.type === "rent") setModalMode("pick-color");
    else if (card.type === "action") {
      if (card.action === "justsayno") { setActionError("Just Say No can only be played in response"); setSelectedCard(null); return; }
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
    if (selectedCard.action === "justsayno") narrateJustSayNo();
    else narrateCardPlay(selectedCard);
    const move = { cardId: selectedCard.id, type: "play", ...(targetPlayer && !params?.asBank ? { targetPlayerIdx: targetPlayer.playerIdx } : {}), ...params };
    setSelectedCard(null); setModalMode(null); setTargetPlayer(null);
    await onMove(move);
  }, [selectedCard, targetPlayer, onMove]);

  const handleModalCancel = useCallback(() => {
    setSelectedCard(null); setModalMode(null); setTargetPlayer(null); setActionError(null); setFlipWildCard(null);
  }, []);

  const handleWildFlip = useCallback((fromColor, card) => {
    if (!isMyTurn || state.phase !== "playing" || state.pendingAction) return;
    setFlipWildCard({ card, fromColor });
  }, [isMyTurn, state]);

  const handleFlipConfirm = useCallback(async ({ toColor }) => {
    const { card, fromColor } = flipWildCard;
    setFlipWildCard(null);
    await onMove({ type: "flipWild", cardId: card.id, fromColor, toColor });
  }, [flipWildCard, onMove]);

  const handleRespond = useCallback(async (responseOrObj) => {
    if (typeof responseOrObj === "object" && responseOrObj !== null && "response" in responseOrObj) {
      await onMove({ type: "respond", ...responseOrObj });
    } else {
      await onMove({ type: "respond", response: responseOrObj });
    }
  }, [onMove]);

  const handleEndTurn = useCallback(async () => {
    if (!isMyTurn || state.pendingAction) return;
    setSelectedCard(null); setModalMode(null);
    await onMove({ type: "endTurn" });
  }, [isMyTurn, state, onMove]);

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ minHeight: "100dvh", maxHeight: "100dvh" }}>

      {/* ── Modals (all game logic modals — preserved exactly) ──────────── */}
      {state.phase === "ended" && (
        <WinnerOverlay winnerName={state.winner} isMe={state.winnerId === myId}
          fairnessProof={state.fairnessProof}
          onPlayAgain={() => window.location.href = "/"}
        />
      )}

      {flipWildCard && <ActionModal mode="flip-wild" card={flipWildCard.card} fromColor={flipWildCard.fromColor} onConfirm={handleFlipConfirm} onCancel={handleModalCancel} />}

      {mustCounterJsn && state.pendingAction && (
        <ActionModal mode="counter-jsn"
          pendingAction={{ ...state.pendingAction, defenderName: state.players[state.pendingAction.jsnChain?.defenderIdx]?.name ?? "Opponent" }}
          onConfirm={({ response }) => handleRespond(response)} onCancel={() => {}} />
      )}

      {mustDiscard && state.pendingAction && (
        <ActionModal mode="discard" pendingAction={state.pendingAction} myHand={me?.hand ?? []}
          onConfirm={({ cardIds }) => onMove({ type: "discard", cardIds })} onCancel={() => {}} />
      )}

      {mustPayAssets && state.pendingAction && (
        <ActionModal mode="pay-choice"
          pendingAction={{ ...state.pendingAction, attackerName: state.players[state.pendingAction.fromIdx]?.name ?? "Opponent" }}
          myAssets={me?.assets ?? {}} myBank={me?.bank ?? []}
          onConfirm={({ cashIds, cards }) => handleRespond({ response: "pay-choice", cashIds, cards })} onCancel={() => {}} />
      )}

      {mustRespond && !mustPayAssets && !mustDiscard && !mustCounterJsn && state.pendingAction && (
        <ActionModal mode="respond"
          pendingAction={{ ...state.pendingAction, attackerName: state.players[state.pendingAction.fromIdx]?.name ?? "Opponent" }}
          myAssets={me?.assets ?? {}} opponentAssets={state.players[state.pendingAction.fromIdx]?.assets ?? {}}
          hasJustSayNo={hasJSN}
          onConfirm={({ response }) => handleRespond(response)} onCancel={() => {}} />
      )}

      {isWaiting && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-amber-500/30 rounded-2xl px-5 py-3 shadow-2xl text-center pointer-events-none backdrop-blur-md">
          <div className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Waiting</div>
          <div className="text-white text-xs font-bold mt-0.5">Opponent is responding...</div>
        </div>
      )}

      {modalMode && selectedCard && !mustRespond && (
        <>
          {modalMode === "pick-player" && <PickPlayerModal opponentIndices={opponentIndices} card={selectedCard} onPick={handlePlayerSelected} onCancel={handleModalCancel} onBankInstead={() => handleModalConfirm({ asBank: true })} />}
          {(modalMode === "confirm" || modalMode === "confirm-targeted") && <ActionModal mode="confirm" card={selectedCard} targetPlayerName={targetPlayer?.player?.name} onConfirm={handleModalConfirm} onCancel={handleModalCancel} onBankInstead={selectedCard?.type === "action" || selectedCard?.type === "rent" ? () => handleModalConfirm({ asBank: true }) : undefined} />}
          {modalMode === "pick-color" && <ActionModal mode="pick-color" card={selectedCard} myAssets={me?.assets ?? {}} onConfirm={handleModalConfirm} onCancel={handleModalCancel} onBankInstead={() => handleModalConfirm({ asBank: true })} />}
          {modalMode === "pick-wild-color" && <ActionModal mode="pick-wild-color" card={selectedCard} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />}
          {modalMode === "pick-property" && targetPlayer && <ActionModal mode="pick-property" opponentAssets={targetPlayer.player.assets ?? {}} opponentName={targetPlayer.player.name} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />}
          {modalMode === "pick-set" && targetPlayer && <ActionModal mode="pick-set" card={selectedCard} opponentAssets={targetPlayer.player.assets ?? {}} opponentName={targetPlayer.player.name} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />}
          {modalMode === "pick-force-deal" && targetPlayer && <ActionModal mode="pick-force-deal" opponentAssets={targetPlayer.player.assets ?? {}} opponentName={targetPlayer.player.name} myAssets={me?.assets ?? {}} myName={me?.name ?? "You"} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TOP BAR — Pot, Timer, Turn indicator, Controls
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-black/95 border-b border-white/6 flex-shrink-0 backdrop-blur-md">
        {/* Pot + Room */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/15 flex items-center justify-center">
            <span className="text-base">💰</span>
          </div>
          <div>
            <div className="text-white font-black text-sm leading-none">${state.pot}M</div>
            <div className="text-slate-600 text-[10px]">Turn {state.turnCount + 1} · {state.deck?.length ?? 0} left</div>
          </div>
        </div>

        {/* Center: Timer + Turn */}
        <div className="flex items-center gap-2">
          {state.phase === "playing" && state.timer && (
            <TimerRing timer={state.timer} />
          )}
          <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            isMyTurn
              ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 turn-pulse"
              : "bg-white/4 text-slate-500 border border-white/5"
          }`}>
            {isMyTurn ? "Your Turn" : `${state.players[state.turnIndex]?.name ?? "..."} thinking...`}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isMyTurn && state.phase === "playing" && !state.pendingAction && (
            <>
              <div className="hidden sm:flex items-center gap-0.5">
                {Array.from({ length: state.maxPlays }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < state.playsThisTurn ? "bg-slate-700" : "bg-emerald-400 shadow-sm shadow-emerald-400/40"
                  }`} />
                ))}
                <span className="text-slate-600 text-[9px] ml-1">{playsLeft} plays</span>
              </div>
              <button onClick={handleEndTurn}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[11px] transition-all shadow-lg shadow-violet-600/20">
                End Turn
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN LAYOUT — Table (players + assets) | Sidebar (log + hand)
      ═══════════════════════════════════════════════════════════════════ */}
      {/* ═══ MAIN LAYOUT: Mobile = 3 layers (header/scroll/fixed-cards) ═══ */}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[1fr_320px] md:grid-rows-[1fr_auto]">

        {/* ── SCROLLABLE AREA: Players + Assets ──────────────────────── */}
        <div className="md:row-span-2 md:border-r border-white/5 overflow-y-auto min-h-0 flex flex-col" style={{ paddingBottom: "200px" }}>

          {/* Opponents */}
          <div className="flex-shrink-0 px-2 pt-2">
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-2 pb-2 no-scrollbar">
              {opponents.map((opp) => {
                const oppIdx = state.players.findIndex((p) => p.id === opp.id);
                const isOppTurn = state.turnIndex === oppIdx;
                const oppSets = countCompletedSets(opp.assets ?? {});

                return (
                  <div key={opp.id}
                    className={`flex-shrink-0 md:flex-shrink rounded-xl p-3 border transition-all ${
                      isOppTurn
                        ? "bg-emerald-950/30 border-emerald-500/20"
                        : "bg-white/[0.02] border-white/5 hover:border-white/8"
                    }`}
                    style={{ minWidth: 240 }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      {/* Avatar with timer ring when it's their turn */}
                      <div className="relative">
                        <img src="/avatar-default.jpg" alt="" className="w-8 h-8 rounded-full object-cover" />
                        {isOppTurn && (
                          <div className="absolute -inset-1 rounded-full border-2 border-emerald-400/50 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold text-xs truncate">{opp.name}</span>
                          {opp.countryCode && <span className="text-[10px]">{countryFlag(opp.countryCode)}</span>}
                          {isOppTurn && <span className="text-emerald-400 text-[10px] shrink-0">thinking...</span>}
                        </div>
                        <div className="flex gap-3 text-slate-500 text-[10px]">
                          <span>{opp.hand?.length ?? 0} cards</span>
                          <span>${bankTotal(opp.bank)}M</span>
                          <span className={oppSets >= 2 ? "text-amber-400 font-bold" : ""}>{oppSets}/3 sets</span>
                        </div>
                      </div>
                    </div>
                    <AssetDisplay assets={opp.assets ?? {}} small />
                  </div>
                );
              })}
            </div>
          </div>

          {/* My Assets on Table */}
          <div className="flex-1 p-2">
            <div className={`rounded-xl p-3 border h-full transition-all ${
              isMyTurn ? "bg-violet-950/20 border-violet-500/15" : "bg-white/[0.02] border-white/5"
            }`}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="relative">
                  <img src="/avatar-default.jpg" alt="" className="w-8 h-8 rounded-full object-cover" />
                  {isMyTurn && <div className="absolute -inset-1 rounded-full border-2 border-violet-400/40 animate-pulse" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold text-xs">{me?.name}</span>
                    <span className="text-violet-400 text-[10px]">(You)</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    ${bankTotal(me?.bank)}M bank · <span className={myCompletedSets >= 2 ? "text-amber-400 font-bold" : ""}>{myCompletedSets}/3 sets</span>
                  </div>
                </div>
              </div>
              <AssetDisplay assets={me?.assets ?? {}} onWildFlip={isMyTurn && !state.pendingAction ? handleWildFlip : undefined} />
            </div>
          </div>
        </div>

        {/* ── SIDEBAR: Log + Hand ─────────────────────────────────────── */}
        <div className="flex flex-col min-h-0 md:row-span-2">

          {/* Game Log */}
          <div className="flex-shrink-0 md:flex-1 md:overflow-y-auto px-3 py-2 border-b border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Log</span>
              {(state.log?.length ?? 0) > 3 && (
                <button onClick={() => setShowFullLog(v => !v)} className="text-slate-700 hover:text-slate-400 text-[10px] md:hidden">{showFullLog ? "less" : "more"}</button>
              )}
            </div>
            <div className="md:hidden">
              {[...(state.log ?? [])].reverse().slice(0, showFullLog ? undefined : 3).map((entry, i) => (
                <div key={i} className={`leading-relaxed text-[10px] ${i === 0 ? "text-slate-400" : "text-slate-700"}`}>
                  {i === 0 && <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 mr-1 mb-0.5" />}{entry}
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              {[...(state.log ?? [])].reverse().slice(0, 15).map((entry, i) => (
                <div key={i} className={`leading-relaxed text-[10px] ${i === 0 ? "text-slate-400" : "text-slate-700"}`}>
                  {i === 0 && <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 mr-1 mb-0.5" />}{entry}
                </div>
              ))}
            </div>
          </div>

          {/* ── MY HAND — Fixed at bottom on mobile, inline on desktop ── */}
          <div className="fixed md:relative bottom-0 left-0 right-0 md:bottom-auto z-40 bg-slate-950/95 md:bg-black/40 backdrop-blur-md md:backdrop-blur-none flex-shrink-0 overflow-visible border-t border-white/5 safe-bottom">
            {/* Errors */}
            {(error || actionError) && (
              <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">{error || actionError}</div>
            )}

            {/* Mobile controls */}
            {isMyTurn && state.phase === "playing" && !state.pendingAction && (
              <div className="flex md:hidden items-center justify-between px-3 py-1.5">
                <div className="flex items-center gap-1">
                  {Array.from({ length: state.maxPlays }).map((_, i) => (
                    <div key={i} className={`w-4 h-1.5 rounded-full ${i < state.playsThisTurn ? "bg-slate-700" : "bg-emerald-400"}`} />
                  ))}
                  <span className="text-slate-500 text-[10px] ml-1">{playsLeft}</span>
                </div>
                <button onClick={handleEndTurn} className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px]">End Turn</button>
              </div>
            )}

            {/* Hand label */}
            <div className="px-3 pt-1.5 pb-0.5 flex items-center gap-2">
              <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Hand ({me?.hand?.length ?? 0})</span>
              {!isMyTurn && state.phase === "playing" && <span className="text-slate-700 text-[10px]">waiting...</span>}
            </div>

            {/* Fan hand */}
            <div className="relative flex items-end justify-center pb-2 pt-1 overflow-visible" style={{ height: 150, perspective: "900px", perspectiveOrigin: "50% 200%", transform: "scale(1)", transformOrigin: "bottom center" }}>
              {(me?.hand ?? []).map((card, i) => {
                const total  = me.hand.length;
                const center = (total - 1) / 2;
                const offset = i - center;
                const spread = Math.min(38, 260 / Math.max(total, 1));
                const tilt   = offset * (total <= 4 ? 5 : total <= 7 ? 7 : 9);
                const tx     = offset * spread;
                const ty     = Math.abs(offset) * 2.5;
                const isSelected = selectedCard?.id === card.id;
                const canPlay = isMyTurn && state.phase === "playing" && !state.pendingAction && playsLeft > 0;
                return (
                  <div key={card.id}
                    style={{
                      position: "absolute", bottom: 0, left: "50%", transformOrigin: "50% 130%",
                      transform: `translateX(calc(-50% + ${tx}px)) translateY(${ty - (isSelected ? 18 : 0)}px) rotateZ(${tilt}deg) rotateX(${isSelected ? -12 : 2}deg) scale(${isSelected ? 1.08 : 1})`,
                      transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease",
                      zIndex: isSelected ? total + 10 : i + 1,
                      cursor: canPlay ? "pointer" : "default",
                      filter: (!canPlay && !isSelected) ? "brightness(0.5) saturate(0.5)" : "none",
                    }}
                    onClick={() => handleCardClick(card)}
                  >
                    <Card card={card} selected={isSelected} dimmed={false} />
                  </div>
                );
              })}
              {!me?.hand?.length && <div className="text-slate-700 text-xs italic absolute bottom-4">No cards</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Timer Ring (SVG countdown) ───────────────────────────────────────────────
function TimerRing({ timer }) {
  if (!timer) return null;
  const pct = Math.max(0, Math.min(1, (timer.remainingMs || 0) / (timer.totalMs || 60000)));
  const secs = Math.ceil((timer.remainingMs || 0) / 1000);
  const color = timer.warning ? "#ef4444" : timer.usingBank ? "#f59e0b" : "#22c55e";

  return (
    <div className="relative w-8 h-8 shrink-0">
      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="13" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={`${pct * 81.7} 81.7`}
          style={{ transition: "stroke-dasharray 0.5s linear, stroke 0.3s" }}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${
        timer.warning ? "text-red-400 animate-pulse" : timer.usingBank ? "text-amber-400" : "text-white/70"
      }`}>
        {secs}
      </span>
      {timer.usingBank && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-amber-500 font-bold">BANK</span>
      )}
    </div>
  );
}

// ── Pick Player Modal ────────────────────────────────────────────────────────
function PickPlayerModal({ opponentIndices, card, onPick, onCancel, onBankInstead }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-white/8 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 pb-8">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4" />
        <h3 className="text-white font-bold text-center mb-1">Choose Target</h3>
        <p className="text-slate-500 text-xs text-center mb-4">Play <strong className="text-white">{card?.name}</strong> on...</p>
        <div className="flex flex-col gap-2 mb-3">
          {opponentIndices.map(({ player: opp, i }) => (
            <button key={opp.id} onClick={() => onPick(opp, i)}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all">
              <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % 4]} flex items-center justify-center text-white font-bold text-xs`}>
                {opp.name[0]?.toUpperCase()}
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-sm">{opp.name}</div>
                <div className="text-slate-500 text-[10px]">${bankTotal(opp.bank)}M · {countCompletedSets(opp.assets ?? {})}/3 sets</div>
              </div>
              <span className="text-slate-600">›</span>
            </button>
          ))}
        </div>
        {onBankInstead && (
          <button onClick={onBankInstead} className="w-full py-2 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/20 text-amber-300 font-semibold text-xs transition mb-2">
            Bank for ${card?.value}M instead
          </button>
        )}
        <button onClick={onCancel} className="w-full py-2 rounded-xl border border-white/8 text-slate-500 font-semibold text-xs hover:bg-white/[0.03] transition">Cancel</button>
      </div>
    </div>
  );
}

// ── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">🃏</div>
        <div className="text-slate-600 text-xs">Loading game...</div>
      </div>
    </div>
  );
}

// ── 3D Model Canvas (for winner overlay) ─────────────────────────────────────

// ── Winner Overlay ───────────────────────────────────────────────────────────
function WinnerOverlay({ winnerName, isMe, fairnessProof, onPlayAgain }) {
  const [seconds, setSeconds] = useState(30);
  const [praiseIdx, setPraiseIdx] = useState(0);

  const winPraises = [
    "You absolutely crushed it! 🔥",
    "The table has never seen anyone like you! 👑",
    "Pure genius strategy! 🧠",
    "They never stood a chance! 💪",
    "Champion energy right there! ✨",
    "Your date is SO proud of you! 😍",
    "Legendary play. Absolutely legendary! 🏆",
  ];

  const lossPraises = [
    "That was a tough one... but you'll be back! 💪",
    "Every champion loses before they win! 🌟",
    "Shake it off. The next game is yours! 🔥",
    "Your date believes in you. Try again! ❤️",
    "Close game! One more try? 🎲",
  ];

  const phrases = isMe ? winPraises : lossPraises;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cycle praise messages every 5 seconds
  useEffect(() => {
    const cycle = setInterval(() => setPraiseIdx(i => (i + 1) % phrases.length), 5000);
    return () => clearInterval(cycle);
  }, [phrases.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* 3D Models — dates celebrating */}
      <div className="hidden sm:block absolute right-4 bottom-0 pointer-events-none" style={{maxHeight:"70vh",width:180}}><div style={{background:"white",borderRadius:16,overflow:"hidden"}}><img src="https://pub-3b44ace66a3b4c17af6fa229197f3026.r2.dev/dates/strawberry.gif" alt="" style={{width:"100%",display:"block"}} /></div></div>
      

      {/* Result Card */}
      <div className="relative z-10 bg-slate-900/95 border border-white/10 rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full mx-4">
        <div className="text-5xl mb-3">{isMe ? "🏆" : "💔"}</div>
        <h2 className="text-white font-black text-3xl mb-1">{isMe ? "You Win!" : "Game Over"}</h2>
        <p className="text-slate-400 text-sm mb-1">
          {isMe ? "You completed 3 property sets first!" : `${winnerName} won this round.`}
        </p>

        {/* Rotating praise messages from date */}
        <div className="my-4 min-h-[40px] flex items-center justify-center">
          <p className="text-amber-300 text-sm font-semibold italic transition-opacity duration-500" key={praiseIdx}>
            {phrases[praiseIdx]}
          </p>
        </div>

        {/* Play Again button — disabled for first 5 seconds to let praise sink in */}
        <button
          onClick={seconds <= 25 ? onPlayAgain : undefined}
          className={`w-full py-3.5 rounded-xl font-bold text-base transition-all shadow-lg mb-2 ${
            seconds <= 25
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/25 cursor-pointer"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {seconds > 25 ? `Wait ${seconds - 25}s...` : isMe ? "Play Again" : "Win It Back"}
        </button>

        {/* Countdown bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full mt-2 mb-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-amber-500 rounded-full transition-all duration-1000"
            style={{ width: `${((30 - seconds) / 30) * 100}%` }}
          />
        </div>

        {fairnessProof && (
          <div className="pt-3 border-t border-white/5">
            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">Provably Fair</div>
            <div className="text-[9px] text-slate-700 font-mono truncate" title={fairnessProof.serverSeed}>
              Seed: {fairnessProof.serverSeed?.slice(0, 20)}...
            </div>
            <a href="/fairness" className="text-[10px] text-violet-500 hover:text-violet-400 transition">Verify this game →</a>
          </div>
        )}
      </div>
    </div>
  );
}
