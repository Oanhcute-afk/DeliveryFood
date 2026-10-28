import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
} from '@/hooks/use-order-socket';
import { RatingModal } from '@/components/rating-modal';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { LanguageSwitch } from '@/components/language-switch';

const COLORS = {
  background: BURGER_COLORS.background,
  surface: BURGER_COLORS.surface,
  primary: BURGER_COLORS.primary,
  primaryLight: BURGER_COLORS.primaryLight,
  text: BURGER_COLORS.text,
  muted: BURGER_COLORS.muted,
  border: BURGER_COLORS.border,
  success: BURGER_COLORS.success,
  successLight: BURGER_COLORS.successLight,
  danger: BURGER_COLORS.danger,
  dangerLight: BURGER_COLORS.dangerLight,
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  grayLight: BURGER_COLORS.surfaceMuted,
};

const STATUS_STEPS = [
  {
    key: 'CONFIRMED',
    labelVi: 'Đơn hàng đã xác nhận',
    labelEn: 'Order confirmed',
    icon: 'checkmark-circle' as const,
  },
  {
    key: 'PREPARING',
    labelVi: 'Nhà hàng đang chuẩn bị',
    labelEn: 'Restaurant is preparing',
    icon: 'restaurant' as const,
  },
  {
    key: 'READY',
    labelVi: 'Món ăn đã sẵn sàng',
    labelEn: 'Food is ready for pickup',
    icon: 'fast-food' as const,
  },
  {
    key: 'PICKED_UP',
    labelVi: 'Tài xế đang giao hàng',
    labelEn: 'Driver is on the way',
    icon: 'bicycle' as const,
  },
  {
    key: 'DELIVERED',
    labelVi: 'Giao hàng thành công',
    labelEn: 'Delivered successfully',
    icon: 'gift' as const,
  },
];

