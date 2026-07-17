import { Page, Locator } from '@playwright/test'

export class MemberDashboardPage {
  readonly page: Page
  readonly summaryCards: Locator
  readonly slotTabs: Locator
  readonly addSlotButton: Locator
  readonly payNowButtons: Locator
  readonly paymentItems: Locator
  readonly emptyPaymentBox: Locator
  readonly filterTabs: Locator
  readonly logoutButton: Locator
  readonly lockButton: Locator
  readonly languageToggle: Locator
  readonly savingsCard: Locator
  readonly depositInput: Locator
  readonly depositButton: Locator
  readonly withdrawButton: Locator
  readonly statementButton: Locator

  constructor(page: Page) {
    this.page = page
    this.summaryCards = page.locator('[class*="statsCard"],[class*="stat"]')
    this.slotTabs = page.locator('[class*="slotTab"],[class*="SlotTab"]')
    this.addSlotButton = page.locator('[class*="slotAddBtn"],[class*="add"]').first()
    this.payNowButtons = page.locator('text=Pay Now,text=ክፈል').first()
    this.paymentItems = page.locator('[class*="pmtCard"],[class*="payment"]')
    this.emptyPaymentBox = page.locator('text=All paid up,text=ሁሉም ተከፍሏል').first()
    this.filterTabs = page.locator('[class*="filterTab"],[class*="Filter"]')
    this.logoutButton = page.locator('text=Logout,text=ውጣ').first()
    this.lockButton = page.locator('text=Lock,text=ቆልፍ').first()
    this.languageToggle = page.locator('text=አማ,text=EN').first()
    this.savingsCard = page.locator('[class*="savingsCard"]').first()
    this.depositInput = page.locator('input[placeholder*="Amount" i]').first()
    this.depositButton = page.locator('text=Deposit,text=ተቀማጭ').first()
    this.withdrawButton = page.locator('text=Withdraw,text=መውጫ').first()
    this.statementButton = page.locator('text=Statement,text=መግለጫ').first()
  }

  async switchSlot(index: number) {
    const slots = await this.slotTabs.all()
    if (slots[index]) {
      await slots[index].click()
      await this.page.waitForTimeout(500)
    }
  }

  async payNow(index: number = 0) {
    const buttons = await this.page.locator('text=Pay Now,text=ክፈል').all()
    if (buttons[index]) {
      await buttons[index].click()
    }
  }

  async getPaymentCount(): Promise<number> {
    return this.paymentItems.count()
  }

  async isSavingsCardVisible(): Promise<boolean> {
    return this.savingsCard.isVisible().catch(() => false)
  }
}
