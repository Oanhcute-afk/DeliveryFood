import type { CustomerVoucher, Voucher } from '@food-delivery/types';
import { api } from '@/lib/axios';

const money = (n: number) => `$${n.toFixed(2).replace(/\.00$/, '')}`;

/** "20%" hoặc "$3" */
export function discountShort(
  v: Pick<Voucher, 'discountType' | 'discountValue'>,
) {
  const value = Number(v.discountValue);
  return v.discountType === 'PERCENT' ? `${value}%` : money(value);
}

/** "Giảm 20%, tối đa $5" */
export function discountText(v: Voucher) {
  const max =
    v.discountType === 'PERCENT' && v.maxDiscount != null
      ? `, tối đa ${money(Number(v.maxDiscount))}`
      : '';
  return `Giảm ${discountShort(v)}${max}`;
}

/** "Đơn từ $10 · HSD 30/11" */
export function conditionText(v: Voucher) {
  const parts: string[] = [];
  const min = Number(v.minOrderAmount);
  parts.push(min > 0 ? `Đơn từ ${money(min)}` : 'Mọi đơn hàng');
  if (v.expiresAt) {
    parts.push(
      `HSD ${new Date(v.expiresAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      })}`,
    );
  }
  return parts.join(' · ');
}

export interface LatestVoucher {
  id: string;
  code: string;
  title: string;
  discountLabel: string;
  minOrderAmount: number;
}

export const voucherApi = {
  available: (subtotal: number) =>
    api
      .get<{
        vouchers: CustomerVoucher[];
        bestVoucherId: string | null;
      }>('/vouchers/available', { params: { subtotal } })
      .then((r) => r.data),
  latest: () =>
    api.get<LatestVoucher | null>('/vouchers/latest').then((r) => r.data),
};
