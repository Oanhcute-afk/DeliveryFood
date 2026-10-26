import { UserRole } from '@food-delivery/types';

export const ROLES = [
  {
    label: 'Customer',
    subtitle: 'Order delicious food',
    icon: 'fast-food-outline' as const,
    value: UserRole.CUSTOMER,
  },
  {
    label: 'Restaurant Owner',
    subtitle: 'Manage your restaurant',
    icon: 'restaurant-outline' as const,
    value: UserRole.RESTAURANT_OWNER,
  },
  {
    label: 'Driver',
    subtitle: 'Deliver and earn',
    icon: 'bicycle-outline' as const,
    value: UserRole.DRIVER,
  },
];
