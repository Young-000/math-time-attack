import { test, expect } from '@playwright/test';

// 게임 완료 후 결과 페이지에 도달하는 헬퍼 함수
async function completeGame(page: any, difficulty: string = 'easy') {
  await page.goto(`/game/${difficulty}`);

  for (let i = 0; i < 5; i++) {
    const firstNum = await page.locator('.problem-num').first().textContent();
    const secondNum = await page.locator('.problem-num').last().textContent();

    if (firstNum && secondNum) {
      const answer = parseInt(firstNum) * parseInt(secondNum);
      const input = page.locator('#answer-input');

      await input.fill(answer.toString());
      await page.getByRole('button', { name: /정답 확인/i }).click();
      await page.waitForTimeout(300);
    }
  }

  await page.waitForURL(/\/result/, { timeout: 10000 });
}

test.describe('Result Page', () => {
  test('displays elapsed time after game completion', async ({ page }) => {
    await completeGame(page);

    // 시간 표시 - 형식: "X.XX초" (1분 미만) 또는 "M:SS.CC" (1분 이상)
    await expect(page.locator('.time-value')).toBeVisible();
    const timeText = await page.locator('.time-value').textContent();
    expect(timeText).toMatch(/(\d+\.\d+초|\d+:\d+\.\d+)/);
  });

  test('displays difficulty label', async ({ page }) => {
    await completeGame(page);

    await expect(page.locator('.result-difficulty')).toBeVisible();
    await expect(page.locator('.result-difficulty')).toHaveText('초급');
  });

  test('displays action buttons', async ({ page }) => {
    await completeGame(page);

    // 3가지 액션 버튼
    await expect(page.getByRole('button', { name: /다시 하기/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /랭킹 보기/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /난이도 선택/i })).toBeVisible();
  });

  test('retry button navigates back to same difficulty game', async ({ page }) => {
    await completeGame(page, 'easy');

    await page.getByRole('button', { name: /다시 하기/i }).click();
    await expect(page).toHaveURL(/\/game\/easy/);
  });

  test('ranking button navigates to ranking page', async ({ page }) => {
    await completeGame(page, 'easy');

    await page.getByRole('button', { name: /랭킹 보기/i }).click();
    await expect(page).toHaveURL(/\/ranking\/easy/);
  });

  test('difficulty select button navigates to home', async ({ page }) => {
    await completeGame(page, 'easy');

    await page.getByRole('button', { name: /난이도 선택/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('shows new record indicator on first play', async ({ page }) => {
    // localStorage 클리어하여 첫 플레이 시뮬레이션
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await completeGame(page);

    // 신기록 표시 확인 (첫 플레이는 항상 신기록)
    await expect(page.locator('.new-record-banner')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.new-record-text')).toHaveText('신기록!');
  });

  test('shows current rank section', async ({ page }) => {
    await completeGame(page);

    // 현재 순위 섹션
    await expect(page.locator('.current-rank')).toBeVisible();
    await expect(page.locator('.rank-label')).toHaveText('현재 순위');
  });
});

test.describe('Result Page - Different Difficulties', () => {
  test('works correctly for medium difficulty', async ({ page }) => {
    await completeGame(page, 'medium');

    await expect(page.locator('.time-value')).toBeVisible();
    await expect(page.locator('.result-difficulty')).toHaveText('중급');
  });

  test('works correctly for hard difficulty', async ({ page }) => {
    await completeGame(page, 'hard');

    await expect(page.locator('.time-value')).toBeVisible();
    await expect(page.locator('.result-difficulty')).toHaveText('고급');
  });
});

test.describe('Result Page - Direct Access Prevention', () => {
  test('redirects to home if accessed directly without game state', async ({ page }) => {
    // 게임 상태 없이 직접 접근 시도
    await page.goto('/result');

    // 홈으로 리다이렉트
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});
