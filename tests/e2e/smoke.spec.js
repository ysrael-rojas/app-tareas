import { test, expect } from '@playwright/test';

/**
 * Real-browser smoke suite for App Tareas.
 *
 * Complementary to the Vitest+RTL acceptance suite (tests/acceptance/app.test.jsx),
 * which covers the 10 MVP criteria at the component level in jsdom. These tests
 * run against the production build (npm run build + npm run preview) in Chromium
 * and exercise the behavior a real browser provides that jsdom cannot:
 * real localStorage across a full page reload, real keyboard events, the real
 * `window.confirm` modal, real ARIA tab associations, and real CSS rendering.
 */

/** Navigate to the app and clear localStorage for a clean, isolated slate. */
async function freshPage(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test('app boots and shows the shell', async ({ page }) => {
  await freshPage(page);

  await expect(page).toHaveTitle('App Tareas');
  await expect(page.getByPlaceholder('¿Qué necesitas hacer?')).toBeVisible();
});

test('creating a task adds it to the list and announces it', async ({ page }) => {
  await freshPage(page);

  await page.getByRole('textbox', { name: /título/i }).fill('Comprar leche');
  await page.getByRole('button', { name: /agregar/i }).click();

  await expect(page.locator('li[data-id]')).toContainText('Comprar leche');
  await expect(page.locator('#app-announcer')).toContainText('Tarea agregada');
});

test('the task survives a full page reload', async ({ page }) => {
  await freshPage(page);

  await page.getByRole('textbox', { name: /título/i }).fill('Tarea persistente');
  await page.getByRole('button', { name: /agregar/i }).click();
  await expect(page.locator('li[data-id]')).toContainText('Tarea persistente');

  await page.reload();

  await expect(page.locator('li[data-id]')).toContainText('Tarea persistente');
});

test('toggling a task marks it is-completed and changes the filter count', async ({ page }) => {
  await freshPage(page);

  await page.getByRole('textbox', { name: /título/i }).fill('Terminar el reporte');
  await page.getByRole('button', { name: /agregar/i }).click();

  await expect(page.locator('[data-counter="pending"]')).toHaveText('1');

  await page.locator('.task__toggle').check();

  await expect(page.locator('li[data-id]')).toHaveClass(/is-completed/);
  await expect(page.locator('[data-counter="pending"]')).toHaveText('0');
});

test('keyboard navigation moves focus and changes the active filter', async ({ page }) => {
  await freshPage(page);

  await page.locator('#filter-tab-all').focus();
  await page.keyboard.press('ArrowRight');

  await expect(page.locator('#filter-tab-pending')).toBeFocused();
  await expect(page.locator('#filter-tab-pending')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#filter-tab-all')).toHaveAttribute('aria-selected', 'false');
});

test('deleting a task shows confirm and removes the task when accepted', async ({ page }) => {
  await freshPage(page);

  page.on('dialog', (dialog) => dialog.accept());

  await page.getByRole('textbox', { name: /título/i }).fill('Comprar pan');
  await page.getByRole('button', { name: /agregar/i }).click();
  await expect(page.locator('li[data-id]')).toHaveCount(1);

  await page.getByRole('button', { name: /^Eliminar/ }).click();

  await expect(page.locator('li[data-id]')).toHaveCount(0);
  await expect(page.locator('#task-title')).toBeFocused();
});

test('the announcement live region receives the filter change message', async ({ page }) => {
  await freshPage(page);

  await page.locator('#filter-tab-all').focus();
  await page.keyboard.press('ArrowRight');

  await expect(page.locator('#app-announcer')).toContainText('Filtro Pendientes');
  await expect(page.locator('#app-announcer')).toContainText(/\d/);
});
