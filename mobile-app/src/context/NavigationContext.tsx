import { createContext, useContext, useState } from 'react'

export type Screen = 'portal' | 'login' | 'signup' | 'forgotPassword' | 'dashboard' | 'admin' | 'onboarding' | 'main' | 'authGate'

interface NavigationContextValue {
  currentScreen: Screen
  navigate: (screen: Screen) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(
  undefined
)

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('portal')

  return (
    <NavigationContext.Provider
      value={{ currentScreen, navigate: setCurrentScreen }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
