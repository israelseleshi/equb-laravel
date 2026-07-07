import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import {
  View,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { Text } from './AppText'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts } from '../../theme'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  showToast: (
    message: string,
    type?: ToastType,
    duration?: number
  ) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, message, type, duration }])
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

const iconMap: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
}

const colorMap: Record<ToastType, string> = {
  success: colors.primary,
  error: colors.destructive,
  info: '#3b82f6',
  warning: '#f59e0b',
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onRemove(toast.id)
      })
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Animated.View
      style={[
        styles.toast,
        { borderLeftColor: colorMap[toast.type], transform: [{ translateY }], opacity },
      ]}
    >
      <Ionicons
        name={iconMap[toast.type]}
        size={22}
        color={colorMap[toast.type]}
      />
      <Text style={styles.message}>{toast.message}</Text>
      <TouchableOpacity
        onPress={() => onRemove(toast.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
    lineHeight: 20,
  },
})
