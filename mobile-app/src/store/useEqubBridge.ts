import { useEffect, useRef, useCallback } from 'react'
import { useEqubStore } from './equbStore'

/**
 * Hook that syncs AdminDashboardScreen round operations with the Brain & Nerve store.
 * When a round is created, updated, or deleted through the store, all subscribers
 * react via the revision counter and auto-recalculate dependent views.
 */
export function useEqubBridge() {
  const store = useEqubStore()
  const prevRevision = useRef(store.revision)

  useEffect(() => {
    if (store.revision !== prevRevision.current) {
      prevRevision.current = store.revision
    }
  }, [store.revision])

  return {
    rounds: store.rounds,
    categories: store.categories,
    metrics: store.metrics,
    isLoading: store.isLoading,
    error: store.error,
    revision: store.revision,

    createRound: store.createRoundAction,
    updateRound: store.updateRoundAction,
    deleteRound: store.deleteRoundAction,
    activateRound: store.activateRoundAction,
    completeRound: store.completeRoundAction,
    cancelRound: store.cancelRoundAction,

    createCategory: store.createCategoryAction,
    updateCategory: store.updateCategoryAction,
    cascadeCategory: store.cascadeCategoryAction,
    deleteCategory: store.deleteCategoryAction,

    fetchAll: store.fetchAll,
    fetchRounds: store.fetchRounds,
    fetchCategories: store.fetchCategories,
    recalculate: store.recalculate,
  }
}

/**
 * Hook for the Home/Landing screen to reactively show
 * updated category pools and spin wheel parameters.
 */
export function useCategoryPools() {
  const categories = useEqubStore(s => s.categories)
  const rounds = useEqubStore(s => s.rounds)
  const metrics = useEqubStore(s => s.metrics)
  const revision = useEqubStore(s => s.revision)

  const activeCategories = categories.filter(c => c.is_active)
  const activeRounds = rounds.filter(r => r.status === 'active')

  const categoryPools = activeCategories.map(cat => {
    const round = activeRounds.find(r => r.category === cat.code)
    const catMetrics = metrics.byCategory.find(m => m.category === cat.code)
    return {
      ...cat,
      activeRound: round || null,
      currentMembers: catMetrics?.count || 0,
      totalBalance: catMetrics?.balance || 0,
      isFull: round ? round.current_participants >= round.people_goal : false,
    }
  })

  return { categoryPools, activeRounds, revision }
}

/**
 * Hook for the Spin Wheel module to get reactive pool parameters.
 */
export function useSpinWheelPool(category?: string) {
  const rounds = useEqubStore(s => s.rounds)
  const slots = useEqubStore(s => s.slots)
  const revision = useEqubStore(s => s.revision)

  const activeRounds = rounds.filter(r => r.status === 'active')
  const eligibleSlots = category
    ? slots.filter(s => s.category === category && s.status === 'active')
    : slots.filter(s => s.status === 'active')

  const roundConfig = category
    ? activeRounds.find(r => r.category === category)
    : null

  return {
    roundConfig,
    eligibleSlots,
    totalEligible: eligibleSlots.length,
    poolVolume: roundConfig
      ? (roundConfig.amount || 0) * roundConfig.people_goal
      : 0,
    revision,
  }
}

/**
 * Hook for Registration screen to get dynamic collateral requirements
 * based on the selected category tier.
 */
export function useRegistrationRules(categoryCode?: string) {
  const categories = useEqubStore(s => s.categories)
  const revision = useEqubStore(s => s.revision)

  const category = categoryCode
    ? categories.find(c => c.code === categoryCode)
    : null

  return {
    requiresLicense: category?.requires_license ?? false,
    licenseType: category?.license_type ?? null,
    collateralType: category?.collateral_type ?? null,
    registrationRequirements: (category?.metadata as any)?.collateral_rules?.registration_requirements ?? [],
    maxMembers: category?.max_members ?? 0,
    revision,
  }
}
