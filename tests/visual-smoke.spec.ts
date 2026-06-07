import { devices, expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const SCREENSHOT_DIR = path.join('test-results', 'screenshots')

async function saveShot(page: Page, name: string) {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true })
}

async function openGame(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.setItem('cts-intro', '1')
  })
  await page.reload()
  await expect(page.getByRole('button', { name: /story missions/i })).toBeVisible()
}

test('desktop menu, delivery, briefing, and gameplay visual smoke', async ({ page }) => {
  await openGame(page)
  await saveShot(page, 'desktop-01-main-menu')

  await page.getByRole('button', { name: /story missions/i }).click()
  await expect(page.getByRole('button', { name: /start mission/i })).toBeVisible()
  await page.waitForTimeout(700)
  await saveShot(page, 'desktop-02-story-briefing')

  await openGame(page)
  await page.getByRole('button', { name: /world delivery/i }).click()
  await expect(page.getByRole('button', { name: /USA.*Houston|Houston.*USA/i })).toBeVisible()
  await saveShot(page, 'desktop-03-world-delivery')

  await page.getByRole('button', { name: /USA.*Houston|Houston.*USA/i }).click()
  await expect(page.getByRole('button', { name: /start delivery/i })).toBeVisible()
  await expect(page.getByText(/Houston|USA Route/i).first()).toBeVisible()
  await page.getByRole('button', { name: /start delivery/i }).click()
  await expect(page.getByRole('heading', { name: /Destination: Houston, USA/i })).toBeVisible()
  await expect(page.getByText(/USA Route|Houston/i).first()).toBeVisible()
  await page.waitForTimeout(700)
  await saveShot(page, 'desktop-04-houston-briefing')
  await page.getByRole('button', { name: /start delivery/i }).click()
  await page.waitForTimeout(1800)
  await expect(page.locator('canvas')).toBeVisible()

  await openGame(page)
  await page.getByRole('button', { name: /strait run/i }).click()
  await expect(page.getByRole('button', { name: /start strait run/i })).toBeVisible()
  await page.getByRole('button', { name: /start strait run/i }).click()
  await page.waitForTimeout(3500)
  await expect(page.locator('canvas')).toBeVisible()
  await saveShot(page, 'desktop-05-strait-run-gameplay')
})

test('mobile gameplay controls visual smoke', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await openGame(page)
  await saveShot(page, 'mobile-01-main-menu')

  await page.getByRole('button', { name: /story missions/i }).click()
  await page.getByRole('button', { name: /start mission/i }).click()
  await page.waitForTimeout(3500)
  await expect(page.locator('.joystick')).toBeVisible()
  await expect(page.getByRole('button', { name: /flank boost/i })).toBeVisible()
  await saveShot(page, 'mobile-02-gameplay-controls')
  await context.close()
})
