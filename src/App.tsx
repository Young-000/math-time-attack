import { Routes, Route } from 'react-router-dom';
import {
  DifficultySelectPage,
  GamePage,
  ResultPage,
  RankingPage,
  TimeAttackPage,
  TimeAttackResultPage,
  PromoTestPage,
  HallOfFamePage,
} from '@presentation/pages';
import { TossAdsProvider } from '@presentation/providers/TossAdsProvider';

function App() {
  return (
    <TossAdsProvider>
      <Routes>
        <Route path="/" element={<DifficultySelectPage />} />
        <Route path="/game/:difficulty" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/ranking/:difficulty" element={<RankingPage />} />
        {/* 타임어택 모드 */}
        <Route path="/time-attack/:difficulty" element={<TimeAttackPage />} />
        <Route path="/time-attack/result" element={<TimeAttackResultPage />} />
        {/* 명예의 전당 */}
        <Route path="/hall-of-fame" element={<HallOfFamePage />} />
        {/* 프로모션 테스트 (샌드박스 전용) */}
        <Route path="/promo-test" element={<PromoTestPage />} />
      </Routes>
    </TossAdsProvider>
  );
}

export default App;
