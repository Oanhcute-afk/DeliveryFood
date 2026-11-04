import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '@/store/cart-store';
import { voucherApi, type LatestVoucher } from '@/lib/vouchers';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

const SEEN_KEY = 'seen_voucher_ids';
const AUTO_HIDE_MS = 8000;
const POLL_MS = 60_000;

async function readSeen(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function markSeen(id: string) {
  const seen = await readSeen();
  if (seen.includes(id)) return;
  await SecureStore.setItemAsync(
    SEEN_KEY,
    JSON.stringify([id, ...seen].slice(0, 50)),
  ).catch(() => undefined);
}

/** Banner nhỏ báo voucher mới — mỗi voucher chỉ hiện 1 lần trên máy */
export function NewVoucherToast() {
  const insets = useSafeAreaInsets();
  const { tr } = useLanguage();
  const hasCartItems = useCartStore((s) => s.items.length > 0);
  const [voucher, setVoucher] = useState<LatestVoucher | null>(null);
  const translateY = useRef(new Animated.Value(-200)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: latest } = useQuery({
    queryKey: ['voucher-latest'],
    queryFn: voucherApi.latest,
    refetchInterval: POLL_MS,
  });

  useEffect(() => {
    if (!latest || latest.id === voucher?.id) return;
    let cancelled = false;
    void readSeen().then((seen) => {
      if (cancelled || seen.includes(latest.id)) return;
      setVoucher(latest);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => dismiss(latest.id), AUTO_HIDE_MS);
    });
    return () => {
      cancelled = true;
    };
  }, [latest?.id]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  function dismiss(id: string) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    void markSeen(id);
    Animated.timing(translateY, {
      toValue: -200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVoucher(null));
  }

  if (!voucher) return null;

  const minOrder =
    voucher.minOrderAmount > 0
      ? tr(
          ` cho đơn từ $${voucher.minOrderAmount.toFixed(2).replace(/\.00$/, '')}`,
          ` on orders from $${voucher.minOrderAmount.toFixed(2).replace(/\.00$/, '')}`,
        )
      : '';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        onPress={() => {
          dismiss(voucher.id);
          router.push(
            hasCartItems
              ? '/(customer)/(tabs)/cart'
              : '/(customer)/(tabs)/(home)',
          );
        }}
        style={({ pressed }) => [styles.toast, pressed && styles.pressed]}
        accessibilityRole="alert"
      >
        <View style={styles.icon}>
          <Ionicons name="ticket" size={20} color={BURGER_COLORS.text} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>
            {tr(
              `Ưu đãi mới giảm ${voucher.discountLabel}, đặt burger ngay!`,
              `New voucher: ${voucher.discountLabel} off, order now!`,
            )}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {tr(
              `Mã ${voucher.code}${minOrder} · Tự động áp dụng`,
              `Code ${voucher.code}${minOrder} · Auto-applied at checkout`,
            )}
          </Text>
        </View>
        <Pressable
          onPress={() => dismiss(voucher.id)}
          hitSlop={12}
          accessibilityLabel={tr('Đóng thông báo', 'Dismiss notification')}
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: BURGER_COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.cheese,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', lineHeight: 18 },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
});
