export type ScoreboardAward = {
  id: number;
  side: number;
  award: string;
  points: number;
  remainingMs: number;
  at: string;
  penaltyLevel?: number;
  opponentAward?: { side: number; award: 'ADVANTAGE' | 'POINTS'; points: number };
  scoreChanges?: { side: number; before: number; after: number }[];
  undone?: boolean;
};

export const SCOREBOARD_AWARD_LABELS: Record<string, string> = { POINTS: 'Điểm', ADVANTAGE: 'Lợi thế', PENALTY: 'Phạt', SUBMISSION: 'Submission', ATTACK: 'Chủ động tấn công' };

export function formatScoreboardTime(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
