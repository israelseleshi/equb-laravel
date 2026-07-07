import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { tourSteps } from '../data/tourSteps'

interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
  pageX: number
  pageY: number
}

interface TourContextValue {
  activeTour: 'portal' | 'dashboard' | null
  currentStep: number
  totalSteps: number
  currentTarget: string | null
  targetLayouts: ReadonlyMap<string, LayoutRect>
  startTour: (tour: 'portal' | 'dashboard') => void
  nextStep: () => void
  prevStep: () => void
  endTour: () => void
  registerTarget: (id: string, layout: LayoutRect) => void
  unregisterTarget: (id: string) => void
}

const TourContext = createContext<TourContextValue | undefined>(undefined)

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [activeTour, setActiveTour] = useState<'portal' | 'dashboard' | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const targetsRef = useRef<Map<string, LayoutRect>>(new Map())

  const totalSteps = activeTour ? tourSteps[activeTour].length : 0
  const currentTarget = activeTour ? tourSteps[activeTour][currentStep]?.targetId ?? null : null

  const startTour = useCallback((tour: 'portal' | 'dashboard') => {
    setActiveTour(tour)
    setCurrentStep(0)
  }, [])

  const nextStep = useCallback(() => {
    if (!activeTour) return
    const steps = tourSteps[activeTour]
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      setActiveTour(null)
      setCurrentStep(0)
    }
  }, [activeTour, currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }, [currentStep])

  const endTour = useCallback(() => {
    setActiveTour(null)
    setCurrentStep(0)
  }, [])

  const registerTarget = useCallback((id: string, layout: LayoutRect) => {
    targetsRef.current.set(id, layout)
  }, [])

  const unregisterTarget = useCallback((id: string) => {
    targetsRef.current.delete(id)
  }, [])

  return (
    <TourContext.Provider
      value={{
        activeTour,
        currentStep,
        totalSteps,
        currentTarget,
        targetLayouts: targetsRef.current,
        startTour,
        nextStep,
        prevStep,
        endTour,
        registerTarget,
        unregisterTarget,
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within TourProvider')
  }
  return context
}
