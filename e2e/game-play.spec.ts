import { test, expect } from '@playwright/test';

test.describe('Game Play Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game/easy');
  });

  test('displays game UI elements', async ({ page }) => {
    // 문제 표시 영역
    await expect(page.locator('.problem-card')).toBeVisible();
    await expect(page.locator('.problem-op')).toHaveText('×');

    // 입력 필드
    await expect(page.locator('#answer-input')).toBeVisible();

    // 확인 버튼
    await expect(page.getByRole('button', { name: /정답 확인/i })).toBeVisible();

    // 진행률 표시 (1 / 5)
    await expect(page.locator('.progress-text')).toContainText('/ 5');
  });

  test('displays timer', async ({ page }) => {
    // 타이머가 표시됨
    await expect(page.locator('.game-timer')).toBeVisible();
  });

  test('input field can receive focus and input', async ({ page }) => {
    const input = page.locator('#answer-input');

    // 입력 필드 클릭하여 포커스
    await input.click();
    await expect(input).toBeFocused();

    // 입력 가능한지 확인
    await input.fill('123');
    await expect(input).toHaveValue('123');
  });

  test('can enter answer and submit', async ({ page }) => {
    const input = page.locator('#answer-input');
    await input.fill('42');
    await page.getByRole('button', { name: /정답 확인/i }).click();
  });

  test('can submit answer with Enter key', async ({ page }) => {
    const input = page.locator('#answer-input');
    await input.fill('42');
    await input.press('Enter');
  });

  test('clears input after submission', async ({ page }) => {
    const input = page.locator('#answer-input');
    await input.fill('42');
    await page.getByRole('button', { name: /정답 확인/i }).click();

    // 입력 필드가 비워짐 (정답이든 오답이든)
    await expect(input).toHaveValue('');
  });

  test('shows progress indicator starting at 1', async ({ page }) => {
    // 초기 상태: 1 / 5
    await expect(page.locator('.progress-text')).toHaveText('1 / 5');
  });

  test('shows progress bar', async ({ page }) => {
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
  });
});

test.describe('Game Play - Correct Answer Flow', () => {
  test('progresses to next problem on correct answer', async ({ page }) => {
    await page.goto('/game/easy');

    // 문제에서 숫자 추출하여 정답 계산
    const firstNum = await page.locator('.problem-num').first().textContent();
    const secondNum = await page.locator('.problem-num').last().textContent();

    if (firstNum && secondNum) {
      const answer = parseInt(firstNum) * parseInt(secondNum);
      const input = page.locator('#answer-input');

      await input.fill(answer.toString());
      await page.getByRole('button', { name: /정답 확인/i }).click();

      // 다음 문제로 진행 (2 / 5)
      await expect(page.locator('.progress-text')).toHaveText('2 / 5', { timeout: 5000 });
    }
  });
});

test.describe('Game Play - Wrong Answer Flow', () => {
  test('stays on same problem after wrong answer', async ({ page }) => {
    await page.goto('/game/easy');

    const input = page.locator('#answer-input');

    // 0은 항상 틀린 답 (1-9 곱셈에서 0이 나올 수 없음)
    await input.fill('0');
    await page.getByRole('button', { name: /정답 확인/i }).click();

    // 여전히 1 / 5에 있음
    await expect(page.locator('.progress-text')).toHaveText('1 / 5');
  });

  test('clears input after wrong answer', async ({ page }) => {
    await page.goto('/game/easy');

    const input = page.locator('#answer-input');
    await input.fill('0');
    await page.getByRole('button', { name: /정답 확인/i }).click();

    await expect(input).toHaveValue('');
  });

  test('shows shake animation on wrong answer', async ({ page }) => {
    await page.goto('/game/easy');

    const input = page.locator('#answer-input');
    await input.fill('0');
    await page.getByRole('button', { name: /정답 확인/i }).click();

    // 입력 필드에 wrong 클래스 추가됨
    await expect(input).toHaveClass(/wrong/);
  });
});

test.describe('Game Completion', () => {
  test('navigates to result page after completing all problems', async ({ page }) => {
    await page.goto('/game/easy');

    // 5개 문제 모두 풀기
    for (let i = 0; i < 5; i++) {
      // 문제에서 숫자 추출
      const firstNum = await page.locator('.problem-num').first().textContent();
      const secondNum = await page.locator('.problem-num').last().textContent();

      if (firstNum && secondNum) {
        const answer = parseInt(firstNum) * parseInt(secondNum);
        const input = page.locator('#answer-input');

        await input.fill(answer.toString());
        await page.getByRole('button', { name: /정답 확인/i }).click();

        // 잠시 대기 (상태 업데이트)
        await page.waitForTimeout(300);
      }
    }

    // 결과 페이지로 이동
    await expect(page).toHaveURL(/\/result/, { timeout: 10000 });
  });
});

test.describe('Game Play - Invalid Difficulty', () => {
  test('shows error for invalid difficulty', async ({ page }) => {
    await page.goto('/game/invalid');
    await expect(page.getByText(/잘못된 난이도/i)).toBeVisible();
  });
});
