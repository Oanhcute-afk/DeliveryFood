import { UserRole } from '@food-delivery/types';

export const ROLES = [
  {
    label: 'Customer',
    labelVi: 'Khách hàng',
    subtitle: 'Order delicious burgers & meals',
    subtitleVi: 'Đặt burger và món ngon giao tận nơi',
    icon: 'fast-food-outline' as const,
    value: UserRole.CUSTOMER,
  },
  {
    label: 'Restaurant Owner',
    labelVi: 'Chủ nhà hàng',
    subtitle: 'Manage your kitchen & menu',
    subtitleVi: 'Quản lý quán ăn và thực đơn của bạn',
    icon: 'restaurant-outline' as const,
    value: UserRole.RESTAURANT_OWNER,
  },
  {
    label: 'Driver',
    labelVi: 'Tài xế giao hàng',
    subtitle: 'Deliver orders & earn',
    subtitleVi: 'Nhận chuyến giao đồ ăn nhanh chóng',
    icon: 'bicycle-outline' as const,
    value: UserRole.DRIVER,
  },
];
