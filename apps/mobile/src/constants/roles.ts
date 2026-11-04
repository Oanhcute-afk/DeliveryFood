import { UserRole } from '@food-delivery/types';

export const ROLES = [
  {
    label: 'Khách hàng',
    subtitle: 'Đặt món ngon dễ dàng',
    icon: 'fast-food-outline' as const,
    value: UserRole.CUSTOMER,
  },
  {
    label: 'Chủ nhà hàng',
    subtitle: 'Quản lý quán ăn của bạn',
    icon: 'restaurant-outline' as const,
    value: UserRole.RESTAURANT_OWNER,
  },
  {
    label: 'Tài xế',
    subtitle: 'Giao hàng và tăng thu nhập',
    icon: 'bicycle-outline' as const,
    value: UserRole.DRIVER,
  },
];
