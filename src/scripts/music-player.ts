// Music player - audio persists across View Transitions navigations
// The window object persists, so we store everything there

declare global {
  interface Window {
    __musicPlayer?: {
      audioContext: AudioContext;
      analyser: AnalyserNode;
      audioElement: HTMLAudioElement;
      source: MediaElementAudioSourceNode;
      dataArray: Uint8Array;
      isPlaying: boolean;
      hasRandomizedPosition: boolean;
      animationId: number | null;
      onAudioData: ((level: number, bass: number) => void) | null;
    };
  }
}

const MUSIC_PATH = "/audio/melody.mp3";

// Store callback for when player is initialized later (avoids eager AudioContext creation)
let pendingCallback: ((level: number, bass: number) => void) | null = null;

function getPlayer() {
  return window.__musicPlayer;
}

async function initPlayer() {
  // Already initialized - reuse
  if (window.__musicPlayer) {
    return window.__musicPlayer;
  }

  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.8;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const audioElement = new Audio(MUSIC_PATH);
  audioElement.loop = true;
  audioElement.volume = 0.5;
  audioElement.preload = "auto";

  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  window.__musicPlayer = {
    audioContext,
    analyser,
    audioElement,
    source,
    dataArray,
    isPlaying: false,
    hasRandomizedPosition: false,
    animationId: null,
    onAudioData: null,
  };

  return window.__musicPlayer;
}

function startAnalysis() {
  const player = getPlayer();
  if (!player || !player.onAudioData) return;

  // Don't start multiple analysis loops
  if (player.animationId) return;

  function analyze() {
    const p = getPlayer();
    if (!p || !p.isPlaying || !p.onAudioData) {
      if (p) p.animationId = null;
      return;
    }

    p.analyser.getByteFrequencyData(p.dataArray as Uint8Array<ArrayBuffer>);

    let sum = 0;
    for (let i = 0; i < p.dataArray.length; i++) {
      sum += p.dataArray[i];
    }
    const level = sum / p.dataArray.length / 255;

    const bassEnd = Math.floor(p.dataArray.length * 0.2);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += p.dataArray[i];
    }
    const bass = bassSum / bassEnd / 255;

    p.onAudioData(level, bass);
    p.animationId = requestAnimationFrame(analyze);
  }

  analyze();
}

function stopAnalysis() {
  const player = getPlayer();
  if (!player) return;

  if (player.animationId) {
    cancelAnimationFrame(player.animationId);
    player.animationId = null;
  }
}

export async function play() {
  const player = await initPlayer();

  // Apply pending callback if any
  if (pendingCallback && !player.onAudioData) {
    player.onAudioData = pendingCallback;
    pendingCallback = null;
  }

  if (player.audioContext.state === "suspended") {
    await player.audioContext.resume();
  }

  await player.audioElement.play();

  // Set random position after play starts (required for mobile browsers)
  if (!player.hasRandomizedPosition && player.audioElement.duration) {
    const randomPosition = Math.random() * player.audioElement.duration;
    player.audioElement.currentTime = randomPosition;
    player.hasRandomizedPosition = true;
  }

  player.isPlaying = true;
  startAnalysis();
}

export function pause() {
  const player = getPlayer();
  if (!player) return;

  player.audioElement.pause();
  player.isPlaying = false;
  stopAnalysis();

  // Send zero levels
  if (player.onAudioData) {
    player.onAudioData(0, 0);
  }
}

export async function toggle() {
  const player = getPlayer();
  if (player?.isPlaying) {
    pause();
  } else {
    await play();
  }
}

export function setVolume(v: number) {
  const player = getPlayer();
  if (player) {
    player.audioElement.volume = Math.max(0, Math.min(1, v));
  }
}

export function isPlaying(): boolean {
  return getPlayer()?.isPlaying ?? false;
}

// Connect audio data callback - called on each page load
export function connectAudioCallback(
  callback: (level: number, bass: number) => void
) {
  const player = getPlayer();
  if (player) {
    player.onAudioData = callback;

    // If already playing, restart analysis with new callback
    if (player.isPlaying) {
      stopAnalysis();
      startAnalysis();
    }
  } else {
    // Player not initialized yet - store callback for when play() is called
    // Don't init player here to avoid eager AudioContext creation (triggers macOS mic indicator)
    pendingCallback = callback;
  }
}
