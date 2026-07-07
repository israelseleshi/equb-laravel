import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts } from '../../theme'
import { Text } from './AppText'

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export function PaginationBar({ currentPage, totalPages, onPrev, onNext }: PaginationBarProps) {
  if (totalPages <= 1) return null

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPrev}
        disabled={currentPage === 1}
        style={[styles.btn, currentPage === 1 && styles.btnDisabled]}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#cbd5e1' : colors.primary} />
        <Text style={[styles.btnText, currentPage === 1 && styles.btnTextDisabled]}>Prev</Text>
      </TouchableOpacity>

      <Text style={styles.pageInfo}>{currentPage} / {totalPages}</Text>

      <TouchableOpacity
        onPress={onNext}
        disabled={currentPage === totalPages}
        style={[styles.btn, currentPage === totalPages && styles.btnDisabled]}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, currentPage === totalPages && styles.btnTextDisabled]}>Next</Text>
        <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#cbd5e1' : colors.primary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  btnTextDisabled: {
    color: '#cbd5e1',
  },
  pageInfo: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: '#64748b',
    minWidth: 48,
    textAlign: 'center',
  },
})
