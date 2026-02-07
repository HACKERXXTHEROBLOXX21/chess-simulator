
import { SOUNDS } from '../constants';
import { SoundType } from '../types';

class AudioService {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();

  constructor() {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds.set(key as SoundType, audio);
    });
  }

  play(type: SoundType) {
    const audio = this.sounds.get(type);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Audio playback failed:', e));
    }
  }
}

export const audioService = new AudioService();
