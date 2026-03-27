import {
  createDeck,
  shuffle,
  getRentAmount,
  countCompletedSets,
  isSetComplete,
  COLORS,
} from "./cards";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_PLAYERS    = 4;
const MIN_PLAYERS    = 2;
const MAX_HAND       = 7;
const CARDS_PER_DRAW = 2;
const MAX_PLAYS      = 3;
const SETS_TO_WIN    = 3;
const STARTING_HAND  = 5;
const POT            = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
function makePlayer(id, name) {
  return { id, name, hand: [], assets: {}, bank: [] };
}
function addLog(room, msg) {
  room.log.push(msg);
  if (room.log.length > 40) room.log.shift();
}

// ─── Room Factory ─────────────────────────────────────────────────────────────
export function createRoom(roomId, hostName, maxPlayers = MAX_PLAYERS) {
  const mp     = Math.min(Math.max(maxPlayers, MIN_PLAYERS), MAX_PLAYERS);
  const hostId = genId();
  return {
    roomId,
    phase: "waiting",
    players: [makePlayer(hostId, hostName)],
    deck: createDeck(),
    discard: [],
    turnIndex: 0,
    playsThisTurn: 0,
    maxPlays: MAX_PLAYS,
    winner: null,
    winnerId: null,
    pot: POT,
    turnCount: 0,
    doubleRentActive: false,
    pendingAction: null,
    log: [`Room ${roomId} created for ${mp} players. Waiting for ${mp - 1} more…`],
    hostId,
    roomMaxPlayers: mp,
  };
}

// ─── Join Room ────────────────────────────────────────────────────────────────
export function joinRoom(room, playerName) {
  if (room.phase !== "waiting") throw new Error("Game already started");
  const cap = room.roomMaxPlayers ?? MAX_PLAYERS;
  if (room.players.length >= cap) throw new Error("Room is full");

  const playerId = genId();
  room.players.push(makePlayer(playerId, playerName));

  const remaining = cap - room.players.length;
  if (remaining > 0) {
    addLog(room, `${playerName} joined! (${room.players.length}/${cap}) — ${remaining} more needed.`);
  } else {
    // Auto-start when room reaches its player cap
    startGame(room);
  }

  return { room, playerId };
}

// ─── Force Start (host triggered) ─────────────────────────────────────────────
export function forceStart(room, playerId) {
  if (room.phase !== "waiting") throw new Error("Game already started");
  if (room.hostId !== playerId) throw new Error("Only the host can start the game");
  if (room.players.length < MIN_PLAYERS) throw new Error(`Need at least ${MIN_PLAYERS} players to start`);
  room.roomMaxPlayers = room.players.length; // lock in current count
  startGame(room);
  return room;
}

// ─── Start Game ───────────────────────────────────────────────────────────────
function startGame(room) {
  room.phase = "playing";

  for (let i = 0; i < STARTING_HAND; i++) {
    room.players.forEach((p) => {
      const card = room.deck.pop();
      if (card) p.hand.push(card);
    });
  }

  drawCards(room, 0, CARDS_PER_DRAW);

  const names = room.players.map((p) => p.name).join(", ");
  addLog(room, `Game started! ${names}. ${room.players[0].name} goes first!`);
}

// ─── Draw Cards ───────────────────────────────────────────────────────────────
function drawCards(room, playerIdx, count) {
  const player = room.players[playerIdx];
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    if (room.deck.length === 0) {
      if (room.discard.length === 0) break;
      room.deck = shuffle([...room.discard]);
      room.discard = [];
      addLog(room, "Deck reshuffled from discard pile.");
    }
    const card = room.deck.pop();
    if (card) { player.hand.push(card); drawn++; }
  }
  return drawn;
}

// ─── Process Move ─────────────────────────────────────────────────────────────
export function processMove(room, playerId, move) {
  const playerIdx = room.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1) throw new Error("Player not found");
  const player = room.players[playerIdx];

  if (move.type === "respond")   return handleResponse(room, playerIdx, move);
  if (move.type === "discard")   return handleDiscard(room, playerIdx, move);
  if (move.type === "flipWild")  return handleFlipWild(room, playerIdx, move);

  if (room.pendingAction) throw new Error("Waiting for a player to respond to the pending action");
  if (room.turnIndex !== playerIdx) throw new Error("It's not your turn");
  if (move.type === "endTurn") return endTurn(room, playerIdx);
  if (room.playsThisTurn >= room.maxPlays) throw new Error("No plays remaining this turn");

  const cardIdx = player.hand.findIndex((c) => c.id === move.cardId);
  if (cardIdx === -1) throw new Error("Card not found in hand");
  const card = player.hand[cardIdx];

  switch (card.type) {
    case "property":
    case "wildproperty": playProperty(room, playerIdx, card, cardIdx, move); break;
    case "money":        playMoney(room, playerIdx, card, cardIdx);           break;
    case "action":
      if (move.asBank) { playMoney(room, playerIdx, card, cardIdx); break; }
      playAction(room, playerIdx, card, cardIdx, move);
      break;
    case "rent":
      if (move.asBank) { playMoney(room, playerIdx, card, cardIdx); break; }
      playRent(room, playerIdx, card, cardIdx, move);
      break;
    default: throw new Error(`Unknown card type: ${card.type}`);
  }

  checkWin(room);
  return room;
}

