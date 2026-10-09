'use client';

import { useState } from 'react';
import Image from 'next/image';
import { UserRound } from 'lucide-react';
import { imageUrl } from '@/lib/image-url';
import styles from './MatchScoreboard.module.css';

type Props = {
  side: 1 | 2;
  athleteId?: string;
  athleteName: string;
  athletePhotoUrl?: string | null;
  athleteUnit: string;
  score: number;
  penalties: number;
  advantages: number;
  submissionAwarded: boolean;
  disabled: boolean;
  onSubmission: () => void;
  onAdvantage: () => void;
  onPenalty: (level: number) => void;
  onPoints: (points: number) => void;
};

export function ScoreboardAthleteRow({ side, athleteId, athleteName, athletePhotoUrl, athleteUnit, score, penalties, advantages, submissionAwarded, disabled, onSubmission, onAdvantage, onPenalty, onPoints }: Props) {
  const corner = side === 1 ? 'Đỏ' : 'Xanh';
  const avatarUrl = imageUrl(athletePhotoUrl || (athleteId ? `/api/participant-auth/avatar/${athleteId}` : undefined), 'portrait');
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string>();
  return (
    <section className={`${styles.row} ${side === 1 ? styles.red : styles.cyan}`} aria-label={`Bảng điểm ${corner}: ${athleteName}`} title={`${corner}: ${athleteName}`}>
      <div className={styles.athleteIdentity}>
        <div className={styles.avatar}>
          {avatarUrl && failedAvatarUrl !== avatarUrl ? (
            <Image src={avatarUrl} alt={`Ảnh đại diện ${athleteName}`} fill unoptimized sizes="9vw" className={styles.avatarImage} onError={() => setFailedAvatarUrl(avatarUrl)} />
          ) : <UserRound className={styles.avatarPlaceholder} aria-hidden="true" />}
        </div>
        <div className={styles.athleteInfo}>
          <div className={styles.athleteName} title={athleteName}>{athleteName}</div>
          <div className={styles.athleteUnit} title={athleteUnit}>{athleteUnit}</div>
        </div>
      </div>
      <div className={styles.actionGroup}>
        <div className={styles.actionColumn}>
          <div className={styles.submissionRow}>
            <button type="button" className={`${styles.submission} ${submissionAwarded ? styles.submissionLit : ''}`} disabled={disabled} aria-label={`Submission cho ${corner}: ${athleteName}`} aria-pressed={submissionAwarded} onClick={onSubmission}>Submission</button>
            <button
              type="button"
              className={`${styles.advantageCount} ${advantages > 0 ? styles.advantageLit : ''}`}
              disabled={disabled}
              aria-label={`Cộng 1 lợi thế cho ${athleteName}`}
              title={`Lợi thế: ${advantages}. Cộng 1 lợi thế cho ${athleteName}`}
              onClick={onAdvantage}
            ><span aria-label={`Số lợi thế ${corner}`} aria-live="polite" aria-atomic="true">{advantages}</span></button>
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
      <div className={styles.scoreContainer}>
        <span className={styles.score} aria-label={`Điểm ${athleteName}`}>{score}</span>
      </div>
    </section>
  );
}
