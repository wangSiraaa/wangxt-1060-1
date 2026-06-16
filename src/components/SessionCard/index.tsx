import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { TrainingSession } from '@/types/training';
import { SESSION_STATUS_MAP, VEHICLE_TYPE_MAP } from '@/types/training';
import styles from './index.module.scss';

interface SessionCardProps {
  session: TrainingSession;
  showBookButton?: boolean;
  onBook?: (session: TrainingSession) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  showBookButton = true,
  onBook
}) => {
  const isFull = session.status === 'full';
  const isAvailable = session.status === 'available';
  const progress = session.capacity > 0 ? (session.bookedCount / session.capacity) * 100 : 0;

  const handleClick = () => {
    Taro.navigateTo({
      url: `/pages/session-detail/index?id=${session.id}`
    });
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    onBook?.(session);
    Taro.navigateTo({
      url: `/pages/session-detail/index?id=${session.id}`
    });
  };

  const getStatusTagClass = () => {
    switch (session.status) {
      case 'available':
        return 'tagSuccess';
      case 'full':
        return 'tagWarning';
      case 'ongoing':
        return 'tagInfo';
      case 'completed':
        return 'tagError';
      default:
        return 'tagInfo';
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <Text className={styles.title}>{session.title}</Text>
        <View className={classnames('tag', getStatusTagClass())}>
          {SESSION_STATUS_MAP[session.status]}
        </View>
      </View>

      <View className={styles.infoRow}>
        <Text className={styles.infoIcon}>📅</Text>
        <Text>{session.date}</Text>
      </View>

      <View className={styles.infoRow}>
        <Text className={styles.infoIcon}>📍</Text>
        <Text>{session.siteName}</Text>
      </View>

      <View className={styles.infoRow}>
        <Text className={styles.infoIcon}>👨‍🏫</Text>
        <Text>教练：{session.coachNames.join('、')}</Text>
      </View>

      <View className={styles.tags}>
        <View className={classnames('tag', styles.tag, session.type === 'practical' ? 'tagPractical' : 'tagTheory')}>
          {session.type === 'practical' ? '实操' : '理论'}
        </View>
        <View className={classnames('tag', styles.tag, 'tagInfo')}>
          {VEHICLE_TYPE_MAP[session.vehicleType]}
        </View>
      </View>

      <View className={styles.footer}>
        <View className={styles.progress}>
          <View className={styles.progressBar}>
            <View className={styles.progressFill} style={{ width: `${progress}%` }} />
          </View>
          <Text className={styles.progressText}>
            {session.bookedCount}/{session.capacity}
          </Text>
        </View>

        {showBookButton && (
          <Button
            className={classnames(styles.bookBtn, isFull && styles.bookBtnFull)}
            disabled={!isAvailable}
            onClick={handleBook}
          >
            {isFull ? '已满' : '预约'}
          </Button>
        )}
      </View>
    </View>
  );
};

export default SessionCard;
