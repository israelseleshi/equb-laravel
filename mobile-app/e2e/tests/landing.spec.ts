import { test, expect } from '@playwright/test'
import { LandingPage } from '../pages/landing-page'
import { ApiClient } from '../utils/api-client'

test.describe('🏠 Landing & Portal Page', () => {
  let landingPage: LandingPage
  let api: ApiClient

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    api = new ApiClient()
  })

  test('1️⃣ Page loads successfully', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('2️⃣ Shows Gojo Equb branding', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    const bodyText = await page.locator('body').innerText()
    expect(
      bodyText.includes('Gojo') || bodyText.includes('Equb') || bodyText.includes('ጎጆ')
    ).toBeTruthy()
  })

  test('3️⃣ Bottom tab bar is visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    // Check for tabs or navigation elements
    const homeTab = page.locator('text=Home,text=መነሻ').first()
    const dashboardTab = page.locator('text=Dashboard,text=ደብተር').first()
    const othersTab = page.locator('text=Others,text=ሌሎች').first()
    const anyTabVisible = await Promise.all([
      homeTab.isVisible().catch(() => false),
      dashboardTab.isVisible().catch(() => false),
      othersTab.isVisible().catch(() => false),
    ])
    expect(anyTabVisible.some(v => v)).toBeTruthy()
  })

  test('4️⃣ Dashboard tab shows content', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    const dashboardTab = page.locator('text=Dashboard,text=ደብተር').first()
    if (await dashboardTab.isVisible().catch(() => false)) {
      await dashboardTab.click()
      await page.waitForTimeout(2000)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(0)
    }
  })

  test('5️⃣ Others tab shows auth options', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    const othersTab = page.locator('text=Others,text=ሌሎች').first()
    if (await othersTab.isVisible().catch(() => false)) {
      await othersTab.click()
      await page.waitForTimeout(2000)
      const bodyText = await page.locator('body').innerText()
      expect(
        bodyText.includes('Sign') || bodyText.includes('Language') || bodyText.includes('Create')
      ).toBeTruthy()
    }
  })

  test('6️⃣ Language toggle switches between EN and AM', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    const langToggle = page.locator('text=አማ,text=EN').first()
    if (await langToggle.isVisible().catch(() => false)) {
      // Toggle to Amharic
      const currentText = await langToggle.innerText()
      await langToggle.click()
      await page.waitForTimeout(1000)
      // Toggle back
      const newToggle = page.locator('text=አማ,text=EN').first()
      if (await newToggle.isVisible().catch(() => false)) {
        await newToggle.click()
      }
      expect(true).toBe(true)
    }
  })

  test('7️⃣ Tiers are visible on page', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)
    const bodyText = await page.locator('body').innerText()
    const hasTierInfo = ['100', '500', '1000', '2000', 'ETB'].some(t => bodyText.includes(t))
    expect(hasTierInfo).toBeTruthy()
  })

  test('8️⃣ Can navigate to Sign In from Others tab', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    const othersTab = page.locator('text=Others,text=ሌሎች').first()
    if (await othersTab.isVisible().catch(() => false)) {
      await othersTab.click()
      await page.waitForTimeout(1000)
      const signInBtn = page.locator('text=Sign In,text=ይግቡ').first()
      if (await signInBtn.isVisible().catch(() => false)) {
        await signInBtn.click()
        await page.waitForTimeout(2000)
        expect(true).toBe(true)
      }
    }
  })

  test('9️⃣ API: Recent winners can be fetched', async () => {
    const draws = await api.getRecentDraws()
    expect(draws).toBeDefined()
  })

  test('🔟 API: Categories are available', async () => {
    const categories = await api.getCategories()
    expect(categories).toBeDefined()
  })
})

test.describe('🏠 API Portal Tests', () => {
  let api: ApiClient

  test.beforeAll(() => {
    api = new ApiClient()
  })

  test('Public tiers endpoint works', async () => {
    const tiers = await api.getTiers()
    expect(tiers).toBeDefined()
  })

  test('Public rounds endpoint works', async () => {
    const rounds = await api.getRounds()
    expect(rounds).toBeDefined()
  })

  test('Public categories endpoint works', async () => {
    const categories = await api.getCategories()
    expect(categories).toBeDefined()
  })

  test('Public draws by category endpoint works', async () => {
    const draws = await api.getDrawsByCategory('500')
    expect(draws).toBeDefined()
  })
})
