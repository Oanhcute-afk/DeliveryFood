import { UserRole } from '@food-delivery/types';

export const ROLES = [
  {
<<<<<<< HEAD
    label: 'Khách hàng',
    subtitle: 'Đặt món ngon dễ dàng',
=======
    label: 'Customer',
    labelVi: 'Khách hàng',
    subtitle: 'Order delicious burgers & meals',
    subtitleVi: 'Đặt burger và món ngon giao tận nơi',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    icon: 'fast-food-outline' as const,
    value: UserRole.CUSTOMER,
  },
  {
<<<<<<< HEAD
    label: 'Chủ nhà hàng',
    subtitle: 'Quản lý quán ăn của bạn',
=======
    label: 'Restaurant Owner',
    labelVi: 'Chủ nhà hàng',
    subtitle: 'Manage your kitchen & menu',
    subtitleVi: 'Quản lý quán ăn và thực đơn của bạn',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    icon: 'restaurant-outline' as const,
    value: UserRole.RESTAURANT_OWNER,
  },
  {
<<<<<<< HEAD
    label: 'Tài xế',
    subtitle: 'Giao hàng và tăng thu nhập',
=======
    label: 'Driver',
    labelVi: 'Tài xế giao hàng',
    subtitle: 'Deliver orders & earn',
    subtitleVi: 'Nhận chuyến giao đồ ăn nhanh chóng',
>>>>>>> 34c1dbf3cba30d6b50dc1c6ca9b738432098a7c6
    icon: 'bicycle-outline' as const,
    value: UserRole.DRIVER,
  },
];
