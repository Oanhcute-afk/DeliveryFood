import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BURGER_COLORS } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

interface StarRatingProps {
  rating: number;
  onRate: (rating: number) => void;
  size?: number;
}

function StarRating({ rating, onRate, size = 34 }: StarRatingProps) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onRate(star)}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <Text
            style={[
              styles.star,
              {
                fontSize: size,
                color:
                  star <= rating ? BURGER_COLORS.cheese : BURGER_COLORS.border,
              },
            ]}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

interface RatingModalProps {
  visible: boolean;
  hasDriver: boolean;
  onSubmit: (data: {
    restaurantRating: number;
    driverRating?: number;
    comment?: string;
  }) => void;
  onDismiss: () => void;
  isSubmitting: boolean;
}

export function RatingModal({
  visible,
  hasDriver,
  onSubmit,
  onDismiss,
  isSubmitting,
}: RatingModalProps) {
  const { tr } = useLanguage();
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [comment, setComment] = useState('');

  const canSubmit = restaurantRating > 0 && (!hasDriver || driverRating > 0);

  function handleSubmit() {
    onSubmit({
      restaurantRating,
      driverRating: hasDriver ? driverRating : undefined,
      comment: comment.trim() || undefined,
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {tr('🍔 Đã giao hàng thành công!', '🍔 Order Delivered!')}
          </Text>
          <Text style={styles.subtitle}>
            {tr(
              'Trải nghiệm bữa ăn của bạn thế nào?',
              'How was your meal and delivery experience?',
            )}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {tr('Đánh giá nhà hàng', 'Restaurant')}
            </Text>
            <StarRating
              rating={restaurantRating}
              onRate={setRestaurantRating}
            />
          </View>

          {hasDriver && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {tr('Đánh giá tài xế', 'Driver')}
              </Text>
              <StarRating rating={driverRating} onRate={setDriverRating} />
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder={tr(
              'Nhận xét thêm về món ăn (không bắt buộc)...',
              'Leave a comment (optional)...',
            )}
            placeholderTextColor={BURGER_COLORS.faint}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
              pressed && canSubmit && { opacity: 0.88 },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {tr('Gửi đánh giá', 'Submit Review')}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={onDismiss}
          >
            <Text style={styles.skipText}>
              {tr('Để sau', 'Skip for now')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 26, 17, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BURGER_COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BURGER_COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: BURGER_COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: BURGER_COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: BURGER_COLORS.text,
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    lineHeight: 38,
  },
  input: {
    borderWidth: 1,
    borderColor: BURGER_COLORS.border,
    backgroundColor: BURGER_COLORS.surface,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: BURGER_COLORS.text,
    textAlignVertical: 'top',
    minHeight: 76,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: BURGER_COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  skipButton: {
    alignItems: 'center',
    padding: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: BURGER_COLORS.muted,
  },
});
