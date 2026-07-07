import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  type CollectionName,
  type AppSettings,
  type UserModel,
  type SlotModel,
  type SlotSchedule,
  type SavingsAccount,
  type DrawRecordModel,
  type PaymentLogModel,
  type SmsLogModel,
  defaultSettings,
  todayStr,
  generateId,
} from '../data/models'

const STORAGE_PREFIX = '@equb_'

function storageKey(collection: CollectionName): string {
  return `${STORAGE_PREFIX}${collection}`
}

async function readAll<T>(collection: CollectionName): Promise<T[]> {
  const key = storageKey(collection)
  const raw = await AsyncStorage.getItem(key)
  if (!raw) return []
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

async function writeAll<T>(collection: CollectionName, items: T[]): Promise<void> {
  const key = storageKey(collection)
  await AsyncStorage.setItem(key, JSON.stringify(items))
}

export async function getAllUsers(): Promise<UserModel[]> {
  return readAll<UserModel>('users')
}

export async function getUserById(id: string): Promise<UserModel | null> {
  const users = await getAllUsers()
  return users.find((u) => u.id === id) ?? null
}

export async function getUserByPhone(phone: string): Promise<UserModel | null> {
  const users = await getAllUsers()
  return users.find((u) => u.phone === phone) ?? null
}

export async function createUser(user: UserModel): Promise<UserModel> {
  const users = await getAllUsers()
  users.push(user)
  await writeAll('users', users)
  return user
}

export async function updateUser(id: string, changes: Partial<UserModel>): Promise<UserModel | null> {
  const users = await getAllUsers()
  const index = users.findIndex((u) => u.id === id)
  if (index === -1) return null
  users[index] = { ...users[index], ...changes }
  await writeAll('users', users)
  return users[index]
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getAllUsers()
  const filtered = users.filter((u) => u.id !== id)
  if (filtered.length === users.length) return false
  await writeAll('users', filtered)
  return true
}

export async function getAllSlots(): Promise<SlotModel[]> {
  return readAll<SlotModel>('slots')
}

export async function getSlotsByUser(userId: string): Promise<SlotModel[]> {
  const slots = await getAllSlots()
  return slots.filter((s) => s.userId === userId)
}

export async function getSlotById(id: string): Promise<SlotModel | null> {
  const slots = await getAllSlots()
  return slots.find((s) => s.id === id) ?? null
}

export async function createSlot(slot: SlotModel): Promise<SlotModel> {
  const slots = await getAllSlots()
  slots.push(slot)
  await writeAll('slots', slots)
  return slot
}

export async function updateSlot(id: string, changes: Partial<SlotModel>): Promise<SlotModel | null> {
  const slots = await getAllSlots()
  const index = slots.findIndex((s) => s.id === id)
  if (index === -1) return null
  slots[index] = { ...slots[index], ...changes }
  await writeAll('slots', slots)
  return slots[index]
}

export async function deleteSlot(id: string): Promise<boolean> {
  const slots = await getAllSlots()
  const filtered = slots.filter((s) => s.id !== id)
  if (filtered.length === slots.length) return false
  await writeAll('slots', filtered)
  return true
}

export async function getSchedule(slotId: string): Promise<SlotSchedule | null> {
  const schedules = await readAll<SlotSchedule>('schedules')
  return schedules.find((s) => s.slotId === slotId) ?? null
}

export async function getAllSchedules(): Promise<SlotSchedule[]> {
  return readAll<SlotSchedule>('schedules')
}

export async function saveSchedule(schedule: SlotSchedule): Promise<void> {
  const schedules = await readAll<SlotSchedule>('schedules')
  const index = schedules.findIndex((s) => s.slotId === schedule.slotId)
  if (index === -1) {
    schedules.push(schedule)
  } else {
    schedules[index] = schedule
  }
  await writeAll('schedules', schedules)
}

export async function updateSchedulePayments(slotId: string, payments: SlotSchedule['payments']): Promise<void> {
  await saveSchedule({ slotId, payments })
}

export async function getSavings(slotId: string): Promise<SavingsAccount | null> {
  const all = await readAll<{ slotId: string; account: SavingsAccount }>('savings')
  const entry = all.find((s) => s.slotId === slotId)
  return entry?.account ?? null
}

export async function getAllSavings(): Promise<Array<{ slotId: string; account: SavingsAccount }>> {
  return readAll<{ slotId: string; account: SavingsAccount }>('savings')
}

export async function saveSavings(slotId: string, account: SavingsAccount): Promise<void> {
  const all = await readAll<{ slotId: string; account: SavingsAccount }>('savings')
  const index = all.findIndex((s) => s.slotId === slotId)
  if (index === -1) {
    all.push({ slotId, account })
  } else {
    all[index] = { slotId, account }
  }
  await writeAll('savings', all)
}

export async function getAllDraws(): Promise<DrawRecordModel[]> {
  return readAll<DrawRecordModel>('draws')
}

export async function getDrawsByCategory(category: string): Promise<DrawRecordModel[]> {
  const draws = await getAllDraws()
  return draws.filter((d) => d.category === category)
}

export async function createDraw(draw: DrawRecordModel): Promise<DrawRecordModel> {
  const draws = await getAllDraws()
  draws.push(draw)
  await writeAll('draws', draws)
  return draw
}

export async function getAllPaymentLogs(): Promise<PaymentLogModel[]> {
  return readAll<PaymentLogModel>('paymentLogs')
}

export async function getPaymentLogsByUser(userId: string): Promise<PaymentLogModel[]> {
  const logs = await getAllPaymentLogs()
  return logs.filter((l) => l.userId === userId)
}

export async function createPaymentLog(log: PaymentLogModel): Promise<PaymentLogModel> {
  const logs = await getAllPaymentLogs()
  logs.push(log)
  await writeAll('paymentLogs', logs)
  return log
}

export async function getAllSmsLogs(): Promise<SmsLogModel[]> {
  return readAll<SmsLogModel>('smsLogs')
}

export async function createSmsLog(log: SmsLogModel): Promise<SmsLogModel> {
  const logs = await getAllSmsLogs()
  logs.push(log)
  await writeAll('smsLogs', logs)
  return log
}

export async function getSettings(): Promise<AppSettings> {
  const all = await readAll<{ key: string; value: AppSettings }>('settings')
  const entry = all.find((s) => s.key === 'app')
  return entry?.value ?? defaultSettings()
}

export async function updateSettings(changes: Partial<AppSettings>): Promise<AppSettings> {
  const all = await readAll<{ key: string; value: AppSettings }>('settings')
  const index = all.findIndex((s) => s.key === 'app')
  const current = index !== -1 ? all[index].value : defaultSettings()
  const updated = { ...current, ...changes }
  if (index === -1) {
    all.push({ key: 'app', value: updated })
  } else {
    all[index] = { key: 'app', value: updated }
  }
  await writeAll('settings', all)
  return updated
}

export async function clearAllData(): Promise<void> {
  const keys = ['users', 'slots', 'schedules', 'savings', 'draws', 'paymentLogs', 'smsLogs', 'settings']
  await AsyncStorage.multiRemove(keys.map((k) => `${STORAGE_PREFIX}${k}`))
}

export async function isFirstRun(): Promise<boolean> {
  const settings = await getSettings()
  return !settings.firstRunComplete
}

export async function markFirstRunComplete(): Promise<void> {
  await updateSettings({ firstRunComplete: true })
}

export { todayStr, generateId }
