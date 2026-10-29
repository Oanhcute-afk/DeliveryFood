import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = (
  process.env.EXPO_PUBLIC_SERVER_URL?.trim() ||
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') ||
  'https://deliveryfood-l3dv.onrender.com'
).replace(/\/+$/, '');

let socket: Socket | null = null;
let subscriberCount = 0;

function acquireSocket(): Socket {
  if (!socket) {
    socket = io(`${SERVER_URL}/orders`, {
      transports: ['websocket'], // force real WebSocket — skip HTTP long-polling
      autoConnect: false, // we connect manually when a screen needs it
    });
  }
  subscriberCount += 1;
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

function releaseSocket() {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

export function useOrderSocket(orderId: string | null) {
  const [orderUpdate, setOrderUpdate] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const s = acquireSocket();

    const joinRoom = () => {
      s.emit('join:order', orderId); // tell server to put us in order:<orderId> room
    };

    joinRoom();
    s.on('connect', joinRoom);

    // runs when server emits 'order:updated' — only accept updates for THIS order
    const handler = (data: { id?: string; [key: string]: unknown }) => {
      if (data.id === orderId) {
        setOrderUpdate({ ...data, _receivedAt: Date.now() });
      }
    };

    s.on('order:updated', handler);

    // cleanup on unmount — remove listener + release reference
    return () => {
      s.off('connect', joinRoom);
      s.off('order:updated', handler);
      releaseSocket();
    };
  }, [orderId]);

  return orderUpdate;
}

export function useRestaurantSocket(restaurantId: string | null) {
  const [orderUpdate, setOrderUpdate] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const s = acquireSocket();

    const joinRoom = () => {
      s.emit('join:restaurant', restaurantId);
    };

    joinRoom();
    s.on('connect', joinRoom);

    // any order update for this restaurant triggers an immediate update + refetch
    const handler = (data: Record<string, unknown>) => {
      setOrderUpdate({ ...data, _receivedAt: Date.now() });
    };

    s.on('order:updated', handler);

    return () => {
      s.off('connect', joinRoom);
      s.off('order:updated', handler);
      releaseSocket();
    };
  }, [restaurantId]);

  return orderUpdate; // screen calls invalidateQueries when this changes
}

export function useDriverLocationSocket(orderId: string | null) {
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const s = acquireSocket();

    const joinRoom = () => {
      s.emit('join:order', orderId);
    };

    joinRoom();
    s.on('connect', joinRoom);

    const handler = (data: { latitude: number; longitude: number }) => {
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude,
      });
    };

    s.on('driver:location', handler);

    return () => {
      s.off('connect', joinRoom);
      s.off('driver:location', handler);
      releaseSocket();
    };
  }, [orderId]);

  return driverLocation;
}
