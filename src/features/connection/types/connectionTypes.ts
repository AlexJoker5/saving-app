export type ConnectionRoute = 'direct' | 'worker';
export type ConnectionPhase = 'preparing' | 'switching' | 'ready' | 'error';

export interface ConnectionSnapshot {
  phase: ConnectionPhase;
  route: ConnectionRoute | null;
  message: string;
}

export interface ConnectionOptions {
  original: string;
  proxy: string;
  key: string;
  development: boolean;
}
