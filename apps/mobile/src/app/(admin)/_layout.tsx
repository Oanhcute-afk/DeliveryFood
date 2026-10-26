import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

export default function AdminLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Tổng quan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="dashboard" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="restaurants">
        <NativeTabs.Trigger.Label>Nhà hàng</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="storefront" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="drivers">
        <NativeTabs.Trigger.Label>Tài xế</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="car.fill" md="two_wheeler" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="customers">
        <NativeTabs.Trigger.Label>Khách hàng</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
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
