import { Routes, Route } from 'react-router-dom';
import {
  IntroPage,
  DifficultySelectPage,
  GamePage,
  ResultPage,
  RankingPage,
  TimeAttackPage,
  TimeAttackResultPage,
  HallOfFamePage,
  ExchangePage,
  MyPointsPage,
} from '@presentation/pages';
import { ErrorBoundary } from '@presentation/components';
import { TossAdsProvider } from '@presentation/providers/TossAdsProvider';

function App() {
  return (
    <TossAdsProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/game" element={<DifficultySelectPage />} />
          <Route path="/game/:difficulty" element={<GamePage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/ranking/:difficulty" element={<RankingPage />} />
          {/* 타임어택 모드 */}
          <Route path="/time-attack/:difficulty" element={<TimeAttackPage />} />
          <Route path="/time-attack/result" element={<TimeAttackResultPage />} />
          {/* 명예의 전당 */}
          <Route path="/hall-of-fame" element={<HallOfFamePage />} />
          {/* 토스 포인트 교환 */}
          <Route path="/exchange" element={<ExchangePage />} />
          <Route path="/my-points" element={<MyPointsPage />} />
        </Routes>
      </ErrorBoundary>
    </TossAdsProvider>
  );
}

export default App;
