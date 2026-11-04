import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  chatApi,
  getCurrentArea,
  type ChatArea,
  type ChatCard,
  type ChatMessage,
} from '@/lib/chat-api';

const COLORS = {
  background: '#FFF9F5',
  white: '#FFFFFF',
  primary: '#FF6B35',
  primaryDark: '#D94D20',
  primaryLight: '#FFF0E8',
  text: '#29232A',
  textSoft: '#4A4249',
  muted: '#8B8289',
  faint: '#A49AA0',
  border: '#F0E8E3',
  green: '#16A34A',
  red: '#E5484D',
};

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Xin chào! Mình là **Deli** 👋\nMình có thể gợi ý món bán chạy, quán được đánh giá cao, quán gần bạn hoặc voucher đang có. Hôm nay bạn muốn ăn gì?',
};

const SUGGESTIONS = [
  { label: '🔥 Món bán chạy nhất', text: 'Món nào đang bán chạy nhất?' },
  {
    label: '⭐ Quán đánh giá cao',
    text: 'Quán nào được đánh giá tốt nhất?',
  },
  { label: '📍 Quán gần tôi', text: 'Có quán nào ngon gần tôi không?' },
  { label: '🎟️ Voucher đang có', text: 'Đang có voucher nào không?' },
  { label: '💸 Món dưới $5', text: 'Gợi ý món ngon dưới $5' },
];

const NEARBY_PATTERN = /gần|quanh đây|xung quanh|near/i;

const areaLabel = (area: ChatArea) =>
  [area.district ?? area.subregion, area.city ?? area.region]
    .filter(Boolean)
    .join(', ') || 'Vị trí hiện tại';

