import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/lib/axios';
import { Order } from '@food-delivery/types';
import {
  useOrderSocket,
  useDriverLocationSocket,
  useOrderChatSocket,
} from '@/hooks/use-order-socket';
import { useAuth } from '@/context/auth-context';
import { RatingModal } from '@/components/rating-modal';
import { CancelOrderModal } from '@/components/cancel-order-modal';
import { OrderChatModal } from '@/components/OrderChatModal';
import {
  ensureConfirmedOrdersHydrated,
  isOrderConfirmedByCustomer,
  markOrderConfirmedByCustomer,
  isOrderAutoConfirmed,
} from '@/lib/confirmed-orders';
import {
  applyLocalCancellation,
  cancelPendingOrder,
  ensureCancelledOrdersHydrated,
  type CancelOrderReason,
} from '@/lib/cancelled-orders';

const COLORS = {
  background: '#FFF9F5',
  surface: '#FFFFFF',
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3478F6',
  blueLight: '#EAF2FF',
  purple: '#8B5CF6',
  purpleLight: '#F1EBFF',
  grayLight: '#F5F1EE',
};

const STATUS_STEPS = [
  { key: 'CONFIRMED', label: 'Đơn hàng đã xác nhận', icon: 'checkmark-circle' as const },
  { key: 'PREPARING', label: 'Nhà hàng đang chuẩn bị', icon: 'restaurant' as const },
  { key: 'READY', label: 'Món ăn đã sẵn sàng', icon: 'fast-food' as const },
  { key: 'PICKED_UP', label: 'Tài xế đang giao hàng', icon: 'bicycle' as const },
  { key: 'DELIVERED', label: 'Giao hàng thành công', icon: 'gift' as const },
];

const STATUS_ORDER = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'DELIVERED',
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  READY: 'Chờ tài xế lấy hàng',
  PICKED_UP: 'Đang giao hàng',
  DELIVERED: 'Đã giao thành công',
  CANCELLED: 'Đã hủy',
};

type DriverLocation = {
  latitude: number;
  longitude: number;
};

function isValidLocation(location: DriverLocation | null | undefined) {
  if (!location) return false;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function createOpenStreetMapHtml(location: DriverLocation) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!isValidLocation(location)) {
    return `<!doctype html><html><body style="font-family:sans-serif;padding:20px">Vị trí tài xế không hợp lệ.</body></html>`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    html, body, #map {
      height:100%; width:100%; margin:0; padding:0; background:#f5f1ee;
    }
    .driver-pin {
      display:flex; align-items:center; justify-content:center;
      width:40px; height:40px; border-radius:20px;
      background:#FF6B35; border:3px solid #FFFFFF;
      font-size:21px; box-shadow:0 3px 10px rgba(0,0,0,.28);
    }
    .leaflet-control-attribution { font-size:9px !important; }
    #map-error {
      display:none; position:absolute; z-index:1000; left:12px; right:12px; bottom:35px;
      padding:12px; border-radius:12px; background:#fff; color:#a11; font:14px sans-serif;
      box-shadow:0 2px 10px rgba(0,0,0,.1);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="map-error">Không tải được bản đồ. Hãy kiểm tra Internet hoặc DNS trên điện thoại.</div>
  <script>
    (function () {
      var driver = [${latitude}, ${longitude}];
      var errorBox = document.getElementById('map-error');
      var map;
      var marker;

      function showError() {
        errorBox.style.display = 'block';
      }

      function updateLocation(event) {
        try {
          var next = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!next || next.type !== 'DRIVER_LOCATION') return;

          var lat = Number(next.latitude);
          var lng = Number(next.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
              Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

          driver = [lat, lng];

          if (map && marker) {
            marker.setLatLng(driver);
            map.panTo(driver, { animate: true });
          }
        } catch (e) {}
      }

      window.addEventListener('message', updateLocation);
      document.addEventListener('message', updateLocation);

      function initMap() {
        if (!window.L) {
          showError();
          return;
        }

        map = L.map('map', { zoomControl: true }).setView(driver, 16);

        var googleTiles = L.tileLayer(
          'https://{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
          {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
          }
        );

        var osmFallback = L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }
        );

        var switchedToFallback = false;
        googleTiles.on('tileerror', function () {
          if (!switchedToFallback && map) {
            switchedToFallback = true;
            map.removeLayer(googleTiles);
            osmFallback.addTo(map);
          }
        });
        googleTiles.on('tileload', function () {
          errorBox.style.display = 'none';
        });
        googleTiles.addTo(map);

        var driverIcon = L.divIcon({
          className: '',
          html: '<div class="driver-pin">🛵</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        marker = L.marker(driver, { icon: driverIcon })
          .addTo(map)
          .bindPopup('Tài xế của bạn đang trên đường giao hàng');

        setTimeout(function () { map.invalidateSize(); }, 250);
      }

      function loadScript(src, onSuccess, onError) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = onSuccess;
        script.onerror = onError;
        document.head.appendChild(script);
      }

      loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
        initMap,
        function () {
          loadScript(
            'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js',
            initMap,
            showError
          );
        }
      );
    })();
  </script>
