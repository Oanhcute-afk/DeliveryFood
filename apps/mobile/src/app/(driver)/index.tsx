import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { Order } from '@food-delivery/types';

let socket: Socket | null = null;

export default function DriverHomeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);

  const { data: status, isLoading } = useQuery<{ isOnline: boolean }>({
    queryKey: ['driver-status'],
    queryFn: () =>
      api.get<{ isOnline: boolean }>('/driver/status').then((r) => r.data),
  });

  const { mutate: toggleOnline, isPending: toggling } = useMutation({
    mutationFn: () => api.patch('/driver/online'),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['driver-status'] }),
    onError: (e: any) =>
      Alert.alert(
        'Không thể cập nhật trạng thái',
        e?.response?.data?.message ?? 'Vui lòng thử lại.',
      ),
  });

  const { mutate: declineOrder, isPending: declining } = useMutation({
    mutationFn: (orderId: string) =>
      api.post(`/driver/orders/${orderId}/decline`),
    onSuccess: () => setIncomingOrder(null),
    onError: (e: any) =>
      Alert.alert(
        'Không thể từ chối đơn',
        e?.response?.data?.message ?? 'Vui lòng thử lại.',
      ),
  });

  const { mutate: acceptOrder, isPending: accepting } = useMutation({
    mutationFn: (orderId: string) =>
      api.patch(`/orders/${orderId}/status`, { status: 'PICKED_UP' }),
    onSuccess: () => {
      setIncomingOrder(null);
      queryClient.invalidateQueries({ queryKey: ['driver-active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
    onError: (e: any) =>
      Alert.alert(
        'Không thể nhận đơn',
        e?.response?.data?.message ?? 'Vui lòng thử lại.',
      ),
  });

  useEffect(() => {
    if (!user?.id) return;

    const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;

    if (!serverUrl) {
      console.warn('Missing EXPO_PUBLIC_SERVER_URL');
      return;
    }

    const driverSocket: Socket = io(`${serverUrl}/orders`, {
      transports: ['websocket'],
    });

    socket = driverSocket;

    driverSocket.emit('join:driver', user.id);

    driverSocket.on('driver:assigned', (order: Order) => {
      setIncomingOrder(order);
    });

    return () => {
      driverSocket.disconnect();

      if (socket === driverSocket) {
        socket = null;
      }
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải thông tin tài xế...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOnline = status?.isOnline ?? false;
  const isProcessing = accepting || declining;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>FOOD DELIVERY</Text>
            <Text style={styles.title}>Xin chào,</Text>
            <Text style={styles.driverName}>
              {user?.firstName || 'Tài xế'} 👋
            </Text>
            <Text style={styles.subtitle}>
              Sẵn sàng cho chuyến giao hàng tiếp theo?
            </Text>
          </View>

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {user?.firstName?.[0]?.toUpperCase() ?? 'D'}
            </Text>
          </View>
        </View>

        {/* Trạng thái trực tuyến */}
        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>
                {isOnline ? '🛵' : '🌙'}
              </Text>
            </View>

            <View style={styles.statusInfo}>
              <Text style={styles.statusCaption}>TRẠNG THÁI HOẠT ĐỘNG</Text>
              <View style={styles.statusTitleRow}>
                <View
                  style={[
                    styles.statusDot,
                    isOnline ? styles.onlineDot : styles.offlineDot,
                  ]}
                />
                <Text
                  style={[
                    styles.statusTitle,
                    { color: isOnline ? '#218653' : '#827780' },
                  ]}
                >
                  {isOnline ? 'Đang trực tuyến' : 'Đang ngoại tuyến'}
                </Text>
              </View>
            </View>

            <Switch
              value={isOnline}
              onValueChange={() => toggleOnline()}
              disabled={toggling}
              trackColor={{ false: '#E9DFDA', true: '#A8E5C2' }}
              thumbColor={isOnline ? '#22A566' : '#B7ACB2'}
              accessibilityLabel="Bật hoặc tắt trạng thái trực tuyến"
            />
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.statusBottomRow}>
            <Text style={styles.statusDescription}>
              {toggling
                ? 'Đang cập nhật trạng thái...'
                : isOnline
                  ? 'Bạn có thể nhận yêu cầu giao hàng mới.'
                  : 'Bật trực tuyến để bắt đầu nhận đơn hàng.'}
            </Text>

            {toggling && (
              <ActivityIndicator size="small" color="#FF6B35" />
            )}
          </View>
        </View>

        {/* Hướng dẫn */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bắt đầu giao hàng</Text>
          <Text style={styles.sectionEmoji}>✨</Text>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>📦</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Nhận đơn hàng mới</Text>
            <Text style={styles.tipDescription}>
              Khi nhà hàng phân công đơn cho bạn, thông báo sẽ xuất hiện ngay
              trên màn hình. Hãy kiểm tra địa chỉ và tổng tiền trước khi nhận.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>📍</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Theo dõi chuyến giao</Text>
            <Text style={styles.tipDescription}>
              Sau khi nhận đơn, mở mục đơn đang giao để theo dõi và hoàn tất
              chuyến giao hàng.
            </Text>
          </View>
        </View>

        {/* Lời nhắc trạng thái */}
        <View
          style={[
            styles.noticeCard,
            isOnline ? styles.noticeOnline : styles.noticeOffline,
          ]}
        >
          <Text style={styles.noticeEmoji}>
            {isOnline ? '🎯' : '💡'}
          </Text>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>
              {isOnline ? 'Bạn đã sẵn sàng!' : 'Đừng bỏ lỡ đơn hàng'}
            </Text>
            <Text style={styles.noticeText}>
              {isOnline
                ? 'Giữ kết nối mạng để nhận yêu cầu giao hàng kịp thời.'
                : 'Chuyển sang trạng thái trực tuyến khi bạn sẵn sàng làm việc.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal đơn hàng mới */}
      <Modal
        visible={!!incomingOrder}
        transparent
        animationType="slide"
        onRequestClose={() => {
          // Chỉ đóng modal qua thao tác nhận hoặc từ chối đơn.
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderIcon}>
              <Text style={styles.modalEmoji}>🛵</Text>
            </View>

            <Text style={styles.modalEyebrow}>CÓ ĐƠN HÀNG MỚI</Text>
            <Text style={styles.modalTitle}>Yêu cầu giao hàng</Text>
            <Text style={styles.modalSubtitle}>
              Kiểm tra thông tin trước khi xác nhận
            </Text>

            <View style={styles.orderDetails}>
              <View style={styles.orderIdRow}>
                <Text style={styles.orderLabel}>Mã đơn hàng</Text>
                <View style={styles.orderIdBadge}>
                  <Text style={styles.orderIdText}>
                    #{incomingOrder?.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDivider} />

              <Text style={styles.orderLabel}>ĐỊA CHỈ GIAO HÀNG</Text>
              <View style={styles.addressRow}>
                <View style={styles.addressIcon}>
                  <Text style={styles.addressEmoji}>📍</Text>
                </View>
                <Text style={styles.addressText}>
                  {incomingOrder?.deliveryAddress || 'Chưa có địa chỉ'}
                </Text>
              </View>

              <View style={styles.orderDivider} />

              <Text style={styles.orderLabel}>TỔNG GIÁ TRỊ ĐƠN HÀNG</Text>
              <Text style={styles.orderTotal}>
                ${Number(incomingOrder?.totalAmount ?? 0).toFixed(2)}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.acceptButton,
                pressed && styles.buttonPressed,
                isProcessing && styles.buttonDisabled,
              ]}
              disabled={isProcessing}
              onPress={() => {
                if (incomingOrder) acceptOrder(incomingOrder.id);
              }}
            >
              {accepting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.acceptButtonText}>✓</Text>
                  <Text style={styles.acceptButtonText}>Nhận đơn hàng</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.declineButton,
                pressed && styles.declinePressed,
                isProcessing && styles.buttonDisabled,
              ]}
              disabled={isProcessing}
              onPress={() => {
                if (incomingOrder) declineOrder(incomingOrder.id);
              }}
            >
              {declining ? (
                <ActivityIndicator color="#D94343" />
              ) : (
                <Text style={styles.declineButtonText}>Từ chối đơn</Text>
              )}
            </Pressable>

            <Text style={styles.modalFooter}>
              Cảm ơn bạn đã đồng hành cùng FoodDelivery
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFF9F5',
  },
  loadingText: {
    fontSize: 13,
    color: '#8B8289',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 35,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: '#FF6B35',
    marginBottom: 8,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#29232A',
  },
  driverName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#29232A',
    marginTop: 1,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8B8289',
    marginTop: 7,
  },
  headerAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },

  // Trạng thái online
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 22,
    padding: 18,
    marginBottom: 28,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: {
    fontSize: 24,
  },
  statusInfo: {
    flex: 1,
  },
  statusCaption: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#A1989E',
    marginBottom: 7,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: '#22A566',
  },
  offlineDot: {
    backgroundColor: '#B7ACB2',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#F3ECE7',
    marginVertical: 16,
  },
  statusBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusDescription: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8B8289',
  },

  // Hướng dẫn
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#29232A',
  },
  sectionEmoji: {
    fontSize: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF4E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipEmoji: {
    fontSize: 21,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#39313A',
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 11,
    lineHeight: 18,
    color: '#8B8289',
  },

  // Lời nhắc
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 15,
    borderRadius: 18,
    marginTop: 12,
  },
  noticeOnline: {
    backgroundColor: '#EAF8EF',
  },
  noticeOffline: {
    backgroundColor: '#FFF0E8',
  },
  noticeEmoji: {
    fontSize: 22,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#39313A',
    marginBottom: 5,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#756B72',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(35, 26, 31, 0.55)',
  },
  modal: {
    backgroundColor: '#FFF9F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2D8D2',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#FFF0E8',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  modalEmoji: {
    fontSize: 29,
  },
  modalEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#29232A',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8B8289',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  orderDetails: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#A1989E',
    marginBottom: 8,
  },
  orderIdBadge: {
    backgroundColor: '#FFF0E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D94D20',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#F3ECE7',
    marginVertical: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FFF4E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressEmoji: {
    fontSize: 16,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#39313A',
    paddingTop: 2,
  },
  orderTotal: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FF6B35',
  },
  acceptButton: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    padding: 15,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  declineButton: {
    minHeight: 49,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 15,
    padding: 14,
    marginTop: 10,
  },
  declinePressed: {
    backgroundColor: '#FEF0EF',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D94343',
  },
  modalFooter: {
    fontSize: 10,
    color: '#A1989E',
    textAlign: 'center',
    marginTop: 17,
  },
});
