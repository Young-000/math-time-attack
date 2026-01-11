import { Routes, Route } from 'react-router-dom';
import { DifficultySelectPage, GamePage, ResultPage, RankingPage } from '@presentation/pages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DifficultySelectPage />} />
      <Route path="/game/:difficulty" element={<GamePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/ranking" element={<RankingPage />} />
      <Route path="/ranking/:difficulty" element={<RankingPage />} />
    </Routes>
  );
}

export default App;
