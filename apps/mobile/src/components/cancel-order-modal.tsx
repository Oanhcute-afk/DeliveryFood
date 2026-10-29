import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CANCEL_ORDER_REASONS,
  type CancelOrderReason,
} from '@/lib/cancelled-orders';

interface CancelOrderModalProps {
  visible: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: CancelOrderReason) => void;
}

const REASON_ICONS: Record<CancelOrderReason, keyof typeof Ionicons.glyphMap> = {
  'Đặt nhầm món': 'fast-food-outline',
  'Ghi sai địa chỉ nhà': 'location-outline',
  'Khác': 'ellipsis-horizontal-circle-outline',
};

export function CancelOrderModal({
  visible,
  isSubmitting,
  onClose,
  onConfirm,
}: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] =
    useState<CancelOrderReason | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerIcon}>
            <Ionicons name="close-circle-outline" size={30} color="#EF4444" />
          </View>

          <Text style={styles.title}>Hủy đơn hàng</Text>
          <Text style={styles.subtitle}>
            Vui lòng chọn lý do bạn muốn hủy đơn hàng đang chờ thanh toán:
          </Text>

          <View style={styles.reasonList}>
            {CANCEL_ORDER_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  disabled={isSubmitting}
                  onPress={() => setSelectedReason(reason)}
                  style={({ pressed }) => [
                    styles.reasonItem,
                    isSelected && styles.reasonItemSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.reasonIconBox,
                      isSelected && styles.reasonIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name={REASON_ICONS[reason]}
                      size={20}
                      color={isSelected ? '#FFFFFF' : '#FF6B35'}
                    />
                  </View>

                  <Text
                    style={[
                      styles.reasonText,
                      isSelected && styles.reasonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>

                  <Ionicons
                    name={
                      isSelected ? 'radio-button-on' : 'radio-button-off'
                    }
                    size={22}
                    color={isSelected ? '#FF6B35' : '#D8CFCA'}
                  />
                </Pressable>
              );
            })}
          </View>

          <Pressable
            disabled={!selectedReason || isSubmitting}
            onPress={() => {
              if (selectedReason) {
                onConfirm(selectedReason);
              }
            }}
            style={({ pressed }) => [
              styles.confirmButton,
              (!selectedReason || isSubmitting) && styles.confirmButtonDisabled,
              pressed && selectedReason && !isSubmitting && styles.pressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={19} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Xác nhận hủy đơn</Text>
              </>
            )}
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={onClose}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(41, 35, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF9F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2D8D2',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#29232A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8B8289',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  reasonList: {
    gap: 10,
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8E3',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  reasonItemSelected: {
    borderColor: '#FF6B35',
    borderWidth: 1.5,
    backgroundColor: '#FFF0E8',
  },
  reasonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonIconBoxSelected: {
    backgroundColor: '#FF6B35',
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#29232A',
  },
  reasonTextSelected: {
    color: '#D94D20',
    fontWeight: '800',
  },
  confirmButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  backButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B8289',
  },
  pressed: {
    opacity: 0.85,
  },
});
