import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  real,
  pgEnum,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ────────────────────────────────────────────────────────────────────

export const gameMode = pgEnum("game_mode", ["free", "credits"]);
export const gameStatus = pgEnum("game_status", [
  "waiting",
  "in_progress",
  "completed",
  "cancelled",
  "voided",
]);
export const playerStatus = pgEnum("player_status", [
  "active",
  "eliminated",
  "winner",
  "disconnected",
]);
export const txType = pgEnum("tx_type", [
  "deposit",
  "withdrawal",
  "game_entry",
  "game_win",
  "rake",
  "refund",
  "bonus",
  "girlfriend_purchase",
]);
export const txStatus = pgEnum("tx_status", ["pending", "confirmed", "failed"]);
export const walletType = pgEnum("wallet_type", ["custodial", "external"]);
export const rarity = pgEnum("rarity", [
  "common",
  "rare",
  "epic",
  "legendary",
]);
export const girlfriendStyle = pgEnum("girlfriend_style", [
  "anime",
  "realistic",
  "fantasy",
  "cyberpunk",
  "casual",
]);
export const gender = pgEnum("gender", ["female", "male"]);
export const tier = pgEnum("tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);
export const friendStatus = pgEnum("friend_status", ["pending", "accepted"]);
export const inviteStatus = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
]);
export const riskLevel = pgEnum("risk_level", [
  "normal",
  "monitor",
  "restrict",
  "block",
]);
export const avatarCategory = pgEnum("avatar_category", [
  "casino",
  "action",
  "fantasy",
  "tech",
  "style",
]);

// ── Users (custom auth — replaces Neon Auth) ─────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    image: text("image"),
    totpSecret: text("totp_secret"), // AES-256-GCM encrypted TOTP secret
    totpEnabled: boolean("totp_enabled").default(false).notNull(),
    recoveryCodes: text("recovery_codes"), // JSON array of bcrypt-hashed codes
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

// ── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sessions_token_idx").on(t.token)]
);

// ── Password Reset Tokens ───────────────────────────────────────────────────

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("reset_token_idx").on(t.token)]
);

// ── Two-Factor Challenges (temporary login state) ───────────────────────────

export const twoFactorChallenges = pgTable(
  "two_factor_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    challengeToken: text("challenge_token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("tfa_challenge_token_idx").on(t.challengeToken)]
);

// ── User Profiles ────────────────────────────────────────────────────────────

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique(), // references neon_auth.users(id)
    username: text("username").notNull().unique(),
    avatarId: uuid("avatar_id"),
    countryCode: text("country_code"), // ISO 3166-1 alpha-2 (e.g. "US", "IN", "BR")
    level: integer("level").default(1).notNull(),
    xp: integer("xp").default(0).notNull(),
    equippedGirlfriendId: uuid("equipped_girlfriend_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_profiles_username_idx").on(t.username),
    index("user_profiles_user_id_idx").on(t.userId),
  ]
);

// ── Gamer Avatars (Midjourney-generated profile pictures) ────────────────────

export const gamerAvatars = pgTable("gamer_avatars", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  category: avatarCategory("category").notNull(),
  isFree: boolean("is_free").default(false).notNull(),
  priceCredits: integer("price_credits").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Wallets ──────────────────────────────────────────────────────────────────

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    type: walletType("type").notNull(),
    address: text("address").notNull(),
    encryptedPrivateKey: text("encrypted_private_key"), // custodial only
    chain: text("chain").default("polygon").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("wallets_user_id_idx").on(t.userId)]
);

// ── Credits ──────────────────────────────────────────────────────────────────

export const credits = pgTable("credits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: integer("balance").default(0).notNull(),
  lockedBalance: integer("locked_balance").default(0).notNull(), // in active games
  lifetimeDeposited: integer("lifetime_deposited").default(0).notNull(),
  lifetimeWithdrawn: integer("lifetime_withdrawn").default(0).notNull(),
  lifetimeWon: integer("lifetime_won").default(0).notNull(),
  lifetimeLost: integer("lifetime_lost").default(0).notNull(),
  lifetimeRake: integer("lifetime_rake").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    type: txType("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    referenceId: text("reference_id"), // room id, tx hash, etc.
    txHash: text("tx_hash"), // blockchain tx hash
    status: txStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("credit_tx_user_idx").on(t.userId),
    index("credit_tx_created_idx").on(t.createdAt),
  ]
);

// ── Game Rooms ───────────────────────────────────────────────────────────────

