import { api } from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import { HealthCheckResponse } from '@food-delivery/types';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BURGER_COLORS } from '@/constants/theme';
import { LanguageSwitch } from '@/components/language-switch';
import { useLanguage } from '@/context/language-context';

export default function HomeScreen() {
  const { tr } = useLanguage();
  const {
    data: health,
    error,
    isLoading,
  } = useQuery<HealthCheckResponse>({
    queryKey: ['health'],
    queryFn: () =>
      api.get<HealthCheckResponse>('/health').then((res) => res.data),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <LanguageSwitch />
      </View>

      <View style={styles.center}>
        <Text style={styles.emoji}>🍔</Text>
        <Text style={styles.title}>DeliBurger</Text>
        <Text style={styles.subtitle}>
          {tr('Kiểm tra kết nối máy chủ', 'Server Connection Check')}
        </Text>

        {isLoading && (
          <ActivityIndicator size="large" color={BURGER_COLORS.primary} />
        )}

        {health && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {tr('Trạng thái API:', 'API Status:')} {health.status}
            </Text>
            <Text style={styles.timestampText}>
              {new Date(health.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {tr(
                'Không thể kết nối tới API. Máy chủ đã chạy chưa?',
                'Could not reach the API. Is the server running?',
              )}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGER_COLORS.background,
    padding: 22,
  },
  topRow: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: BURGER_COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: BURGER_COLORS.muted,
    marginBottom: 28,
  },
  statusBox: {
    backgroundColor: BURGER_COLORS.lettuceLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFE8D3',
  },
  statusText: {
    fontSize: 17,
    fontWeight: '800',
    color: BURGER_COLORS.lettuce,
  },
  timestampText: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: BURGER_COLORS.tomatoLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#F5C9C4',
  },
  errorText: {
    fontSize: 14,
    color: BURGER_COLORS.tomato,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '600',
  },
});
