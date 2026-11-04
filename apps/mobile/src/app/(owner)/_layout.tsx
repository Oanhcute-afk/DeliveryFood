import { Tabs } from 'expo-router';
import React from 'react';
<<<<<<< HEAD
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OwnerLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 8);
  const tabHeight = (Platform.OS === 'ios' ? 52 : 54) + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#8B8289',
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0E8E3',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="(index)"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="menu"
        options={{
          title: 'Thực đơn',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
=======
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

export default function OwnerLayout() {
  const { tr } = useLanguage();

  return (
    <NativeTabs
      tintColor={BURGER_COLORS.primary}
      backgroundColor={BURGER_COLORS.background}
    >
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Label>{tr('Đơn hàng', 'Orders')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox.fill" md="local_shipping" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="menu">
        <NativeTabs.Trigger.Label>{tr('Thực đơn', 'Menu')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="menucard.fill" md="restaurant_menu" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Label>{tr('Thống kê', 'Analytics')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{tr('Hồ sơ', 'Profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="person.crop.circle.fill"
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
  );
}
