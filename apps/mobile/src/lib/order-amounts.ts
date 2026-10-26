import type { Order } from '@food-delivery/types';

type Amounts = Pick<Order, 'totalAmount' | 'subtotalAmount' | 'discountAmount'>;

/**
 * Số tiền nhà hàng nhận = giá gốc của món (trước voucher).
 * Voucher do app bù, nên không trừ vào tiền của nhà hàng.
 * Đơn cũ (trước khi có voucher) không có subtotal → dùng totalAmount.
 */
export const restaurantAmount = (order: Amounts) =>
  Number(order.subtotalAmount ?? order.totalAmount);

/** Số tiền app bù cho voucher của đơn này */
export const voucherSubsidy = (order: Amounts) =>
  Number(order.discountAmount ?? 0);