export const gameRooms = pgTable(
  "game_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomCode: text("room_code").notNull().unique(),
    entryFee: integer("entry_fee").default(0).notNull(),
    mode: gameMode("mode").default("free").notNull(),
    maxPlayers: integer("max_players").default(4).notNull(),
    status: gameStatus("status").default("waiting").notNull(),
    potAmount: integer("pot_amount").default(0).notNull(),
    rakeAmount: integer("rake_amount").default(0).notNull(),
    // Provably fair
    serverSeedHash: text("server_seed_hash"),
    serverSeed: text("server_seed"), // revealed after game
    clientSeeds: jsonb("client_seeds"), // {playerId: seed}
    combinedHash: text("combined_hash"),
    deckOrder: jsonb("deck_order"), // revealed after game
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("game_rooms_status_idx").on(t.status),
    index("game_rooms_created_idx").on(t.createdAt),
  ]
);

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull(),
    userId: text("user_id").notNull(),
    seat: integer("seat").notNull(),
    status: playerStatus("status").default("active").notNull(),
    payout: integer("payout").default(0).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    index("game_players_room_idx").on(t.roomId),
    index("game_players_user_idx").on(t.userId),
  ]
);

// ── Game Actions (audit trail for every move) ────────────────────────────────

export const gameActions = pgTable(
  "game_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moveId: text("move_id").notNull().unique(), // anti-replay
    roomId: uuid("room_id").notNull(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(), // playCard, drawCards, endTurn, respond, etc.
    targetPlayer: text("target_player"), // who was targeted
    cardId: text("card_id"),
    payload: jsonb("payload"), // additional action data
    moveTimeMs: integer("move_time_ms"), // time taken to make move
    ip: text("ip"),
    deviceId: text("device_id"),
    sequence: integer("sequence").notNull(), // order within game
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (t) => [
    index("game_actions_room_idx").on(t.roomId),
    index("game_actions_user_idx").on(t.userId),
    index("game_actions_move_id_idx").on(t.moveId),
  ]
);

// ── Provably Fair (separate for easy verification) ───────────────────────────

export const rngProofs = pgTable("rng_proofs", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().unique(),
  serverSeed: text("server_seed").notNull(),
  serverSeedHash: text("server_seed_hash").notNull(),
  clientSeeds: jsonb("client_seeds").notNull(),
  combinedHash: text("combined_hash").notNull(),
  deckOrder: jsonb("deck_order").notNull(),
  revealedAt: timestamp("revealed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Girlfriends / Boyfriends ─────────────────────────────────────────────────

export const girlfriends = pgTable(
  "girlfriends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    rarity: rarity("rarity").notNull(),
    modelUrl: text("model_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    priceCredits: integer("price_credits").default(0).notNull(),
    style: girlfriendStyle("style").notNull(),
    gender: gender("gender").default("female").notNull(),
    isStarter: boolean("is_starter").default(false).notNull(),
    description: text("description"),
    personality: text("personality"), // affects speech lines
    backstory: text("backstory"),
    totalEquipped: integer("total_equipped").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("girlfriends_rarity_idx").on(t.rarity),
    index("girlfriends_equipped_idx").on(t.totalEquipped),
  ]
);

export const userGirlfriends = pgTable(
  "user_girlfriends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    girlfriendId: uuid("girlfriend_id").notNull(),
    equipped: boolean("equipped").default(false).notNull(),
    purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  },
  (t) => [
    index("user_girlfriends_user_idx").on(t.userId),
    uniqueIndex("user_girlfriends_unique").on(t.userId, t.girlfriendId),
  ]
);

// ── Friends ──────────────────────────────────────────────────────────────────

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    friendId: text("friend_id").notNull(),
    status: friendStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("friendships_user_idx").on(t.userId),
    uniqueIndex("friendships_pair_idx").on(t.userId, t.friendId),
  ]
);

export const gameInvites = pgTable(
  "game_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id").notNull(),
    inviterId: text("inviter_id").notNull(),
    inviteeId: text("invitee_id").notNull(),
    status: inviteStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("game_invites_invitee_idx").on(t.inviteeId)]
);

// ── Skill Rating & Matchmaking ───────────────────────────────────────────────

export const userRatings = pgTable(
  "user_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique(),
    eloRating: integer("elo_rating").default(1000).notNull(),
    tier: tier("tier").default("bronze").notNull(),
    gamesPlayed: integer("games_played").default(0).notNull(),
    gamesWon: integer("games_won").default(0).notNull(),
    winStreak: integer("win_streak").default(0).notNull(),
    bestStreak: integer("best_streak").default(0).notNull(),
    totalEarnings: integer("total_earnings").default(0).notNull(),
    totalLosses: integer("total_losses").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("user_ratings_elo_idx").on(t.eloRating)]
);

// ── Leaderboard ──────────────────────────────────────────────────────────────

export const leaderboardPeriod = pgEnum("leaderboard_period", [
  "daily",
  "weekly",
  "all_time",
]);