// ─── Play Property ────────────────────────────────────────────────────────────
function playProperty(room, playerIdx, card, cardIdx, move = {}) {
  const player = room.players[playerIdx];

  // Wild property: use the chosen color from the move
  let color = card.color;
  if (card.type === "wildproperty") {
    color = move.chosenColor;
    if (!color || !COLORS[color]) throw new Error("Choose a valid color for this wild property");
    if (card.colors && !card.colors.includes(color)) throw new Error(`This wild card can only be placed as: ${card.colors.join(" or ")}`);
  }

  player.hand.splice(cardIdx, 1);
  if (!player.assets[color]) player.assets[color] = [];
  // Store placed color on card so it survives steal operations
  player.assets[color].push({ ...card, color });
  room.playsThisTurn++;
  addLog(room, `${player.name} added ${card.name} (${COLORS[color].label}) to their properties.`);
}

// ─── Play Money ───────────────────────────────────────────────────────────────
function playMoney(room, playerIdx, card, cardIdx) {
  const player = room.players[playerIdx];
  player.hand.splice(cardIdx, 1);
  player.bank.push(card);
  room.playsThisTurn++;
  addLog(room, `${player.name} banked $${card.value}M.`);
}

// ─── Play Action ──────────────────────────────────────────────────────────────
function playAction(room, playerIdx, card, cardIdx, move) {
  const player = room.players[playerIdx];
  const others = room.players.filter((_, i) => i !== playerIdx);

  if (card.action === "justsayno") {
    throw new Error("Just Say No can only be played in response to an action");
  }

  player.hand.splice(cardIdx, 1);
  room.playsThisTurn++;

  // ── Self-targeted / all-player actions (no blocking) ─────────────────────
  if (card.action === "passgo") {
    const drawn = drawCards(room, playerIdx, 2);
    room.discard.push(card);
    addLog(room, `${player.name} played Pass Go — drew ${drawn} cards!`);
    return;
  }

  if (card.action === "doublerent") {
    room.doubleRentActive = true;
    room.discard.push(card);
    addLog(room, `${player.name} played Double Rent — next rent is doubled! 💥`);
    return;
  }

  if (card.action === "timewarp") {
    room.maxPlays += 1;
    room.discard.push(card);
    addLog(room, `${player.name} played Time Warp — gains +1 extra play this turn! ⏩`);
    return;
  }

  if (card.action === "chaoscard") {
    // All hands go back to deck, everyone redraws 5
    room.players.forEach((p) => {
      room.discard.push(...p.hand);
      p.hand = [];
    });
    room.deck = shuffle([...room.deck, ...room.discard]);
    room.discard = [];
    room.players.forEach((_, i) => drawCards(room, i, 5));
    room.discard.push(card);
    addLog(room, `${player.name} played Chaos Card — ALL hands reshuffled and redrawn! 🌀`);
    return;
  }

  // ── Targeted actions (can be blocked with Just Say No) ───────────────────
  const toIdx = move.targetPlayerIdx ?? null;

  if (card.action === "identityswap") {
    if (toIdx === null || toIdx === playerIdx) throw new Error("Identity Swap requires a target opponent");
    const target = room.players[toIdx];
    if (!target) throw new Error("Target player not found");
    room.discard.push(card);
    room.pendingAction = {
      type: "identityswap",
      fromIdx: playerIdx,
      toIdx,
      card,
      params: {},
    };
    addLog(room, `${player.name} played Identity Swap on ${target.name} — waiting for response… 🔀`);
    return;
  }

  if (card.action === "taxtherich") {
    if (toIdx === null || toIdx === playerIdx) throw new Error("Tax The Rich requires a target opponent");
    const target = room.players[toIdx];
    if (!target) throw new Error("Target player not found");
    const bankValue = target.bank.reduce((s, c) => s + (c.value ?? 0), 0);
    const amount = Math.floor(bankValue / 2);
    room.discard.push(card);
    room.pendingAction = {
      type: "taxtherich",
      fromIdx: playerIdx,
      toIdx,
      card,
      params: { amount },
    };
    addLog(room, `${player.name} played Tax The Rich on ${target.name} ($${amount}M) — waiting for response… 💸`);
    return;
  }

  if (card.action === "debtcollector") {
    if (toIdx === null || toIdx === playerIdx) throw new Error("Debt Collector requires a target opponent");
    const target = room.players[toIdx];
    room.discard.push(card);
    room.pendingAction = {
      type: "debtcollector",
      fromIdx: playerIdx,
      toIdx,
      card,
      params: { amount: 5 },
    };
    addLog(room, `${player.name} played Debt Collector on ${target.name} — waiting for response…`);
    return;
  }

  if (card.action === "birthday") {
    // Birthday hits ALL other players simultaneously
    room.discard.push(card);
    room.pendingAction = {
      type: "birthday",
      fromIdx: playerIdx,
      toIdx: -1,       // -1 = all opponents
      toIdxList: room.players.map((_, i) => i).filter((i) => i !== playerIdx),
      respondedList: [],
      card,
      params: { amount: 2 },
    };
    const nameList = others.map((p) => p.name).join(", ");
    addLog(room, `${player.name} is celebrating! All others must pay $2M (${nameList}) — waiting for responses…`);
    return;
  }

  if (card.action === "slydeal") {
    const { targetPlayerIdx: tIdx, targetCardId, targetColor } = move;
    if (tIdx === undefined || tIdx === playerIdx) throw new Error("Sly Deal requires a target opponent");
    const target = room.players[tIdx];
    if (!target) throw new Error("Target player not found");
    const oppCards = target.assets[targetColor] ?? [];
    if (isSetComplete(target.assets, targetColor)) throw new Error("Cannot steal from a complete set with Sly Deal");
    if (!oppCards.find((c) => c.id === targetCardId)) throw new Error("Target card not found");

    room.discard.push(card);
    room.pendingAction = {
      type: "slydeal",
      fromIdx: playerIdx,
      toIdx: tIdx,
      card,
      params: { targetCardId, targetColor },
    };
    addLog(room, `${player.name} used Sly Deal on ${target.name}'s ${COLORS[targetColor].label} — waiting for response…`);
    return;
  }

  if (card.action === "dealbreaker") {
    const { targetPlayerIdx: tIdx, targetColor } = move;
    if (tIdx === undefined || tIdx === playerIdx) throw new Error("Deal Breaker requires a target opponent");
    const target = room.players[tIdx];
    if (!target) throw new Error("Target player not found");
    if (!isSetComplete(target.assets, targetColor)) throw new Error("Deal Breaker can only steal complete sets");

    room.discard.push(card);
    room.pendingAction = {
      type: "dealbreaker",
      fromIdx: playerIdx,
      toIdx: tIdx,
      card,
      params: { targetColor },
    };
    addLog(room, `${player.name} played Deal Breaker on ${target.name}'s ${COLORS[targetColor].label} set — waiting for response…`);
    return;
  }

  // ── 4 New Card Types ────────────────────────────────────────────────────

  if (card.action === "secondchance") {
    if (room.discard.length === 0) {
      room.discard.push(card);
      addLog(room, `${player.name} played Second Chance but the discard pile is empty!`);
      return;
    }
    const rescued = room.discard.pop();
    room.discard.push(card);
    player.hand.push(rescued);
    addLog(room, `${player.name} played Second Chance — rescued ${rescued.name} from discard! ♻️`);
    return;
  }

  if (card.action === "propertytax") {
    room.discard.push(card);
    const toIdxList = room.players.map((_, i) => i).filter((i) => i !== playerIdx);
    room.pendingAction = {
      type: "propertytax",
      fromIdx: playerIdx,
      toIdx: -1,
      toIdxList,
      respondedList: [],
      card,
      params: {},
    };
    const taxAmounts = toIdxList.map((i) => {
      const sets = countCompletedSets(room.players[i].assets);
      return `${room.players[i].name}: $${sets}M`;
    }).join(", ");
    addLog(room, `${player.name} declared Property Tax! (${taxAmounts}) — waiting for responses…`);
    return;
  }

  if (card.action === "wreckingball") {
    const { targetPlayerIdx: tIdx, targetColor } = move;
    if (tIdx === undefined || tIdx === playerIdx) throw new Error("Wrecking Ball requires a target opponent");
    const target = room.players[tIdx];
    if (!target) throw new Error("Target player not found");
    if (!isSetComplete(target.assets, targetColor)) throw new Error("Wrecking Ball only works on complete sets");

    room.discard.push(card);
    room.pendingAction = {
      type: "wreckingball",
      fromIdx: playerIdx,
      toIdx: tIdx,
      card,
      params: { targetColor },
    };
    addLog(room, `${player.name} played Wrecking Ball on ${target.name}'s ${COLORS[targetColor].label} set — waiting for response… 💥`);
    return;
  }

  if (card.action === "forceddeal") {
    const { targetPlayerIdx: tIdx, targetCardId, targetColor, myCardId, myColor } = move;
    if (tIdx === undefined || tIdx === playerIdx) throw new Error("Force Deal requires a target opponent");
    const target = room.players[tIdx];
    if (!target) throw new Error("Target player not found");
    if (isSetComplete(target.assets, targetColor)) throw new Error("Cannot take from a complete set with Force Deal");
    if (isSetComplete(player.assets, myColor)) throw new Error("Cannot give from a complete set with Force Deal");
    const targetCards = target.assets[targetColor] ?? [];
    const myCards     = player.assets[myColor] ?? [];
    if (!targetCards.find((c) => c.id === targetCardId)) throw new Error("Target card not found");
    if (!myCards.find((c) => c.id === myCardId)) throw new Error("Your chosen card not found");

    room.discard.push(card);
    room.pendingAction = {
      type: "forceddeal",
      fromIdx: playerIdx,
      toIdx: tIdx,
      card,
      params: { targetCardId, targetColor, myCardId, myColor },
    };
    addLog(room, `${player.name} proposed Force Deal with ${target.name} — waiting for response… 🔄`);
    return;
  }

  throw new Error(`Unknown action: ${card.action}`);
}

