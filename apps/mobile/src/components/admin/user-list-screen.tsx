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
import { useLanguage } from '@/context/language-context';

const TAB_BAR_OFFSET = 88;

export function UserListScreen({ role }: { role: SignupRole }) {
  const { tr, language } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 350);

  const copy =
    role === UserRole.DRIVER
      ? {
          title: tr('Tài xế', 'Drivers'),
          subtitle: tr(
            'Theo dõi và quản lý tài khoản tài xế',
            'Monitor and manage driver accounts',
          ),
          emoji: '🛵',
          noun: tr('tài xế', 'drivers'),
        }
      : role === UserRole.CUSTOMER
        ? {
            title: tr('Khách hàng', 'Customers'),
            subtitle: tr(
              'Theo dõi và quản lý tài khoản khách hàng',
              'Monitor and manage customer accounts',
            ),
            emoji: '🍔',
            noun: tr('khách hàng', 'customers'),
          }
        : {
            title: tr('Chủ nhà hàng', 'Restaurant Owners'),
            subtitle: tr(
              'Theo dõi và quản lý tài khoản chủ nhà hàng',
              'Monitor and manage restaurant owner accounts',
            ),
            emoji: '🏪',
            noun: tr('chủ nhà hàng', 'owners'),
          };

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
    onError: (err) =>
      Alert.alert(tr('Không thực hiện được', 'Action failed'), errorMessage(err)),
  });

  function confirmToggle(user: AdminUser) {
    const name = `${user.firstName} ${user.lastName}`.trim();
    const blocking = !user.isBlocked;
    Alert.alert(
      blocking
        ? tr('Khoá tài khoản?', 'Lock account?')
        : tr('Mở khoá tài khoản?', 'Unlock account?'),
      blocking
        ? tr(
            `${name} sẽ bị đăng xuất và không thể sử dụng app cho tới khi được mở khoá.`,
            `${name} will be signed out and unable to access the app until unlocked.`,
          )
        : tr(
            `${name} sẽ có thể đăng nhập và sử dụng app trở lại.`,
            `${name} will be able to sign in and use the app again.`,
          ),
      [
        { text: tr('Huỷ', 'Cancel'), style: 'cancel' },
        {
          text: blocking ? tr('Khoá', 'Lock') : tr('Mở khoá', 'Unlock'),
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
              placeholder={tr(
                'Tìm theo tên hoặc email...',
                'Search by name or email...',
              )}
            />
            {data ? (
              <Text style={styles.summary}>
                {data.length} {copy.noun}
                {role === UserRole.DRIVER
                  ? ` · ${onlineCount} ${tr('đang online', 'online')}`
                  : ''}
                {blockedCount
                  ? ` · ${blockedCount} ${tr('đang bị khoá', 'locked')}`
                  : ''}
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
              text={tr(
                `Không tìm thấy ${copy.noun} nào`,
                `No ${copy.noun} found`,
              )}
            />
          )
        }
        renderItem={({ item }) => (
          <UserCard
            user={item}
            language={language}
            tr={tr}
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
  language,
  tr,
  busy,
  onToggleBlock,
}: {
  user: AdminUser;
  language: 'vi' | 'en';
  tr: (vi: string, en: string) => string;
  busy: boolean;
  onToggleBlock: () => void;
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const initials =
    `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() ||
    '?';

  const stats =
    user.role === UserRole.DRIVER
      ? tr(
          `${user.deliveredCount} chuyến đã giao · ${user.activeDeliveries} đang giao`,
          `${user.deliveredCount} delivered · ${user.activeDeliveries} active`,
        )
      : user.role === UserRole.CUSTOMER
        ? tr(
            `${user.orderCount} đơn · đã chi ${formatUsd(user.totalSpent)}`,
            `${user.orderCount} orders · spent ${formatUsd(user.totalSpent)}`,
          )
        : tr(
            `${user.restaurantCount} nhà hàng`,
            `${user.restaurantCount} restaurants`,
          );

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
            label={tr('Đã khoá', 'Locked')}
            color={COLORS.red}
            background={COLORS.redLight}
          />
        ) : null}
        {user.role === UserRole.DRIVER ? (
          user.isOnline ? (
            <Badge
              label="Online"
              color={COLORS.green}
              background={COLORS.greenLight}
            />
          ) : (
            <Badge label="Offline" color={COLORS.muted} background="#F2E5D7" />
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
          {tr('Tham gia', 'Joined')}{' '}
          {new Date(user.createdAt).toLocaleDateString(
            language === 'vi' ? 'vi-VN' : 'en-US',
          )}
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
              {user.isBlocked ? tr('Mở khoá', 'Unlock') : tr('Khoá', 'Lock')}
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
    paddingTop: 16,
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
  cardBlocked: { backgroundColor: '#FFF8F6', borderColor: '#F5C9C4' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBlocked: { backgroundColor: COLORS.faint },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  joined: { fontSize: 11, color: COLORS.faint },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stats: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textSoft },
  action: {
    minWidth: 80,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  actionLock: { backgroundColor: COLORS.redLight, borderColor: '#F5C9C4' },
  actionUnlock: { backgroundColor: COLORS.greenLight, borderColor: '#BFE8D3' },
  actionText: { fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.88 },
});
