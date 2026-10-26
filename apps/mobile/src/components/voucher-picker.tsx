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

const COLORS = {
  background: '#FFF9F5',
  white: '#FFFFFF',
  primary: '#FF6B35',
  primaryDark: '#D94D20',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  muted: '#8B8289',
  faint: '#A49AA0',
  border: '#F0E8E3',
  green: '#16A34A',
  greenLight: '#DCFCE7',
};

interface Props {
  vouchers: CustomerVoucher[];
  bestVoucherId: string | null;
  selected: CustomerVoucher | null;
  isLoading: boolean;
  disabled?: boolean;
  /** null = không dùng voucher */
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
  const eligibleCount = vouchers.filter((v) => v.eligible).length;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled || isLoading || vouchers.length === 0}
        style={({ pressed }) => [styles.section, pressed && styles.pressed]}
      >
        <View style={styles.sectionIcon}>
          <Ionicons name="ticket" size={21} color={COLORS.primary} />
        </View>

        <View style={styles.sectionBody}>
          <Text style={styles.sectionTitle}>Voucher giảm giá</Text>
          {isLoading ? (
            <Text style={styles.sectionHint}>Đang tìm voucher cho bạn...</Text>
          ) : selected ? (
            <View style={styles.selectedRow}>
              <Text style={styles.selectedCode}>{selected.code}</Text>
              <Text style={styles.selectedDiscount}>
                −${selected.discount.toFixed(2)}
              </Text>
              {selected.id === bestVoucherId ? (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>Tốt nhất</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.sectionHint}>
              {eligibleCount > 0
                ? `${eligibleCount} voucher có thể dùng`
                : vouchers.length > 0
                  ? 'Chưa đủ điều kiện dùng voucher'
                  : 'Hiện chưa có voucher'}
            </Text>
          )}
        </View>

        {vouchers.length > 0 ? (
          <View style={styles.change}>
            <Text style={styles.changeText}>{selected ? 'Đổi' : 'Chọn'}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
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
              <Text style={styles.modalTitle}>Chọn voucher</Text>
              <Text style={styles.modalSubtitle}>
                Voucher giảm nhiều nhất được chọn sẵn cho bạn
              </Text>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {isLoading ? <ActivityIndicator color={COLORS.primary} /> : null}

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
                  style={[
                    styles.ticket,
                    isSelected && styles.ticketSelected,
                    !v.eligible && styles.ticketDisabled,
                  ]}
                >
                  <View
                    style={[
                      styles.ticketStub,
                      !v.eligible && styles.ticketStubDisabled,
                    ]}
                  >
                    <Ionicons name="pricetag" size={20} color="#FFFFFF" />
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
                          <Text style={styles.bestBadgeText}>Tốt nhất</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.ticketDiscount}>{discountText(v)}</Text>
                    <Text style={styles.ticketCondition}>
                      {conditionText(v)}
                    </Text>
                    {v.eligible ? (
                      <Text style={styles.ticketSave}>
                        Bạn được giảm ${v.discount.toFixed(2)}
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
                        ? COLORS.primary
                        : v.eligible
                          ? '#D8CFCA'
                          : '#ECE6E2'
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
              style={[styles.none, !selected && styles.ticketSelected]}
            >
              <Text style={styles.noneText}>Không dùng voucher</Text>
              <Ionicons
                name={!selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={!selected ? COLORS.primary : '#D8CFCA'}
              />
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  sectionHint: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  selectedCode: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  selectedDiscount: { fontSize: 13, fontWeight: '800', color: COLORS.green },
  change: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  bestBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.green },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  ticketSelected: { borderColor: COLORS.primary, borderWidth: 1.5 },
  ticketDisabled: { opacity: 0.6 },
  ticketStub: {
    width: 78,
    alignSelf: 'stretch',
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  ticketStubDisabled: { backgroundColor: '#C9C1C6' },
  stubCode: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  ticketBody: { flex: 1, padding: 12, minWidth: 0 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  ticketDiscount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  ticketCondition: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  ticketSave: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
    marginTop: 4,
  },
  ticketReason: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.faint,
    marginTop: 4,
  },
  radio: { marginRight: 12 },
  none: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
  },
  noneText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
