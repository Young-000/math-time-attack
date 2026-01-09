import { Routes, Route } from 'react-router-dom';
import { DifficultySelectPage, GamePage, ResultPage } from '@presentation/pages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DifficultySelectPage />} />
      <Route path="/game/:difficulty" element={<GamePage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}

export default App;
