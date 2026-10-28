import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageSwitch } from '@/components/language-switch';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import {
  adminApi,
  errorMessage,
  formatUsd,
  openMonitor,
} from '@/lib/admin-api';
import {
  Card,
  COLORS,
  EmptyState,
  ScreenHeader,
} from '@/components/admin/admin-ui';

const TAB_BAR_OFFSET = 88;

const ROLE_LABELS: Record<string, { vi: string; en: string }> = {
  CUSTOMER: { vi: 'Khách hàng', en: 'Customers' },
  RESTAURANT_OWNER: { vi: 'Chủ nhà hàng', en: 'Restaurant Owners' },
  DRIVER: { vi: 'Tài xế', en: 'Drivers' },
};

const STATUS_LABELS: Record<string, { vi: string; en: string }> = {
  PENDING: { vi: 'Chờ thanh toán', en: 'Pending Payment' },
  CONFIRMED: { vi: 'Đã xác nhận', en: 'Confirmed' },
  PREPARING: { vi: 'Đang nấu', en: 'Preparing' },
  READY: { vi: 'Chờ lấy hàng', en: 'Ready for Pickup' },
  PICKED_UP: { vi: 'Đang giao', en: 'Out for Delivery' },
  DELIVERED: { vi: 'Đã giao', en: 'Delivered' },
  CANCELLED: { vi: 'Đã huỷ', en: 'Cancelled' },
};

export default function AdminOverviewScreen() {
  const { user, logout } = useAuth();
  const { tr } = useLanguage();
  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminApi.overview,
    refetchInterval: 30_000,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={COLORS.primary}
          />
        }
      >
        <ScreenHeader
          title={tr('Tổng quan', 'Overview')}
          subtitle={tr(
            'Hoạt động của toàn bộ ứng dụng',
            'Platform-wide activity and metrics',
          )}
          emoji="🍔"
        />

        <Pressable
          onPress={openMonitor}
          style={({ pressed }) => [styles.monitor, pressed && styles.pressed]}
        >
          <View style={styles.monitorIcon}>
            <Ionicons name="pulse" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.monitorText}>
            <Text style={styles.monitorTitle}>
              {tr('Mở trang Monitor', 'Open Live Monitor')}
            </Text>
            <Text style={styles.monitorSubtitle}>
              {tr(
                'Lượng truy cập, tốc độ API và lỗi server',
                'Traffic volume, API latency, and server errors',
              )}
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : error ? (
          <EmptyState text={errorMessage(error)} />
        ) : data && !data.ok ? (
          <EmptyState
            text={tr(
              `Không đọc được database: ${data.error}`,
              `Database error: ${data.error}`,
            )}
          />
        ) : data?.ok ? (
          <>
            <View style={styles.tiles}>
              <Tile
                label={tr('Người dùng', 'Total Users')}
                value={String(
                  data.users.total - (data.users.byRole.ADMIN ?? 0),
                )}
                sub={tr(
                  `+${data.users.new24h} trong 24 giờ`,
                  `+${data.users.new24h} in last 24h`,
                )}
              />
              <Tile
                label={tr('Tài xế online', 'Online Drivers')}
                value={String(data.driversOnline)}
                sub={tr(
                  `trên ${data.users.byRole.DRIVER ?? 0} tài xế`,
                  `of ${data.users.byRole.DRIVER ?? 0} drivers`,
                )}
              />
              <Tile
                label={tr('Nhà hàng mở cửa', 'Open Restaurants')}
                value={String(data.restaurants.open)}
                sub={tr(
                  `trên ${data.restaurants.total} nhà hàng`,
                  `of ${data.restaurants.total} restaurants`,
                )}
              />
              <Tile
                label={tr('Đơn đã thanh toán', 'Paid Orders (24h)')}
                value={String(data.orders.paid24h)}
                sub={tr(
                  `${data.orders.paid7d} đơn trong 7 ngày`,
                  `${data.orders.paid7d} orders in 7 days`,
                )}
              />
              <Tile
                label={tr('Doanh thu 24 giờ', 'Revenue (24h)')}
                value={formatUsd(data.orders.revenue24h)}
                sub={tr(
                  `${formatUsd(data.orders.revenue7d)} / 7 ngày`,
                  `${formatUsd(data.orders.revenue7d)} / 7 days`,
                )}
              />
              <Tile
                label={tr('App bù voucher 24 giờ', 'Voucher Spend (24h)')}
                value={formatUsd(data.orders.voucherCost24h)}
                sub={tr(
                  `${formatUsd(data.orders.voucherCost7d)} / 7 ngày`,
                  `${formatUsd(data.orders.voucherCost7d)} / 7 days`,
                )}
              />
              <Tile
                label={tr('Đăng nhập Google', 'Google Sign-In')}
                value={
                  data.users.googleLinked == null
                    ? '–'
                    : String(data.users.googleLinked)
                }
                sub={tr('tài khoản đã liên kết', 'linked accounts')}
              />
            </View>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>
                {tr('Số đơn mỗi ngày', 'Daily Orders')}
              </Text>
              <Text style={styles.sectionDesc}>
                {tr('7 ngày gần nhất', 'Last 7 days')}
              </Text>
              <DailyBars days={data.orders.perDay} />
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>
                {tr('Người dùng theo vai trò', 'Users by Role')}
              </Text>
              <BarList
                rows={Object.keys(ROLE_LABELS).map((key) => ({
                  label: tr(ROLE_LABELS[key].vi, ROLE_LABELS[key].en),
                  value: data.users.byRole[key] ?? 0,
                }))}
              />
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>
                {tr('Đơn hàng theo trạng thái', 'Orders by Status')}
              </Text>
              <BarList
                rows={Object.keys(STATUS_LABELS).map((key) => ({
                  label: tr(STATUS_LABELS[key].vi, STATUS_LABELS[key].en),
                  value: data.orders.byStatus[key] ?? 0,
                }))}
              />
            </Card>
          </>
        ) : null}

        <View style={styles.languageWrap}>
          <LanguageSwitch variant="card" />
        </View>

        <Card style={styles.account}>
          <View style={styles.accountIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>
              {tr('Quản trị viên', 'Administrator')}
            </Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                tr('Đăng xuất?', 'Sign out?'),
                tr(
                  'Bạn sẽ cần đăng nhập lại để quản trị.',
                  'You will need to sign in again to access admin tools.',
                ),
                [
                  { text: tr('Huỷ', 'Cancel'), style: 'cancel' },
                  {
                    text: tr('Đăng xuất', 'Sign Out'),
                    style: 'destructive',
                    onPress: () => void logout(),
                  },
                ],
              )
            }
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
            <Text style={styles.logoutText}>
              {tr('Đăng xuất', 'Sign Out')}
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

