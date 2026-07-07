import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../../theme'
import { Text } from '../ui/AppText'
import { Card } from '../ui/Card'
import { useTranslation } from '../../i18n/useTranslation'

const MOCK_SMS_LOGS = Array.from({ length: 20 }, (_, i) => ({
  id: `sms-${i}`,
  recipient: ['Abebe Kebede', 'Almaz Tadesse', 'Lemma Hailu', 'Tigist Wondimu', 'Biruk Alemu'][i % 5],
  type: ['payment_reminder', 'draw_winner', 'payment_receipt', 'registration_welcome', 'lien_warning'][i % 5],
  message: [
    'Daily payment reminder: Please pay your 500 ETB contribution.',
    'Congratulations! You won the draw. Payout of 4,500 ETB initiated.',
    'Payment of 500 ETB received successfully. Receipt: RCP-001',
    'Welcome to Miniዕቁቤ! Your registration is complete.',
    'Warning: You have missed 2 consecutive payments. Your slot may be placed on lien.',
  ][i % 5],
  timestamp: new Date(Date.now() - i * 86400000).toISOString(),
}))

const TYPE_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  payment_reminder: { label: 'Reminder', icon: 'alarm-outline', color: '#f59e0b' },
  draw_winner: { label: 'Winner', icon: 'trophy-outline', color: '#059669' },
  payment_receipt: { label: 'Receipt', icon: 'receipt-outline', color: '#3b82f6' },
  registration_welcome: { label: 'Welcome', icon: 'hand-left-outline', color: '#8b5cf6' },
  lien_warning: { label: 'Warning', icon: 'warning-outline', color: '#ef4444' },
}

export function SmsLogView() {
  const { t, lang } = useTranslation()
  const a = t.admin
  const isAm = lang === 'am'
  const [filter, setFilter] = useState<string>('all')

  const types = ['all', ...Object.keys(TYPE_CONFIG)]

  const filtered = filter === 'all'
    ? MOCK_SMS_LOGS
    : MOCK_SMS_LOGS.filter(l => l.type === filter)

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    return `${date} ${time}`
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isAm ? 'የኤስኤምኤስ መዝገብ' : 'SMS Log'}
      </Text>

      <View style={styles.filterRow}>
        {types.map(type => {
          const cfg = TYPE_CONFIG[type]
          const isAll = type === 'all'
          return (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, filter === type && styles.filterChipActive]}
              onPress={() => setFilter(type)}
            >
              {!isAll && cfg && (
                <Ionicons name={cfg.icon as any} size={14} color={filter === type ? '#fff' : cfg.color} />
              )}
              <Text style={[styles.filterChipText, filter === type && styles.filterChipTextActive]}>
                {isAll ? (isAm ? 'ሁሉም' : 'All') : (cfg?.label || type)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>
          {isAm ? 'ምንም ኤስኤምኤስ የለም' : 'No SMS logs'}
        </Text>
      ) : (
        filtered.map(log => {
          const cfg = TYPE_CONFIG[log.type]
          return (
            <View key={log.id} style={styles.logRow}>
              <View style={[styles.iconWrap, { backgroundColor: cfg?.color ? `${cfg.color}20` : '#f1f5f9' }]}>
                <Ionicons name={cfg?.icon as any} size={18} color={cfg?.color || colors.mutedForeground} />
              </View>
              <View style={styles.logContent}>
                <View style={styles.logTop}>
                  <Text style={styles.recipient}>{log.recipient}</Text>
                  <Text style={styles.time}>{formatTime(log.timestamp)}</Text>
                </View>
                <Text style={styles.message} numberOfLines={2}>{log.message}</Text>
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  empty: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing['3xl'],
  },
  logRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logContent: {
    flex: 1,
    gap: 4,
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipient: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  time: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  message: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
})
