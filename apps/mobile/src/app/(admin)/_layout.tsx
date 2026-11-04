import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 8);
  const tabHeight = (Platform.OS === 'ios' ? 52 : 54) + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#8B8289',
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
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="restaurants"
        options={{
          title: 'Nhà hàng',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'business' : 'business-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Tài xế',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bicycle' : 'bicycle-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: 'Khách hàng',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="vouchers"
        options={{
          title: 'Voucher',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'ticket' : 'ticket-outline'}
              size={21}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
