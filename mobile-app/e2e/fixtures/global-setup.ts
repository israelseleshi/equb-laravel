import { FullConfig } from '@playwright/test'

const API_BASE = 'http://localhost:8080/api'

async function seedTestData() {
  // Register admin user if not exists
  const adminRes = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0911000000', password: 'password123' }),
  })
  
  let adminToken: string | null = null
  if (adminRes.ok) {
    const data = await adminRes.json()
    adminToken = data.token
  } else {
    // Register admin
    const regRes = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin User',
        phone: '0911000000',
        password: 'password123',
        password_confirmation: 'password123',
        role: 'admin',
      }),
    })
    if (regRes.ok) {
      const data = await regRes.json()
      adminToken = data.token
    }
  }

  // Register test member
  const memberRes = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0911000001', password: 'password123' }),
  })
  if (!memberRes.ok) {
    await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Member',
        phone: '0911000001',
        password: 'password123',
        password_confirmation: 'password123',
      }),
    })
  }

  if (adminToken) {
    // Seed a test round
    await fetch(`${API_BASE}/admin/rounds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Round 500',
        category: '500',
        amount: 500,
        frequency: 'daily',
        people_goal: 10,
        total_rounds: 12,
        winners_per_spin: 2,
        auto_spin_enabled: true,
        spin_time: '08:00',
        commission_rate: 10,
      }),
    })

    // Seed test category
    await fetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: '500',
        label_en: '500 ETB',
        label_am: '500 ብር',
        amount: 500,
        frequency: 'daily',
        max_members: 10,
        min_deposit: 100,
        total_rounds: 12,
        is_active: true,
        sort_order: 1,
      }),
    })
  }
}

async function globalSetup(config: FullConfig) {
  try {
    await seedTestData()
    console.log('✅ Test data seeded successfully')
  } catch (error) {
    console.warn('⚠️  Could not seed test data:', (error as Error).message)
    console.warn('   Make sure the backend is running on http://localhost:8000')
  }
}

export default globalSetup