const STATUS_ORDER = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'DELIVERED',
];

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
      height:100%; width:100%; margin:0; padding:0; background:#F7EFE4;
    }
    .driver-pin {
      display:flex; align-items:center; justify-content:center;
      width:40px; height:40px; border-radius:20px;
      background:#D94E1F; border:3px solid #FFFFFF;
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
  const { tr } = useLanguage();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const queryClient = useQueryClient();
  const orderUpdate = useOrderSocket(id ?? null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const mapWebViewRef = useRef<WebView | null>(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [cachedDriverLocation, setCachedDriverLocation] =
    useState<DriverLocation | null>(null);

  const statusLabels: Record<string, string> = {
    PENDING: tr('Chờ thanh toán', 'Pending Payment'),
    CONFIRMED: tr('Đã xác nhận', 'Confirmed'),
    PREPARING: tr('Đang chuẩn bị', 'Preparing'),
    READY: tr('Chờ tài xế lấy hàng', 'Ready for Pickup'),
    PICKED_UP: tr('Đang giao hàng', 'Out for Delivery'),
    DELIVERED: tr('Đã giao thành công', 'Delivered'),
    CANCELLED: tr('Đã hủy', 'Cancelled'),
  };

  useEffect(() => {
    if (!orderUpdate || !id) return;

    queryClient.setQueryData(['order', id], (old: unknown) => ({
      ...((old && typeof old === 'object') ? old : {}),
      ...orderUpdate,
    }));
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
    queryFn: () =>
      api.get<Order & { items: any[] }>(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 4000,
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
      Alert.alert(
        tr('Không gửi được đánh giá', 'Unable to submit review'),
        tr('Vui lòng thử lại sau.', 'Please try again later.'),
      );
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
        merchantDisplayName: 'Food Delivery',
        paymentIntentClientSecret: res.data.clientSecret,
      });

      if (initError) {
        Alert.alert(
          tr('Không thể khởi tạo thanh toán', 'Payment setup failed'),
          initError.message,
        );
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert(
          tr('Thanh toán thất bại', 'Payment failed'),
          paymentError.message,
        );
        return;
      }

      queryClient.setQueryData(['order', id], (old: unknown) => ({
        ...((old && typeof old === 'object') ? old : order),
        status: 'CONFIRMED',
      }));
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });

      Alert.alert(
        tr('Thanh toán thành công', 'Payment successful'),
        tr(
          'Nhà hàng đang chuẩn bị đơn hàng.',
          'The restaurant is now preparing your order.',
        ),
      );

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
        tr('Có lỗi xảy ra', 'Something went wrong'),
        error?.response?.data?.message ??
          tr('Vui lòng thử lại sau.', 'Please try again later.'),
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  if (!id || isLoading || (isPending && !isError)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
          <Text style={styles.loadingTitle}>
            {tr('Đang tải đơn hàng', 'Loading order')}
          </Text>
          <Text style={styles.loadingText}>
            {tr('Vui lòng đợi trong giây lát...', 'Please wait a moment...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={40}
              color={COLORS.danger}
            />
          </View>

          <Text style={styles.errorTitle}>
            {tr('Không tải được đơn hàng', 'Unable to load order')}
          </Text>
          <Text style={styles.errorText}>
            {tr(
              'Kiểm tra kết nối mạng rồi thử lại nhé.',
              'Check your internet connection and try again.',
            )}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => void refetch()}
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {tr('Thử tải lại', 'Retry')}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.replace('/(customer)/(tabs)/(home)')}
          >
            <Text style={styles.secondaryButtonText}>
              {tr('Về trang chủ', 'Back to Home')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const statusStyle = getStatusStyle(order.status);

  const heroTitle =
    order.status === 'CANCELLED'
      ? tr('Đơn hàng đã bị hủy', 'Order Cancelled')
      : order.status === 'DELIVERED'
        ? tr('Giao hàng thành công!', 'Order Delivered!')
        : order.status === 'PENDING'
          ? tr('Chờ thanh toán', 'Awaiting Payment')
          : order.status === 'CONFIRMED'
            ? tr('Đơn hàng đã xác nhận!', 'Order Confirmed!')
            : tr('Đơn hàng đang được xử lý', 'Order in Progress');

  const heroSubtitle =
    order.status === 'CANCELLED'
      ? tr('Đơn hàng này đã bị hủy.', 'This order has been cancelled.')
      : order.status === 'DELIVERED'
        ? tr(
            'Cảm ơn bạn đã đặt món cùng DeliFood.',
            'Thank you for ordering with DeliFood.',
          )
        : order.status === 'PENDING'
          ? tr(
              'Hoàn tất thanh toán để nhà hàng bắt đầu chuẩn bị món.',
              'Complete payment so the restaurant can start preparing your meal.',
            )
          : order.status === 'PICKED_UP'
            ? tr(
                'Tài xế đang trên đường mang món ăn đến cho bạn.',
                'Your driver is on the way with your meal.',
              )
            : tr(
                'Theo dõi tiến trình đơn hàng của bạn ngay bên dưới.',
                'Track your order progress live below.',
              );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.replace('/(customer)/(tabs)/(home)')}
          >
            <Ionicons name="arrow-back" size={21} color={COLORS.text} />
          </Pressable>

          <Text style={styles.topBarTitle} numberOfLines={1}>
            {tr('Chi tiết đơn hàng', 'Order Details')}
          </Text>

          <View style={styles.topBarRight}>
            <LanguageSwitch />
            <Pressable
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.pressed,
              ]}
              onPress={() => void refetch()}
            >
              <Ionicons
                name="refresh-outline"
                size={19}
                color={COLORS.text}
              />
            </Pressable>
          </View>
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
              {statusLabels[order.status] ?? order.status}
            </Text>
          </View>
        </View>

        <View style={styles.orderCard}>
          <View style={styles.orderCardHeader}>
            <View style={styles.orderCardIcon}>
              <Ionicons
                name="receipt-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.orderCardHeading}>
              <Text style={styles.cardTitle}>
                {tr('Thông tin đơn hàng', 'Order Information')}
              </Text>
              <Text style={styles.orderId}>
                {tr('Mã đơn', 'Order')} #{order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={22}
              color={COLORS.success}
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
              <Text style={styles.infoLabel}>
                {tr('Tổng tiền đơn hàng', 'Total order amount')}
              </Text>
              <Text style={styles.amount}>
                ${Number(order.totalAmount).toFixed(2)}
              </Text>
              {Number(order.discountAmount ?? 0) > 0 ? (
                <Text style={styles.discountNote}>
                  {tr('Đã giảm', 'Saved')} ${Number(order.discountAmount).toFixed(2)}
                  {order.voucherCode
                    ? tr(
                        ` với voucher ${order.voucherCode}`,
                        ` with voucher ${order.voucherCode}`,
                      )
                    : ''}
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
              <Text style={styles.infoLabel}>
                {tr('Địa chỉ cụ thể', 'Delivery address')}
              </Text>
              <Text style={styles.infoValue}>
                {order.deliveryAddress || tr('Chưa có địa chỉ', 'No address provided')}
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
              <Text style={styles.infoLabel}>
                {tr('Trạng thái hiện tại', 'Current status')}
              </Text>
              <Text style={styles.infoValue}>
                {statusLabels[order.status] ?? order.status}
              </Text>
            </View>
          </View>
        </View>

        {order.status === 'PENDING' && (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIcon}>
                <Ionicons
                  name="card-outline"
                  size={23}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.paymentHeaderText}>
                <Text style={styles.paymentTitle}>
                  {tr('Hoàn tất thanh toán', 'Complete Payment')}
                </Text>
                <Text style={styles.paymentSubtitle}>
                  {tr(
                    'Thanh toán an toàn để xác nhận đơn hàng.',
                    'Pay securely to confirm your order.',
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.paymentAmountRow}>
              <Text style={styles.paymentAmountLabel}>
                {tr('Số tiền cần thanh toán', 'Amount due')}
              </Text>
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
              disabled={paymentLoading}
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
                {paymentLoading
                  ? tr('Đang xử lý...', 'Processing...')
                  : tr('Thanh toán ngay', 'Pay Now')}
              </Text>

              {!paymentLoading && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </Pressable>

            <View style={styles.secureNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={COLORS.muted}
              />
              <Text style={styles.secureNoteText}>
                {tr('Thanh toán được xử lý qua Stripe', 'Secured by Stripe')}
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
                  size={23}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>
                  {tr('Theo dõi tài xế', 'Live Driver Tracking')}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {tr(
                    'Vị trí cập nhật theo dữ liệu nhận được',
                    'Real-time driver position updates',
                  )}
                </Text>
              </View>

              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
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
                      size={28}
                      color={COLORS.danger}
                    />
                  </View>

                  <Text style={styles.mapErrorTitle}>
                    {tr('Không thể tải bản đồ', 'Unable to load map')}
                  </Text>

                  <Text style={styles.mapErrorText}>
                    {tr(
                      'Kiểm tra kết nối Internet để tải dữ liệu bản đồ.',
                      'Check your Internet connection to load map tiles.',
                    )}
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
                    <Text style={styles.mapRetryText}>
                      {tr('Tải lại bản đồ', 'Reload map')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.mapFooter}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color={COLORS.muted}
              />
              <Text style={styles.mapAttribution}>
                {tr(
                  'Bản đồ © OpenStreetMap contributors',
                  'Map © OpenStreetMap contributors',
                )}
              </Text>
            </View>
          </View>
        )}

        {order.status === 'CANCELLED' ? (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIcon}>
              <Ionicons
                name="close-circle-outline"
                size={26}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.cancelledTextContainer}>
              <Text style={styles.cancelledTitle}>
                {tr('Đơn hàng đã bị hủy', 'Order Cancelled')}
              </Text>
              <Text style={styles.cancelledDescription}>
                {tr(
                  'Bạn có thể quay lại trang chủ để chọn món khác.',
                  'You can return to the home screen to place a new order.',
                )}
              </Text>
            </View>
          </View>
        ) : order.status !== 'PENDING' ? (
          <View style={styles.trackerCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="git-commit-outline"
                  size={23}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>
                  {tr('Tiến trình đơn hàng', 'Order Progress')}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {tr(
                    'Cập nhật trạng thái đơn của bạn',
                    'Live updates on your meal preparation & delivery',
                  )}
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
                                : BURGER_COLORS.faint
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
                        {tr(step.labelVi, step.labelEn)}
                      </Text>

                      {isActive && (
                        <Text style={styles.stepCurrent}>
                          {tr('Trạng thái hiện tại', 'Current step')}
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
              <Ionicons name="star" size={22} color={BURGER_COLORS.cheese} />
            </View>
            <View style={styles.reviewedTextContainer}>
              <Text style={styles.reviewedTitle}>
                {tr('Cảm ơn bạn đã đánh giá!', 'Thank you for your feedback!')}
              </Text>
              <Text style={styles.reviewedSubtitle}>
                {tr(
                  'Ý kiến của bạn giúp chúng tôi phục vụ tốt hơn.',
                  'Your rating helps us serve you better.',
                )}
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
          <Text style={styles.homeButtonText}>
            {tr('Quay về trang chủ', 'Back to Home')}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={19}
            color={COLORS.primary}
          />
        </Pressable>

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
    paddingHorizontal: 18,
    paddingBottom: 34,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 22,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroIconCancelled: {
    backgroundColor: COLORS.dangerLight,
  },
  heroIconDelivered: {
    backgroundColor: COLORS.successLight,
  },
  heroIconPending: {
    backgroundColor: BURGER_COLORS.cheeseLight,
  },
  heroEmoji: {
    fontSize: 42,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 310,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 8,
    marginTop: 14,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCardHeading: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  orderId: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
    paddingTop: 1,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  amount: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  discountNote: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 3,
  },
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentHeaderText: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
    marginTop: 3,
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
    paddingVertical: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  paymentAmountLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
  },
  paymentAmount: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.primary,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
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
    marginTop: 12,
  },
  secureNoteText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  mapCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
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
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.grayLight,
  },
  mapErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,253,249,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mapErrorIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mapErrorTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  mapErrorText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  mapRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    marginTop: 12,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  tracker: {
    marginTop: 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 62,
    gap: 12,
  },
  stepLeft: {
    width: 40,
    alignItems: 'center',
  },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 13,
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
    height: 24,
    backgroundColor: COLORS.border,
    marginVertical: 3,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.success,
  },
  stepContent: {
    flex: 1,
    paddingTop: 9,
    paddingBottom: 14,
  },
  stepLabel: {
    fontSize: 13,
    lineHeight: 19,
    color: BURGER_COLORS.faint,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: COLORS.text,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  stepCurrent: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 3,
    fontWeight: '700',
  },
  stepCheck: {
    marginTop: 9,
  },
  cancelledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
    marginBottom: 14,
  },
  cancelledIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 14,
  },
  reviewedIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BURGER_COLORS.cheeseLight,
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
    marginTop: 3,
  },
  homeButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  homeButtonText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  errorIcon: {
    width: 82,
    height: 82,
    borderRadius: 27,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  secondaryButton: {
    minHeight: 48,
    width: '100%',
    borderRadius: 15,
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
  pressed: {
    opacity: 0.88,
  },
});
