
export enum AppView {
  LAB = 'LAB',
  ARCHITECT = 'ARCHITECT',
  COVER_ART = 'COVER_ART',
  TRANSCRIBE = 'TRANSCRIBE',
  LIVE = 'LIVE'
}

export interface AudioStem {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  color: string;
  pan?: number; // -100 (Left) to 100 (Right)
}

export interface LyricLine {
  time: number; // Start time in seconds
  text: string;
}

export interface AudioMetadata {
  bpm: number;
  key: string;
  chords: string[];
  lyrics?: LyricLine[];
}

export interface ProductConcept {
  brand: string;
  prompt: string;
  imageUrl?: string;
  description?: string;
}