// ─── Play Rent (charges ALL other players) ───────────────────────────────────
function playRent(room, playerIdx, card, cardIdx, move) {
  const player = room.players[playerIdx];
  const { color } = move;
  if (!color) throw new Error("Must specify a color for rent");
  if (card.colors && !card.colors.includes(color)) throw new Error("This rent card doesn't cover that color");

  const ownCount = (player.assets[color] ?? []).length;
  if (ownCount === 0) throw new Error(`You have no ${COLORS[color].label} properties`);

  let amount = getRentAmount(color, ownCount);
  const doubled = room.doubleRentActive;
  if (doubled) { amount *= 2; room.doubleRentActive = false; }

  player.hand.splice(cardIdx, 1);
  room.discard.push(card);
  room.playsThisTurn++;

  const toIdxList = room.players.map((_, i) => i).filter((i) => i !== playerIdx);
  room.pendingAction = {
    type: "rent",
    fromIdx: playerIdx,
    toIdx: -1,      // all opponents
    toIdxList,
    respondedList: [],
    card,
    params: { color, amount, doubled },
  };

  const names = toIdxList.map((i) => room.players[i].name).join(", ");
  addLog(room, `${player.name} charged $${amount}M rent (${COLORS[color].label}${doubled ? " ×2" : ""}) — waiting for: ${names}…`);
}

