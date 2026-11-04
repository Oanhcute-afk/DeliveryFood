import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Chiều cao tab bar để nút không đè lên tab
const TAB_BAR_HEIGHT = 84;

/** Nút mở trợ lý AI, nổi ở góc phải trên các tab của khách */
export function ChatFab() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Ẩn trong màn chat, chi tiết đơn và trang menu nhà hàng (có nút giỏ hàng riêng)
  if (
    pathname.startsWith('/chat') ||
    pathname.startsWith('/order') ||
    pathname.includes('/restaurant/')
  ) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_HEIGHT }]}
    >
      <Pressable
        onPress={() => router.push('/(customer)/chat')}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Mở trợ lý AI tư vấn món ăn"
      >
        <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        <Text style={styles.label}>Hỏi Deli</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, zIndex: 50 },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  label: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
