// All sound is synthesised with WebAudio — no audio files, no network.
// Short plucks and thuds for actions, and a quiet pentatonic music loop
// that the game loop drives through tick(dt).

const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
const ROOT = 220;

export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  let started = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  /** Call from a user gesture (start / restart) so the browser allows sound. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    started = true;
  }

  function tone(freq, duration, type, volume, when = 0, slideTo = 0) {
    if (!context || !started) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function note(freq, duration, volume) {
    if (!context || !started) return;
    const t0 = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    },
    /** A mote pickup: pitch climbs with the combo, so chains sound like rising. */
    collect(combo) {
      const step = Math.min(combo, PENTA.length - 1);
      const freq = ROOT * Math.pow(2, PENTA[step] / 12);
      tone(freq, 0.28, 'sine', 0.5);
      tone(freq * 2, 0.18, 'triangle', 0.18);
    },
    dash() {
      tone(520, 0.16, 'sawtooth', 0.12, 0, 180);
    },
    hit() {
      tone(160, 0.35, 'sawtooth', 0.4, 0, 55);
      tone(70, 0.3, 'square', 0.25, 0, 40);
    },
    power() {
      tone(660, 0.14, 'sine', 0.35);
      tone(880, 0.14, 'sine', 0.3, 0.09);
      tone(1320, 0.22, 'sine', 0.28, 0.18);
    },
    comet() {
      tone(980, 0.5, 'triangle', 0.35, 0, 1560);
      tone(1470, 0.4, 'sine', 0.2, 0.08);
    },
    wave() {
      tone(392, 0.3, 'triangle', 0.25);
      tone(523, 0.4, 'triangle', 0.25, 0.12);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.5, 'triangle', 0.3, i * 0.14));
    },
    lose() {
      [392, 330, 262, 196].forEach((freq, i) => tone(freq, 0.45, 'sine', 0.3, i * 0.16));
    },
    /** Called every frame; schedules the next music note when one is due. */
    tick(dt) {
      if (!context || !started || muted) return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      musicTimer = 0.42;
      musicStep += 1;
      // A slow wandering line over the pentatonic scale, with a soft low root
      // every eighth note so the loop feels like a song, not a metronome.
      const walk = [0, 2, 4, 7, 5, 9, 7, 4, 2, 5, 7, 10, 9, 7, 5, 4];
      const degree = walk[musicStep % walk.length];
      const freq = (ROOT / 2) * Math.pow(2, PENTA[degree % PENTA.length] / 12);
      note(freq, 0.9, 0.5);
      if (musicStep % 8 === 0) note(ROOT / 4, 2.2, 0.5);
      if (musicStep % 4 === 2) note(freq * 1.5, 0.7, 0.18);
    },
  };
}
