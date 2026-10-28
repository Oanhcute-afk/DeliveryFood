import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/language-context';
import { useDebounce } from '@/hooks/use-debounce';
import {
  adminApi,
  errorMessage,
  formatUsd,
  type AdminRestaurant,
} from '@/lib/admin-api';
import {
  Badge,
  Card,
  COLORS,
  EmptyState,
  ScreenHeader,
  SearchBox,
} from '@/components/admin/admin-ui';

const TAB_BAR_OFFSET = 88;

export default function AdminRestaurantsScreen() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 350);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['admin-restaurants', debouncedSearch],
    queryFn: () => adminApi.restaurants(debouncedSearch),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const openMutation = useMutation({
    mutationFn: ({ id, isOpen }: { id: string; isOpen: boolean }) =>
      adminApi.setRestaurantOpen(id, isOpen),
    onSuccess: invalidate,
    onError: (err) =>
      Alert.alert(tr('Không thực hiện được', 'Action failed'), errorMessage(err)),
  });

  const ownerMutation = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      adminApi.setUserBlocked(id, blocked),
    onSuccess: invalidate,
    onError: (err) =>
      Alert.alert(tr('Không thực hiện được', 'Action failed'), errorMessage(err)),
  });

  function confirmOwner(restaurant: AdminRestaurant) {
    const { owner } = restaurant;
    const name = `${owner.firstName} ${owner.lastName}`.trim();
    const blocking = !owner.isBlocked;
    Alert.alert(
      blocking
        ? tr('Khoá chủ nhà hàng?', 'Block restaurant owner?')
        : tr('Mở khoá chủ nhà hàng?', 'Unblock restaurant owner?'),
      blocking
        ? tr(
            `${name} sẽ không thể đăng nhập để quản lý ${restaurant.name}. Bạn có thể đóng cửa nhà hàng bằng công tắc bên trên.`,
            `${name} will not be able to sign in to manage ${restaurant.name}. You can close the restaurant using the switch above.`,
          )
        : tr(
            `${name} sẽ có thể đăng nhập trở lại.`,
            `${name} will be able to sign in again.`,
          ),
      [
        { text: tr('Huỷ', 'Cancel'), style: 'cancel' },
        {
          text: blocking ? tr('Khoá', 'Block') : tr('Mở khoá', 'Unblock'),
          style: blocking ? 'destructive' : 'default',
          onPress: () =>
            ownerMutation.mutate({ id: owner.id, blocked: blocking }),
        },
      ],
    );
  }

  const openCount = data?.filter((r) => r.isOpen).length ?? 0;

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
              title={tr('Nhà hàng', 'Restaurants')}
              subtitle={tr(
                'Mở/đóng cửa nhà hàng và quản lý chủ quán',
                'Open/close restaurants and manage owners',
              )}
              emoji="🍔"
            />
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={tr(
                'Tìm theo tên, địa chỉ, email chủ quán',
                'Search by name, address, or owner email',
              )}
            />
            {data ? (
              <Text style={styles.summary}>
                {tr(
                  `${data.length} nhà hàng · ${openCount} đang mở cửa`,
                  `${data.length} restaurants · ${openCount} open now`,
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
              text={tr('Không tìm thấy nhà hàng nào', 'No restaurants found')}
            />
          )
        }
        renderItem={({ item }) => {
          const togglingOpen =
            openMutation.isPending && openMutation.variables?.id === item.id;
          const togglingOwner =
            ownerMutation.isPending &&
            ownerMutation.variables?.id === item.owner.id;
          const ownerName =
            `${item.owner.firstName} ${item.owner.lastName}`.trim();
          const rating = Number(item.rating ?? 0);

          return (
            <Card style={styles.card}>
              <View style={styles.row}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Text style={styles.imageEmoji}>🍔</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.cuisineType} · {item.address}
                  </Text>
                  <View style={styles.badges}>
                    {item.isOpen ? (
                      <Badge
                        label={tr('Đang mở', 'Open')}
                        color={COLORS.green}
                        background={COLORS.greenLight}
                      />
                    ) : (
                      <Badge
                        label={tr('Đã đóng', 'Closed')}
                        color={COLORS.muted}
                        background={COLORS.surfaceAlt}
                      />
                    )}
                    {rating > 0 ? (
                      <Text style={styles.rating}>★ {rating.toFixed(1)}</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{item.orderCount}</Text>
                  <Text style={styles.statLabel}>
                    {tr('Đơn hàng', 'Orders')}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {formatUsd(item.revenue)}
                  </Text>
                  <Text style={styles.statLabel}>
                    {tr('Doanh thu', 'Revenue')}
                  </Text>
                </View>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>
                  {tr('Cho phép nhận đơn', 'Accepting orders')}
                </Text>
                {togglingOpen ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Switch
                    value={item.isOpen}
                    onValueChange={(isOpen) =>
                      openMutation.mutate({ id: item.id, isOpen })
                    }
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>

              <View style={styles.ownerRow}>
                <View style={styles.info}>
                  <Text style={styles.ownerLabel}>
                    {tr('CHỦ NHÀ HÀNG', 'RESTAURANT OWNER')}
                  </Text>
                  <Text style={styles.ownerName} numberOfLines={1}>
                    {ownerName}
                    {item.owner.isBlocked
                      ? tr('  · đã khoá', '  · blocked')
                      : ''}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.owner.email}
                  </Text>
                </View>
                <Pressable
                  onPress={() => confirmOwner(item)}
                  disabled={togglingOwner}
                  style={({ pressed }) => [
                    styles.action,
                    item.owner.isBlocked
                      ? styles.actionUnlock
                      : styles.actionLock,
                    pressed && styles.pressed,
                  ]}
                >
                  {togglingOwner ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: item.owner.isBlocked
                            ? COLORS.green
                            : COLORS.red,
                        },
                      ]}
                    >
                      {item.owner.isBlocked
                        ? tr('Mở khoá', 'Unblock')
                        : tr('Khoá', 'Block')}
                    </Text>
                  )}
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background,padding:1 },
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
  row: { flexDirection: 'row', gap: 12 },
  image: { width: 64, height: 64, borderRadius: 16 },
  imagePlaceholder: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmoji: { fontSize: 26 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rating: { fontSize: 12, fontWeight: '800', color: '#D99000' },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  stat: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSoft },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ownerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.faint,
  },
  ownerName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
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
  pressed: { opacity: 0.88 },
});
