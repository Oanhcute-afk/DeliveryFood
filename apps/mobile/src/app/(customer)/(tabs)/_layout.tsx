import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

export default function CustomerLayout() {
  const { tr } = useLanguage();

  return (
    <NativeTabs
      tintColor={BURGER_COLORS.primary}
      backgroundColor={BURGER_COLORS.background}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>
          {tr('Trang chủ', 'Home')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>
          {tr('Tìm kiếm', 'Search')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Label>
          {tr('Giỏ hàng', 'Cart')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag.fill" md="shopping_cart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Label>
          {tr('Đơn hàng', 'Orders')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox.fill" md="local_shipping" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>
          {tr('Tài khoản', 'Account')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="person.crop.circle.fill"
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
