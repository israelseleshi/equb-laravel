import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly phoneInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly forgotPasswordLink: Locator
  readonly createAccountLink: Locator
  readonly backButton: Locator
  readonly errorMessage: Locator
  readonly languageToggle: Locator

  constructor(page: Page) {
    this.page = page
    this.phoneInput = page.locator('input[type="tel"],input[placeholder*="phone" i],input[placeholder*="Phone"],input:not([type="password"])').first()
    this.passwordInput = page.locator('input[type="password"]').first()
    this.submitButton = page.locator('button,button[type="submit"],text=Sign In,text=Login,text=ግባ,text=ይግቡ').first()
    this.forgotPasswordLink = page.locator('text=Forgot Password,text=ረሱት').first()
    this.createAccountLink = page.locator('text=Create Account,text=መለያ ይፍጠሩ').first()
    this.backButton = page.locator('[class*="back"],text=Back,text=ተመለስ,[aria-label*="back"],[aria-label*="Back"]').first()
    this.errorMessage = page.locator('[class*="error"],[class*="alert"],[role="alert"]').first()
    this.languageToggle = page.locator('text=አማ,text=EN').first()
  }

  async login(phone: string, password: string) {
    await this.phoneInput.fill(phone)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async isVisible(): Promise<boolean> {
    return this.page.locator('text=Sign In,text=Login,text=ይግቡ').first().isVisible().catch(() => false)
  }
}

export class SignupPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly phoneInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly submitButton: Locator
  readonly backButton: Locator
  readonly signInLink: Locator

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.locator('input[placeholder*="name" i],input[placeholder*="Name"]').first()
    this.phoneInput = page.locator('input[type="tel"],input:not([type="password"])').first()
    this.passwordInput = page.locator('input[type="password"]').first()
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1)
    this.submitButton = page.locator('button,button[type="submit"],text=Register,text=Sign Up,text=ይመዝገቡ').first()
    this.backButton = page.locator('[class*="back"],text=Back,text=ተመለስ').first()
    this.signInLink = page.locator('text=Sign In,text=Login,text=ግባ').first()
  }

  async signup(name: string, phone: string, password: string) {
    await this.nameInput.fill(name)
    await this.phoneInput.fill(phone)
    await this.passwordInput.fill(password)
    if (await this.confirmPasswordInput.isVisible().catch(() => false)) {
      await this.confirmPasswordInput.fill(password)
    }
    await this.submitButton.click()
  }
}

export class ForgotPasswordPage {
  readonly page: Page
  readonly phoneInput: Locator
  readonly submitButton: Locator
  readonly backButton: Locator
  readonly successMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.phoneInput = page.locator('input[type="tel"],input:not([type="password"])').first()
    this.submitButton = page.locator('button,button[type="submit"],text=Send,text=Submit,text=ላክ,text=ያስገቡ').first()
    this.backButton = page.locator('[class*="back"],text=Back,text=ተመለስ').first()
    this.successMessage = page.locator('text=sent,text=ተልኳል').first()
  }

  async requestReset(phone: string) {
    await this.phoneInput.fill(phone)
    await this.submitButton.click()
  }
}
