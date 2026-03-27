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

// Free, permanently hosted demo tracks — no API key needed
// Full Pixabay integration activates with PIXABAY_API_KEY in .env.local
const FALLBACK = {
  lasvegas:   [
    { title: "Neon Strip Groove",      artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"  },
    { title: "High Roller Lounge",     artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"  },
  ],
  tokyo:      [
    { title: "Neon Garden Drift",      artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"  },
    { title: "Cherry Blossom Night",   artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"  },
  ],
  macau:      [
    { title: "Dragon Palace Nights",   artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"  },
    { title: "Oriental Fortune",       artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
  ],
  montecarlo: [
    { title: "Riviera Elegance",       artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"  },
    { title: "Grand Prix Lounge",      artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
  ],
  singapore:  [
    { title: "Marina Bay Glow",        artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"  },
    { title: "Gardens by Night",       artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" },
  ],
  atlantic:   [
    { title: "Boardwalk Swagger",      artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"  },
    { title: "Seaside Stakes",         artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"  },
  ],
  badenbaden: [
    { title: "Black Forest Waltz",     artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3" },
    { title: "Grand Spa Concerto",     artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
  ],
  sanjose:    [
    { title: "Tropical Hacienda",      artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" },
    { title: "Latin Quarter Groove",   artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
  ],
  paradise:   [
    { title: "Paradise Shuffle",       artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3" },
    { title: "Blue Lagoon Lounge",     artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"  },
  ],
  london:     [
    { title: "Thames Twilight Jazz",   artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"  },
    { title: "Mayfair Club Vibes",     artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"  },
  ],
  sydney:     [
    { title: "Harbour Bridge Sunset",  artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"  },
    { title: "Opera House Sessions",   artist: "SoundHelix",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"  },
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
