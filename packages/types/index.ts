export const UserRole = {
    CUSTOMER: "CUSTOMER",
    RESTAURANT_OWNER: 'RESTAURANT_OWNER',
    DRIVER: 'DRIVER',
    ADMIN: 'ADMIN'
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

// Các role người dùng tự chọn khi đăng ký (ADMIN chỉ được tạo sẵn trên server)
export const SIGNUP_ROLES = [UserRole.CUSTOMER, UserRole.RESTAURANT_OWNER, UserRole.DRIVER] as const
export type SignupRole = typeof SIGNUP_ROLES[number]

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isBlocked?: boolean;
    createdAt: Date;
}

export interface HealthCheckResponse {
    status: string;
    timestamp: Date;
}

export interface JwtPayload {
    sub: string 
    email: string
    role: string
}

export interface RestaurantType {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  address: string;
  cuisineType: string;
  isOpen: boolean;
  rating: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantWithMenu {
  restaurant: RestaurantType;
  categories: MenuCategory[];
  items: MenuItem[];
}

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export interface CartItem {
  id: string;          // menuItem id
  name: string;
  price: string;
  imageUrl: string | null;
  restaurantId: string;
  restaurantName: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId: string | null;
  status: OrderStatus;
  totalAmount: string;
  subtotalAmount?: string | null;
  discountAmount?: string;
  voucherId?: string | null;
  voucherCode?: string | null;
  cancelReason?: string | null;
  deliveryAddress: string;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: string;
  unitPrice: string;
  createdAt: Date;
}
export const VoucherDiscountType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
} as const;

export type VoucherDiscountType =
  typeof VoucherDiscountType[keyof typeof VoucherDiscountType];

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: VoucherDiscountType;
  discountValue: string;
  maxDiscount: string | null;
  minOrderAmount: string;
  startsAt: string;
  expiresAt: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  isActive: boolean;
  createdAt: string;
}

/** Voucher kèm trạng thái áp dụng cho giỏ hàng hiện tại của khách */
export interface CustomerVoucher extends Voucher {
  eligible: boolean;
  /** Lý do không dùng được (khi eligible = false) */
  reason: string | null;
  /** Số tiền được giảm với tạm tính hiện tại */
  discount: number;
  usedByMe: number;
}
