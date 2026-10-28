import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BURGER_COLORS } from '@/constants/theme';
import { LanguageSwitch } from '@/components/language-switch';
import { useLanguage } from '@/context/language-context';

export const COLORS = {
  background: BURGER_COLORS.background,
  surface: BURGER_COLORS.surface,
  surfaceAlt: BURGER_COLORS.surfaceMuted,
  primary: BURGER_COLORS.primary,
  primaryDark: BURGER_COLORS.primaryDark,
  primaryLight: BURGER_COLORS.primaryLight,
  text: BURGER_COLORS.text,
  textSoft: BURGER_COLORS.textSoft,
  muted: BURGER_COLORS.muted,
  faint: BURGER_COLORS.faint,
  border: BURGER_COLORS.border,
  green: BURGER_COLORS.lettuce,
  greenLight: BURGER_COLORS.lettuceLight,
  red: BURGER_COLORS.tomato,
  redLight: BURGER_COLORS.tomatoLight,
  blue: BURGER_COLORS.blue,
  blueLight: BURGER_COLORS.blueLight,
};

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  emoji,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  emoji: string;
}) {
  const { tr } = useLanguage();
  const displayEyebrow = eyebrow ?? tr('QUẢN TRỊ HỆ THỐNG', 'ADMIN CONSOLE');

  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={styles.badgeRow}>
          <Text style={styles.headerEmoji}>{emoji}</Text>
          <Text style={styles.eyebrow}>{displayEyebrow}</Text>
        </View>
        <LanguageSwitch />
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={COLORS.faint} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.faint}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

export function Badge({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🍔</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BURGER_COLORS.cheeseLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  headerEmoji: { fontSize: 13 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: BURGER_COLORS.cheeseDark,
  },
  title: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  search: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, height: '100%', fontSize: 14, color: COLORS.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
  },
  empty: { alignItems: 'center', paddingVertical: 44, gap: 8 },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
});
