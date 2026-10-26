import { Stack } from 'expo-router';
import { View } from 'react-native';
import { NewVoucherToast } from '@/components/new-voucher-toast';

export default function CustomerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order/[id]" />
      </Stack>
      <NewVoucherToast />
    </View>
  );
}
