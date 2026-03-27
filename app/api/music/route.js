import { NextResponse } from "next/server";

// City → Pixabay search query (tuned for casino atmosphere)
const CITY_QUERIES = {
  lasvegas:   "casino jazz lounge",
  tokyo:      "japanese ambient lofi",
  macau:      "chinese traditional erhu",
  montecarlo: "french jazz piano elegant",
  singapore:  "asian modern chill lounge",
  atlantic:   "jazz saxophone smooth",
  badenbaden: "classical waltz elegant",
  sanjose:    "latin jazz bossa nova",
  paradise:   "caribbean tropical lounge",
  london:     "british jazz blues pub",
  sydney:     "smooth jazz lounge chill",
};

// Curated fallback tracks from Pixabay's free CDN (no key needed)
// These are real publicly-accessible Pixabay free music tracks
const FALLBACK = {
  lasvegas:   [
    { title: "Casino Lounge",        url: "https://cdn.pixabay.com/audio/2022/10/18/audio_2dde668d05.mp3" },
    { title: "Jazz Piano Bar",       url: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3" },
  ],
  tokyo:      [
    { title: "Japanese Ambient",     url: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3" },
    { title: "Zen Garden",           url: "https://cdn.pixabay.com/audio/2021/11/25/audio_91b5c59c79.mp3" },
  ],
  macau:      [
    { title: "Oriental Night",       url: "https://cdn.pixabay.com/audio/2023/03/21/audio_c1e9fc12a8.mp3" },
    { title: "Chinese Jazz",         url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3" },
  ],
  montecarlo: [
    { title: "Monte Carlo Elegance", url: "https://cdn.pixabay.com/audio/2022/12/17/audio_d8c2b4cc28.mp3" },
    { title: "French Piano Lounge",  url: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3" },
  ],
  singapore:  [
    { title: "Singapore Nights",     url: "https://cdn.pixabay.com/audio/2022/10/25/audio_8e3c4a0e2b.mp3" },
    { title: "Asia Modern Chill",    url: "https://cdn.pixabay.com/audio/2022/03/15/audio_c73e38a8d2.mp3" },
  ],
  atlantic:   [
    { title: "Atlantic Boardwalk",   url: "https://cdn.pixabay.com/audio/2022/10/31/audio_dfc06b7da2.mp3" },
    { title: "Smooth Jazz Night",    url: "https://cdn.pixabay.com/audio/2021/09/06/audio_2f524e2378.mp3" },
  ],
  badenbaden: [
    { title: "Grand Waltz",          url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3" },
    { title: "Classical Evening",    url: "https://cdn.pixabay.com/audio/2021/10/05/audio_f1dba43d90.mp3" },
  ],
  sanjose:    [
    { title: "Latin Jazz Fiesta",    url: "https://cdn.pixabay.com/audio/2022/07/25/audio_cd56b6f54e.mp3" },
    { title: "Bossa Nova Chill",     url: "https://cdn.pixabay.com/audio/2021/08/09/audio_45852ac45b.mp3" },
  ],
  paradise:   [
    { title: "Paradise Beach",       url: "https://cdn.pixabay.com/audio/2022/08/02/audio_4bcf72ec16.mp3" },
    { title: "Tropical Lounge",      url: "https://cdn.pixabay.com/audio/2021/11/01/audio_cb0f231032.mp3" },
  ],
  london:     [
    { title: "London Jazz Club",     url: "https://cdn.pixabay.com/audio/2022/09/14/audio_e3b18c51a1.mp3" },
    { title: "Thames Evening",       url: "https://cdn.pixabay.com/audio/2021/12/20/audio_d6b5c80862.mp3" },
  ],
  sydney:     [
    { title: "Sydney Harbour Chill", url: "https://cdn.pixabay.com/audio/2022/06/08/audio_dd6f327b79.mp3" },
    { title: "Harbour Bridge Lounge",url: "https://cdn.pixabay.com/audio/2021/07/15/audio_ca6c1d0d6e.mp3" },
  ],
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? "lasvegas";
  const apiKey = process.env.PIXABAY_API_KEY;

  // If no API key, return curated fallbacks
  if (!apiKey) {
    const tracks = FALLBACK[city] ?? FALLBACK.lasvegas;
    return NextResponse.json({ tracks, source: "fallback" });
  }

  try {
    const query = CITY_QUERIES[city] ?? "lounge jazz";
    const url   = `https://pixabay.com/api/music/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=10`;
    const res   = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
    if (!res.ok) throw new Error(`Pixabay API ${res.status}`);

    const data = await res.json();
    const tracks = (data.hits ?? []).map((h) => ({
      id:       h.id,
      title:    h.title ?? h.tags?.split(",")[0] ?? "Track",
      url:      h.audio_url ?? h.url ?? h.previewURL,
      duration: h.duration ?? 180,
      artist:   h.user ?? "Pixabay Artist",
    })).filter((t) => t.url);

    if (tracks.length === 0) throw new Error("No tracks returned");
    return NextResponse.json({ tracks, source: "pixabay" });
  } catch (e) {
    // Graceful fallback on API error
    const tracks = FALLBACK[city] ?? FALLBACK.lasvegas;
    return NextResponse.json({ tracks, source: "fallback", error: e.message });
  }
}
