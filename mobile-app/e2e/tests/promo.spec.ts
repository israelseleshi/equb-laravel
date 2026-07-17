import { test, expect } from '@playwright/test'
import { ApiClient } from '../utils/api-client'

test.describe('🎁 Promo Codes', () => {
  let adminApi: ApiClient

  test.beforeAll(async () => {
    adminApi = new ApiClient()
    try {
      await adminApi.login('0911000000', 'password123')
    } catch {
      await adminApi.register('PromoAdmin', '0911000000', 'password123', 'admin')
    }
  })

  test('1️⃣ Admin can list promo codes', async () => {
    const promos = await adminApi.getPromos()
    expect(promos).toBeDefined()
    expect((promos as any).promo_codes).toBeDefined()
  })

  test('2️⃣ Admin can create a promo code', async () => {
    const promo = await adminApi.createPromo({
      broker_name: 'Test Broker',
      broker_phone: '0911999999',
      commission_rate: 10,
    })
    expect(promo).toBeDefined()
    expect((promo as any).promo_code).toBeDefined()
    expect((promo as any).promo_code.code).toBeDefined()
  })

  test('3️⃣ Promo stats endpoint works', async () => {
    const stats = await adminApi.getPromosStats()
    expect(stats).toBeDefined()
    expect((stats as any).total_brokers).toBeDefined()
    expect((stats as any).total_registrations).toBeDefined()
  })

  test('4️⃣ Validate a valid promo code', async () => {
    // First create one
    const promo = await adminApi.createPromo({
      broker_name: 'Validation Broker',
      broker_phone: '0911888888',
      commission_rate: 15,
    })
    const code = (promo as any).promo_code?.code
    if (code) {
      const validation = await adminApi.validatePromo(code)
      expect(validation).toBeDefined()
      expect((validation as any).valid).toBeDefined()
    }
  })

  test('5️⃣ Validate an invalid promo code', async () => {
    const validation = await adminApi.validatePromo('INVALID-CODE-12345')
    expect(validation).toBeDefined()
    expect((validation as any).valid).toBe(false)
  })

  test('6️⃣ Promo codes list shows created codes', async () => {
    // Create a few promo codes
    await adminApi.createPromo({
      broker_name: 'Broker One',
      broker_phone: '0911777777',
      commission_rate: 5,
    })
    await adminApi.createPromo({
      broker_name: 'Broker Two',
      broker_phone: '0911666666',
      commission_rate: 12,
    })
    
    const promos = await adminApi.getPromos()
    const codes = (promos as any).promo_codes || []
    expect(codes.length).toBeGreaterThanOrEqual(2)
  })
})