// Payment actions — these prompt the target to choose how to pay
const PAYMENT_ACTIONS = new Set(["debtcollector", "rent", "birthday", "propertytax", "taxtherich"]);

// ─── Helper: consume a JSN from a player's hand ───────────────────────────────
function consumeJsn(player, room) {
  const idx = player.hand.findIndex((c) => c.action === "justsayno");
  if (idx === -1) throw new Error("You don't have Just Say No");
  const [jsn] = player.hand.splice(idx, 1);
  room.discard.push(jsn);
}

// ─── Helper: start or continue JSN chain after a block ────────────────────────
// Returns true if chain is pending (attacker can counter), false if resolved as blocked
function startJsnChain(room, pending, defenderIdx) {
  const attacker  = room.players[pending.fromIdx];
  const defender  = room.players[defenderIdx];
  const canCounter = attacker.hand.some((c) => c.action === "justsayno");
  addLog(room, `${defender.name} played Just Say No! 🚫`);
  if (canCounter) {
    pending.jsnChain = { waitingForIdx: pending.fromIdx, blocked: true, defenderIdx };
    addLog(room, `${attacker.name} — do you counter with Just Say No?`);
    return true; // chain is live
  }
  return false; // resolved immediately as blocked
}

// ─── Helper: resolve a completed JSN chain ────────────────────────────────────
function resolveJsnChain(room, pending, blocked) {
  const isMulti    = Array.isArray(pending.toIdxList);
  const defenderIdx = pending.jsnChain.defenderIdx;
  const defender    = room.players[defenderIdx];
  delete pending.jsnChain;

  if (blocked) {
    addLog(room, `Just Say No chain ended — action blocked for ${defender.name}. 🚫`);
    if (isMulti) {
      if (!pending.blockedList) pending.blockedList = [];
      pending.blockedList.push(defenderIdx);
      pending.respondedList.push(defenderIdx);
      if (pending.respondedList.length >= pending.toIdxList.length) {
        const q = pending.payChoiceQueue ?? [];
        room.pendingAction = q.length > 0 ? nextPayChoice(q) : null;
      }
    } else {
      room.pendingAction = null;
    }
  } else {
    addLog(room, `Just Say No countered — action proceeds against ${defender.name}!`);
    if (isMulti) {
      if (PAYMENT_ACTIONS.has(pending.type)) {
        const amount = pending.type === "propertytax"
          ? countCompletedSets(defender.assets)
          : pending.params.amount;
        if (!pending.payChoiceQueue) pending.payChoiceQueue = [];
        if (amount > 0) pending.payChoiceQueue.push({ fromIdx: pending.fromIdx, toIdx: defenderIdx, amount, actionType: pending.type });
      } else {
        applySingleTarget(room, pending, defenderIdx);
      }
      pending.respondedList.push(defenderIdx);
      if (pending.respondedList.length >= pending.toIdxList.length) {
        const q = pending.payChoiceQueue ?? [];
        room.pendingAction = q.length > 0 ? nextPayChoice(q) : null;
      }
    } else {
      if (PAYMENT_ACTIONS.has(pending.type)) {
        const amount = pending.type === "propertytax"
          ? countCompletedSets(defender.assets)
          : pending.params.amount;
        if (amount > 0) {
          room.pendingAction = { type: "pay-choice", fromIdx: pending.fromIdx, toIdx: defenderIdx,
            params: { amount, actionType: pending.type }, queue: [] };
        } else {
          room.pendingAction = null;
        }
      } else {
        applyPendingAction(room, pending);
        room.pendingAction = null;
      }
    }
  }
}

