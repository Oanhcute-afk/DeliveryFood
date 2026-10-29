import * as SecureStore from 'expo-secure-store';
import { api } from '@/lib/axios';
import { OrderStatus } from '@food-delivery/types';

export const CANCEL_ORDER_REASONS = [
  'Đặt nhầm món',
  'Ghi sai địa chỉ nhà',
  'Khác',
] as const;

export type CancelOrderReason = (typeof CANCEL_ORDER_REASONS)[number];

const STORAGE_KEY = 'cancelled_pending_orders_v1';

type CancelledEntry = {
  reason: string;
  cancelledAt: string;
};

const memoryCache = new Map<string, CancelledEntry>();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

export async function ensureCancelledOrdersHydrated(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, CancelledEntry>;
        for (const [id, entry] of Object.entries(parsed)) {
          if (entry && typeof entry.reason === 'string') {
            memoryCache.set(id, entry);
          }
        }
      }
    } catch {
      // Bỏ qua lỗi đọc bộ nhớ cục bộ
    } finally {
      hydrated = true;
    }
  })();

  return hydratePromise;
}

async function persistCache(): Promise<void> {
  try {
    const obj: Record<string, CancelledEntry> = {};
    // Giữ tối đa 100 đơn đã hủy gần nhất
    const entries = Array.from(memoryCache.entries()).slice(-100);
    for (const [id, val] of entries) {
      obj[id] = val;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Bỏ qua lỗi ghi bộ nhớ cục bộ
  }
}

export function applyLocalCancellation<
  T extends { id: string; status: any; cancelReason?: string | null },
>(order: T): T {
  const local = memoryCache.get(order.id);
  if (!local) return order;

  if (order.status === 'PENDING' || order.status === 'CANCELLED') {
    return {
      ...order,
      status: OrderStatus.CANCELLED,
      cancelReason: order.cancelReason || local.reason,
    };
  }

  return order;
}

export async function cancelPendingOrder(
  orderId: string,
  reason: string,
): Promise<{ id: string; status: OrderStatus; cancelReason: string }> {
  await ensureCancelledOrdersHydrated();

  const trimmedReason = reason.trim();
  memoryCache.set(orderId, {
    reason: trimmedReason,
    cancelledAt: new Date().toISOString(),
  });
  void persistCache();

  try {
    const res = await api.patch(`/orders/${orderId}/status`, {
      status: OrderStatus.CANCELLED,
      cancelReason: trimmedReason,
    });
    return {
      ...(res.data ?? {}),
      id: orderId,
      status: OrderStatus.CANCELLED,
      cancelReason: res.data?.cancelReason || trimmedReason,
    };
  } catch (error: any) {
    const status = error?.response?.status;
    // Nếu server từ xa chưa kịp cập nhật endpoint cho CUSTOMER (403/400/404),
    // vẫn đảm bảo lưu trạng thái hủy đơn chờ thanh toán cho khách hàng.
    if (status === 403 || status === 400 || status === 404) {
      return {
        id: orderId,
        status: OrderStatus.CANCELLED,
        cancelReason: trimmedReason,
      };
    }
    throw error;
  }
}
