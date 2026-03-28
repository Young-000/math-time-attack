/**
 * App 컴포넌트 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock pages to avoid complex dependencies
vi.mock('@presentation/pages', () => ({
  IntroPage: () => <div data-testid="intro-page">IntroPage</div>,
  DifficultySelectPage: () => <div data-testid="difficulty-page">DifficultySelectPage</div>,
  GamePage: () => <div data-testid="game-page">GamePage</div>,
  ResultPage: () => <div data-testid="result-page">ResultPage</div>,
  RankingPage: () => <div data-testid="ranking-page">RankingPage</div>,
  TimeAttackPage: () => <div data-testid="timeattack-page">TimeAttackPage</div>,
  TimeAttackResultPage: () => <div data-testid="timeattack-result-page">TimeAttackResultPage</div>,
  HallOfFamePage: () => <div data-testid="hall-of-fame-page">HallOfFamePage</div>,
  ExchangePage: () => <div data-testid="exchange-page">ExchangePage</div>,
  MyPointsPage: () => <div data-testid="my-points-page">MyPointsPage</div>,
}));

describe('App', () => {
  describe('라우팅', () => {
    it('루트 경로에서 IntroPage를 렌더링해야 한다', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('intro-page')).toBeInTheDocument();
    });

    it('/game/:difficulty 경로에서 GamePage를 렌더링해야 한다', () => {
      render(
        <MemoryRouter initialEntries={['/game/easy']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('game-page')).toBeInTheDocument();
    });

    it('/result 경로에서 ResultPage를 렌더링해야 한다', () => {
      render(
        <MemoryRouter initialEntries={['/result']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('result-page')).toBeInTheDocument();
    });

    it('/ranking 경로에서 RankingPage를 렌더링해야 한다', () => {
      render(
        <MemoryRouter initialEntries={['/ranking']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('ranking-page')).toBeInTheDocument();
    });

    it('/ranking/:difficulty 경로에서 RankingPage를 렌더링해야 한다', () => {
      render(
        <MemoryRouter initialEntries={['/ranking/easy']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByTestId('ranking-page')).toBeInTheDocument();
    });
  });
});
