import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

interface LanguageSwitchProps {
  /** 'compact' for top headers, 'card' for profile settings rows */
  variant?: 'compact' | 'card';
}

export function LanguageSwitch({ variant = 'compact' }: LanguageSwitchProps) {
  const { language, setLanguage, toggleLanguage, tr } = useLanguage();
  const isVi = language === 'vi';

  if (variant === 'card') {
    return (
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <View style={styles.cardIcon}>
            <Ionicons
              name="language-outline"
              size={20}
              color={BURGER_COLORS.primary}
            />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>
              {tr('Ngôn ngữ hiển thị', 'App Language')}
            </Text>
            <Text style={styles.cardSub}>
              {tr(
                'Đang dùng Tiếng Việt (VI)',
                'Currently using English (EN)',
              )}
            </Text>
          </View>
        </View>

        <View style={styles.track}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tiếng Việt"
            onPress={() => setLanguage('vi')}
            style={({ pressed }) => [
              styles.segment,
              isVi && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentText, isVi && styles.segmentTextActive]}>
              VI
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="English"
            onPress={() => setLanguage('en')}
            style={({ pressed }) => [
              styles.segment,
              !isVi && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.segmentText, !isVi && styles.segmentTextActive]}
            >
              EN
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: !isVi }}
      accessibilityLabel={tr(
        'Chuyển đổi ngôn ngữ Tiếng Việt hoặc Tiếng Anh',
        'Switch language between Vietnamese and English',
      )}
      onPress={toggleLanguage}
      style={({ pressed }) => [styles.track, pressed && styles.pressed]}
    >
      <View style={[styles.segment, isVi && styles.segmentActive]}>
        <Text style={[styles.segmentText, isVi && styles.segmentTextActive]}>
          VI
        </Text>
      </View>
      <View style={[styles.segment, !isVi && styles.segmentActive]}>
        <Text style={[styles.segmentText, !isVi && styles.segmentTextActive]}>
          EN
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BURGER_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segment: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: BURGER_COLORS.primary,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: BURGER_COLORS.muted,
    letterSpacing: 0.4,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BURGER_COLORS.surface,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BURGER_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BURGER_COLORS.text,
  },
  cardSub: {
    fontSize: 12,
    color: BURGER_COLORS.muted,
    marginTop: 2,
  },
});
