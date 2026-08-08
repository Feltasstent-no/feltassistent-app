export type VoiceCue = 'ready10' | 'ready' | 'fire' | 'stop';

const CUE_FILES: Record<VoiceCue, string> = {
  ready10: '/audio/StartKommando.wav',
  ready: '/audio/Klar.wav',
  fire: '/audio/Ild.wav',
  stop: '/audio/Stans.wav',
};

// iOS/PWA-safe playback: one shared AudioContext, all four WAVs decoded once to
// AudioBuffers. Playing from a decoded buffer is deterministic, low-latency and never
// produces audible artifacts during unlock (unlike muted HTMLAudioElement priming,
// where iOS ignores volume=0 and plays the sound anyway).

let audioContext: AudioContext | null = null;
const buffers = new Map<VoiceCue, AudioBuffer>();
const loading = new Map<VoiceCue, Promise<void>>();

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function loadCue(cue: VoiceCue): Promise<void> {
  if (buffers.has(cue)) return Promise.resolve();
  const existing = loading.get(cue);
  if (existing) return existing;

  const ctx = getContext();
  if (!ctx) return Promise.resolve();

  const promise = fetch(CUE_FILES[cue])
    .then((res) => res.arrayBuffer())
    .then(
      (data) =>
        new Promise<void>((resolve, reject) => {
          // Callback form is used for broadest iOS Safari compatibility.
          ctx.decodeAudioData(
            data,
            (buffer) => {
              buffers.set(cue, buffer);
              resolve();
            },
            (err) => reject(err)
          );
        })
    )
    .catch(() => {
      // network/decoding failure — leave buffer unset, playback becomes a no-op
    })
    .finally(() => {
      loading.delete(cue);
    });

  loading.set(cue, promise);
  return promise;
}

export function preloadVoiceCues() {
  (Object.keys(CUE_FILES) as VoiceCue[]).forEach(loadCue);
}

export function unlockVoiceCues() {
  // Must run inside the Start user-gesture. Only resumes the shared context; makes no
  // sound and queues nothing.
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      // ignore — resume may reject if not in a gesture; playback simply stays blocked
    });
  }
  preloadVoiceCues();
}

function playBuffer(cue: VoiceCue, onEnded?: () => void): boolean {
  const ctx = getContext();
  const buffer = buffers.get(cue);
  if (!ctx || !buffer) return false;

  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (onEnded) source.onended = onEnded;
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

export function playStartCommand(onEnded: () => void) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onEnded();
  };

  const started = playBuffer('ready10', finish);
  if (!started) {
    // Buffer not ready or playback unavailable: never block the clock — start prep now.
    finish();
  }
}

export function playCue(cue: VoiceCue) {
  playBuffer(cue);
}
