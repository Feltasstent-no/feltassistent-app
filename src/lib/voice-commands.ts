export type VoiceCue = 'ready10' | 'ready' | 'fire' | 'stop';

const CUE_FILES: Record<VoiceCue, string> = {
  ready10: '/audio/StartKommando.wav',
  ready: '/audio/Klar.wav',
  fire: '/audio/Ild.wav',
  stop: '/audio/Stans.wav',
};

// One preloaded HTMLAudioElement per WAV. We never call .play() during preload/unlock
// (no muted priming): iOS ignores volume=0 and would otherwise play the sound audibly.
// The only element started directly from the Start user-gesture is 'ready10'
// (StartKommando); once that user-activated playback happens, the remaining elements
// are allowed to play later during the countdown.

const elements = new Map<VoiceCue, HTMLAudioElement>();

function getElement(cue: VoiceCue): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let el = elements.get(cue);
  if (!el) {
    el = new Audio(CUE_FILES[cue]);
    el.preload = 'auto';
    elements.set(cue, el);
  }
  return el;
}

export function preloadVoiceCues() {
  (Object.keys(CUE_FILES) as VoiceCue[]).forEach((cue) => {
    const el = getElement(cue);
    if (el) el.load();
  });
}

export function unlockVoiceCues() {
  // Ensure the elements exist and are loading. Intentionally does NOT call .play().
  preloadVoiceCues();
}

export function playStartCommand(onEnded: () => void) {
  const el = getElement('ready10');
  if (!el) {
    console.debug('[voice] ready10 element unavailable, starting clock via fallback');
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
    console.debug('[voice] play ready10', { readyState: el.readyState });
    const result = el.play();
    if (result && typeof result.then === 'function') {
      result
        .then(() => console.debug('[voice] ready10 play() success'))
        .catch((err) => {
          console.debug('[voice] ready10 play() failed, fallback start', err);
          finish();
        });
    }
  } catch (err) {
    console.debug('[voice] ready10 play() threw, fallback start', err);
    finish();
  }
}

export function playCue(cue: VoiceCue) {
  const el = getElement(cue);
  if (!el) {
    console.debug('[voice] element unavailable', cue);
    return;
  }
  try {
    el.currentTime = 0;
    console.debug('[voice] play cue', cue, { readyState: el.readyState });
    const result = el.play();
    if (result && typeof result.then === 'function') {
      result
        .then(() => console.debug('[voice] cue play() success', cue))
        .catch((err) => console.debug('[voice] cue play() failed', cue, err));
    }
  } catch (err) {
    console.debug('[voice] cue play() threw', cue, err);
  }
}
