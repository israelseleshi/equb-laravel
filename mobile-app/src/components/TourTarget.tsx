import { useRef, useEffect, type ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTour } from '../context/TourContext'

interface TourTargetProps {
  id: string
  children: ReactNode
  style?: any
}

export function TourTarget({ id, children, style }: TourTargetProps) {
  const ref = useRef<View>(null)
  const { registerTarget, unregisterTarget } = useTour()

  useEffect(() => {
    const view = ref.current
    if (!view) return

    const timeout = setTimeout(() => {
      view.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          registerTarget(id, { x, y, width, height, pageX: x, pageY: y })
        }
      })
    }, 500)

    return () => {
      clearTimeout(timeout)
      unregisterTarget(id)
    }
  }, [id, registerTarget, unregisterTarget])

  return (
    <View ref={ref} style={style} collapsable={false}>
      {children}
    </View>
  )
}