// ─── Handle Response ──────────────────────────────────────────────────────────
export function handleResponse(room, playerIdx, move) {
  const pending = room.pendingAction;
  if (!pending) throw new Error("No pending action to respond to");

  const responder = room.players[playerIdx];

  // ── pay-choice: payer selects cash + property cards ───────────────────────
  if (pending.type === "pay-choice") {
    if (pending.toIdx !== playerIdx) throw new Error("This payment is not directed at you");
    return handlePayChoice(room, playerIdx, move);
  }

  // ── JSN chain: attacker or defender countering Just Say No ───────────────
  if (pending.jsnChain) {
    if (pending.jsnChain.waitingForIdx !== playerIdx) throw new Error("Not your turn in the Just Say No chain");
    const chain = pending.jsnChain;
    if (move.response === "counter-jsn") {
      consumeJsn(responder, room);
      chain.blocked = !chain.blocked;
      const otherIdx = playerIdx === pending.fromIdx ? chain.defenderIdx : pending.fromIdx;
      const other    = room.players[otherIdx];
      const otherCanCounter = other.hand.some((c) => c.action === "justsayno");
      addLog(room, `${responder.name} counters! ${chain.blocked ? "Action blocked." : "Action re-activated!"} 🚫`);
      if (otherCanCounter) {
        chain.waitingForIdx = otherIdx;
        addLog(room, `${other.name} — do you counter?`);
        return room;
      }
      // other can't counter → chain resolves now
      resolveJsnChain(room, pending, chain.blocked);
    } else {
      // "pass-jsn" — accept current chain state
      resolveJsnChain(room, pending, chain.blocked);
    }
    checkWin(room);
    return room;
  }

  // ── Multi-target actions (rent, birthday, propertytax) ───────────────────
  const isMulti = Array.isArray(pending.toIdxList);

  if (isMulti) {
    if (!pending.toIdxList.includes(playerIdx)) throw new Error("This action is not directed at you");
    if (pending.respondedList.includes(playerIdx)) throw new Error("You already responded");

    if (move.response === "block") {
      consumeJsn(responder, room);
      const chainLive = startJsnChain(room, pending, playerIdx);
      if (!chainLive) {
        if (!pending.blockedList) pending.blockedList = [];
        pending.blockedList.push(playerIdx);
        pending.respondedList.push(playerIdx);
        if (pending.respondedList.length >= pending.toIdxList.length) {
          const q = pending.payChoiceQueue ?? [];
          room.pendingAction = q.length > 0 ? nextPayChoice(q) : null;
        }
      }
      // if chainLive: don't add to respondedList yet; chain will resolve it
    } else if (PAYMENT_ACTIONS.has(pending.type)) {
      const amount = pending.type === "propertytax"
        ? countCompletedSets(responder.assets)
        : pending.params.amount;
      if (!pending.payChoiceQueue) pending.payChoiceQueue = [];
      if (amount > 0) {
        pending.payChoiceQueue.push({ fromIdx: pending.fromIdx, toIdx: playerIdx, amount, actionType: pending.type });
      } else {
        addLog(room, `${responder.name} has no complete sets — no tax paid.`);
      }
      pending.respondedList.push(playerIdx);
      if (pending.respondedList.length >= pending.toIdxList.length) {
        const q = pending.payChoiceQueue ?? [];
        room.pendingAction = q.length > 0 ? nextPayChoice(q) : null;
      }
    } else {
      applySingleTarget(room, pending, playerIdx);
      pending.respondedList.push(playerIdx);
      if (pending.respondedList.length >= pending.toIdxList.length) {
        room.pendingAction = null;
      }
    }

    checkWin(room);
    return room;
  }

  // ── Single-target actions ────────────────────────────────────────────────
  if (pending.toIdx !== playerIdx) throw new Error("This action is not directed at you");

  if (move.response === "block") {
    consumeJsn(responder, room);
    const chainLive = startJsnChain(room, pending, playerIdx);
    if (!chainLive) {
      addLog(room, `${pending.type} cancelled! 🚫`);
      room.pendingAction = null;
    }
  } else if (PAYMENT_ACTIONS.has(pending.type)) {
    // Let the player choose how to pay
    const amount = pending.type === "propertytax"
      ? countCompletedSets(responder.assets)
      : pending.params.amount;
    if (amount > 0) {
      room.pendingAction = {
        type: "pay-choice",
        fromIdx: pending.fromIdx,
        toIdx: playerIdx,
        params: { amount, actionType: pending.type },
        queue: [],
      };
    } else {
      addLog(room, `${responder.name} has no complete sets — no tax paid.`);
      room.pendingAction = null;
    }
  } else {
    applyPendingAction(room, pending);
    room.pendingAction = null;
  }

  checkWin(room);
  return room;
}