export const leaderboards = pgTable(
  "leaderboards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    period: leaderboardPeriod("period").notNull(),
    gamesPlayed: integer("games_played").default(0).notNull(),
    gamesWon: integer("games_won").default(0).notNull(),
    totalEarnings: integer("total_earnings").default(0).notNull(),
    eloRating: integer("elo_rating").default(1000).notNull(),
    rank: integer("rank"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("leaderboards_period_rank_idx").on(t.period, t.rank),
    uniqueIndex("leaderboards_user_period_idx").on(t.userId, t.period),
  ]
);

// ── Fraud Detection ──────────────────────────────────────────────────────────

export const fraudEvents = pgTable(
  "fraud_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    roomId: uuid("room_id"),
    eventType: text("event_type").notNull(), // same_ip, repeated_match, biased_targeting, funneling, bot_timing
    severity: integer("severity").default(1).notNull(), // 1-5
    details: jsonb("details"), // event-specific data
    riskScoreImpact: integer("risk_score_impact").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("fraud_events_user_idx").on(t.userId),
    index("fraud_events_type_idx").on(t.eventType),
    index("fraud_events_created_idx").on(t.createdAt),
  ]
);

export const playerRiskProfiles = pgTable("player_risk_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  riskScore: integer("risk_score").default(0).notNull(),
  riskLevel: riskLevel("risk_level").default("normal").notNull(),
  fairPlayScore: integer("fair_play_score").default(100).notNull(),
  consecutiveLosses: integer("consecutive_losses").default(0).notNull(),
  dailyLosses: integer("daily_losses").default(0).notNull(),
  dailyLossResetAt: timestamp("daily_loss_reset_at"),
  cooldownUntil: timestamp("cooldown_until"),
  lastWarningAt: timestamp("last_warning_at"),
  totalFlags: integer("total_flags").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tracks relationships between players for collusion detection
export const playerPairStats = pgTable(
  "player_pair_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerA: text("player_a").notNull(),
    playerB: text("player_b").notNull(),
    matchesTogether: integer("matches_together").default(0).notNull(),
    aWinsVsB: integer("a_wins_vs_b").default(0).notNull(),
    bWinsVsA: integer("b_wins_vs_a").default(0).notNull(),
    assetTransfers: integer("asset_transfers").default(0).notNull(), // cards/money funneled
    mutualAttacks: integer("mutual_attacks").default(0).notNull(),
    collusionScore: integer("collusion_score").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("player_pair_unique").on(t.playerA, t.playerB),
    index("player_pair_collusion_idx").on(t.collusionScore),
  ]
);

// ── Bot Pool (Platform Bots) ─────────────────────────────────────────────────

export const botPersonality = pgEnum("bot_personality", [
  "aggressive",
  "cautious",
  "balanced",
  "strategic",
  "unpredictable",
]);

export const botProfiles = pgTable(
  "bot_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    botId: text("bot_id").notNull().unique(), // e.g. "BOT_001" — used in game engine
    displayName: text("display_name").notNull(), // e.g. "Jake_TX"
    countryCode: text("country_code").notNull(), // "US", "IN", "BR", etc.
    avatarId: integer("avatar_id").default(15).notNull(),
    personality: botPersonality("personality").default("balanced").notNull(),
    eloRating: integer("elo_rating").default(1000).notNull(),
    tier: tier("tier").default("bronze").notNull(),
    equippedDateId: uuid("equipped_date_id"), // bot can have an equipped date too
    gamesPlayed: integer("games_played").default(0).notNull(),
    gamesWon: integer("games_won").default(0).notNull(),
    isPlatformBot: boolean("is_platform_bot").default(true).notNull(), // always true, never shown to users
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("bot_profiles_tier_idx").on(t.tier),
    index("bot_profiles_elo_idx").on(t.eloRating),
    index("bot_profiles_active_idx").on(t.isActive),
  ]
);

// ── Audit Log ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id"),
    action: text("action").notNull(),
    resource: text("resource"), // game_room, credit, wallet, etc.
    resourceId: text("resource_id"),
    details: jsonb("details"),
    ip: text("ip"),
    deviceId: text("device_id"),
    success: boolean("success").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_user_idx").on(t.userId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_idx").on(t.createdAt),
  ]
);

// ── Relations ────────────────────────────────────────────────────────────────

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  girlfriends: many(userGirlfriends),
  wallets: many(wallets),
}));

export const gameRoomsRelations = relations(gameRooms, ({ many }) => ({
  players: many(gamePlayers),
  actions: many(gameActions),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  room: one(gameRooms, {
    fields: [gamePlayers.roomId],
    references: [gameRooms.id],
  }),
}));
