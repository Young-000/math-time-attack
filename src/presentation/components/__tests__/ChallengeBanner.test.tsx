/**
 * ChallengeBanner 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChallengeBanner } from '../ChallengeBanner';

// 렌더마다 effect가 다시 돌면 남은 시간 계산이 끝없이 반복된다.
// 무한 루프가 테스트를 멈추게 두지 않고 실패로 끝내기 위해 호출 상한을 둔다.
const MAX_REMAINING_CALLS = 20;

// 주간·월간 마감일이 서로 다른 날짜로 고정한다 (월말이 일요일인 주에는 둘이 같아진다).
const FIXED_NOW = new Date(2026, 9, 2, 12, 0, 0);

const { mockGetTimeRemaining } = vi.hoisted(() => ({
  mockGetTimeRemaining: vi.fn(),
}));

vi.mock('@domain/services/challengeService', async () => {
  const actual = await vi.importActual<typeof import('@domain/services/challengeService')>(
    '@domain/services/challengeService',
  );
  return {
    ...actual,
    getTimeRemaining: mockGetTimeRemaining,
  };
});

describe('ChallengeBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
    mockGetTimeRemaining.mockReset();
    mockGetTimeRemaining.mockImplementation(() => {
      if (mockGetTimeRemaining.mock.calls.length > MAX_REMAINING_CALLS) {
        throw new Error('getTimeRemaining called on every render (effect loop)');
      }
      return { days: 2, hours: 3, minutes: 4 };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderBanner = () =>
    render(
      <MemoryRouter>
        <ChallengeBanner />
      </MemoryRouter>,
    );

  it('남은 시간을 표시한다', () => {
    renderBanner();
    expect(screen.getByText('마감까지 2일 3시간')).toBeInTheDocument();
  });

  it('마감 시각이 같으면 재렌더해도 남은 시간을 다시 계산하지 않는다', () => {
    const { rerender } = renderBanner();
    rerender(
      <MemoryRouter>
        <ChallengeBanner />
      </MemoryRouter>,
    );
    expect(mockGetTimeRemaining).toHaveBeenCalledTimes(1);
  });

  it('탭을 바꾸면 해당 기간의 남은 시간을 다시 계산한다', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: '월간 챌린지' }));
    expect(mockGetTimeRemaining).toHaveBeenCalledTimes(2);
  });
});
