import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

const TAB_BAR_HEIGHT = 84;

/** Nút mở trợ lý AI, nổi ở góc phải trên các tab của khách */
export function ChatFab() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { tr } = useLanguage();

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
        accessibilityLabel={tr(
          'Mở trợ lý AI tư vấn món ăn',
          'Open AI food assistant',
        )}
      >
        <View style={styles.badgeDot}>
          <Ionicons name="sparkles" size={16} color={BURGER_COLORS.text} />
        </View>
        <Text style={styles.label}>{tr('Hỏi Deli', 'Ask Deli')}</Text>
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
    height: 46,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: 23,
    backgroundColor: BURGER_COLORS.primary,
    borderWidth: 1,
    borderColor: BURGER_COLORS.primaryDark,
    shadowColor: BURGER_COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.cheese,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
  label: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
