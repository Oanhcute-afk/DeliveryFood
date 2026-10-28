import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

export default function DriverLayout() {
  const { tr } = useLanguage();

  return (
    <NativeTabs
      tintColor={BURGER_COLORS.primary}
      backgroundColor={BURGER_COLORS.background}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{tr('Trang chủ', 'Home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="active">
        <NativeTabs.Trigger.Label>{tr('Đang giao', 'Active')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car.fill" md="local_shipping" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>{tr('Lịch sử', 'History')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.fill" md="history" />
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
