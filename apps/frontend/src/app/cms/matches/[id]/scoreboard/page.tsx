'use client';

import { useParams } from 'next/navigation';
import { MatchScoreboard } from '@/components/cms/MatchScoreboard';

export default function ScoreboardPage() {
  const { id } = useParams<{ id: string }>();
  return <MatchScoreboard matchId={id} />;
}
