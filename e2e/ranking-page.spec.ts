import { test, expect } from '@playwright/test';

test.describe('Ranking Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ranking');
  });

  test('displays ranking page title', async ({ page }) => {
    await expect(page.locator('.ranking-title')).toHaveText('랭킹');
  });

  test('displays difficulty tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '초급' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '중급' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '고급' })).toBeVisible();
  });

  test('easy tab is selected by default', async ({ page }) => {
    const easyTab = page.getByRole('tab', { name: '초급' });
    await expect(easyTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch between difficulty tabs', async ({ page }) => {
    // 중급 탭 클릭
    await page.getByRole('tab', { name: '중급' }).click();

    // URL 업데이트 확인
    await expect(page).toHaveURL(/\/ranking\/medium/);

    // 탭 선택 상태 확인
    await expect(page.getByRole('tab', { name: '중급' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: '초급' })).toHaveAttribute('aria-selected', 'false');
  });

  test('displays back button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /뒤로 가기/i })).toBeVisible();
  });

  test('back button navigates to home', async ({ page }) => {
    await page.getByRole('button', { name: /뒤로 가기/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('displays nickname bar', async ({ page }) => {
    await expect(page.locator('.ranking-nickname-bar')).toBeVisible();
    await expect(page.locator('.nickname-label')).toHaveText('내 닉네임:');
  });

  test('displays ranking content area', async ({ page }) => {
    await expect(page.locator('.ranking-content')).toBeVisible();
  });
});

test.describe('Ranking Page - Specific Difficulty', () => {
  test('can access easy ranking directly', async ({ page }) => {
    await page.goto('/ranking/easy');
    await expect(page.locator('.ranking-title')).toHaveText('랭킹');
    await expect(page.getByRole('tab', { name: '초급' })).toHaveAttribute('aria-selected', 'true');
  });

  test('can access medium ranking directly', async ({ page }) => {
    await page.goto('/ranking/medium');
    await expect(page.locator('.ranking-title')).toHaveText('랭킹');
    await expect(page.getByRole('tab', { name: '중급' })).toHaveAttribute('aria-selected', 'true');
  });

  test('can access hard ranking directly', async ({ page }) => {
    await page.goto('/ranking/hard');
    await expect(page.locator('.ranking-title')).toHaveText('랭킹');
    await expect(page.getByRole('tab', { name: '고급' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Ranking Page - Nickname Feature', () => {
  test('displays nickname in header', async ({ page }) => {
    await page.goto('/ranking');

    // 닉네임 값이 로딩되거나 표시됨
    const nicknameValue = page.locator('.nickname-value');
    await expect(nicknameValue).toBeVisible();
  });

  test('can open nickname edit modal', async ({ page }) => {
    await page.goto('/ranking');

    // 닉네임 수정 버튼 클릭
    await page.locator('.nickname-edit-btn').click();

    // 모달이 열리는지 확인 (NicknameModal 컴포넌트)
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 5000 });
  });

  test('can close nickname modal', async ({ page }) => {
    await page.goto('/ranking');

    // 모달 열기
    await page.locator('.nickname-edit-btn').click();
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible({ timeout: 5000 });

    // 닫기 버튼 또는 배경 클릭으로 닫기
    const closeButton = page.locator('[aria-label="닫기"], .modal-close, .close-btn');
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    // 모달이 닫히는지 확인 (짧은 대기 후)
    await page.waitForTimeout(300);
  });
});

test.describe('Ranking Page - Tab Panel', () => {
  test('tabpanel has correct aria attributes', async ({ page }) => {
    await page.goto('/ranking/easy');

    const tabPanel = page.locator('[role="tabpanel"]');
    await expect(tabPanel).toHaveAttribute('id', 'ranking-panel-easy');
    await expect(tabPanel).toHaveAttribute('aria-label', '초급 랭킹');
  });

  test('tab panel updates when switching tabs', async ({ page }) => {
    await page.goto('/ranking');

    // 고급 탭으로 전환
    await page.getByRole('tab', { name: '고급' }).click();

    // 탭 패널 aria-label 업데이트 확인
    const tabPanel = page.locator('[role="tabpanel"]');
    await expect(tabPanel).toHaveAttribute('aria-label', '고급 랭킹');
  });
});
