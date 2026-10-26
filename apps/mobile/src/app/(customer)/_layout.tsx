import { Stack } from 'expo-router';
import { View } from 'react-native';
import { NewVoucherToast } from '@/components/new-voucher-toast';
import { ChatFab } from '@/components/chat-fab';

export default function CustomerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="chat" />
      </Stack>
      <ChatFab />
      <NewVoucherToast />
    </View>
  );
}
