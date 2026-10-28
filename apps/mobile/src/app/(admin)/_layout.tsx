import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

export default function AdminLayout() {
  const { tr } = useLanguage();

  return (
    <NativeTabs
      tintColor={BURGER_COLORS.primary}
      backgroundColor={BURGER_COLORS.surface}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>
          {tr('Tổng quan', 'Overview')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="dashboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="restaurants">
        <NativeTabs.Trigger.Label>
          {tr('Nhà hàng', 'Restaurants')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="storefront" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="drivers">
        <NativeTabs.Trigger.Label>
          {tr('Tài xế', 'Drivers')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car.fill" md="two_wheeler" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="customers">
        <NativeTabs.Trigger.Label>
          {tr('Khách hàng', 'Customers')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="vouchers">
        <NativeTabs.Trigger.Label>
          {tr('Voucher', 'Vouchers')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ticket.fill" md="confirmation_number" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
