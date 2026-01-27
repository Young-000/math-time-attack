import { Routes, Route } from 'react-router-dom';
import {
  DifficultySelectPage,
  GamePage,
  ResultPage,
  RankingPage,
  TimeAttackPage,
  TimeAttackResultPage,
} from '@presentation/pages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DifficultySelectPage />} />
      <Route path="/game/:difficulty" element={<GamePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/ranking" element={<RankingPage />} />
      <Route path="/ranking/:difficulty" element={<RankingPage />} />
      {/* 타임어택 모드 */}
      <Route path="/time-attack/:difficulty" element={<TimeAttackPage />} />
      <Route path="/time-attack/result" element={<TimeAttackResultPage />} />
    </Routes>
  );
}

export default App;
