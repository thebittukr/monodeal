"use client";
import { useState, useEffect } from "react";

const DEFAULT_AVATAR = "/avatar-default.webp";

// Cache avatars list globally (fetched once per page load)
let _avatarsCache = null;
async function getAvatars() {
  if (_avatarsCache) return _avatarsCache;
  try {
    const res = await fetch("/api/avatars");
    const d = await res.json();
    _avatarsCache = d.avatars || [];
  } catch {
    _avatarsCache = [];
  }
  return _avatarsCache;
}

/**
 * Client-side auth hook.
 * Returns { user, profile, credits, isAdmin, equippedDate, avatarUrl, loading }
 */
export function useAuth() {
  const [data, setData] = useState({
    user: null, profile: null, credits: null, isAdmin: false,
    equippedDate: null, avatarUrl: DEFAULT_AVATAR, loading: true,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
      getAvatars(),
    ]).then(([d, avatars]) => {
      if (d?.user) {
        // Resolve avatar URL from profile's avatarId
        let avatarUrl = DEFAULT_AVATAR;
        if (d.profile?.avatarId && avatars.length) {
          const match = avatars.find(a => a.id === d.profile.avatarId);
          if (match) avatarUrl = match.imageUrl;
        }

        setData({
          user: d.user,
          profile: d.profile,
          credits: d.credits,
          isAdmin: d.isAdmin || false,
          equippedDate: d.equippedDate || null,
          avatarUrl,
          loading: false,
        });
      } else {
        setData({
          user: null, profile: null, credits: null, isAdmin: false,
          equippedDate: null, avatarUrl: DEFAULT_AVATAR, loading: false,
        });
      }
    }).catch(() => setData({
      user: null, profile: null, credits: null, isAdmin: false,
      equippedDate: null, avatarUrl: DEFAULT_AVATAR, loading: false,
    }));
  }, []);

  return data;
}
