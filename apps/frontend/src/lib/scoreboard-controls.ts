export type ScoreboardControlCommand = {
  action: 'START' | 'PAUSE' | 'RESUME' | 'AWARD' | 'UNDO' | 'FINISH';
  side?: 1 | 2;
  award?: 'POINTS' | 'ADVANTAGE' | 'PENALTY' | 'SUBMISSION';
  points?: number;
  penaltyLevel?: number;
  winnerId?: string;
  winMethod?: string;
};

export type ScoreboardShortcut =
  | { type: 'clock' | 'confirm' | 'fullscreen' | 'history' }
  | { type: 'command'; command: { action: 'UNDO' } };

type ResolvedScoreboardShortcut =
  | { type: 'confirm' | 'fullscreen' | 'history' }
  | { type: 'command'; command: ScoreboardControlCommand };

type KeyboardInput = { code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean };
type ControlState = {
  status: string;
  editable: boolean;
  modalOpen: boolean;
  blocked: boolean;
  runningSince: boolean;
  hasTime: boolean;
  terminal: boolean;
  canConfirmResult: boolean;
  hasActions: boolean;
};

export function getScoreboardShortcut(event: KeyboardInput): ScoreboardShortcut | null {
  if (event.altKey) return null;
  if (event.ctrlKey || event.metaKey) {
    return event.code === 'KeyZ' && !event.shiftKey ? { type: 'command', command: { action: 'UNDO' } } : null;
  }
  if (event.shiftKey) return null;
  if (event.code === 'Space') return { type: 'clock' };
  if (event.code === 'KeyR') return { type: 'confirm' };
  if (event.code === 'KeyF') return { type: 'fullscreen' };
  if (event.code === 'KeyH') return { type: 'history' };
  if (event.code === 'KeyU') return { type: 'command', command: { action: 'UNDO' } };

  return null;
}

export function resolveScoreboardShortcut(shortcut: ScoreboardShortcut, state: ControlState): ResolvedScoreboardShortcut | null {
  if (state.modalOpen) return null;
  if (shortcut.type === 'fullscreen' || shortcut.type === 'history') return { type: shortcut.type };
  if (!state.editable) return null;
  if (shortcut.type === 'clock') {
    if (state.status === 'SCHEDULED') return state.blocked ? null : { type: 'command', command: { action: 'START' } };
    if (state.status !== 'RUNNING') return null;
    if (state.runningSince) return { type: 'command', command: { action: 'PAUSE' } };
    return !state.terminal && state.hasTime ? { type: 'command', command: { action: 'RESUME' } } : null;
  }
  if (shortcut.type === 'confirm') return state.status === 'RUNNING' && state.canConfirmResult && !(state.runningSince && state.hasTime) ? { type: 'confirm' } : null;
  return shortcut.type === 'command' && state.status === 'RUNNING' && state.hasActions ? shortcut : null;
}
