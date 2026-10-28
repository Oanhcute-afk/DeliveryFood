import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CustomerVoucher } from '@food-delivery/types';
import { conditionText, discountText } from '@/lib/vouchers';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

interface Props {
  vouchers: CustomerVoucher[];
  bestVoucherId: string | null;
  selected: CustomerVoucher | null;
  isLoading: boolean;
  disabled?: boolean;
  onSelect: (voucherId: string | null) => void;
}

/** Mục "Voucher" trong giỏ hàng + bảng chọn voucher */
export function VoucherSection({
  vouchers,
  bestVoucherId,
  selected,
  isLoading,
  disabled,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const { tr } = useLanguage();
  const eligibleCount = vouchers.filter((v) => v.eligible).length;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled || isLoading || vouchers.length === 0}
        style={({ pressed }) => [styles.section, pressed && styles.pressed]}
      >
        <View style={styles.sectionIcon}>
          <Ionicons name="ticket" size={20} color={BURGER_COLORS.primary} />
        </View>

        <View style={styles.sectionBody}>
          <Text style={styles.sectionTitle}>
            {tr('Voucher ưu đãi', 'Promo Voucher')}
          </Text>
          {isLoading ? (
            <Text style={styles.sectionHint}>
              {tr('Đang tìm voucher cho bạn...', 'Finding available vouchers...')}
            </Text>
          ) : selected ? (
            <View style={styles.selectedRow}>
              <Text style={styles.selectedCode}>{selected.code}</Text>
              <Text style={styles.selectedDiscount}>
                −${selected.discount.toFixed(2)}
              </Text>
              {selected.id === bestVoucherId ? (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>
                    {tr('Tốt nhất', 'Best')}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.sectionHint}>
              {eligibleCount > 0
                ? tr(
                    `${eligibleCount} voucher có thể dùng`,
                    `${eligibleCount} eligible voucher${eligibleCount > 1 ? 's' : ''}`,
                  )
                : vouchers.length > 0
                  ? tr(
                      'Chưa đủ điều kiện dùng voucher',
                      'Order does not meet voucher minimum',
                    )
                  : tr('Hiện chưa có voucher', 'No vouchers available')}
            </Text>
          )}
        </View>

        {vouchers.length > 0 ? (
          <View style={styles.change}>
            <Text style={styles.changeText}>
              {selected ? tr('Đổi', 'Change') : tr('Chọn', 'Select')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={BURGER_COLORS.primary}
            />
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {tr('Chọn voucher', 'Select Voucher')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {tr(
                  'Voucher giảm nhiều nhất được chọn sẵn cho bạn',
                  'The best saving voucher is auto-selected for you',
                )}
              </Text>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons name="close" size={26} color={BURGER_COLORS.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {isLoading ? (
              <ActivityIndicator color={BURGER_COLORS.primary} />
            ) : null}

            {vouchers.map((v) => {
              const isSelected = selected?.id === v.id;
              return (
                <Pressable
                  key={v.id}
                  disabled={!v.eligible}
                  onPress={() => {
                    onSelect(v.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.ticket,
                    isSelected && styles.ticketSelected,
                    !v.eligible && styles.ticketDisabled,
                    pressed && v.eligible && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.ticketStub,
                      !v.eligible && styles.ticketStubDisabled,
                    ]}
                  >
                    <Ionicons name="pricetag" size={18} color="#FFFFFF" />
                    <Text style={styles.stubCode} numberOfLines={1}>
                      {v.code}
                    </Text>
                  </View>

                  <View style={styles.ticketBody}>
                    <View style={styles.ticketTop}>
                      <Text style={styles.ticketTitle} numberOfLines={1}>
                        {v.title}
                      </Text>
                      {v.id === bestVoucherId ? (
                        <View style={styles.bestBadge}>
                          <Text style={styles.bestBadgeText}>
                            {tr('Tốt nhất', 'Best')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.ticketDiscount}>{discountText(v)}</Text>
                    <Text style={styles.ticketCondition}>
                      {conditionText(v)}
                    </Text>
                    {v.eligible ? (
                      <Text style={styles.ticketSave}>
                        {tr(
                          `Giảm được $${v.discount.toFixed(2)}`,
                          `You save $${v.discount.toFixed(2)}`,
                        )}
                      </Text>
                    ) : (
                      <Text style={styles.ticketReason}>{v.reason}</Text>
                    )}
                  </View>

                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={
                      isSelected
                        ? BURGER_COLORS.primary
                        : v.eligible
                          ? BURGER_COLORS.border
                          : BURGER_COLORS.divider
                    }
                    style={styles.radio}
                  />
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.none,
                !selected && styles.ticketSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.noneText}>
                {tr('Không dùng voucher', 'Do not use a voucher')}
              </Text>
              <Ionicons
                name={!selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={!selected ? BURGER_COLORS.primary : BURGER_COLORS.border}
              />
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.88 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.cheeseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: BURGER_COLORS.text },
  sectionHint: { fontSize: 12, color: BURGER_COLORS.muted, marginTop: 2 },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  selectedCode: {
    fontSize: 12,
    fontWeight: '800',
    color: BURGER_COLORS.primaryDark,
    backgroundColor: BURGER_COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  selectedDiscount: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.lettuce,
  },
  change: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeText: {
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.primary,
  },
  bestBadge: {
    backgroundColor: BURGER_COLORS.cheeseLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: BURGER_COLORS.cheeseDark,
  },
  modal: { flex: 1, backgroundColor: BURGER_COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: BURGER_COLORS.text },
  modalSubtitle: { fontSize: 12, color: BURGER_COLORS.muted, marginTop: 3 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ticketSelected: { borderColor: BURGER_COLORS.primary, borderWidth: 1.5 },
  ticketDisabled: { opacity: 0.6 },
  ticketStub: {
    width: 74,
    alignSelf: 'stretch',
    backgroundColor: BURGER_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  ticketStubDisabled: { backgroundColor: BURGER_COLORS.faint },
  stubCode: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  ticketBody: { flex: 1, padding: 12, minWidth: 0 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  ticketDiscount: {
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.primaryDark,
    marginTop: 3,
  },
  ticketCondition: { fontSize: 11, color: BURGER_COLORS.muted, marginTop: 2 },
  ticketSave: {
    fontSize: 12,
    fontWeight: '700',
    color: BURGER_COLORS.lettuce,
    marginTop: 4,
  },
  ticketReason: {
    fontSize: 12,
    fontWeight: '600',
    color: BURGER_COLORS.faint,
    marginTop: 4,
  },
  radio: { marginRight: 12 },
  none: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  noneText: { fontSize: 14, fontWeight: '700', color: BURGER_COLORS.text },
});
