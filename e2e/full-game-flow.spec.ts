import { test, expect } from '@playwright/test';

// 헬퍼: 게임 한 라운드 완료
async function solveAllProblems(page: any) {
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
}

test.describe('Full Game Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage 클리어하여 깨끗한 상태에서 시작
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('complete game flow: select difficulty -> play -> result -> ranking', async ({ page }) => {
    // 1. 난이도 선택 페이지
    await expect(page.getByRole('heading', { name: /연산 타임어택/i })).toBeVisible();

    // 2. 초급 난이도 선택
    await page.locator('[data-difficulty="easy"]').click();
    await expect(page).toHaveURL(/\/game\/easy/);

    // 3. 게임 플레이 - 5개 문제 풀기
    for (let i = 0; i < 5; i++) {
      // 현재 문제 번호 확인
      await expect(page.locator('.progress-text')).toHaveText(`${i + 1} / 5`);

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

    // 4. 결과 페이지로 이동
    await expect(page).toHaveURL(/\/result/, { timeout: 10000 });

    // 5. 결과 확인 - 시간 표시
    await expect(page.locator('.time-value')).toBeVisible();

    // 6. 신기록 표시 (첫 플레이)
    await expect(page.locator('.new-record-banner')).toBeVisible({ timeout: 5000 });

    // 7. 랭킹 보기로 이동
    await page.getByRole('button', { name: /랭킹 보기/i }).click();
    await expect(page).toHaveURL(/\/ranking/);

    // 8. 랭킹 페이지 확인
    await expect(page.locator('.ranking-title')).toHaveText('랭킹');
  });

  test('complete game flow: play again after completion', async ({ page }) => {
    // 1. 게임 완료
    await page.goto('/game/easy');
    await solveAllProblems(page);

    await expect(page).toHaveURL(/\/result/, { timeout: 10000 });

    // 2. 다시 하기 클릭
    await page.getByRole('button', { name: /다시 하기/i }).click();
    await expect(page).toHaveURL(/\/game\/easy/);

    // 3. 새 게임 시작 확인
    await expect(page.locator('.progress-text')).toHaveText('1 / 5');

    // 입력 필드가 활성화되어 있고 입력 가능한지 확인
    const input = page.locator('#answer-input');
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test('navigate from ranking back to home and start new game', async ({ page }) => {
    // 1. 랭킹 페이지로 이동
    await page.getByRole('button', { name: /랭킹 보기/i }).click();
    await expect(page).toHaveURL(/\/ranking/);

    // 2. 뒤로가기 버튼
    await page.getByRole('button', { name: /뒤로 가기/i }).click();
    await expect(page).toHaveURL('/');

    // 3. 다른 난이도 선택
    await page.locator('[data-difficulty="medium"]').click();
    await expect(page).toHaveURL(/\/game\/medium/);
  });
});

test.describe('Game Flow - Wrong Answer Handling', () => {
  test('retry same problem after wrong answer until correct', async ({ page }) => {
    await page.goto('/game/easy');

    // 1. 잘못된 답 입력
    const input = page.locator('#answer-input');
    await input.fill('0');
    await page.getByRole('button', { name: /정답 확인/i }).click();

    // 2. 여전히 1 / 5에 있음
    await expect(page.locator('.progress-text')).toHaveText('1 / 5');

    // 3. 정답 계산 및 입력
    const firstNum = await page.locator('.problem-num').first().textContent();
    const secondNum = await page.locator('.problem-num').last().textContent();

    if (firstNum && secondNum) {
      const answer = parseInt(firstNum) * parseInt(secondNum);
      await input.fill(answer.toString());
      await page.getByRole('button', { name: /정답 확인/i }).click();
      await page.waitForTimeout(300);

      // 4. 다음 문제로 진행
      await expect(page.locator('.progress-text')).toHaveText('2 / 5');
    }
  });
});

test.describe('Game Flow - Timer Functionality', () => {
  test('timer increases during gameplay', async ({ page }) => {
    await page.goto('/game/easy');

    // 1. 초기 타이머 확인
    await page.waitForTimeout(500);
    const timer = page.locator('.game-timer');
    await expect(timer).toBeVisible();

    const initialTime = await timer.textContent();

    // 2. 1초 대기
    await page.waitForTimeout(1100);

    // 3. 타이머가 증가했는지 확인
    const laterTime = await timer.textContent();

    expect(initialTime).not.toBe(laterTime);
  });

  test('result page shows final time', async ({ page }) => {
    await page.goto('/game/easy');
    await solveAllProblems(page);

    // 결과 페이지에서 시간 표시
    await expect(page).toHaveURL(/\/result/, { timeout: 10000 });

    const timeValue = page.locator('.time-value');
    await expect(timeValue).toBeVisible();

    // 시간 형식 확인: "X.XX초" (1분 미만) 또는 "M:SS.CC" (1분 이상)
    const timeText = await timeValue.textContent();
    expect(timeText).toMatch(/(\d+\.\d+초|\d+:\d+\.\d+)/);
  });
});

test.describe('Game Flow - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('game is playable on mobile viewport', async ({ page }) => {
    await page.goto('/');

    // 난이도 선택
    await page.locator('[data-difficulty="easy"]').click();
    await expect(page).toHaveURL(/\/game\/easy/);

    // 입력 및 제출 가능
    const input = page.locator('#answer-input');
    await expect(input).toBeVisible();

    const submitButton = page.getByRole('button', { name: /정답 확인/i });
    await expect(submitButton).toBeVisible();

    // 문제 풀이 가능
    const firstNum = await page.locator('.problem-num').first().textContent();
    const secondNum = await page.locator('.problem-num').last().textContent();

    if (firstNum && secondNum) {
      const answer = parseInt(firstNum) * parseInt(secondNum);
      await input.fill(answer.toString());
      await submitButton.click();

      await expect(page.locator('.progress-text')).toHaveText('2 / 5');
    }
  });
});

test.describe('Game Flow - Accessibility', () => {
  test('game elements have proper ARIA labels', async ({ page }) => {
    await page.goto('/game/easy');

    // 입력 필드에 aria-label이 있음
    const input = page.locator('#answer-input');
    const ariaLabel = await input.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/\d+\s*×\s*\d+/);
  });

  test('progress bar has proper ARIA attributes', async ({ page }) => {
    await page.goto('/game/easy');

    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '5');
  });

  test('ranking tabs are accessible', async ({ page }) => {
    await page.goto('/ranking');

    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toHaveAttribute('aria-label', '난이도 선택');

    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(3);
  });
});

test.describe('Game Flow - Navigation', () => {
  test('can navigate using keyboard on home page', async ({ page }) => {
    await page.goto('/');

    // Tab으로 난이도 버튼 이동
    await page.keyboard.press('Tab'); // 랭킹 버튼
    await page.keyboard.press('Tab'); // 첫 번째 난이도

    // Enter로 선택
    await page.keyboard.press('Enter');

    // 게임 페이지로 이동
    await expect(page).toHaveURL(/\/game\/.+/);
  });

  test('browser back button works correctly', async ({ page }) => {
    // 홈 -> 랭킹 -> 뒤로가기
    await page.goto('/');
    await page.getByRole('button', { name: /랭킹 보기/i }).click();
    await expect(page).toHaveURL(/\/ranking/);

    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});
