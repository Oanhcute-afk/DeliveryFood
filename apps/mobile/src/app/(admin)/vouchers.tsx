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

// Thời hạn chọn nhanh thay cho date picker
const EXPIRY_OPTIONS = [
  { label: '1 ngày', days: 1 },
  { label: '3 ngày', days: 3 },
  { label: '7 ngày', days: 7 },
  { label: '30 ngày', days: 30 },
  { label: 'Không hạn', days: null },
] as const;

function statusOf(v: AdminVoucher) {
  if (!v.isActive)
    return { label: 'Đã tắt', color: COLORS.muted, bg: '#F0EEF1' };
  if (v.isExpired)
    return { label: 'Hết hạn', color: COLORS.red, bg: COLORS.redLight };
  if (v.usageLimit != null && v.usedCount >= v.usageLimit)
    return { label: 'Hết lượt', color: COLORS.red, bg: COLORS.redLight };
  return { label: 'Đang chạy', color: COLORS.green, bg: COLORS.greenLight };
}

export default function AdminVouchersScreen() {
  const queryClient = useQueryClient();
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
    onError: (err) => Alert.alert('Không thực hiện được', errorMessage(err)),
  });

  const runningCount = data?.filter(
    (v) => statusOf(v).label === 'Đang chạy',
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
              title="Voucher"
              subtitle="Tạo mã giảm giá để kích cầu đặt món"
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
              <Text style={styles.createText}>Tạo voucher mới</Text>
            </Pressable>
            {data ? (
              <Text style={styles.summary}>
                {data.length} voucher · {runningCount} đang chạy
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
            <EmptyState text="Chưa có voucher nào" />
          )
        }
        renderItem={({ item }) => {
          const status = statusOf(item);
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
                  Đã dùng {item.usedCount}
                  {item.usageLimit != null ? ` / ${item.usageLimit}` : ''} lượt
                  · {item.perUserLimit} lượt/khách
                </Text>
                {toggling ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Switch
                    value={item.isActive}
                    onValueChange={(isActive) =>
                      toggleMutation.mutate({ id: item.id, isActive })
                    }
                    trackColor={{ false: '#E3DCD8', true: COLORS.primary }}
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
        'Đã tạo voucher',
        `${voucher.code} đang chạy. Khách hàng sẽ thấy thông báo voucher mới khi mở app.`,
      );
    },
    onError: (err) => Alert.alert('Không tạo được voucher', errorMessage(err)),
  });

  const num = (s: string) => Number(s.replace(',', '.'));

  function submit() {
    const discountValue = num(value);
    if (!code.trim() || !title.trim()) {
      return Alert.alert('Thiếu thông tin', 'Nhập mã và tên voucher.');
    }
    if (!(discountValue > 0)) {
      return Alert.alert('Mức giảm không hợp lệ', 'Nhập số lớn hơn 0.');
    }
    if (type === VoucherDiscountType.PERCENT && discountValue > 100) {
      return Alert.alert('Mức giảm không hợp lệ', 'Giảm tối đa 100%.');
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
          <Text style={styles.modalTitle}>Tạo voucher</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={COLORS.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Mã voucher" hint="3-20 ký tự: chữ, số, _ hoặc -">
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="VD: GIAM20"
              placeholderTextColor={COLORS.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
          </Field>

          <Field label="Tên voucher" hint="Khách hàng sẽ thấy tên này">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="VD: Giảm 20% cho đơn cuối tuần"
              placeholderTextColor={COLORS.faint}
              maxLength={80}
            />
          </Field>

          <Field label="Loại giảm giá">
            <View style={styles.segment}>
              {[
                { key: VoucherDiscountType.PERCENT, label: 'Theo %' },
                { key: VoucherDiscountType.FIXED, label: 'Số tiền ($)' },
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
                type === VoucherDiscountType.PERCENT ? 'Giảm (%)' : 'Giảm ($)'
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
              <Field label="Giảm tối đa ($)" style={styles.half}>
                <TextInput
                  style={styles.input}
                  value={maxDiscount}
                  onChangeText={setMaxDiscount}
                  placeholder="Không giới hạn"
                  placeholderTextColor={COLORS.faint}
                  keyboardType="decimal-pad"
                />
              </Field>
            ) : null}
          </View>

          <Field label="Đơn tối thiểu ($)">
            <TextInput
              style={styles.input}
              value={minOrder}
              onChangeText={setMinOrder}
              placeholder="0 = mọi đơn hàng"
              placeholderTextColor={COLORS.faint}
              keyboardType="decimal-pad"
            />
          </Field>

          <View style={styles.row}>
            <Field label="Tổng lượt dùng" style={styles.half}>
              <TextInput
                style={styles.input}
                value={usageLimit}
                onChangeText={setUsageLimit}
                placeholder="Không giới hạn"
                placeholderTextColor={COLORS.faint}
                keyboardType="number-pad"
              />
            </Field>
            <Field label="Lượt / khách" style={styles.half}>
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

          <Field label="Thời hạn">
            <View style={styles.chips}>
              {EXPIRY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.label}
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
                    {opt.label}
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
              <Text style={styles.submitText}>Tạo voucher</Text>
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
  pressed: { opacity: 0.85 },
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
    borderTopColor: '#F3ECE7',
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
    color: '#393039',
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
