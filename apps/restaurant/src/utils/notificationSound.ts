// Plays a short two-tone "new order" chime using the Web Audio API — no
// external audio file needed, and it works instantly after the restaurant
// app has had at least one user interaction (browsers require that before
// audio can play).
let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function beep(freq: number, start: number, duration: number, audioCtx: AudioContext) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
  gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration + 0.05);
}

export function playNewOrderChime() {
  try {
    const audioCtx = getContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    beep(880, 0, 0.18, audioCtx);
    beep(1108, 0.18, 0.22, audioCtx);
  } catch {
    // Audio isn't critical to functionality — fail silently (e.g. autoplay
    // restrictions before the user has interacted with the page at all).
  }
}
