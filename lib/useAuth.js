"use client";
import { useState, useEffect } from "react";

/**
 * Client-side auth hook.
 * Returns { user, profile, credits, isAdmin, equippedDate, loading }
 */
export function useAuth() {
  const [data, setData] = useState({ user: null, profile: null, credits: null, isAdmin: false, equippedDate: null, loading: true });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setData({
            user: d.user,
            profile: d.profile,
            credits: d.credits,
            isAdmin: d.isAdmin || false,
            equippedDate: d.equippedDate || null,
            loading: false,
          });
        } else {
          setData({ user: null, profile: null, credits: null, isAdmin: false, equippedDate: null, loading: false });
        }
      })
      .catch(() => setData({ user: null, profile: null, credits: null, isAdmin: false, equippedDate: null, loading: false }));
  }, []);

  return data;
}
