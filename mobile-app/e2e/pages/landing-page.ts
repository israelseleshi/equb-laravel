import { Page, Locator } from '@playwright/test'

export class LandingPage {
  readonly page: Page
  readonly portalContainer: Locator
  readonly homeTab: Locator
  readonly dashboardTab: Locator
  readonly othersTab: Locator
  readonly signInButton: Locator
  readonly createAccountButton: Locator
  readonly languageToggle: Locator
  readonly tierCards: Locator
  readonly activeRoundsSection: Locator
  readonly winnersSection: Locator

  constructor(page: Page) {
    this.page = page
    this.portalContainer = page.locator('text=Gojo Equb,text=Your trusted savings').first()
    this.homeTab = page.locator('text=Home,text=መነሻ').first()
    this.dashboardTab = page.locator('text=Dashboard,text=ደብተር').first()
    this.othersTab = page.locator('text=Others,text=ሌሎች').last()
    this.signInButton = page.locator('text=Sign In,text=ይግቡ').first()
    this.createAccountButton = page.locator('text=Create Account,text=መለያ ይፍጠሩ').first()
    this.languageToggle = page.locator('[class*="lang"],text=አማ,text=EN').first()
    this.tierCards = page.locator('[class*="tierCard"],[class*="card"]')
    this.activeRoundsSection = page.locator('text=Active Rounds,text=ንቁ ክብዬ').first()
    this.winnersSection = page.locator('text=Recent Winners,text=የቅርብ ጊዜ አሸናፊዎች').first()
  }

  async goto() {
    await this.page.goto('/')
  }

  async switchToTab(tab: 'home' | 'dashboard' | 'others') {
    const labels: Record<string, string[]> = {
      home: ['Home', 'መነሻ'],
      dashboard: ['Dashboard', 'ደብተር'],
      others: ['Others', 'ሌሎች'],
    }
    for (const label of labels[tab]) {
      const btn = this.page.locator(`text="${label}"`).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        return
      }
    }
  }

  async clickSignIn() {
    // Try "Others" tab first (mobile layout) or direct sign-in button
    try {
      await this.signInButton.click({ timeout: 3000 })
    } catch {
      await this.switchToTab('others')
      await this.page.locator('text=Sign In,text=ይግቡ').last().click()
    }
  }

  async clickCreateAccount() {
    try {
      await this.createAccountButton.click({ timeout: 3000 })
    } catch {
      await this.switchToTab('others')
      await this.page.locator('text=Create Account,text=መለያ ይፍጠሩ').last().click()
    }
  }

  async toggleLanguage() {
    await this.languageToggle.click()
    await this.page.waitForTimeout(500)
  }

  async isJarAnimationPresent(): Promise<boolean> {
    return this.page.locator('[class*="jar"],[class*="spin"],svg,canvas').first().isVisible().catch(() => false)
  }
}