// ─── Build next pay-choice pendingAction from queue ───────────────────────────
function nextPayChoice(queue) {
  const [next, ...rest] = queue;
  return {
    type:    "pay-choice",
    fromIdx: next.fromIdx,
    toIdx:   next.toIdx,
    params:  { amount: next.amount, actionType: next.actionType },
    queue:   rest,
  };
}

// ─── Handle pay-choice: payer manually selects cash + property cards ──────────
function handlePayChoice(room, playerIdx, move) {
  const pending  = room.pendingAction;
  const payer    = room.players[playerIdx];
  const receiver = room.players[pending.fromIdx];
  const { amount } = pending.params;
  const { cashIds = [], cards = [] } = move; // cashIds = bank card IDs, cards = [{ color, cardId }]

  let totalValue = 0;
  const takenCash  = [];
  const takenProps = [];

  // Validate & take cash cards
  for (const id of cashIds) {
    const idx = payer.bank.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Cash card not found in your bank`);
    const [card] = payer.bank.splice(idx, 1);
    takenCash.push(card);
    totalValue += card.value ?? 0;
  }

  // Validate & take property cards
  for (const { color, cardId } of cards) {
    const arr = payer.assets[color] ?? [];
    const idx = arr.findIndex((c) => c.id === cardId);
    if (idx === -1) {
      payer.bank.push(...takenCash); // rollback cash
      throw new Error(`Property card not found in your ${color} assets`);
    }
    const [card] = arr.splice(idx, 1);
    takenProps.push({ card, color });
    totalValue += card.value ?? 0;
  }

  // Must cover debt OR have given every last asset
  const gaveAll = payer.bank.length === 0 && Object.values(payer.assets).flat().length === 0;
  if (totalValue < amount && !gaveAll) {
    // Rollback everything
    payer.bank.push(...takenCash);
    takenProps.forEach(({ card, color }) => {
      if (!payer.assets[color]) payer.assets[color] = [];
      payer.assets[color].push(card);
    });
    throw new Error(`Need $${amount - totalValue}M more, or give all remaining assets`);
  }

  // Transfer to receiver
  receiver.bank.push(...takenCash);
  takenProps.forEach(({ card, color }) => {
    if (!receiver.assets[color]) receiver.assets[color] = [];
    receiver.assets[color].push(card);
  });

  // Log
  const parts = [];
  if (takenCash.length)  parts.push(`$${takenCash.reduce((s, c) => s + (c.value ?? 0), 0)}M cash`);
  if (takenProps.length) parts.push(`${takenProps.length} propert${takenProps.length > 1 ? "ies" : "y"}`);
  addLog(room, parts.length
    ? `${payer.name} paid ${parts.join(" + ")} to ${receiver.name}.`
    : `${payer.name} has nothing — debt forgiven.`
  );

  // Chain to next or finish
  const queue = pending.queue ?? [];
  room.pendingAction = queue.length > 0 ? nextPayChoice(queue) : null;

  checkWin(room);
  return room;
}

// ─── Apply single-target action to one player (non-payment, for multi-target) ─
function applySingleTarget(room, pending, targetIdx) {
  const attacker = room.players[pending.fromIdx];
  const defender = room.players[targetIdx];
  const { params } = pending;

  // Non-payment multi-target types (none currently, but reserved)
  void attacker; void defender; void params;
}

// ─── Apply single pending action (non-payment only) ──────────────────────────
function applyPendingAction(room, pending) {
  const attacker = room.players[pending.fromIdx];
  const defender = room.players[pending.toIdx];
  const { params } = pending;

  switch (pending.type) {
    case "slydeal": {
      const { targetCardId, targetColor } = params;
      const oppArr = defender.assets[targetColor] ?? [];
      const idx = oppArr.findIndex((c) => c.id === targetCardId);
      if (idx !== -1) {
        const [stolen] = oppArr.splice(idx, 1);
        if (!attacker.assets[stolen.color]) attacker.assets[stolen.color] = [];
        attacker.assets[stolen.color].push(stolen);
        addLog(room, `${attacker.name} stole ${stolen.name} from ${defender.name}! 🕵️`);
      }
      break;
    }

    case "dealbreaker": {
      const { targetColor } = params;
      const set = defender.assets[targetColor] ?? [];
      if (!attacker.assets[targetColor]) attacker.assets[targetColor] = [];
      attacker.assets[targetColor].push(...set);
      delete defender.assets[targetColor];
      addLog(room, `${attacker.name} stole the entire ${COLORS[targetColor].label} set from ${defender.name}! 💣`);
      break;
    }

    case "identityswap": {
      // Swap ALL assets between attacker and defender
      const aAssets = attacker.assets;
      const dAssets = defender.assets;
      attacker.assets = dAssets;
      defender.assets = aAssets;
      addLog(room, `${attacker.name} and ${defender.name} swapped ALL their property assets! 🔀`);
      break;
    }

    case "wreckingball": {
      const { targetColor } = params;
      const set = defender.assets[targetColor] ?? [];
      room.discard.push(...set);
      delete defender.assets[targetColor];
      addLog(room, `${attacker.name} demolished ${defender.name}'s ${COLORS[targetColor]?.label} set — all gone! 💥`);
      break;
    }

    case "forceddeal": {
      const { targetCardId, targetColor, myCardId, myColor } = params;
      const attackerArr = attacker.assets[myColor] ?? [];
      const defenderArr = defender.assets[targetColor] ?? [];
      const aIdx = attackerArr.findIndex((c) => c.id === myCardId);
      const dIdx = defenderArr.findIndex((c) => c.id === targetCardId);
      if (aIdx !== -1 && dIdx !== -1) {
        const [aCard] = attackerArr.splice(aIdx, 1);
        const [dCard] = defenderArr.splice(dIdx, 1);
        // Swap them — each goes into the color group it was assigned to
        const aColor = aCard.color ?? myColor;
        const dColor = dCard.color ?? targetColor;
        if (!attacker.assets[dColor]) attacker.assets[dColor] = [];
        attacker.assets[dColor].push({ ...dCard, color: dColor });
        if (!defender.assets[aColor]) defender.assets[aColor] = [];
        defender.assets[aColor].push({ ...aCard, color: aColor });
        addLog(room, `${attacker.name} and ${defender.name} force-swapped properties! 🔄`);
      }
      break;
    }
  }
}


