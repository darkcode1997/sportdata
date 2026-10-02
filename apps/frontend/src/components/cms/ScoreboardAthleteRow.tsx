import styles from './MatchScoreboard.module.css';

type Props = {
  side: 1 | 2;
  athleteName: string;
  score: number;
  penalties: number;
  submissions: number;
  disabled: boolean;
  onSubmission: () => void;
  onPenalty: (level: number) => void;
  onPoints: (points: number) => void;
};

/** Structural conversion of one athlete row in scoreboard.html. */
export function ScoreboardAthleteRow({ side, athleteName, score, penalties, submissions, disabled, onSubmission, onPenalty, onPoints }: Props) {
  const corner = side === 1 ? 'Đỏ' : 'Xanh';
  return (
    <section className={`${styles.row} ${side === 1 ? styles.red : styles.cyan}`} aria-label={`Bảng điểm ${corner}: ${athleteName}`} title={`${corner}: ${athleteName}`}>
      <div className={styles.actionGroup}>
        <div className={styles.actionColumn}>
          <div className={styles.submissionRow}>
            <button type="button" className={styles.submission} disabled={disabled} aria-label={`Submission cho ${corner}: ${athleteName}`} onClick={onSubmission}>Submission</button>
            <span className={styles.submissionCount} aria-label={`Số submission ${corner}`}>{submissions}</span>
          </div>
          <div className={styles.penalties} role="group" aria-label={`Mốc phạt ${corner}: ${athleteName}`}>
            {[1, 2, 3, 4].map((level) => {
              const lit = penalties >= level;
              return <button
                key={level}
                type="button"
                className={`${styles.penalty} ${lit ? styles.penaltyLit : ''}`}
                aria-label={`${level}P ${corner}: ${athleteName}`}
                aria-pressed={lit}
                disabled={disabled || level !== penalties + 1}
                title={lit ? `Đã ghi nhận lần phạt ${level}` : `Ghi nhận lần phạt ${level} cho ${athleteName}`}
                onClick={() => onPenalty(level)}
              >{level}P</button>;
            })}
          </div>
        </div>
        <div className={styles.pointColumn}>
          {[2, 3, 4].map((points) => <button type="button" key={points} className={styles.point} disabled={disabled} aria-label={`Cộng ${points} điểm cho ${athleteName}`} onClick={() => onPoints(points)}>{points}</button>)}
        </div>
      </div>
      <span className={styles.score} aria-label={`Điểm ${athleteName}`}>{score}</span>
    </section>
  );
}
