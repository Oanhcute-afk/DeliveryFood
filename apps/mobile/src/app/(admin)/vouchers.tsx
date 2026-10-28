import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  VoucherDiscountType,
  type VoucherDiscountType as DiscountType,
} from '@food-delivery/types';
import { useLanguage } from '@/context/language-context';
import {
  adminApi,
  errorMessage,
  type AdminVoucher,
  type CreateVoucherInput,
} from '@/lib/admin-api';
import { conditionText, discountText } from '@/lib/vouchers';
import {
  Badge,
  Card,
  COLORS,
  EmptyState,
  ScreenHeader,
} from '@/components/admin/admin-ui';

const TAB_BAR_OFFSET = 88;

const EXPIRY_OPTIONS = [
  { vi: '1 ngày', en: '1 day', days: 1 },
  { vi: '3 ngày', en: '3 days', days: 3 },
  { vi: '7 ngày', en: '7 days', days: 7 },
  { vi: '30 ngày', en: '30 days', days: 30 },
  { vi: 'Không hạn', en: 'No expiry', days: null },
] as const;

function statusOf(
  v: AdminVoucher,
  tr: (vi: string, en: string) => string,
) {
  if (!v.isActive)
    return {
      key: 'inactive',
      label: tr('Đã tắt', 'Inactive'),
      color: COLORS.muted,
      bg: COLORS.surfaceAlt,
    };
  if (v.isExpired)
    return {
      key: 'expired',
      label: tr('Hết hạn', 'Expired'),
      color: COLORS.red,
      bg: COLORS.redLight,
    };
  if (v.usageLimit != null && v.usedCount >= v.usageLimit)
    return {
      key: 'exhausted',
      label: tr('Hết lượt', 'Exhausted'),
      color: COLORS.red,
      bg: COLORS.redLight,
    };
  return {
    key: 'running',
    label: tr('Đang chạy', 'Active'),
    color: COLORS.green,
    bg: COLORS.greenLight,
  };
}

export default function AdminVouchersScreen() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: adminApi.vouchers,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setVoucherActive(id, isActive),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] }),
    onError: (err) =>
      Alert.alert(tr('Không thực hiện được', 'Action failed'), errorMessage(err)),
  });

  const runningCount = data?.filter(
    (v) => statusOf(v, tr).key === 'running',
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <>
            <ScreenHeader
              title={tr('Voucher', 'Vouchers')}
              subtitle={tr(
                'Tạo mã giảm giá để kích cầu đặt món',
                'Create promo codes to boost food orders',
              )}
              emoji="🎟️"
            />
            <Pressable
              onPress={() => setShowForm(true)}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="add-circle" size={22} color="#FFFFFF" />
              <Text style={styles.createText}>
                {tr('Tạo voucher mới', 'Create New Voucher')}
              </Text>
            </Pressable>
            {data ? (
              <Text style={styles.summary}>
                {tr(
                  `${data.length} voucher · ${runningCount} đang chạy`,
                  `${data.length} vouchers · ${runningCount} active`,
                )}
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : error ? (
            <EmptyState text={errorMessage(error)} />
          ) : (
            <EmptyState
              text={tr('Chưa có voucher nào', 'No vouchers created yet')}
            />
          )
        }
        renderItem={({ item }) => {
          const status = statusOf(item, tr);
          const toggling =
            toggleMutation.isPending &&
            toggleMutation.variables?.id === item.id;
          return (
            <Card style={styles.card}>
              <View style={styles.ticket}>
                <View style={styles.ticketLeft}>
                  <Ionicons name="pricetag" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.ticketBody}>
                  <View style={styles.codeRow}>
                    <Text style={styles.code}>{item.code}</Text>
                    <Badge
                      label={status.label}
                      color={status.color}
                      background={status.bg}
                    />
                  </View>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.discount}>{discountText(item)}</Text>
                  <Text style={styles.condition}>{conditionText(item)}</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.usage}>
                  {tr(
                    `Đã dùng ${item.usedCount}${
                      item.usageLimit != null ? ` / ${item.usageLimit}` : ''
                    } lượt · ${item.perUserLimit} lượt/khách`,
                    `Used ${item.usedCount}${
                      item.usageLimit != null ? ` / ${item.usageLimit}` : ''
                    } times · ${item.perUserLimit} per user`,
                  )}
                </Text>
                {toggling ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Switch
                    value={item.isActive}
                    onValueChange={(isActive) =>
                      toggleMutation.mutate({ id: item.id, isActive })
                    }
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>
            </Card>
          );
        }}
      />

      <CreateVoucherModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => {
          setShowForm(false);
          void queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] });
        }}
      />
    </SafeAreaView>
  );
}

function CreateVoucherModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { tr } = useLanguage();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DiscountType>(VoucherDiscountType.PERCENT);
  const [value, setValue] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [expiryDays, setExpiryDays] = useState<number | null>(7);

  const reset = () => {
    setCode('');
    setTitle('');
    setType(VoucherDiscountType.PERCENT);
    setValue('');
    setMaxDiscount('');
    setMinOrder('');
    setUsageLimit('');
    setPerUserLimit('1');
    setExpiryDays(7);
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateVoucherInput) => adminApi.createVoucher(input),
    onSuccess: (voucher) => {
      reset();
      onCreated();
      Alert.alert(
        tr('Đã tạo voucher', 'Voucher Created'),
        tr(
          `${voucher.code} đang chạy. Khách hàng sẽ thấy thông báo voucher mới khi mở app.`,
          `${voucher.code} is now active. Customers will be notified when they open the app.`,
        ),
      );
    },
    onError: (err) =>
      Alert.alert(
        tr('Không tạo được voucher', 'Could not create voucher'),
        errorMessage(err),
      ),
  });

  const num = (s: string) => Number(s.replace(',', '.'));

  function submit() {
    const discountValue = num(value);
    if (!code.trim() || !title.trim()) {
      return Alert.alert(
        tr('Thiếu thông tin', 'Missing Information'),
        tr('Nhập mã và tên voucher.', 'Please enter voucher code and title.'),
      );
    }
    if (!(discountValue > 0)) {
      return Alert.alert(
        tr('Mức giảm không hợp lệ', 'Invalid Discount'),
        tr('Nhập số lớn hơn 0.', 'Enter a value greater than 0.'),
      );
    }
    if (type === VoucherDiscountType.PERCENT && discountValue > 100) {
      return Alert.alert(
        tr('Mức giảm không hợp lệ', 'Invalid Discount'),
        tr('Giảm tối đa 100%.', 'Maximum percentage discount is 100%.'),
      );
    }

    createMutation.mutate({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      discountType: type,
      discountValue,
      maxDiscount:
        type === VoucherDiscountType.PERCENT && maxDiscount
          ? num(maxDiscount)
          : undefined,
      minOrderAmount: minOrder ? num(minOrder) : 0,
      usageLimit: usageLimit ? Math.round(num(usageLimit)) : undefined,
      perUserLimit: perUserLimit ? Math.round(num(perUserLimit)) : 1,
      expiresAt:
        expiryDays == null
          ? undefined
          : new Date(Date.now() + expiryDays * 86_400_000).toISOString(),
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {tr('Tạo voucher', 'Create Voucher')}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={COLORS.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label={tr('Mã voucher', 'Voucher Code')}
            hint={tr(
              '3-20 ký tự: chữ, số, _ hoặc -',
              '3-20 characters: letters, numbers, _ or -',
            )}
          >
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder={tr('VD: GIAM20', 'e.g. BURGER20')}
              placeholderTextColor={COLORS.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
          </Field>

          <Field
            label={tr('Tên voucher', 'Voucher Title')}
            hint={tr(
              'Khách hàng sẽ thấy tên này',
              'Customers will see this title',
            )}
          >
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={tr(
                'VD: Giảm 20% cho đơn cuối tuần',
                'e.g. 20% off weekend burger feast',
              )}
              placeholderTextColor={COLORS.faint}
              maxLength={80}
            />
          </Field>

          <Field label={tr('Loại giảm giá', 'Discount Type')}>
            <View style={styles.segment}>
              {[
                {
                  key: VoucherDiscountType.PERCENT,
                  label: tr('Theo %', 'Percentage (%)'),
                },
                {
                  key: VoucherDiscountType.FIXED,
                  label: tr('Số tiền ($)', 'Fixed Amount ($)'),
                },
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setType(opt.key)}
                  style={[
                    styles.segmentItem,
                    type === opt.key && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      type === opt.key && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <View style={styles.row}>
            <Field
              label={
                type === VoucherDiscountType.PERCENT
                  ? tr('Giảm (%)', 'Discount (%)')
                  : tr('Giảm ($)', 'Discount ($)')
              }
              style={styles.half}
            >
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder={type === VoucherDiscountType.PERCENT ? '20' : '3'}
                placeholderTextColor={COLORS.faint}
                keyboardType="decimal-pad"
              />
            </Field>
            {type === VoucherDiscountType.PERCENT ? (
              <Field
                label={tr('Giảm tối đa ($)', 'Max Discount ($)')}
                style={styles.half}
              >
                <TextInput
                  style={styles.input}
                  value={maxDiscount}
                  onChangeText={setMaxDiscount}
                  placeholder={tr('Không giới hạn', 'Unlimited')}
                  placeholderTextColor={COLORS.faint}
                  keyboardType="decimal-pad"
                />
              </Field>
            ) : null}
          </View>

          <Field label={tr('Đơn tối thiểu ($)', 'Minimum Order ($)')}>
            <TextInput
              style={styles.input}
              value={minOrder}
              onChangeText={setMinOrder}
              placeholder={tr('0 = mọi đơn hàng', '0 = all orders')}
              placeholderTextColor={COLORS.faint}
              keyboardType="decimal-pad"
            />
          </Field>

          <View style={styles.row}>
            <Field
              label={tr('Tổng lượt dùng', 'Total Usage Limit')}
              style={styles.half}
            >
              <TextInput
                style={styles.input}
                value={usageLimit}
                onChangeText={setUsageLimit}
                placeholder={tr('Không giới hạn', 'Unlimited')}
                placeholderTextColor={COLORS.faint}
                keyboardType="number-pad"
              />
            </Field>
            <Field
              label={tr('Lượt / khách', 'Per-User Limit')}
              style={styles.half}
            >
              <TextInput
                style={styles.input}
                value={perUserLimit}
                onChangeText={setPerUserLimit}
                placeholder="1"
                placeholderTextColor={COLORS.faint}
                keyboardType="number-pad"
              />
            </Field>
          </View>

          <Field label={tr('Thời hạn', 'Validity Period')}>
            <View style={styles.chips}>
              {EXPIRY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.en}
                  onPress={() => setExpiryDays(opt.days)}
                  style={[
                    styles.chip,
                    expiryDays === opt.days && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      expiryDays === opt.days && styles.chipTextActive,
                    ]}
                  >
                    {tr(opt.vi, opt.en)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Pressable
            onPress={submit}
            disabled={createMutation.isPending}
            style={({ pressed }) => [
              styles.submit,
              createMutation.isPending && styles.submitDisabled,
              pressed && styles.pressed,
            ]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {tr('Tạo voucher', 'Create Voucher')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  hint,
  style,
  children,
}: {
  label: string;
  hint?: string;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: TAB_BAR_OFFSET + 20,
  },
  loader: { marginTop: 40 },
  pressed: { opacity: 0.88 },
  createButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    marginBottom: 14,
  },
  createText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  summary: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 12,
  },
  card: { marginBottom: 12, padding: 0, overflow: 'hidden' },
  ticket: { flexDirection: 'row' },
  ticketLeft: {
    width: 52,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBody: { flex: 1, padding: 14 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  code: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  title: { fontSize: 13, color: COLORS.textSoft, marginTop: 4 },
  discount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 6,
  },
  condition: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  usage: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textSoft },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  form: { paddingHorizontal: 20, paddingBottom: 40 },
  field: { marginBottom: 14 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 7,
  },
  hint: { fontSize: 11, color: COLORS.faint, marginTop: 5 },
  input: {
    height: 50,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.text,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { fontSize: 13, fontWeight: '700', color: COLORS.textSoft },
  segmentTextActive: { color: '#FFFFFF' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSoft },
  chipTextActive: { color: COLORS.primaryDark },
  submit: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});
