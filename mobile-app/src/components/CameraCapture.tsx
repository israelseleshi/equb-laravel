import { useState, useRef, useCallback, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../theme'
import { Text } from './ui/AppText'
import { useTranslation } from '../i18n/useTranslation'

interface CameraCaptureProps {
  onCapture: (uri: string) => void
  label?: string
}

export function CameraCapture({ onCapture, label }: CameraCaptureProps) {
  const { lang } = useTranslation()
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission()
    }
  }, [permission, requestPermission])

  const handleTakePicture = useCallback(async () => {
    if (!cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      if (photo?.uri) {
        setCapturedUri(photo.uri)
        onCapture(photo.uri)
      }
    } catch {
      // Silently handle - camera might not be ready
    }
  }, [onCapture])

  const handleRetake = () => {
    setCapturedUri(null)
  }

  const toggleFacing = () => {
    setFacing((f) => (f === 'back' ? 'front' : 'back'))
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label || 'Take a photo'}</Text>
        <View style={styles.noPermission}>
          <Ionicons name="camera-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.noPermissionText}>
            {lang === 'en' ? 'Camera permission is required' : 'የካሜራ ፍቃድ ያስፈልጋል'}
          </Text>
          <TouchableOpacity style={styles.permitBtn} onPress={requestPermission}>
            <Text style={styles.permitBtnText}>
              {lang === 'en' ? 'Grant Permission' : 'ፍቃድ ስጥ'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (capturedUri) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label || 'Photo captured'}</Text>
        <Image source={{ uri: capturedUri }} style={styles.preview} />
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Ionicons name="camera-reverse-outline" size={20} color={colors.primary} />
          <Text style={styles.retakeText}>{lang === 'en' ? 'Retake' : 'እንደገና አንሳ'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label || 'Take a photo'}</Text>
      <View style={styles.cameraBox}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          autofocus="on"
        />
        <View style={styles.guideFrame} pointerEvents="none">
          <View style={styles.guideCornerTL} />
          <View style={styles.guideCornerTR} />
          <View style={styles.guideCornerBL} />
          <View style={styles.guideCornerBR} />
        </View>

        <View style={styles.cameraControls}>
          <View style={styles.cameraBtnRow}>
            <TouchableOpacity onPress={toggleFacing} style={styles.circleBtn}>
              <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTakePicture} style={styles.captureBtn}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={{ width: 44 }} />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  cameraBox: {
    borderRadius: colors.radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    height: 280,
  },
  guideFrame: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopLeftRadius: 8,
  },
  guideCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    borderTopRightRadius: 8,
  },
  guideCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    borderBottomLeftRadius: 8,
  },
  guideCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    borderBottomRightRadius: 8,
  },
  cameraControls: {
    padding: spacing.lg,
    backgroundColor: '#111',
  },
  cameraBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: colors.radius.md,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  retakeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  noPermission: {
    height: 200,
    borderRadius: colors.radius.md,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noPermissionText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  permitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
