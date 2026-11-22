// Original WebAudio sounds, synthesized at runtime: no audio files, no
// network, nothing borrowed. A soft chime for loot, a low alarm swell, a
// muffled thud when a guard turns, and a short fanfare for the getaway.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, when, slideTo) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + when + seconds);
    gain.gain.setValueAtTime(0, ctx.currentTime + when);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + seconds + 0.05);
  }

  return {
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume();
    },
    loot() {
      tone(880, 0.16, 'sine', 0.5, 0);
      tone(1318, 0.22, 'sine', 0.4, 0.07);
    },
    smoke() {
      tone(320, 0.3, 'sine', 0.35, 0, 90);
    },
    alarmTick() {
      tone(196, 0.12, 'square', 0.16, 0);
      tone(147, 0.12, 'square', 0.16, 0.14);
    },
    caught() {
      tone(220, 0.5, 'sawtooth', 0.35, 0, 55);
      tone(110, 0.7, 'sawtooth', 0.3, 0.1, 40);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.28, 'triangle', 0.45, index * 0.11));
    },
    click() {
      tone(660, 0.06, 'sine', 0.3, 0);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
