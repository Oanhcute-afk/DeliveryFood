import * as WebBrowser from 'expo-web-browser';
import { api } from '@/lib/axios';
import type { SignupRole } from '@food-delivery/types';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: SignupRole;
  isOnline: boolean;
  isBlocked: boolean;
  hasGoogle: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  deliveredCount: number;
  activeDeliveries: number;
  restaurantCount: number;
}

export interface AdminRestaurant {
  id: string;
  name: string;
  address: string;
  cuisineType: string;
  imageUrl: string | null;
  isOpen: boolean;
  rating: string | null;
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isBlocked: boolean;
  };
  orderCount: number;
  revenue: number;
}

export type AdminOverview =
  | {
      ok: true;
      users: {
        total: number;
        byRole: Partial<Record<string, number>>;
        new24h: number;
        googleLinked: number | null;
      };
      driversOnline: number;
      restaurants: { total: number; open: number };
      orders: {
        byStatus: Partial<Record<string, number>>;
        paid24h: number;
        paid7d: number;
        revenue24h: number;
        revenue7d: number;
        perDay: { day: string; count: number }[];
      };
    }
  | { ok: false; error: string };

export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview').then((r) => r.data),
  users: (role: SignupRole, search: string) =>
    api
      .get<AdminUser[]>('/admin/users', {
        params: { role, search: search || undefined },
      })
      .then((r) => r.data),
  setUserBlocked: (id: string, blocked: boolean) =>
    api
      .patch<{
        id: string;
        isBlocked: boolean;
      }>(`/admin/users/${id}/block`, { blocked })
      .then((r) => r.data),
  restaurants: (search: string) =>
    api
      .get<AdminRestaurant[]>('/admin/restaurants', {
        params: { search: search || undefined },
      })
      .then((r) => r.data),
  setRestaurantOpen: (id: string, isOpen: boolean) =>
    api
      .patch<{ id: string; isOpen: boolean }>(`/admin/restaurants/${id}`, {
        isOpen,
      })
      .then((r) => r.data),
};

export const formatUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    n,
  );

export const errorMessage = (error: any) => {
  const message =
    error?.response?.data?.message ?? error?.message ?? 'Có lỗi xảy ra';
  return Array.isArray(message) ? message.join('\n') : String(message);
};

// Trang monitor chạy trên web (server), đăng nhập lại bằng tài khoản admin
export function openMonitor() {
  void WebBrowser.openBrowserAsync(
    `${process.env.EXPO_PUBLIC_SERVER_URL}/monitor`,
  );
}
