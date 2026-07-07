import { useState } from 'react'
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput as RNTextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing } from '../../theme'
import { Text } from '../ui/AppText'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useTranslation } from '../../i18n/useTranslation'

interface User {
  id: string
  name: string
  phone: string
  joinedAt: string
}

interface Slot {
  id: string
  userId: string
  category: string
  slotNumber: number
  status: 'active' | 'lien'
  balance: number
  consecutiveMissedSweeps: number
  depositedToday: boolean
}

interface MemberDetailModalProps {
  visible: boolean
  user: User | null
  slots: Slot[]
  allSlots: Slot[]
  onClose: () => void
  onUpdateUser: (id: string, name: string, phone: string) => void
  onAssignSlot: (userId: string, category: string) => void
  onRemoveSlot: (slotId: string) => void
  onToggleLien: (slotId: string) => void
}

const CATEGORIES = ['500', '1000', '2000', '5000']

export function MemberDetailModal({
  visible,
  user,
  slots: userSlots,
  allSlots,
  onClose,
  onUpdateUser,
  onAssignSlot,
  onRemoveSlot,
  onToggleLien,
}: MemberDetailModalProps) {
  const { t, lang } = useTranslation()
  const { showToast } = useToast()
  const a = t.admin
  const isAm = lang === 'am'

  const [editName, setEditName] = useState(user?.name ?? '')
  const [editPhone, setEditPhone] = useState(user?.phone ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [showSlotPicker, setShowSlotPicker] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('500')

  if (!user) return null

  const availableCategories = CATEGORIES.filter(cat => {
    const assigned = userSlots.filter(s => s.category === cat && s.status === 'active').length
    return assigned < 2
  })

  const handleSaveEdit = () => {
    if (!editName.trim() || !editPhone.trim()) {
      showToast(isAm ? 'ሁሉንም መስኮች ይሙሉ' : 'Fill all fields', 'error')
      return
    }
    onUpdateUser(user.id, editName.trim(), editPhone.trim())
    setIsEditing(false)
    showToast(isAm ? 'ተዘምኗል' : 'Updated', 'success')
  }

  const handleAssignSlot = () => {
    setShowSlotPicker(true)
  }

  const confirmAssignSlot = () => {
    const existingCount = allSlots.filter(s => s.category === selectedCategory).length
    const count = allSlots.filter(s => s.category === selectedCategory).length
    onAssignSlot(user.id, selectedCategory)
    setShowSlotPicker(false)
    showToast(
      `${isAm ? 'ተመድቧል' : 'Assigned'} ${selectedCategory} ${isAm ? 'ቦታ' : 'slot'} ${isAm ? `ቁጥር ${count + 1}` : `#${count + 1}`}`,
      'success'
    )
  }

  const totalBalance = userSlots.reduce((sum, s) => sum + s.balance, 0)

  const catConfig: Record<string, { label: string; color: string }> = {
    '500': { label: '500 ETB', color: '#059669' },
    '1000': { label: '1,000 ETB', color: '#0ea5e9' },
    '2000': { label: '2,000 ETB', color: '#8b5cf6' },
    '5000': { label: '5,000 ETB', color: '#f59e0b' },
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {isAm ? 'የአባል ዝርዝር' : 'Member Details'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {isEditing ? (
              <Card style={styles.editCard}>
                <Text style={styles.fieldLabel}>{isAm ? 'ስም' : 'Name'}</Text>
                <RNTextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={styles.fieldLabel}>{isAm ? 'ስልክ ቁጥር' : 'Phone'}</Text>
                <RNTextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View style={styles.editActions}>
                  <Button title={isAm ? 'ተመለስ' : 'Cancel'} variant="ghost" onPress={() => setIsEditing(false)} />
                  <Button title={isAm ? 'አስቀምጥ' : 'Save'} onPress={handleSaveEdit} />
                </View>
              </Card>
            ) : (
              <Card style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.infoText}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userMeta}>{user.phone}</Text>
                    <Text style={styles.userMeta}>
                      {isAm ? 'መለያ' : 'ID'}: {user.id} · {isAm ? 'የተቀላቀለበት' : 'Joined'}: {user.joinedAt}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { setIsEditing(true); setEditName(user.name); setEditPhone(user.phone) }}>
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            <Card style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userSlots.length}</Text>
                <Text style={styles.statLabel}>{isAm ? 'ቦታዎች' : 'Slots'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalBalance.toLocaleString()} ETB</Text>
                <Text style={styles.statLabel}>{isAm ? 'ጠቅላላ ቀሪ' : 'Total Balance'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {userSlots.filter(s => s.status === 'active').length}
                </Text>
                <Text style={styles.statLabel}>{isAm ? 'ንቁ' : 'Active'}</Text>
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isAm ? 'ቦታዎች' : 'Slots'}</Text>
              {availableCategories.length > 0 && (
                <TouchableOpacity style={styles.assignBtn} onPress={handleAssignSlot}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.assignBtnText}>{isAm ? 'መድብ' : 'Assign'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {userSlots.length === 0 ? (
              <Text style={styles.emptyText}>
                {isAm ? 'ምንም ቦታ አልተመደበም' : 'No slots assigned'}
              </Text>
            ) : (
              userSlots.map(slot => {
                const cfg = catConfig[slot.category] || { label: slot.category, color: colors.primary }
                const isLien = slot.status !== 'active'
                return (
                  <View key={slot.id} style={styles.slotRow}>
                    <View style={[styles.slotIndicator, { backgroundColor: cfg.color }]} />
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotTitle}>
                        {cfg.label} #{slot.slotNumber}
                      </Text>
                      <Text style={styles.slotMeta}>
                        {slot.balance.toLocaleString()} ETB · {isLien ? (isAm ? 'ቅጣት' : 'Lien') : (isAm ? 'ንቁ' : 'Active')}
                        {slot.consecutiveMissedSweeps > 0 ? ` · ${slot.consecutiveMissedSweeps}x ${isAm ? 'አመለጠ' : 'missed'}` : ''}
                      </Text>
                    </View>
                    <View style={styles.slotActions}>
                      <TouchableOpacity onPress={() => onToggleLien(slot.id)} style={styles.slotActionBtn}>
                        <Ionicons
                          name={isLien ? 'lock-open-outline' : 'lock-closed-outline'}
                          size={18}
                          color={isLien ? colors.primary : colors.destructive}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onRemoveSlot(slot.id)} style={styles.slotActionBtn}>
                        <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })
            )}
          </ScrollView>
        </View>
      </View>

      <Modal visible={showSlotPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>
              {isAm ? 'ምድብ ይምረጡ' : 'Select Category'}
            </Text>
            {availableCategories.map(cat => {
              const cfg = catConfig[cat] || { label: cat, color: colors.primary }
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pickerOption, selectedCategory === cat && styles.pickerOptionActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <View style={[styles.pickerDot, { backgroundColor: cfg.color }]} />
                  <Text style={styles.pickerOptionText}>{cfg.label}</Text>
                  {selectedCategory === cat && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )
            })}
            <View style={styles.pickerActions}>
              <Button title={isAm ? 'ተመለስ' : 'Cancel'} variant="ghost" onPress={() => setShowSlotPicker(false)} />
              <Button title={isAm ? 'መድብ' : 'Assign'} onPress={confirmAssignSlot} />
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  body: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  editCard: {
    gap: spacing.sm,
  },
  infoCard: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  userMeta: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: colors.radius.md,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  slotIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  slotInfo: {
    flex: 1,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  slotMeta: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  slotActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  slotActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  pickerSheet: {
    backgroundColor: colors.card,
    borderRadius: colors.radius.lg,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 320,
    gap: spacing.sm,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: colors.radius.sm,
  },
  pickerOptionActive: {
    backgroundColor: '#f0fdf4',
  },
  pickerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
})
