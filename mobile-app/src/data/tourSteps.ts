interface TourStep {
  targetId: string
  titleKey: string
  descriptionKey: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

export const tourSteps: Record<'portal' | 'dashboard', TourStep[]> = {
  portal: [
    {
      targetId: 'portal-header',
      titleKey: 'tour:portalStep1',
      descriptionKey: 'tour:portalStep1',
      position: 'bottom',
    },
    {
      targetId: 'portal-tiers',
      titleKey: 'tour:portalStep2',
      descriptionKey: 'tour:portalStep2',
      position: 'top',
    },
    {
      targetId: 'portal-wheel',
      titleKey: 'tour:portalStep3',
      descriptionKey: 'tour:portalStep3',
      position: 'top',
    },
    {
      targetId: 'portal-winners',
      titleKey: 'tour:portalStep4',
      descriptionKey: 'tour:portalStep4',
      position: 'top',
    },
    {
      targetId: 'portal-nav',
      titleKey: 'tour:portalStep5',
      descriptionKey: 'tour:portalStep5',
      position: 'bottom',
    },
  ],
  dashboard: [
    {
      targetId: 'dash-header',
      titleKey: 'tour:dashboardStep1',
      descriptionKey: 'tour:dashboardStep1',
      position: 'bottom',
    },
    {
      targetId: 'dash-slots',
      titleKey: 'tour:dashboardStep2',
      descriptionKey: 'tour:dashboardStep2',
      position: 'bottom',
    },
    {
      targetId: 'dash-payments',
      titleKey: 'tour:dashboardStep3',
      descriptionKey: 'tour:dashboardStep3',
      position: 'top',
    },
    {
      targetId: 'dash-savings',
      titleKey: 'tour:dashboardStep4',
      descriptionKey: 'tour:dashboardStep4',
      position: 'top',
    },
    {
      targetId: 'dash-actions',
      titleKey: 'tour:dashboardStep5',
      descriptionKey: 'tour:dashboardStep5',
      position: 'top',
    },
  ],
}