// ─── Flip Wild Property (free move any time on your turn) ─────────────────────
function handleFlipWild(room, playerIdx, move) {
  if (room.pendingAction) throw new Error("Resolve pending actions first");
  if (room.turnIndex !== playerIdx) throw new Error("Not your turn");

  const player = room.players[playerIdx];
  const { cardId, fromColor, toColor } = move;

  if (!fromColor || !toColor || fromColor === toColor) throw new Error("Choose a different color to move to");

  const fromArr = player.assets[fromColor] ?? [];
  const idx = fromArr.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error("Card not found in assets");

  const card = fromArr[idx];
  if (card.type !== "wildproperty") throw new Error("Only wild property cards can be flipped");
  if (card.colors && !card.colors.includes(toColor)) {
    throw new Error(`This wild card can only be ${card.colors.map((c) => COLORS[c]?.label).join(" or ")}`);
  }

  fromArr.splice(idx, 1);
  if (fromArr.length === 0) delete player.assets[fromColor];

  if (!player.assets[toColor]) player.assets[toColor] = [];
  player.assets[toColor].push({ ...card, color: toColor });

  addLog(room, `${player.name} flipped a wild property to ${COLORS[toColor]?.label}.`);
  checkWin(room);
  return room;
}

// ─── Handle Discard (player chooses cards to return when hand > 7) ────────────
function handleDiscard(room, playerIdx, move) {
  const pending = room.pendingAction;
  if (!pending || pending.type !== "discard" || pending.toIdx !== playerIdx) {
    throw new Error("No discard pending for you");
  }

  const player = room.players[playerIdx];
  const needed  = pending.params.count;
  const { cardIds = [] } = move;

  if (cardIds.length !== needed) throw new Error(`Select exactly ${needed} card${needed > 1 ? "s" : ""} to discard`);

  for (const id of cardIds) {
    const idx = player.hand.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Card ${id} not found in your hand`);
    const [card] = player.hand.splice(idx, 1);
    room.discard.push(card);
  }

  addLog(room, `${player.name} discarded ${needed} card${needed > 1 ? "s" : ""} (hand limit).`);
  room.pendingAction = null;

  // Now actually advance the turn
  return advanceTurn(room, playerIdx);
}

// ─── End Turn ─────────────────────────────────────────────────────────────────
export function endTurn(room, playerIdx) {
  if (room.pendingAction) throw new Error("Resolve all pending actions first");

  const player = room.players[playerIdx];
  const excess  = player.hand.length - MAX_HAND;

  // If over the limit, pause and ask the player to choose what to discard
  if (excess > 0) {
    room.pendingAction = {
      type:   "discard",
      toIdx:  playerIdx,
      fromIdx: playerIdx,
      params: { count: excess },
    };
    addLog(room, `${player.name} has ${player.hand.length} cards — discard ${excess} to end turn.`);
    return room;
  }

  return advanceTurn(room, playerIdx);
}

function advanceTurn(room, playerIdx) {
  const current = room.players[playerIdx];
  room.turnIndex     = (playerIdx + 1) % room.players.length;
  room.playsThisTurn = 0;
  room.maxPlays      = MAX_PLAYS;
  room.turnCount++;
  room.doubleRentActive = false;

  const next      = room.players[room.turnIndex];
  const drawCount = next.hand.length === 0 ? 5 : CARDS_PER_DRAW;
  const drawn     = drawCards(room, room.turnIndex, drawCount);
  addLog(room, `${current.name} ended their turn. ${next.name} drew ${drawn} card${drawn !== 1 ? "s" : ""}${drawCount === 5 ? " (empty hand bonus!)" : ""}.`);

  if (room.deck.length === 0 && room.discard.length === 0) endGameByValue(room);

  return room;
}

// ─── Win Check ────────────────────────────────────────────────────────────────
function checkWin(room) {
  if (room.phase === "ended") return;
  for (const player of room.players) {
    if (countCompletedSets(player.assets) >= SETS_TO_WIN) {
      room.phase    = "ended";
      room.winnerId = player.id;
      room.winner   = player.name;
      addLog(room, `🏆 ${player.name} wins with ${countCompletedSets(player.assets)} complete property sets!`);
      return;
    }
  }
}

function endGameByValue(room) {
  const scores = room.players.map((p) => ({
    id: p.id, name: p.name,
    score: [...p.bank, ...p.hand, ...Object.values(p.assets).flat()].reduce((s, c) => s + (c.value ?? 0), 0),
  })).sort((a, b) => b.score - a.score);

  room.phase    = "ended";
  room.winnerId = scores[0].id;
  room.winner   = scores[0].name;
  addLog(room, `Game over! ${scores[0].name} wins with $${scores[0].score}M total value. 🏆`);
}

// ─── Sanitize State ───────────────────────────────────────────────────────────
export function sanitizeState(room, playerId) {
  return {
    ...room,
    players: room.players.map((p) => {
      if (p.id === playerId) return p;
      return { ...p, hand: p.hand.map(() => ({ id: "?", type: "hidden" })) };
    }),
  };
}
