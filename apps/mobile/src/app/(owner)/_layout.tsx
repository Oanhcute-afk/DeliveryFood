import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
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
  );
}
