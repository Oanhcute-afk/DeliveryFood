import * as Location from 'expo-location';
import { api } from '@/lib/axios';

export interface ChatCard {
  type: 'item' | 'restaurant';
  id: string;
  restaurantId: string;
  name: string;
  restaurantName: string;
  price: number | null;
  imageUrl: string | null;
  rating: number | null;
  isOpen: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: ChatCard[];
}

export interface ChatArea {
  street?: string;
  district?: string;
  subregion?: string;
  city?: string;
  region?: string;
}

export const chatApi = {
  send: (messages: ChatMessage[], location?: ChatArea) =>
    api
      .post<{ reply: string; cards: ChatCard[] }>(
        '/chat',
        {
          messages: messages.map(({ role, text }) => ({ role, text })),
          location,
        },
        // Gemini + tra cứu dữ liệu có thể mất vài giây
        { timeout: 45_000 },
      )
      .then((r) => r.data),
};

/**
 * Xin quyền vị trí và đổi toạ độ GPS → tên đường/quận/thành phố ngay trên máy.
 * Chỉ gửi tên khu vực lên server, không gửi toạ độ.
 */
export async function getCurrentArea(): Promise<ChatArea | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [place] = await Location.reverseGeocodeAsync(position.coords);
  if (!place) return null;

  return {
    street: place.street ?? undefined,
    district: place.district ?? undefined,
    subregion: place.subregion ?? undefined,
    city: place.city ?? undefined,
    region: place.region ?? undefined,
  };
}
