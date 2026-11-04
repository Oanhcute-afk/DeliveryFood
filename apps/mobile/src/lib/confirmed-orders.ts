import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'customer_confirmed_orders_v1';
const memoryCache = new Set<string>();
let hydrated = false;

export async function ensureConfirmedOrdersHydrated(): Promise<void> {
  if (hydrated) return;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => memoryCache.add(id));
      }
    }
  } catch {
    // Bỏ qua lỗi đọc bộ nhớ
  } finally {
    hydrated = true;
  }
}

export function isOrderConfirmedByCustomer(orderId: string): boolean {
  return memoryCache.has(orderId);
}

export async function markOrderConfirmedByCustomer(
  orderId: string,
): Promise<void> {
  memoryCache.add(orderId);
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify(Array.from(memoryCache)),
    );
  } catch {
    // Bỏ qua lỗi ghi bộ nhớ
  }
}

/**
 * Kiểm tra xem đơn hàng đã quá 1 ngày (24 giờ) kể từ khi cập nhật/giao hay chưa.
 * Nếu quá 1 ngày -> tự động xác nhận khách đã nhận đơn.
 */
export function isOrderAutoConfirmed(updatedAt?: string | Date): boolean {
  if (!updatedAt) return false;
  const updateTime = new Date(updatedAt).getTime();
  if (isNaN(updateTime)) return false;
  return Date.now() - updateTime > 24 * 60 * 60 * 1000;
}
