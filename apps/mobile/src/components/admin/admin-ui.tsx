import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// Bảng màu dùng chung với các màn hình owner/driver
export const COLORS = {
  background: '#FFF9F5',
  surface: '#FFFFFF',
  primary: '#FF6B35',
  primaryDark: '#D94D20',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  textSoft: '#4A4249',
  muted: '#8B8289',
  faint: '#A49AA0',
  border: '#F0E8E3',
  green: '#16A36A',
  greenLight: '#E8F8F0',
  red: '#E5484D',
  redLight: '#FDEBEC',
  blue: '#3478F6',
  blueLight: '#EAF1FF',
};

export function ScreenHeader({
  eyebrow = 'QUẢN TRỊ',
  title,
  subtitle,
  emoji,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  emoji: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerIcon}>
        <Text style={styles.headerEmoji}>{emoji}</Text>
      </View>
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
      <Text style={styles.emptyEmoji}>🔍</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
    color: COLORS.primary,
    marginBottom: 6,
  },
  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: { fontSize: 26 },
  search: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 14,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 30 },
  emptyText: { fontSize: 13, color: COLORS.muted },
});
