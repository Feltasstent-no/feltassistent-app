export type VoiceCue = 'ready10' | 'ready' | 'fire' | 'stop';

const CUE_FILES: Record<VoiceCue, string> = {
  ready10: '/audio/StartKommando.wav',
  ready: '/audio/Klar.wav',
  fire: '/audio/Ild.wav',
  stop: '/audio/Stans.wav',
};

const elements = new Map<VoiceCue, HTMLAudioElement>();
let primed = false;

function getElement(cue: VoiceCue): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let el = elements.get(cue);
  if (!el) {
    el = new Audio(CUE_FILES[cue]);
    el.preload = 'auto';
    try {
      el.load();
    } catch {
      // ignore
    }
    elements.set(cue, el);
  }
  return el;
}

export function preloadVoiceCues() {
  (Object.keys(CUE_FILES) as VoiceCue[]).forEach(getElement);
}

export function unlockVoiceCues() {
  if (primed) return;
  primed = true;
  // Prime the cues that fire later during the countdown. 'ready10' is intentionally
  // skipped: it is played audibly as the very first sound after the Start press, so
  // priming it muted here could pause that first real playback.
  (['ready', 'fire', 'stop'] as VoiceCue[]).forEach((cue) => {
    const el = getElement(cue);
    if (!el) return;
    const originalVolume = el.volume;
    el.volume = 0;
    const playResult = el.play();
    if (playResult && typeof playResult.then === 'function') {
      playResult
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = originalVolume;
        })
        .catch(() => {
          el.volume = originalVolume;
        });
    } else {
      el.volume = originalVolume;
    }
  });
}

export function playStartCommand(onEnded: () => void) {
  const el = getElement('ready10');
  if (!el) {
    onEnded();
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.removeEventListener('ended', finish);
    el.removeEventListener('error', finish);
    onEnded();
  };

  el.addEventListener('ended', finish, { once: true });
  el.addEventListener('error', finish, { once: true });

  try {
    el.currentTime = 0;
    el.volume = 1;
    const playResult = el.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        finish();
      });
    }
  } catch {
    finish();
  }
}

export function playCue(cue: VoiceCue) {
  const el = getElement(cue);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = 1;
    const playResult = el.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        // playback blocked / file missing — ignore, clock is unaffected
      });
    }
  } catch {
    // ignore
  }
}
