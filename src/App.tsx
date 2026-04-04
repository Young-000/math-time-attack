import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { graniteEvent, closeView } from '@apps-in-toss/web-framework';
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

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = graniteEvent.addEventListener('backEvent', {
      onEvent: () => {
        if (location.pathname === '/') {
          closeView();
        } else {
          navigate(-1);
        }
      },
      onError: () => {},
    });

    return () => {
      unsubscribe();
    };
  }, [location.pathname, navigate]);

  return (
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
  );
}

function App() {
  return (
    <TossAdsProvider>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </TossAdsProvider>
  );
}

export default App;
