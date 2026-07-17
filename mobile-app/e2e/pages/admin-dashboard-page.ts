import { Page, Locator } from '@playwright/test'

export class AdminDashboardPage {
  readonly page: Page
  readonly overviewTab: Locator
  readonly membersTab: Locator
  readonly winnersTab: Locator
  readonly paymentsTab: Locator
  readonly roundsTab: Locator
  readonly promoTab: Locator
  readonly searchInput: Locator
  readonly logoutButton: Locator
  readonly statsCards: Locator
  readonly filterChips: Locator
  readonly addRoundButton: Locator
  readonly createRoundForm: Locator

  // Desktop sidebar elements
  readonly sidebar: Locator
  readonly sidebarTabs: Locator

  constructor(page: Page) {
    this.page = page
    this.overviewTab = page.locator('text=Overview,text=አጠቃላይ').first()
    this.membersTab = page.locator('text=Members,text=አባላት').first()
    this.winnersTab = page.locator('text=Winners,text=አሸናፊዎች').first()
    this.paymentsTab = page.locator('text=Payments,text=ክፍያዎች').first()
    this.roundsTab = page.locator('text=Rounds,text=ክብዬ').first()
    this.promoTab = page.locator('text=Promo,text=ፕሮሞ').first()
    this.searchInput = page.locator('input[placeholder*="search" i],input[placeholder*="Search"]').first()
    this.logoutButton = page.locator('text=Logout,text=ውጣ').first()
    this.statsCards = page.locator('[class*="statCard"],[class*="Stat"]')
    this.filterChips = page.locator('[class*="filterChip"],[class*="chip"]')
    this.addRoundButton = page.locator('text=Add Round,text=ክብዬ ጨምር').first()
    this.createRoundForm = page.locator('[class*="form"],[class*="modal"]').first()

    // Desktop sidebar
    this.sidebar = page.locator('[class*="sidebar"],[class*="desktopLayout"]').first()
    this.sidebarTabs = page.locator('[class*="sidebarTab"],[class*="sidebarLabel"]')
  }

  async switchToTab(tab: string) {
    // Try sidebar first (desktop), then bottom tabs (mobile)
    const tabLocators: Record<string, RegExp> = {
      overview: /Overview|አጠቃላይ/,
      members: /Members|አባላት/,
      winners: /Winners|አሸናፊዎች/,
      payments: /Payments|ክፍያዎች/,
      rounds: /Rounds|ክብዬ/,
      promo: /Promo|ፕሮሞ/,
    }
    const pattern = tabLocators[tab]
    if (!pattern) return
    const btn = this.page.locator(`text=${pattern.source}`).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await this.page.waitForTimeout(500)
    }
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(300)
  }

  async isDesktopLayout(): Promise<boolean> {
    return this.sidebar.isVisible().catch(() => false)
  }

  async getStatCardValue(index: number): Promise<string> {
    const cards = await this.statsCards.all()
    if (cards[index]) {
      return (await cards[index].innerText()) || ''
    }
    return ''
  }

  async getMembersCount(): Promise<number> {
    return this.page.locator('[class*="memberCard"],[class*="memberRow"]').count()
  }

  async getRoundsCount(): Promise<number> {
    return this.page.locator('[class*="roundCard"],[class*="roundRow"]').count()
  }

  async getWinnersCount(): Promise<number> {
    return this.page.locator('[class*="winnerCard"],[class*="heroCard"]').count()
  }
}
