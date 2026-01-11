import { test, expect } from '@playwright/test';

test.describe('Difficulty Select Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /연산 타임어택/i })).toBeVisible();
  });

  test('displays subtitle', async ({ page }) => {
    await expect(page.getByText(/5문제를 가장 빠르게 풀어보세요/i)).toBeVisible();
  });

  test('displays all three difficulty options', async ({ page }) => {
    await expect(page.getByText('초급')).toBeVisible();
    await expect(page.getByText('중급')).toBeVisible();
    await expect(page.getByText('고급')).toBeVisible();
  });

  test('displays difficulty ranges', async ({ page }) => {
    await expect(page.getByText(/1-9단/)).toBeVisible();
    await expect(page.getByText(/1-19단/)).toBeVisible();
    await expect(page.getByText(/1-99단/)).toBeVisible();
  });

  test('displays ranking button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /랭킹 보기/i })).toBeVisible();
  });

  test('navigates to easy game when clicking easy difficulty', async ({ page }) => {
    await page.locator('[data-difficulty="easy"]').click();
    await expect(page).toHaveURL(/\/game\/easy/);
  });

  test('navigates to medium game when clicking medium difficulty', async ({ page }) => {
    await page.locator('[data-difficulty="medium"]').click();
    await expect(page).toHaveURL(/\/game\/medium/);
  });

  test('navigates to hard game when clicking hard difficulty', async ({ page }) => {
    await page.locator('[data-difficulty="hard"]').click();
    await expect(page).toHaveURL(/\/game\/hard/);
  });

  test('navigates to ranking page when clicking ranking button', async ({ page }) => {
    await page.getByRole('button', { name: /랭킹 보기/i }).click();
    await expect(page).toHaveURL(/\/ranking/);
  });

  test('shows record status for each difficulty', async ({ page }) => {
    // 각 난이도 카드에 기록 상태 표시 (기록 없음 또는 시간)
    const difficultyCards = page.locator('.difficulty-card');
    await expect(difficultyCards).toHaveCount(3);

    // 각 카드에 기록 정보가 있는지 확인
    for (let i = 0; i < 3; i++) {
      const card = difficultyCards.nth(i);
      const recordOrNone = card.locator('.record-time, .record-none');
      await expect(recordOrNone).toBeVisible();
    }
  });
});
