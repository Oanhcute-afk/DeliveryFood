import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

export default function OwnerLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Label>Đơn hàng</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox.fill" md="local_shipping" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="menu">
        <NativeTabs.Trigger.Label>Thực đơn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="menucard.fill" md="restaurant_menu" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Label>Thống kê</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Tài khoản</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="person.crop.circle.fill"
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
