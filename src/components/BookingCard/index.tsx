import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Booking } from '@/types/training';
import { BOOKING_STATUS_MAP } from '@/types/training';
import styles from './index.module.scss';

interface BookingCardProps {
  booking: Booking;
  showActions?: boolean;
  onCancel?: (booking: Booking) => void;
  onResult?: (booking: Booking) => void;
  onDetail?: (booking: Booking) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  showActions = true,
  onCancel,
  onResult,
  onDetail
}) => {
  const getStatusTagClass = () => {
    switch (booking.status) {
      case 'confirmed':
        return 'tagInfo';
      case 'completed':
        return 'tagSuccess';
      case 'cancelled':
        return 'tagError';
      case 'absent':
        return 'tagWarning';
      case 'failed':
        return 'tagError';
      case 'retraining':
        return 'tagRetraining';
      default:
        return 'tagInfo';
    }
  };

  const canCancel = booking.status === 'confirmed';
  const canRegisterResult = booking.status === 'confirmed';

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.(booking);
  };

  const handleResult = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResult?.(booking);
    Taro.navigateTo({
      url: `/pages/result-register/index?bookingId=${booking.id}`
    });
  };

  const handleClick = () => {
    onDetail?.(booking);
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <Text className={styles.title}>{booking.sessionTitle}</Text>
        <View className={classnames('tag', getStatusTagClass())}>
          {BOOKING_STATUS_MAP[booking.status]}
        </View>
      </View>

      <View className={styles.infoRow}>
        <Text className={styles.infoIcon}>📅</Text>
        <Text>{booking.date} {booking.timeSlot}</Text>
      </View>

      <View className={styles.infoRow}>
        <Text className={styles.infoIcon}>🚜</Text>
        <Text>{booking.vehiclePlate}</Text>
      </View>

      <View className={styles.infoRow}>
        <Text className={styles.infoIcon}>👨‍🏫</Text>
        <Text>{booking.coachName}</Text>
      </View>

      {booking.isRetraining && (
        <View className={styles.infoRow}>
          <View className={classnames('tag', 'tagRetraining')}>补训</View>
          {booking.retrainingReason && (
            <Text style={{ marginLeft: '16rpx', color: '#C62828', fontSize: '24rpx' }}>
              {booking.retrainingReason}
            </Text>
          )}
        </View>
      )}

      <View className={styles.detailRow}>
        <View className={styles.detailItem}>
          <Text className={styles.detailLabel}>车型</Text>
          <Text className={styles.detailValue}>{booking.vehiclePlate.slice(0, 3)}</Text>
        </View>
        <View className={styles.detailItem}>
          <Text className={styles.detailLabel}>状态</Text>
          <Text className={styles.detailValue}>{BOOKING_STATUS_MAP[booking.status]}</Text>
        </View>
        <View className={styles.detailItem}>
          <Text className={styles.detailLabel}>预约时间</Text>
          <Text className={styles.detailValue}>
            {new Date(booking.bookingTime).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {showActions && (
        <View className={styles.actions}>
          {canCancel && (
            <Button
              className={classnames(styles.actionBtn, styles.dangerBtn)}
              onClick={handleCancel}
            >
              取消预约
            </Button>
          )}
          {canRegisterResult && (
            <Button
              className={classnames(styles.actionBtn, styles.primaryBtn)}
              onClick={handleResult}
            >
              成绩登记
            </Button>
          )}
        </View>
      )}
    </View>
  );
};

export default BookingCard;
