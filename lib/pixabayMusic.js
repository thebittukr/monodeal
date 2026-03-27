/**
 * Pixabay Music Player
 * Streams city-themed music from Pixabay CDN.
 * Auto-shuffles, loops playlist, exposes now-playing info.
 */

let _instance = null;

class PixabayMusicPlayer {
  constructor() {
    this.audio       = null;  // lazy init (requires browser)
    this.tracks      = [];
    this.currentIdx  = 0;
    this.volume      = 0.35;
    this.playing     = false;
    this.city        = null;
    this.onTrackChange = null; // callback(track) for UI updates
    this._loading    = false;
  }

  _initAudio() {
    if (this.audio) return;
    this.audio           = new Audio();
    this.audio.volume    = this.volume;
    this.audio.addEventListener("ended",  () => this.next());
    this.audio.addEventListener("error",  () => {
      console.warn("[Music] Track error, skipping…");
      setTimeout(() => this.next(), 1000);
    });
  }

  async loadCity(city) {
    if (this._loading) return;
    this._loading = true;
    this.city = city;

    try {
      const res   = await fetch(`/api/music?city=${encodeURIComponent(city)}`);
      const data  = await res.json();
      this.tracks = this._shuffle(data.tracks ?? []);
      this.currentIdx = 0;
      if (this.playing) {
        this._playCurrentTrack();
      }
    } catch (e) {
      console.warn("[Music] Failed to load tracks:", e.message);
    } finally {
      this._loading = false;
    }
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _playCurrentTrack() {
    this._initAudio();
    const track = this.tracks[this.currentIdx];
    if (!track) return;

    const url = typeof track === "string" ? track : track.url;
    if (!url) { this.next(); return; }

    this.audio.src = url;
    const p = this.audio.play();
    if (p) p.catch(() => {});
    this.onTrackChange?.(this.getCurrentTrack());
  }

  play() {
    this._initAudio();
    this.playing = true;
    if (this.tracks.length > 0) {
      this._playCurrentTrack();
    }
  }

  pause() {
    this.playing = false;
    this.audio?.pause();
  }

  stop() {
    this.playing = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  next() {
    if (this.tracks.length === 0) return;
    this.currentIdx = (this.currentIdx + 1) % this.tracks.length;
    if (this.playing) this._playCurrentTrack();
    else this.onTrackChange?.(this.getCurrentTrack());
  }

  prev() {
    if (this.tracks.length === 0) return;
    this.currentIdx = (this.currentIdx - 1 + this.tracks.length) % this.tracks.length;
    if (this.playing) this._playCurrentTrack();
    else this.onTrackChange?.(this.getCurrentTrack());
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this.volume;
  }

  getCurrentTrack() {
    const t = this.tracks[this.currentIdx];
    if (!t) return null;
    if (typeof t === "string") return { title: "Now Playing", url: t };
    return t;
  }

  isPlaying() {
    return this.playing && this.audio && !this.audio.paused;
  }
}

// Singleton — one player across the whole app
export function getMusicPlayer() {
  if (!_instance) _instance = new PixabayMusicPlayer();
  return _instance;
}
