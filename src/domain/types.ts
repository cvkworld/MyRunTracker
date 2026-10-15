export type Phase = 'run' | 'walk';
export type WorkoutStatus = 'active' | 'paused' | 'finished';
export type TrackingMode = 'background' | 'foreground';

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  status: WorkoutStatus;
  phase: Phase;
  mode: TrackingMode;
  weightKg: number;
  summary: string | null;
}

export interface Segment {
  id: string;
  sessionId: string;
  phase: Phase;
  startedAt: number;
  endedAt: number | null;
}

export interface Fix {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
}

export interface TrackPoint extends Fix {
  segmentId: string;
}

export interface Workout {
  session: Session;
  segments: Segment[];
  points: TrackPoint[];
}

export interface Split {
  kilometre: number;
  durationMs: number;
  cumulativeMs: number;
}

export interface PhaseStats {
  distanceM: number;
  durationMs: number;
  calories: number;
  splits: Split[];
  partialDistanceM: number;
  partialDurationMs: number;
}

export interface RoutePart {
  key: string;
  phase: Phase;
  coordinates: Fix[];
}

export interface Analysis {
  run: PhaseStats;
  walk: PhaseStats;
  activeMs: number;
  wallMs: number;
  liveSpeedMps: number;
  routes: RoutePart[];
  rejected: number;
  gaps: number;
  lastFix: Fix | null;
  lastGoodAt: number | null;
}

export interface Settings {
  weightKg: number;
}

export interface HistoryItem extends Session {
  totals: Pick<Analysis, 'run' | 'walk' | 'activeMs' | 'wallMs' | 'gaps' | 'rejected'>;
}
