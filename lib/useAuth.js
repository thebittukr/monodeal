"use client";
import { useState, useEffect } from "react";

/**
 * Client-side auth hook. Checks /api/profile to see if user is logged in.
 * Returns { user, profile, loading } — null user means anonymous.
 */
export function useAuth() {
  const [data, setData] = useState({ user: null, profile: null, credits: null, loading: true });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setData({ user: d.user, profile: d.profile, credits: d.credits, loading: false });
        } else {
          setData({ user: null, profile: null, credits: null, loading: false });
        }
      })
      .catch(() => setData({ user: null, profile: null, credits: null, loading: false }));
  }, []);

  return data;
}
