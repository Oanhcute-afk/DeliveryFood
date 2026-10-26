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
import { useAuth } from '@/context/auth-context';
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

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  RESTAURANT_OWNER: 'Chủ nhà hàng',
  DRIVER: 'Tài xế',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang nấu',
  READY: 'Chờ lấy hàng',
  PICKED_UP: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

export default function AdminOverviewScreen() {
  const { user, logout } = useAuth();
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
          title="Tổng quan"
          subtitle="Hoạt động của toàn bộ ứng dụng"
          emoji="📊"
        />

        <Pressable
          onPress={openMonitor}
          style={({ pressed }) => [styles.monitor, pressed && styles.pressed]}
        >
          <View style={styles.monitorIcon}>
            <Ionicons name="pulse" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.monitorText}>
            <Text style={styles.monitorTitle}>Mở trang Monitor</Text>
            <Text style={styles.monitorSubtitle}>
              Lượng truy cập, tốc độ API và lỗi server
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : error ? (
          <EmptyState text={errorMessage(error)} />
        ) : data && !data.ok ? (
          <EmptyState text={`Không đọc được database: ${data.error}`} />
        ) : data?.ok ? (
          <>
            <View style={styles.tiles}>
              <Tile
                label="Người dùng"
                value={String(
                  data.users.total - (data.users.byRole.ADMIN ?? 0),
                )}
                sub={`+${data.users.new24h} trong 24 giờ`}
              />
              <Tile
                label="Tài xế online"
                value={String(data.driversOnline)}
                sub={`trên ${data.users.byRole.DRIVER ?? 0} tài xế`}
              />
              <Tile
                label="Nhà hàng mở cửa"
                value={String(data.restaurants.open)}
                sub={`trên ${data.restaurants.total} nhà hàng`}
              />
              <Tile
                label="Đơn đã thanh toán"
                value={String(data.orders.paid24h)}
                sub={`${data.orders.paid7d} đơn trong 7 ngày`}
              />
              <Tile
                label="Doanh thu 24 giờ"
                value={formatUsd(data.orders.revenue24h)}
                sub={`${formatUsd(data.orders.revenue7d)} / 7 ngày`}
              />
              <Tile
                label="Đăng nhập Google"
                value={
                  data.users.googleLinked == null
                    ? '–'
                    : String(data.users.googleLinked)
                }
                sub="tài khoản đã liên kết"
              />
            </View>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Số đơn mỗi ngày</Text>
              <Text style={styles.sectionDesc}>7 ngày gần nhất</Text>
              <DailyBars days={data.orders.perDay} />
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Người dùng theo vai trò</Text>
              <BarList
                rows={Object.keys(ROLE_LABELS).map((key) => ({
                  label: ROLE_LABELS[key],
                  value: data.users.byRole[key] ?? 0,
                }))}
              />
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Đơn hàng theo trạng thái</Text>
              <BarList
                rows={Object.keys(STATUS_LABELS).map((key) => ({
                  label: STATUS_LABELS[key],
                  value: data.orders.byStatus[key] ?? 0,
                }))}
              />
            </Card>
          </>
        ) : null}

        <Card style={styles.account}>
          <View style={styles.accountIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>Quản trị viên</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Đăng xuất?',
                'Bạn sẽ cần đăng nhập lại để quản trị.',
                [
                  { text: 'Huỷ', style: 'cancel' },
                  {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: () => void logout(),
                  },
                ],
              )
            }
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
            <Text style={styles.logoutText}>Đăng xuất</Text>
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
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
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
  pressed: { opacity: 0.85 },
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
    backgroundColor: '#E85B28',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: { fontSize: 10, color: COLORS.faint, marginTop: 6 },
  list: { gap: 10, marginTop: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listLabel: { width: 104, fontSize: 13, color: COLORS.textSoft },
  listTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryLight,
    overflow: 'hidden',
  },
  listFill: { height: '100%', borderRadius: 5, backgroundColor: '#E85B28' },
  listValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
});
