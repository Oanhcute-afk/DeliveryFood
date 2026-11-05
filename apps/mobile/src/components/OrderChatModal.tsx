import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useOrderChatSocket } from '@/hooks/use-order-socket';
import { OrderMessage } from '@food-delivery/types';

const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  background: '#FFF9F5',
  white: '#FFFFFF',
  text: '#29232A',
  muted: '#8B8289',
  border: '#F0E8E3',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  bubbleOther: '#FFFFFF',
  bubbleMine: '#FF6B35',
};

interface OrderChatModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  currentUserRole: 'CUSTOMER' | 'DRIVER' | 'RESTAURANT_OWNER';
  currentUserId?: string;
  currentUserName?: string;
  otherPartyName: string;
  otherPartyPhone?: string | null;
  otherPartyRoleTitle: string;
  chatMode?: 'RESTAURANT' | 'CUSTOMER' | 'DRIVER';
}

export function OrderChatModal({
  visible,
  onClose,
  orderId,
  currentUserRole,
  currentUserId,
  currentUserName,
  otherPartyName,
  otherPartyPhone,
  otherPartyRoleTitle,
  chatMode,
}: OrderChatModalProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { data: messages = [], isLoading } = useQuery<OrderMessage[]>({
    queryKey: ['order-messages', orderId],
    queryFn: async () => {
      try {
        const res = await api.get<OrderMessage[]>(`/orders/${orderId}/messages`);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return queryClient.getQueryData<OrderMessage[]>(['order-messages', orderId]) ?? [];
        }
        throw err;
      }
    },
    enabled: visible && !!orderId,
    refetchInterval: 5000,
  });

  const onSocketMessage = useCallback(
    (newMsg: OrderMessage) => {
      queryClient.setQueryData<OrderMessage[]>(
        ['order-messages', orderId],
        (old = []) => {
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        },
      );
    },
    [orderId, queryClient],
  );

  useOrderChatSocket(visible ? orderId : null, onSocketMessage);

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      try {
        const res = await api
          .post<OrderMessage>(`/orders/${orderId}/messages`, { content });
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const fallbackMsg: OrderMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            orderId,
            senderId: currentUserId ?? 'user',
            senderName:
              currentUserName ??
              (currentUserRole === 'DRIVER'
                ? 'Tài xế'
                : currentUserRole === 'RESTAURANT_OWNER'
                  ? 'Nhà hàng'
                  : 'Khách hàng'),
            senderRole: currentUserRole,
            content,
            createdAt: new Date().toISOString(),
          };
          return fallbackMsg;
        }
        throw err;
      }
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData<OrderMessage[]>(
        ['order-messages', orderId],
        (old = []) => {
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        },
      );
      setInputText('');
    },
    onError: (e: any) => {
      Alert.alert(
        'Không gửi được tin nhắn',
        e?.response?.data?.message ?? 'Vui lòng thử lại sau.',
      );
    },
  });

  function handleSend(contentToSend?: string) {
    const text = (contentToSend ?? inputText).trim();
    if (!text || isSending) return;
    sendMessage(text);
  }

  function handleCall() {
    if (!otherPartyPhone?.trim()) {
      Alert.alert(
        'Chưa có số điện thoại',
        `${otherPartyName} chưa cập nhật số điện thoại. Bạn có thể nhắn tin trao đổi qua khung chat này nhé!`,
      );
      return;
    }
    const cleanPhone = otherPartyPhone.trim().replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng cuộc gọi.');
    });
  }

  const isDriverToRestaurant =
    currentUserRole === 'DRIVER' &&
    (chatMode === 'RESTAURANT' ||
      otherPartyRoleTitle.toLowerCase().includes('quán') ||
      otherPartyRoleTitle.toLowerCase().includes('nhà hàng'));

  const isOwnerToDriver =
    currentUserRole === 'RESTAURANT_OWNER' &&
    (chatMode === 'DRIVER' ||
      otherPartyRoleTitle.toLowerCase().includes('tài xế') ||
      otherPartyRoleTitle.toLowerCase().includes('shipper'));

  const quickPrompts = isDriverToRestaurant
    ? [
        '🛵 Tôi đang trên đường đến quán lấy món',
        '📍 Tôi đã đến trước quán rồi nhé',
        '⏳ Món ăn đã sẵn sàng chưa quán ơi?',
        '📦 Tôi đã nhận đủ món, bắt đầu đi giao nhé!',
      ]
    : isOwnerToDriver
      ? [
          '👨‍🍳 Quán đang chuẩn bị món, khoảng 5 phút nữa xong',
          '✨ Món ăn đã làm xong, mời tài xế vào lấy nhé',
          '📦 Quán đã đóng gói đủ món và nước cho tài xế',
        ]
      : currentUserRole === 'DRIVER'
        ? [
            '🛵 Tôi đang đến điểm giao hàng',
            '📍 Tôi đã đến trước sảnh/cổng rồi nhé',
            '📦 Bạn xuống nhận đồ giúp tôi nhé!',
            '⏳ Tôi chờ ở đây khoảng 5 phút nhé',
          ]
        : currentUserRole === 'RESTAURANT_OWNER'
          ? [
              '👨‍🍳 Quán đang chuẩn bị món ăn cho bạn nhé',
              '⏱️ Món sẽ sẵn sàng trong khoảng 10-15 phút',
              '⚠️ Quán có lưu ý về ghi chú đơn của bạn',
              '✨ Món ăn đã làm xong, chờ shipper đến lấy',
            ]
          : [
              '🏃 Tôi đang xuống ngay đây!',
              '⏳ Bạn đợi tôi 2 phút nhé',
              '🏢 Bạn gửi giúp tôi ở bàn lễ tân/bảo vệ nhé',
              '🚪 Vui lòng bấm chuông giúp tôi nhé',
            ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top, 16) },
          ]}
        >
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherPartyName?.[0]?.toUpperCase() ?? 'U'}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherPartyName}
              </Text>
              <View style={styles.onlineBadge} />
            </View>
            <Text style={styles.headerRole}>{otherPartyRoleTitle}</Text>
          </View>

          {/* Nút gọi điện thoại trực tiếp */}
          <Pressable
            style={({ pressed }) => [
              styles.callButton,
              pressed && styles.pressed,
            ]}
            onPress={handleCall}
            accessibilityLabel={`Gọi điện cho ${otherPartyName}`}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Gọi</Text>
          </Pressable>

          {/* Nút đóng */}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
            accessibilityLabel="Đóng khung chat"
          >
            <Ionicons name="close" size={22} color={COLORS.text} />
          </Pressable>
        </View>

        {/* Thông tin số điện thoại */}
        {otherPartyPhone ? (
          <View style={styles.phoneBanner}>
            <Ionicons name="call-outline" size={14} color={COLORS.green} />
            <Text style={styles.phoneBannerText}>
              Số liên hệ: <Text style={styles.phoneNumber}>{otherPartyPhone}</Text>
            </Text>
          </View>
        ) : null}

        {/* Danh sách tin nhắn */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={46}
                  color={COLORS.muted}
                />
                <Text style={styles.emptyTitle}>Chưa có tin nhắn</Text>
                <Text style={styles.emptySubtitle}>
                  Hãy nhắn tin hoặc gọi điện để dễ dàng gặp nhau nhận hàng nhé!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine =
                item.senderId === currentUserId ||
                item.senderRole === currentUserRole;

              return (
                <View
                  style={[
                    styles.messageRow,
                    isMine ? styles.messageRowMine : styles.messageRowOther,
                  ]}
                >
                  {!isMine && (
                    <Text style={styles.senderLabel}>{item.senderName}</Text>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMine ? styles.bubbleMine : styles.bubbleOther,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMine ? styles.textMine : styles.textOther,
                      ]}
                    >
                      {item.content}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.timestamp,
                      isMine ? styles.timestampMine : styles.timestampOther,
                    ]}
                  >
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Gợi ý tin nhắn nhanh */}
        <View style={styles.quickPromptsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPromptsScroll}
          >
            {quickPrompts.map((prompt, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.quickPromptChip,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleSend(prompt)}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Thanh nhập tin nhắn */}
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: isKeyboardVisible
                ? 12
                : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder={`Nhắn cho ${otherPartyName}...`}
            placeholderTextColor="#A89EA6"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isSending}
          />

          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  onlineBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  headerRole: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3ECEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  phoneBannerText: {
    fontSize: 12,
    color: COLORS.text,
  },
  phoneNumber: {
    fontWeight: '800',
    color: COLORS.green,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  messageRow: {
    maxWidth: '82%',
    gap: 3,
  },
  messageRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: COLORS.bubbleMine,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.bubbleOther,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMine: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  textOther: {
    color: COLORS.text,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 2,
  },
  timestampMine: {
    color: '#A0969E',
  },
  timestampOther: {
    color: '#A0969E',
  },
  quickPromptsContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  quickPromptsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCD8C8',
  },
  quickPromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: '#F7F1EE',
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
