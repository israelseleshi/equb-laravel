export const CATEGORY_CODES = ['100', '500', '1000', '2000', 'savings']

interface CategoryConfig {
  label: string
  barColor: string
  target: number
}

const DEFAULT_CONFIGS: Record<string, CategoryConfig> = {
  '100': { label: '100 ETB', barColor: '#059669', target: 10 },
  '500': { label: '500 ETB', barColor: '#047857', target: 10 },
  '1000': { label: '1,000 ETB', barColor: '#34d399', target: 8 },
  '2000': { label: '2,000 ETB', barColor: '#065f46', target: 6 },
  'savings': { label: 'Savings', barColor: '#10b981', target: 0 },
}

const ROUND_ONE_TARGETS: Record<string, number> = {
  '100': 50,
  '500': 50,
  '1000': 50,
  '2000': 50,
  'savings': 0,
}

export function getCategoryConfig(code: string, slots?: { registrationDate?: string }[]) {
  const base = DEFAULT_CONFIGS[code]
  if (!base) return null

  const isRoundOne = slots ? getCategoryRound(slots) === 1 : false

  return {
    label: base.label,
    barColor: base.barColor,
    target: isRoundOne ? (ROUND_ONE_TARGETS[code] ?? base.target) : base.target,
    round: isRoundOne ? 1 : 2,
  }
}

export function getCategoryRound(slots: { registrationDate?: string }[]): number {
  if (!slots || slots.length === 0) return 2

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const hasRecentSlot = slots.some((s) => {
    if (!s.registrationDate) return false
    const regDate = new Date(s.registrationDate)
    return regDate >= thirtyDaysAgo
  })

  return hasRecentSlot ? 1 : 2
}

export function isSavingsCategory(code: string): boolean {
  return code === 'savings'
}