let nextId = 0;
const newId = () => `m${Date.now()}-${nextId++}`;

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState<ChatArea | null>(null);
  const [locating, setLocating] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function locate() {
    setLocating(true);
    try {
      const found = await getCurrentArea();
      if (found) setArea(found);
      return found;
    } catch {
      return null;
    } finally {
      setLocating(false);
    }
  }

  async function send(text: string, history = messages) {
    const content = text.trim();
    if (!content || sending) return;

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      text: content,
    };
    const next = [...history, userMessage];
    setMessages(next);
    setInput('');
    setError(null);
    setSending(true);

    try {
      // Khách hỏi "gần đây" mà chưa có vị trí → xin quyền vị trí trước
      const location =
        area ?? (NEARBY_PATTERN.test(content) ? await locate() : null);
      const res = await chatApi.send(
        next.filter((m) => m.id !== WELCOME.id),
        location ?? undefined,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: res.reply,
          cards: res.cards,
        },
      ]);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        typeof message === 'string'
          ? message
          : 'Không kết nối được trợ lý. Bạn thử lại nhé!',
      );
    } finally {
      setSending(false);
    }
  }

  function retry() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    // Gửi lại câu hỏi cuối (bỏ bản cũ để không bị lặp)
    void send(
      lastUser.text,
      messages.filter((m) => m.id !== lastUser.id),
    );
  }

  function openRestaurant(card: ChatCard) {
    router.push({
      pathname: '/(customer)/(tabs)/(home)/restaurant/[id]',
      params: { id: card.restaurantId },
    });
  }

  const showSuggestions = messages.length === 1 && !sending;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.back}
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Trợ lý Deli</Text>
          <Text style={styles.subtitle}>Tư vấn món ngon bằng AI</Text>
        </View>
        <Pressable
          onPress={() => void locate()}
          disabled={locating}
          style={({ pressed }) => [
            styles.locationChip,
            area && styles.locationChipActive,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Dùng vị trí hiện tại"
        >
          {locating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons
              name={area ? 'location' : 'location-outline'}
              size={15}
              color={area ? COLORS.primaryDark : COLORS.muted}
            />
          )}
          <Text
            style={[styles.locationText, area && styles.locationTextActive]}
            numberOfLines={1}
          >
            {area ? areaLabel(area) : 'Bật vị trí'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((m) => (
            <View key={m.id}>
              <View
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <RichText
                  text={m.text}
                  color={m.role === 'user' ? '#FFFFFF' : COLORS.text}
                />
              </View>
              {m.cards?.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cards}
                >
                  {m.cards.map((card) => (
                    <SuggestionCard
                      key={card.id}
                      card={card}
                      onPress={() => openRestaurant(card)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ))}

          {sending ? (
            <View style={[styles.bubble, styles.botBubble, styles.typing]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.typingText}>Deli đang tìm món cho bạn…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle" size={18} color={COLORS.red} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={retry} hitSlop={8}>
                <Text style={styles.retry}>Thử lại</Text>
              </Pressable>
            </View>
          ) : null}

          {showSuggestions ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.label}
                  onPress={() => void send(s.text)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.suggestionText}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Hỏi Deli về món ăn…"
            placeholderTextColor={COLORS.faint}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <Pressable
            onPress={() => void send(input)}
            disabled={!input.trim() || sending}
            style={({ pressed }) => [
              styles.send,
              (!input.trim() || sending) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityLabel="Gửi"
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>
          Câu trả lời do AI tạo, dựa trên dữ liệu món ăn trong app.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Markdown tối giản: xuống dòng, gạch đầu dòng "- " và **chữ đậm** */
function RichText({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.rich}>
      {text.split('\n').map((line, i) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const content = line.replace(/^\s*[-*•]\s+/, '');
        if (!content.trim()) return <View key={i} style={styles.gap} />;
        return (
          <View key={i} style={bullet ? styles.bulletRow : undefined}>
            {bullet ? <Text style={[styles.text, { color }]}>•</Text> : null}
            <Text style={[styles.text, { color }, bullet && styles.flex]}>
              {content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                part.startsWith('**') && part.endsWith('**') ? (
                  <Text key={j} style={styles.bold}>
                    {part.slice(2, -2)}
                  </Text>
                ) : (
                  part
                ),
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SuggestionCard({
  card,
  onPress,
}: {
  card: ChatCard;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {card.imageUrl ? (
        <Image
          source={{ uri: card.imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder]}>
          <Text style={styles.cardEmoji}>
            {card.type === 'item' ? '🍲' : '🏪'}
          </Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {card.name}
        </Text>
        {card.type === 'item' ? (
          <Text style={styles.cardMeta} numberOfLines={1}>
            {card.restaurantName}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          {card.price != null ? (
            <Text style={styles.cardPrice}>${card.price.toFixed(2)}</Text>
          ) : null}
          {card.rating ? (
            <Text style={styles.cardRating}>★ {card.rating.toFixed(1)}</Text>
          ) : null}
          {!card.isOpen ? (
            <Text style={styles.cardClosed}>Đóng cửa</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  back: { padding: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 140,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  locationChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  locationText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  locationTextActive: { color: COLORS.primaryDark },
  messages: { padding: 16, gap: 10 },
  bubble: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 6,
  },
  rich: { gap: 2 },
  text: { fontSize: 14, lineHeight: 21 },
  bold: { fontWeight: '800' },
  bulletRow: { flexDirection: 'row', gap: 6 },
  gap: { height: 4 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 13, color: COLORS.muted },
  cards: { gap: 10, paddingTop: 8, paddingRight: 16 },
  card: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 84 },
  cardPlaceholder: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 30 },
  cardBody: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  cardMeta: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  cardPrice: { fontSize: 13, fontWeight: '900', color: COLORS.primaryDark },
  cardRating: { fontSize: 11, fontWeight: '800', color: '#D99000' },
  cardClosed: { fontSize: 10, fontWeight: '800', color: COLORS.red },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDECEC',
    borderRadius: 14,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: COLORS.red },
  retry: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 23,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  disclaimer: {
    fontSize: 10,
    color: COLORS.faint,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
