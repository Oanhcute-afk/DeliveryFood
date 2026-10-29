import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserRole, type SignupRole } from '@food-delivery/types';
import { useDebounce } from '@/hooks/use-debounce';
import {
  adminApi,
  errorMessage,
  formatUsd,
  type AdminUser,
} from '@/lib/admin-api';
import {
  Badge,
  Card,
  COLORS,
  EmptyState,
  ScreenHeader,
  SearchBox,
} from './admin-ui';

const TAB_BAR_OFFSET = 88;

const COPY: Record<
  SignupRole,
  { title: string; subtitle: string; emoji: string; noun: string }
> = {
  [UserRole.DRIVER]: {
    title: 'Tài xế',
    subtitle: 'Theo dõi và khoá tài khoản tài xế',
    emoji: '🛵',
    noun: 'tài xế',
  },
  [UserRole.CUSTOMER]: {
    title: 'Khách hàng',
    subtitle: 'Theo dõi và khoá tài khoản khách hàng',
    emoji: '🧑‍🍳',
    noun: 'khách hàng',
  },
  [UserRole.RESTAURANT_OWNER]: {
    title: 'Chủ nhà hàng',
    subtitle: 'Theo dõi và khoá tài khoản chủ nhà hàng',
    emoji: '🏪',
    noun: 'chủ nhà hàng',
  },
};

export function UserListScreen({ role }: { role: SignupRole }) {
  const copy = COPY[role];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 350);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['admin-users', role, debouncedSearch],
    queryFn: () => adminApi.users(role, debouncedSearch),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      adminApi.setUserBlocked(id, blocked),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
    },
    onError: (err) => Alert.alert('Không thực hiện được', errorMessage(err)),
  });

  function confirmToggle(user: AdminUser) {
    const name = `${user.firstName} ${user.lastName}`.trim();
    const blocking = !user.isBlocked;
    Alert.alert(
      blocking ? 'Khoá tài khoản?' : 'Mở khoá tài khoản?',
      blocking
        ? `${name} sẽ bị đăng xuất và không thể sử dụng app cho tới khi được mở khoá.`
        : `${name} sẽ có thể đăng nhập và sử dụng app trở lại.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: blocking ? 'Khoá' : 'Mở khoá',
          style: blocking ? 'destructive' : 'default',
          onPress: () =>
            blockMutation.mutate({ id: user.id, blocked: blocking }),
        },
      ],
    );
  }

  const blockedCount = data?.filter((u) => u.isBlocked).length ?? 0;
  const onlineCount = data?.filter((u) => u.isOnline).length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
              title={copy.title}
              subtitle={copy.subtitle}
              emoji={copy.emoji}
            />
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên hoặc email"
            />
            {data ? (
              <Text style={styles.summary}>
                {data.length} {copy.noun}
                {role === UserRole.DRIVER
                  ? ` · ${onlineCount} đang trực tuyến`
                  : ''}
                {blockedCount ? ` · ${blockedCount} đang bị khoá` : ''}
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
            <EmptyState text={`Không tìm thấy ${copy.noun} nào`} />
          )
        }
        renderItem={({ item }) => (
          <UserCard
            user={item}
            busy={
              blockMutation.isPending && blockMutation.variables?.id === item.id
            }
            onToggleBlock={() => confirmToggle(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function UserCard({
  user,
  busy,
  onToggleBlock,
}: {
  user: AdminUser;
  busy: boolean;
  onToggleBlock: () => void;
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const initials =
    `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() ||
    '?';

  const stats =
    user.role === UserRole.DRIVER
      ? `${user.deliveredCount} chuyến đã giao · ${user.activeDeliveries} đang giao`
      : user.role === UserRole.CUSTOMER
        ? `${user.orderCount} đơn · đã chi ${formatUsd(user.totalSpent)}`
        : `${user.restaurantCount} nhà hàng`;

  return (
    <Card style={[styles.card, user.isBlocked && styles.cardBlocked]}>
      <View style={styles.row}>
        <View style={[styles.avatar, user.isBlocked && styles.avatarBlocked]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>

      <View style={styles.badges}>
        {user.isBlocked ? (
          <Badge
            label="Đã khoá"
            color={COLORS.red}
            background={COLORS.redLight}
          />
        ) : null}
        {user.role === UserRole.DRIVER ? (
          user.isOnline ? (
            <Badge
              label="Trực tuyến"
              color={COLORS.green}
              background={COLORS.greenLight}
            />
          ) : (
            <Badge label="Ngoại tuyến" color={COLORS.muted} background="#F0EEF1" />
          )
        ) : null}
        {user.hasGoogle ? (
          <Badge
            label="Google"
            color={COLORS.blue}
            background={COLORS.blueLight}
          />
        ) : null}
        <Text style={styles.joined}>
          Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.stats}>{stats}</Text>
        <Pressable
          onPress={onToggleBlock}
          disabled={busy}
          style={({ pressed }) => [
            styles.action,
            user.isBlocked ? styles.actionUnlock : styles.actionLock,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator
              size="small"
              color={user.isBlocked ? COLORS.green : COLORS.red}
            />
          ) : (
            <Text
              style={[
                styles.actionText,
                { color: user.isBlocked ? COLORS.green : COLORS.red },
              ]}
            >
              {user.isBlocked ? 'Mở khoá' : 'Khoá'}
            </Text>
          )}
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: TAB_BAR_OFFSET + 20,
  },
  summary: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 12,
  },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardBlocked: { backgroundColor: '#FFFBFB', borderColor: '#F5D5D6' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBlocked: { backgroundColor: '#C9C1C6' },
  avatarText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  joined: { fontSize: 11, color: COLORS.faint },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3ECE7',
  },
  stats: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textSoft },
  action: {
    minWidth: 84,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  actionLock: { backgroundColor: COLORS.redLight, borderColor: '#F5C9CB' },
  actionUnlock: { backgroundColor: COLORS.greenLight, borderColor: '#BFE8D3' },
  actionText: { fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.8 },
});
