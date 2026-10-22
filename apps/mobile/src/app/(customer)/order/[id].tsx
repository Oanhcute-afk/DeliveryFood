
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
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map {
      height:100%; width:100%; margin:0; padding:0; background:#f5f1ee;
    }
    .driver-pin {
      font-size:30px; line-height:36px; text-align:center;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,.2));
    }
    .leaflet-control-attribution { font-size:10px; }
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
          var next = JSON.parse(event.data);
          if (!next || next.type !== 'DRIVER_LOCATION') return;

          var lat = Number(next.latitude);
          var lng = Number(next.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
              Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

          driver = [lat, lng];

          if (map && marker) {
            marker.setLatLng(driver);
            map.panTo(driver);
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

        var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });

        tiles.on('tileerror', showError);
        tiles.on('tileload', function () {
          errorBox.style.display = 'none';
        });
        tiles.addTo(map);

        var driverIcon = L.divIcon({
          className: '',
          html: '<div class="driver-pin">🛵</div>',
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        marker = L.marker(driver, { icon: driverIcon })
          .addTo(map)
          .bindPopup('Tài xế của bạn đang trên đường giao hàng');

        setTimeout(function () { map.invalidateSize(); }, 250);
      }

      var script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      script.onerror = showError;
      document.head.appendChild(script);
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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [cachedDriverLocation, setCachedDriverLocation] =
    useState<DriverLocation | null>(null);

  useEffect(() => {
    if (!orderUpdate || !id) return;

    queryClient.setQueryData(['order', id], (old: unknown) => ({
      ...((old && typeof old === 'object') ? old : {}),
      ...orderUpdate,
    }));
  }, [orderUpdate, id, queryClient]);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery<Order & { items: any[] }>({
    queryKey: ['order', id],
    queryFn: () =>
      api.get<Order & { items: any[] }>(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
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
    if (!id || !order?.driverId || order.status !== 'PICKED_UP') return;

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
  }, [id, order?.driverId, order?.status]);

  const driverLocation = liveDriverLocation ?? cachedDriverLocation;

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
        merchantDisplayName: 'Food Delivery',
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

      let confirmed = false;

      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const result = await refetch();

        if (result.data?.status === 'CONFIRMED') {
          confirmed = true;
          break;
        }
      }

      if (confirmed) {
        Alert.alert(
          'Thanh toán thành công',
          'Nhà hàng đang chuẩn bị đơn hàng.',
        );
      } else {
        Alert.alert(
          'Đã gửi thanh toán',
          'Thanh toán đang được xử lý. Vui lòng kiểm tra trạng thái đơn hàng sau.',
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Có lỗi xảy ra',
        error?.response?.data?.message ?? 'Vui lòng thử lại sau.',
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
          <Text style={styles.loadingTitle}>Đang tải đơn hàng</Text>
          <Text style={styles.loadingText}>
            Vui lòng đợi trong giây lát...
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
        </View>
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
      ? 'Đơn hàng này đã bị hủy.'
      : order.status === 'DELIVERED'
        ? 'Cảm ơn bạn đã đặt món cùng DeliFood.'
        : order.status === 'PENDING'
          ? 'Hoàn tất thanh toán để nhà hàng bắt đầu chuẩn bị món.'
          : order.status === 'PICKED_UP'
            ? 'Tài xế đang trên đường mang món ăn đến cho bạn.'
            : 'Theo dõi tiến trình đơn hàng của bạn ngay bên dưới.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
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
              name="checkmark-circle"
              size={23}
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
              <Text style={styles.infoLabel}>Tổng tiền đơn hàng</Text>
              <Text style={styles.amount}>
                ${Number(order.totalAmount).toFixed(2)}
              </Text>
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
              <Text style={styles.infoLabel}>Địa chỉ giao hàng</Text>
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
        </View>

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
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.map}>
              <WebView
                ref={mapWebViewRef}
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                setSupportMultipleWindows={false}
                onLoadEnd={() => {
                  setMapLoaded(true);
                  setMapLoadFailed(false);
                }}
                onError={() => {
                  setMapLoadFailed(true);
                  setMapLoaded(false);
                }}
                onHttpError={() => {
                  setMapLoadFailed(true);
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

  cancelledDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
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

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
