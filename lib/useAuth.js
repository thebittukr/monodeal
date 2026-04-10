"use client";
import { useState, useEffect, useCallback } from "react";

const DEFAULT_AVATAR = "/avatar-default.webp";
const CACHE_KEY = "pr_auth_cache";
const CACHE_TTL = 60_000; // 1 minute — stale data served instantly, refreshed in background

// ── Global avatar cache (fetched once per page session) ─────────────────────
let _avatarsCache = null;
async function getAvatars() {
  if (_avatarsCache) return _avatarsCache;
  try {
    const res = await fetch("/api/avatars");
    const d = await res.json();
    _avatarsCache = d.avatars || [];
  } catch { _avatarsCache = []; }
  return _avatarsCache;
}

function resolveAvatarUrl(avatarId, avatars) {
  if (!avatarId || !avatars?.length) return DEFAULT_AVATAR;
  const match = avatars.find(a => a.id === avatarId);
  return match?.imageUrl || DEFAULT_AVATAR;
}

// ── Read/write sessionStorage cache ─────────────────────────────────────────
function getCachedAuth() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    // Return cached data regardless of age (we'll refresh in background)
    return cached.data || null;
  } catch { return null; }
}

function setCachedAuth(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function clearCachedAuth() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

function isCacheStale() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return true;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts > CACHE_TTL;
  } catch { return true; }
}

/**
 * Client-side auth hook.
 * Renders instantly from sessionStorage cache, refreshes in background.
 * Returns { user, profile, credits, isAdmin, equippedDate, avatarUrl, loading, refresh }
 */
export function useAuth() {
  // Initialize from cache for instant render
  const cached = typeof window !== "undefined" ? getCachedAuth() : null;
  const [data, setData] = useState(cached || {
    user: null, profile: null, credits: null, isAdmin: false,
    equippedDate: null, avatarUrl: DEFAULT_AVATAR, loading: true,
  });

  const fetchAuth = useCallback(async () => {
    try {
      const [d, avatars] = await Promise.all([
        fetch("/api/profile").then(r => r.ok ? r.json() : null),
        getAvatars(),
      ]);

      if (d?.user) {
        const authData = {
          user: d.user,
          profile: d.profile,
          credits: d.credits,
          isAdmin: d.isAdmin || false,
          equippedDate: d.equippedDate || null,
          avatarUrl: resolveAvatarUrl(d.profile?.avatarId, avatars),
          loading: false,
        };
        setData(authData);
        setCachedAuth(authData);
      } else {
        const noAuth = {
          user: null, profile: null, credits: null, isAdmin: false,
          equippedDate: null, avatarUrl: DEFAULT_AVATAR, loading: false,
        };
        setData(noAuth);
        clearCachedAuth();
      }
    } catch {
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (cached && !isCacheStale()) {
      // Cache is fresh — render from cache, skip fetch
      setData(prev => ({ ...prev, loading: false }));
      return;
    }
    // Cache is stale or missing — fetch in background
    fetchAuth();
  }, [fetchAuth]); // eslint-disable-line

  return { ...data, refresh: fetchAuth };
}

/**
 * Call after sign-out to clear cache immediately.
 */
export function clearAuthCache() {
  clearCachedAuth();
}
