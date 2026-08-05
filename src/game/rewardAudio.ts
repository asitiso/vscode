export type RewardSound =
  | 'tap'
  | 'charge'
  | 'burst'
  | 'reveal'
  | 'legendary'
  | 'reward'
  | 'complete';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  endFrequency?: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.025, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playRewardSound(sound: RewardSound, enabled = true): void {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime + 0.01;

  switch (sound) {
    case 'tap':
      tone(context, 420, now, 0.08, 0.05, 'sine', 560);
      break;
    case 'charge':
      tone(context, 180, now, 0.42, 0.045, 'sawtooth', 760);
      tone(context, 260, now + 0.12, 0.34, 0.035, 'triangle', 980);
      break;
    case 'burst':
      tone(context, 110, now, 0.28, 0.08, 'sawtooth', 45);
      tone(context, 680, now + 0.04, 0.22, 0.055, 'square', 1300);
      break;
    case 'reveal':
      [523, 659, 784].forEach((frequency, index) =>
        tone(context, frequency, now + index * 0.075, 0.32, 0.045, 'sine'),
      );
      break;
    case 'legendary':
      [196, 294, 392, 587, 784].forEach((frequency, index) =>
        tone(context, frequency, now + index * 0.12, 0.6, 0.055, index < 2 ? 'triangle' : 'sine'),
      );
      break;
    case 'reward':
      tone(context, 740, now, 0.15, 0.045, 'sine', 980);
      tone(context, 980, now + 0.08, 0.2, 0.04, 'sine', 1240);
      break;
    case 'complete':
      [523, 659, 784, 1047].forEach((frequency, index) =>
        tone(context, frequency, now + index * 0.07, 0.34, 0.05, 'triangle'),
      );
      break;
  }
}