function DailyBars({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <View style={styles.bars}>
      {days.map((d) => {
        const [, month, day] = d.day.split('-');
        return (
          <View key={d.day} style={styles.barCol}>
            <Text style={styles.barValue}>{d.count}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.max((d.count / max) * 100, 2)}%` },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>
              {day}/{month}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BarList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={styles.list}>
      {rows.map((r) => (
        <View key={r.label} style={styles.listRow}>
          <Text style={styles.listLabel} numberOfLines={1}>
            {r.label}
          </Text>
          <View style={styles.listTrack}>
            <View
              style={[styles.listFill, { width: `${(r.value / max) * 100}%` }]}
            />
          </View>
          <Text style={styles.listValue}>{r.value}</Text>
        </View>
      ))}
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
  languageWrap: {
    marginTop: 4,
    marginBottom: 12,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: { flex: 1, minWidth: 0 },
  accountLabel: { fontSize: 11, fontWeight: '800', color: COLORS.faint },
  accountEmail: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.redLight,
  },
  logoutText: { fontSize: 13, fontWeight: '800', color: COLORS.red },
  pressed: { opacity: 0.88 },
  monitor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  monitorIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitorText: { flex: 1 },
  monitorTitle: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  monitorSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
  },
  tileLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  tileValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  tileSub: { fontSize: 11, color: COLORS.faint, marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sectionDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 150,
    marginTop: 14,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barValue: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSoft,
    marginBottom: 4,
  },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: { fontSize: 10, color: COLORS.faint, marginTop: 6 },
  list: { gap: 10, marginTop: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listLabel: { width: 116, fontSize: 13, color: COLORS.textSoft },
  listTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryLight,
    overflow: 'hidden',
  },
  listFill: { height: '100%', borderRadius: 5, backgroundColor: COLORS.primary },
  listValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
});
