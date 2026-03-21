import { lazy, Suspense } from 'react';
import { SectionErrorBoundary } from '../ErrorBoundary';
import { LoadingFallback } from '../LoadingFallback';

const LeagueView = lazy(() => import('../LeagueView').then((m) => ({ default: m.LeagueView })));

interface Props {
  onStartTournament: (leagueId: string, options?: { quickStart?: boolean | undefined; playerNames?: string[] | undefined }) => void;
}

export function LeagueModeContainer({ onStartTournament }: Props) {
  return (
    <SectionErrorBoundary><Suspense fallback={<LoadingFallback />}>
      <LeagueView onStartTournament={onStartTournament} />
    </Suspense></SectionErrorBoundary>
  );
}