</body>
</html>`;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'CONFIRMED':
    case 'DELIVERED':
      return {
        backgroundColor: COLORS.successLight,
        color: COLORS.success,
      };
    case 'PREPARING':
      return {
        backgroundColor: COLORS.purpleLight,
        color: COLORS.purple,
      };
    case 'READY':
      return {
        backgroundColor: COLORS.blueLight,
        color: COLORS.blue,
      };
    case 'PICKED_UP':
      return {
        backgroundColor: COLORS.primaryLight,
        color: COLORS.primary,
      };
    case 'CANCELLED':
      return {
        backgroundColor: COLORS.dangerLight,
        color: COLORS.danger,
      };
    default:
      return {
        backgroundColor: COLORS.primaryLight,
        color: COLORS.primary,
      };
  }
}

export default function OrderConfirmationScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const queryClient = useQueryClient();
  const orderUpdate = useOrderSocket(id ?? null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const mapWebViewRef = useRef<WebView | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const { user } = useAuth();
  const [isConfirmedReceived, setIsConfirmedReceived] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastDriverMessage, setLastDriverMessage] = useState<string | null>(null);

  useOrderChatSocket(id ?? null, (msg) => {
    if (msg && msg.senderRole === 'DRIVER') {
      if (!isChatVisible) {
        setUnreadChatCount((prev) => prev + 1);
        setLastDriverMessage(msg.content);
      }
    }
  });

  useEffect(() => {
    if (isChatVisible) {
      setUnreadChatCount(0);
      setLastDriverMessage(null);
    }
  }, [isChatVisible]);

  useEffect(() => {
    if (!id) return;
    ensureConfirmedOrdersHydrated().then(() => {
      setIsConfirmedReceived(isOrderConfirmedByCustomer(id));
    });
  }, [id]);

  const handleConfirmReceived = async () => {
    if (!id) return;
    await markOrderConfirmedByCustomer(id);
    setIsConfirmedReceived(true);
    try {
      await api.post(`/orders/${id}/confirm-received`);
    } catch {
      // Bỏ qua lỗi mạng, đã lưu local
    }
    queryClient.setQueryData(['order', id], (old: any) => ({
      ...(old ?? {}),
      customerConfirmedAt: new Date(),
      status: 'DELIVERED',
    }));
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    Alert.alert(
      'Xác nhận thành công',
      'Cảm ơn bạn đã xác nhận đã nhận được món ăn! Chúc bạn có một bữa ăn ngon miệng.',
    );
    setShowRatingModal(true);
  };


  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [cachedDriverLocation, setCachedDriverLocation] =
    useState<DriverLocation | null>(null);

  useEffect(() => {
    if (!orderUpdate || !id) return;

    queryClient.setQueryData(['order', id], (old: unknown) => {
      const merged = {
        ...((old && typeof old === 'object') ? old : {}),
        ...orderUpdate,
      } as unknown as Order & { items: any[] };
      return merged.id ? applyLocalCancellation(merged) : merged;
    });
    queryClient.invalidateQueries({ queryKey: ['my-orders'] });
  }, [orderUpdate, id, queryClient]);

  const {
    data: order,
    isLoading,
    isPending,
    isError,
    refetch,
  } = useQuery<Order & { items: any[] }>({
    queryKey: ['order', id],
    queryFn: async () => {
      await ensureCancelledOrdersHydrated();
      const r = await api.get<Order & { items: any[] }>(`/orders/${id}`);
      return applyLocalCancellation(r.data);
    },
    enabled: !!id,
    refetchInterval: 4000,
  });

  const isAutoConfirmed = useMemo(() => {
    return isOrderAutoConfirmed(order?.updatedAt);
  }, [order?.updatedAt]);

  const driver = (order as any)?.driver;
  const driverName = driver
    ? `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() || 'Tài xế giao hàng'
    : 'Tài xế giao hàng';
  const driverPhone = driver?.phone ?? null;

  function handleCallDriver() {
    if (!driverPhone?.trim()) {
      Alert.alert(
        'Chưa có số điện thoại',
        'Tài xế chưa cập nhật số điện thoại. Bạn có thể bấm "Nhắn tin trao đổi" để chat trực tiếp nhé!',
      );
      return;
    }
    const cleanPhone = driverPhone.trim().replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng cuộc gọi.');
    });
  }

  const { mutate: cancelOrder, isPending: isCancellingOrder } = useMutation({
    mutationFn: (reason: CancelOrderReason) =>
      cancelPendingOrder(order!.id, reason),
    onSuccess: (result) => {
      setShowCancelModal(false);
      queryClient.setQueryData(['order', id], (old: unknown) => ({
        ...((old && typeof old === 'object') ? old : order),
        status: 'CANCELLED',
        cancelReason: result.cancelReason,
      }));
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      Alert.alert(
        'Hủy đơn thành công',
        `Đơn hàng chờ thanh toán đã được hủy thành công.\nLý do: ${result.cancelReason}`,
      );
    },
    onError: (e: any) => {
      Alert.alert(
        'Không thể hủy đơn',
        e?.response?.data?.message ?? 'Vui lòng thử lại sau.',
      );
    },
  });

  useEffect(() => {
    if (!id || order?.status !== 'DELIVERED') return;

    api
      .get<{ reviewed: boolean }>(`/reviews/order/${id}/status`)
      .then((r) => {
        if (r.data.reviewed) setRatingSubmitted(true);
      })
      .catch(() => {});
  }, [id, order?.status]);

  useEffect(() => {
    if (order?.status !== 'DELIVERED' || ratingSubmitted) return;

    const timer = setTimeout(() => setShowRatingModal(true), 1200);
    return () => clearTimeout(timer);
  }, [order?.status, ratingSubmitted]);

  const { mutate: submitReview, isPending: isSubmittingReview } = useMutation({
    mutationFn: (data: {
      restaurantRating: number;
      driverRating?: number;
      comment?: string;
    }) => api.post('/reviews', { orderId: id, ...data }),

    onSuccess: () => {
      setShowRatingModal(false);
      setRatingSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },

    onError: () => {
      Alert.alert('Không gửi được đánh giá', 'Vui lòng thử lại sau.');
    },
  });

  const liveDriverLocation = useDriverLocationSocket(
    order?.status === 'PICKED_UP' ? (id ?? null) : null,
  );

  useEffect(() => {
    if (!id || order?.status !== 'PICKED_UP') return;

    const fetchLocation = () => {
      api
        .get<DriverLocation | null>(`/location/${id}`)
        .then((r) => {
          if (isValidLocation(r.data)) {
            setCachedDriverLocation({
              latitude: Number(r.data!.latitude),
              longitude: Number(r.data!.longitude),
            });
          }
        })
        .catch(() => {});
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 4000);
    return () => clearInterval(interval);
  }, [id, order?.driverId, order?.status]);

  const driverLocation =
    liveDriverLocation ??
    cachedDriverLocation ??
    (order?.status === 'PICKED_UP'
      ? { latitude: 10.7769, longitude: 106.7009 }
      : null);

  const showMap =
    order?.status === 'PICKED_UP' && isValidLocation(driverLocation);

  const mapHtml = useMemo(
    () =>
      showMap && driverLocation
        ? createOpenStreetMapHtml(driverLocation)
        : '',
    // Chỉ khởi tạo lại HTML khi bản đồ chuyển sang trạng thái hiển thị.
    // Các cập nhật vị trí tiếp theo được gửi qua WebView postMessage.
    [showMap],
  );

  useEffect(() => {
    if (!showMap || !driverLocation || !mapLoaded) return;

    const payload = JSON.stringify({
      type: 'DRIVER_LOCATION',
      latitude: Number(driverLocation.latitude),
      longitude: Number(driverLocation.longitude),
    });

    mapWebViewRef.current?.postMessage(payload);
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    mapLoaded,
    showMap,
  ]);

  function handleMapMessage(event: WebViewMessageEvent) {
    // Giữ handler để có thể nhận thông điệp từ bản đồ trong tương lai.
    void event;
  }

  async function handlePayment() {
    if (!order || paymentLoading) return;

    setPaymentLoading(true);

    try {
      const res = await api.post<{ clientSecret: string }>(
        '/payments/intent',
        { orderId: order.id },
      );

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'DeliFood',
        paymentIntentClientSecret: res.data.clientSecret,
      });

      if (initError) {
        Alert.alert('Không thể khởi tạo thanh toán', initError.message);
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert('Thanh toán thất bại', paymentError.message);
        return;
      }

      // Cập nhật ngay trạng thái CONFIRMED trên giao diện sau khi Stripe PaymentSheet hoàn tất
      queryClient.setQueryData(['order', id], (old: unknown) => ({
        ...((old && typeof old === 'object') ? old : order),
        status: 'CONFIRMED',
      }));
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });

      Alert.alert(
        'Thanh toán thành công',
        'Nhà hàng đang chuẩn bị đơn hàng.',
      );

      // Đồng bộ ngầm với server sau khi webhook Stripe xử lý xong
      void (async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const result = await refetch();
          if (result.data?.status && result.data.status !== 'PENDING') {
            break;
          }
        }
      })();
    } catch (error: any) {
      Alert.alert(
        'Có lỗi xảy ra',
        error?.response?.data?.message ?? 'Vui lòng thử lại sau.',
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  if (!id || isLoading || (isPending && !isError)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.centered}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
        >
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
          <Text style={styles.loadingTitle}>Đang tải đơn hàng</Text>
          <Text style={styles.loadingText}>
            Vui lòng đợi trong giây lát...
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.centered}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
        >
          <View style={styles.errorIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={42}
              color={COLORS.danger}
            />
          </View>

          <Text style={styles.errorTitle}>Không tải được đơn hàng</Text>
          <Text style={styles.errorText}>
            Kiểm tra kết nối mạng rồi thử lại nhé.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => void refetch()}
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Thử tải lại</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace('/(customer)/(tabs)/(home)')}
          >
            <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const statusStyle = getStatusStyle(order.status);

  const heroTitle =
    order.status === 'CANCELLED'
      ? 'Đơn hàng đã bị hủy'
      : order.status === 'DELIVERED'
        ? 'Giao hàng thành công!'
        : order.status === 'PENDING'
          ? 'Chờ thanh toán'
          : order.status === 'CONFIRMED'
            ? 'Đơn hàng đã xác nhận!'
            : 'Đơn hàng đang được xử lý';

  const heroSubtitle =
    order.status === 'CANCELLED'
      ? order.cancelReason
        ? `Lý do hủy: ${order.cancelReason}`
        : 'Đơn hàng này đã bị hủy.'
      : order.status === 'DELIVERED'
        ? 'Cảm ơn bạn đã đặt món cùng DeliFood.'
        : order.status === 'PENDING'
          ? 'Hoàn tất thanh toán để nhà hàng bắt đầu chuẩn bị món.'
          : order.status === 'PICKED_UP'
            ? 'Tài xế đang trên đường mang món ăn đến cho bạn.'
            : 'Theo dõi tiến trình đơn hàng của bạn ngay bên dưới.';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={true}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace('/(customer)/(tabs)/(home)')}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </Pressable>

          <Text style={styles.topBarTitle}>Chi tiết đơn hàng</Text>

          <Pressable
            style={styles.refreshButton}
            onPress={() => void refetch()}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.text}
            />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              order.status === 'CANCELLED' && styles.heroIconCancelled,
              order.status === 'DELIVERED' && styles.heroIconDelivered,
              order.status === 'PENDING' && styles.heroIconPending,
            ]}
          >
            <Text style={styles.heroEmoji}>
              {order.status === 'CANCELLED'
                ? '✕'
                : order.status === 'DELIVERED'
                  ? '🎉'
                  : order.status === 'PENDING'
                    ? '💳'
                    : order.status === 'PICKED_UP'
                      ? '🛵'
                      : '🍔'}
            </Text>
          </View>

          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusStyle.backgroundColor },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusStyle.color },
              ]}
            />
            <Text style={[styles.statusPillText, { color: statusStyle.color }]}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
          </View>
        </View>

        {/* Tên tiệm của món ăn */}
        <View style={styles.restaurantBannerCard}>
          <View style={styles.restaurantBannerIcon}>
            <Ionicons name="restaurant" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.restaurantBannerEyebrow}>TIỆM LÀM MÓN</Text>
            <Text style={styles.restaurantBannerName}>
              {(order as any)?.restaurant?.name || 'Nhà hàng đối tác'}
            </Text>
            {(order as any)?.restaurant?.address ? (
              <Text style={styles.restaurantBannerAddress} numberOfLines={1}>
                📍 {(order as any).restaurant.address}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Thông tin tài xế & Liên hệ Chat / Gọi điện */}
        {order.driverId || (order as any)?.driver || ['READY', 'PICKED_UP'].includes(order.status) ? (
          <View style={styles.driverContactCard}>
            <View style={styles.driverContactHeader}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>
                  {driverName?.[0]?.toUpperCase() ?? 'T'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverEyebrow}>TÀI XẾ GIAO HÀNG</Text>
                <Text style={styles.driverName}>{driverName}</Text>
                {driverPhone ? (
                  <Text style={styles.driverPhone}>📞 {driverPhone}</Text>
                ) : (
                  <Text style={[styles.driverPhone, { color: COLORS.muted }]}>
                    Chưa cập nhật SĐT (Nhắn tin qua khung chat)
                  </Text>
                )}
              </View>
              {unreadChatCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadChatCount} tin mới
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.contactButtonsRow}>
              <Pressable
                style={[styles.contactBtn, styles.callBtn]}
                onPress={handleCallDriver}
              >
                <Ionicons name="call" size={17} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Gọi shipper</Text>
              </Pressable>

              <Pressable
                style={[styles.contactBtn, styles.chatBtn]}
                onPress={() => setIsChatVisible(true)}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={17}
                  color={COLORS.primary}
                />
                <Text style={styles.chatBtnText}>Nhắn tin với shipper</Text>
                {unreadChatCount > 0 ? (
                  <View style={styles.chatBtnBadge}>
                    <Text style={styles.chatBtnBadgeText}>
                      {unreadChatCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.orderCard}>
          <View style={styles.orderCardHeader}>
            <View style={styles.orderCardIcon}>
              <Ionicons
                name="receipt-outline"
                size={23}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.orderCardHeading}>
              <Text style={styles.cardTitle}>Thông tin đơn hàng</Text>
              <Text style={styles.orderId}>
                Mã đơn #{order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>

            <Ionicons
              name={
                order.status === 'CANCELLED'
                  ? 'close-circle'
                  : 'checkmark-circle'
              }
              size={23}
              color={
                order.status === 'CANCELLED' ? COLORS.danger : COLORS.success
              }
            />
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Tổng tiền đơn hàng</Text>
              <Text style={styles.amount}>
                ${Number(order.totalAmount).toFixed(2)}
              </Text>
              {Number(order.discountAmount ?? 0) > 0 ? (
                <Text style={styles.discountNote}>
                  Đã giảm ${Number(order.discountAmount).toFixed(2)}
                  {order.voucherCode ? ` với voucher ${order.voucherCode}` : ''}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Địa chỉ cụ thể</Text>
              <Text style={styles.infoValue}>
                {order.deliveryAddress || 'Chưa có địa chỉ'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="time-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Trạng thái hiện tại</Text>
              <Text style={styles.infoValue}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons
                name={order.paymentMethod === 'CASH' ? 'cash-outline' : 'card-outline'}
                size={20}
                color={order.paymentMethod === 'CASH' ? COLORS.success : COLORS.primary}
              />
            </View>

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Hình thức thanh toán</Text>
              <Text style={styles.infoValue}>
                {order.paymentMethod === 'CASH'
                  ? 'Tiền mặt khi nhận hàng (COD)'
                  : 'Thanh toán trực tuyến (Stripe)'}
              </Text>
              {order.paymentMethod === 'CASH' ? (
                <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 2, fontWeight: '700' }}>
                  {order.isPaid ? '✓ Đã thanh toán cho tài xế' : 'Vui lòng chuẩn bị tiền mặt trả shipper'}
                </Text>
              ) : null}
            </View>
          </View>

          {order.status === 'CANCELLED' && order.cancelReason ? (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, styles.cancelReasonIcon]}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Lý do hủy đơn</Text>
                <Text style={[styles.infoValue, { color: COLORS.danger }]}>
                  {order.cancelReason}
                </Text>
              </View>
            </View>
          ) : null}

          {Array.isArray(order.items) && order.items.length > 0 ? (
            <View style={styles.orderedItemsBox}>
              <View style={styles.orderedItemsHeader}>
                <Ionicons
                  name="fast-food-outline"
                  size={17}
                  color={COLORS.primary}
                />
                <Text style={styles.orderedItemsTitle}>
                  Món đã đặt ({order.items.length})
                </Text>
              </View>

              {order.items.map((item: any, idx: number) => {
                const qty = Number(item.quantity ?? 1);
                const unitPrice = Number(
                  item.unitPrice ?? item.menuItem?.price ?? 0,
                );
                const itemName =
                  item.menuItem?.name ?? item.name ?? `Món ăn #${idx + 1}`;
                return (
                  <View key={item.id ?? idx} style={styles.orderedItemRow}>
                    <View style={styles.orderedItemQtyBadge}>
                      <Text style={styles.orderedItemQtyText}>{qty}x</Text>
                    </View>
                    <Text style={styles.orderedItemName} numberOfLines={2}>
                      {itemName}
                    </Text>
                    {unitPrice > 0 ? (
                      <Text style={styles.orderedItemPrice}>
                        ${(unitPrice * qty).toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Khách hàng xác nhận đã nhận đơn hàng */}
        {order.status === 'DELIVERED' && (
          <View style={styles.receivedConfirmCard}>
            <View style={styles.receivedConfirmHeader}>
              <View
                style={[
                  styles.receivedConfirmIconWrap,
                  (isConfirmedReceived || isAutoConfirmed) &&
                    styles.receivedConfirmIconWrapActive,
                ]}
              >
                <Ionicons
                  name={
                    isConfirmedReceived || isAutoConfirmed
                      ? 'checkmark-done-circle'
                      : 'checkbox-outline'
                  }
                  size={24}
                  color={
                    isConfirmedReceived || isAutoConfirmed
                      ? COLORS.success
                      : COLORS.primary
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.receivedConfirmTitle}>
                  {isConfirmedReceived
                    ? 'Đã xác nhận nhận đơn hàng'
                    : isAutoConfirmed
                    ? 'Đã nhận đơn hàng (Tự động)'
                    : 'Xác nhận đã nhận đơn hàng'}
                </Text>
                <Text style={styles.receivedConfirmSubtitle}>
                  {isConfirmedReceived
                    ? 'Bạn đã xác nhận nhận món ăn thành công.'
                    : isAutoConfirmed
                    ? 'Hệ thống đã tự động xác nhận bạn đã nhận đơn sau 1 ngày (24 giờ).'
                    : 'Không bắt buộc tick. Nếu sau 1 ngày bạn không tick, hệ thống sẽ tự động xác nhận.'}
                </Text>
              </View>
            </View>

            {!isConfirmedReceived && !isAutoConfirmed && (
              <Pressable
                style={({ pressed }) => [
                  styles.confirmReceivedBtn,
                  pressed && styles.pressed,
                ]}
                onPress={handleConfirmReceived}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.confirmReceivedBtnText}>
                  Tôi đã nhận được món ăn
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {order.status === 'PENDING' && (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIcon}>
                <Ionicons
                  name="card-outline"
                  size={24}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.paymentHeaderText}>
                <Text style={styles.paymentTitle}>Hoàn tất thanh toán</Text>
                <Text style={styles.paymentSubtitle}>
                  Thanh toán an toàn để xác nhận đơn hàng.
                </Text>
              </View>
            </View>

            <View style={styles.paymentAmountRow}>
              <Text style={styles.paymentAmountLabel}>Số tiền cần thanh toán</Text>
              <Text style={styles.paymentAmount}>
                ${Number(order.totalAmount).toFixed(2)}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                paymentLoading && styles.disabledButton,
                pressed && !paymentLoading && styles.pressed,
              ]}
              onPress={() => void handlePayment()}
              disabled={paymentLoading || isCancellingOrder}
            >
              {paymentLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.primaryButtonText}>
                {paymentLoading ? 'Đang xử lý...' : 'Thanh toán ngay'}
              </Text>

              {!paymentLoading && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cancelOrderButton,
                (paymentLoading || isCancellingOrder) && styles.disabledButton,
                pressed && !paymentLoading && !isCancellingOrder && styles.pressed,
              ]}
              onPress={() => setShowCancelModal(true)}
              disabled={paymentLoading || isCancellingOrder}
            >
              <Ionicons
                name="close-circle-outline"
                size={19}
                color={COLORS.danger}
              />
              <Text style={styles.cancelOrderButtonText}>
                Hủy đơn chờ thanh toán
              </Text>
            </Pressable>

            <View style={styles.secureNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={COLORS.muted}
              />
              <Text style={styles.secureNoteText}>
                Thanh toán được xử lý qua Stripe
              </Text>
            </View>
          </View>
        )}

        {showMap && driverLocation && (
          <View style={styles.mapCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="navigate-circle-outline"
                  size={24}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Theo dõi tài xế</Text>
                <Text style={styles.sectionSubtitle}>
                  Vị trí cập nhật theo dữ liệu nhận được
                </Text>
              </View>

              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>TRỰC TIẾP</Text>
              </View>
            </View>

            <View style={styles.map}>
              <WebView
                ref={mapWebViewRef as any}
                originWhitelist={['*']}
                source={{ html: mapHtml, baseUrl: 'https://maps.google.com' }}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                setSupportMultipleWindows={false}
                mixedContentMode="always"
                onLoadEnd={() => {
                  setMapLoaded(true);
                  setMapLoadFailed(false);
                }}
                onError={() => {
                  setMapLoadFailed(true);
                  setMapLoaded(false);
                }}
                onMessage={handleMapMessage}
              />

              {mapLoadFailed && (
                <View style={styles.mapErrorOverlay}>
                  <View style={styles.mapErrorIcon}>
                    <Ionicons
                      name="map-outline"
                      size={30}
                      color={COLORS.danger}
                    />
                  </View>

                  <Text style={styles.mapErrorTitle}>
                    Không thể tải bản đồ
                  </Text>

                  <Text style={styles.mapErrorText}>
                    Kiểm tra kết nối Internet. Bản đồ cần tải Leaflet và dữ
                    liệu từ OpenStreetMap.
                  </Text>

                  <Pressable
                    style={styles.mapRetryButton}
                    onPress={() => {
                      setMapLoaded(false);
                      setMapLoadFailed(false);
                      mapWebViewRef.current?.reload();
                    }}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text style={styles.mapRetryText}>Tải lại bản đồ</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.mapFooter}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.muted}
              />
              <Text style={styles.mapAttribution}>
                Bản đồ © OpenStreetMap contributors
              </Text>
            </View>
          </View>
        )}

        {order.status === 'CANCELLED' ? (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIcon}>
              <Ionicons
                name="close-circle-outline"
                size={28}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.cancelledTextContainer}>
              <Text style={styles.cancelledTitle}>Đơn hàng đã bị hủy</Text>
              {order.cancelReason ? (
                <Text style={styles.cancelledReasonText}>
                  Lý do: {order.cancelReason}
                </Text>
              ) : null}
              <Text style={styles.cancelledDescription}>
                Bạn có thể quay lại trang chủ để chọn món khác.
              </Text>
            </View>
          </View>
        ) : order.status !== 'PENDING' ? (
          <View style={styles.trackerCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="git-commit-outline"
                  size={24}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Tiến trình đơn hàng</Text>
                <Text style={styles.sectionSubtitle}>
                  Cập nhật trạng thái đơn của bạn
                </Text>
              </View>
            </View>

            <View style={styles.tracker}>
              {STATUS_STEPS.map((step, index) => {
                const isCompleted =
                  currentIndex >= 0 && index <= currentIndex;
                const isActive = index === currentIndex;

                return (
                  <View key={step.key} style={styles.step}>
                    <View style={styles.stepLeft}>
                      <View
                        style={[
                          styles.stepCircle,
                          isCompleted && styles.stepCircleCompleted,
                          isActive && styles.stepCircleActive,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={18}
                          color={
                            isActive
                              ? '#FFFFFF'
                              : isCompleted
                                ? COLORS.success
                                : '#B8ADB4'
                          }
                        />
                      </View>

                      {index < STATUS_STEPS.length - 1 && (
                        <View
                          style={[
                            styles.stepLine,
                            isCompleted &&
                              index < currentIndex &&
                              styles.stepLineCompleted,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stepContent}>
                      <Text
                        style={[
                          styles.stepLabel,
                          isCompleted && styles.stepLabelCompleted,
                          isActive && styles.stepLabelActive,
                        ]}
                      >
                        {step.label}
                      </Text>

                      {isActive && (
                        <Text style={styles.stepCurrent}>
                          Trạng thái hiện tại
                        </Text>
                      )}
                    </View>

                    {isCompleted && (
                      <Ionicons
                        name="checkmark-circle"
                        size={19}
                        color={COLORS.success}
                        style={styles.stepCheck}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {order.status === 'DELIVERED' && ratingSubmitted && (
          <View style={styles.reviewedCard}>
            <View style={styles.reviewedIcon}>
              <Ionicons name="star" size={23} color="#F59E0B" />
            </View>
            <View style={styles.reviewedTextContainer}>
              <Text style={styles.reviewedTitle}>Cảm ơn bạn đã đánh giá!</Text>
              <Text style={styles.reviewedSubtitle}>
                Ý kiến của bạn giúp chúng tôi phục vụ tốt hơn.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.homeButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace('/(customer)/(tabs)/(home)')}
        >
          <Ionicons name="home-outline" size={20} color={COLORS.primary} />
          <Text style={styles.homeButtonText}>Quay về trang chủ</Text>
          <Ionicons
            name="arrow-forward"
            size={19}
            color={COLORS.primary}
          />
        </Pressable>

        <View style={styles.bottomNote}>
          <Ionicons
            name="heart"
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.bottomNoteText}>
            Cảm ơn bạn đã lựa chọn DeliFood
          </Text>
        </View>

        <CancelOrderModal
          visible={showCancelModal}
          isSubmitting={isCancellingOrder}
          onClose={() => setShowCancelModal(false)}
          onConfirm={(reason) => cancelOrder(reason)}
        />

        <RatingModal
          visible={showRatingModal}
          hasDriver={!!order.driverId}
          onSubmit={submitReview}
          onDismiss={() => {
            setShowRatingModal(false);
            setRatingSubmitted(true);
          }}
          isSubmitting={isSubmittingReview}
        />

        <OrderChatModal
          visible={isChatVisible}
          onClose={() => setIsChatVisible(false)}
          orderId={order.id}
          currentUserRole="CUSTOMER"
          currentUserId={order.customerId}
          currentUserName={
            user
              ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
              : 'Khách hàng'
          }
          otherPartyName={driverName}
          otherPartyPhone={driverPhone}
          otherPartyRoleTitle="Tài xế giao hàng"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 18,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 26,
  },

  heroIcon: {
    width: 112,
    height: 112,
    borderRadius: 38,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  heroIconCancelled: {
    backgroundColor: COLORS.dangerLight,
  },

  heroIconDelivered: {
    backgroundColor: COLORS.successLight,
  },

  heroIconPending: {
    backgroundColor: '#FFF3D9',
  },

  heroEmoji: {
    fontSize: 48,
  },

  heroTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 33,
  },

  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 9,
    maxWidth: 310,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 30,
    gap: 8,
    marginTop: 16,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
  },

  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  orderCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderCardHeading: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  orderId: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },

  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },

  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: '#FAF5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelReasonIcon: {
    backgroundColor: COLORS.dangerLight,
  },

  infoTextContainer: {
    flex: 1,
    paddingTop: 2,
  },

  infoLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 5,
  },

  infoValue: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: COLORS.text,
  },

  amount: {
    color: COLORS.primary,
    fontSize: 21,
    fontWeight: '900',
  },

  discountNote: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 3,
  },

  orderedItemsBox: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },

  orderedItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 2,
  },

  orderedItemsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  orderedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFAF7',
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  orderedItemQtyBadge: {
    minWidth: 28,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  orderedItemQtyText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },

  orderedItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  orderedItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#FFE0CF',
    padding: 18,
    marginBottom: 16,
  },

  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  paymentHeaderText: {
    flex: 1,
  },

  paymentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  paymentSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    marginTop: 4,
  },

  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 16,
    marginTop: 18,
    marginBottom: 16,
  },

  paymentAmountLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.muted,
  },

  paymentAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 3,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  cancelOrderButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },

  cancelOrderButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.7,
  },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 13,
  },

  secureNoteText: {
    color: COLORS.muted,
    fontSize: 11,
  },

  mapCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 16,
  },

  sectionIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    marginTop: 4,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.successLight,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },

  liveText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.success,
  },

  map: {
    width: '100%',
    height: 260,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#F5F1EE',
  },

  mapErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  mapErrorIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  mapErrorTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 7,
  },

  mapErrorText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
  },

  mapRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    marginTop: 13,
  },

  mapRetryText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
  },

  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },

  mapAttribution: {
    color: COLORS.muted,
    fontSize: 10,
  },

  trackerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
  },

  tracker: {
    marginTop: 4,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 65,
    gap: 12,
  },

  stepLeft: {
    width: 42,
    alignItems: 'center',
  },

  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepCircleCompleted: {
    backgroundColor: COLORS.successLight,
  },

  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },

  stepLine: {
    width: 2,
    height: 25,
    backgroundColor: COLORS.border,
    marginVertical: 3,
  },

  stepLineCompleted: {
    backgroundColor: COLORS.success,
  },

  stepContent: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 15,
  },

  stepLabel: {
    fontSize: 13,
    lineHeight: 19,
    color: '#B0A6AC',
    fontWeight: '500',
  },

  stepLabelCompleted: {
    color: COLORS.text,
    fontWeight: '600',
  },

  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  stepCurrent: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '600',
  },

  stepCheck: {
    marginTop: 10,
  },

  cancelledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 17,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F7D4D4',
    marginBottom: 16,
  },

  cancelledIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelledTextContainer: {
    flex: 1,
  },

  cancelledTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.danger,
  },

  cancelledReasonText: {
    color: '#393039',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  cancelledDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  reviewedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },

  reviewedIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#FFF5D9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewedTextContainer: {
    flex: 1,
  },

  reviewedTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },

  reviewedSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  homeButton: {
    minHeight: 55,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#FFD9C7',
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 5,
  },

  homeButtonText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },

  bottomNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },

  bottomNoteText: {
    color: COLORS.muted,
    fontSize: 11,
  },

  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 32,
  },

  loadingIcon: {
    width: 85,
    height: 85,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  loadingTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
  },

  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },

  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: 29,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },

  errorText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },

  secondaryButton: {
    minHeight: 50,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },

  restaurantBannerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  restaurantBannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantBannerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  restaurantBannerName: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },
  restaurantBannerAddress: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  driverContactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  driverContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  driverEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  driverPhone: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 2,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  callBtn: {
    backgroundColor: COLORS.success,
  },
  chatBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: '#FCD8C8',
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  chatBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  receivedConfirmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#29232A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  receivedConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  receivedConfirmIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receivedConfirmIconWrapActive: {
    backgroundColor: COLORS.successLight,
  },
  receivedConfirmTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  receivedConfirmSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
    marginTop: 4,
  },
  confirmReceivedBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 14,
  },
  confirmReceivedBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  topBarBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  topBarBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  chatNotificationBanner: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatNotificationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatNotificationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFE2D6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatNotificationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  chatNotificationReplyBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatNotificationReplyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chatBtnBadge: {
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  chatBtnBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});