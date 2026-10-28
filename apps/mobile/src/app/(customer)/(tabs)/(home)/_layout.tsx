import { Stack } from 'expo-router';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

export default function CustomerHomeLayout() {
  const { tr } = useLanguage();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="restaurant/[id]"
        options={{
          headerShown: true,
          title: tr('Thực đơn', 'Menu'),
          headerBackTitle: tr('Quay lại', 'Back'),
          headerStyle: { backgroundColor: BURGER_COLORS.background },
          headerTintColor: BURGER_COLORS.text,
          headerShadowVisible: false,
          headerRight: () => <LanguageSwitch />,
        }}
      />
    </Stack>
  );
}
