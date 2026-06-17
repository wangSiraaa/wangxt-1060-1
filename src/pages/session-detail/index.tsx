import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import { VEHICLE_TYPE_MAP, SESSION_STATUS_MAP } from '@/types/training';
import type { TimeSlot, TrainingSession } from '@/types/training';
import styles from './index.module.scss';

const SessionDetailPage: React.FC = () => {
  const router = useRouter();
  const sessionId = (router.params.sessionId || router.params.id) as string;

  const {
    getSessionById,
    getVehicles,
    getUsers,
    getCoaches,
    getCurrentUser,
    canBookSession,
    getMyBookings,
    initializeData
  } = useTrainingStore();

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  useEffect(() => {
    if (sessionId) {
      const s = getSessionById(sessionId);
      setSession(s || null);
      setLoading(false);
    }
  }, [sessionId, getSessionById]);

  const currentUser = getCurrentUser();
  const vehicles = getVehicles() || [];
  const coaches = getCoaches() || [];
  const myBookings = getMyBookings() || [];

  const sessionVehicles = useMemo(() => {
    if (!session) return [];
    return vehicles.filter(v => session.vehicleIds.includes(v.id));
  }, [session, vehicles]);

  const sessionCoaches = useMemo(() => {
    if (!session) return [];
    return coaches.filter(c => session.coachIds.includes(c.id));
  }, [session, coaches]);

  const canBook = useMemo(() => {
    if (!session || !selectedTimeSlot) return { canBook: false, reasons: ['请选择时段'] };
    return canBookSession(session.id, selectedTimeSlot);
  }, [session, selectedTimeSlot, canBookSession]);

  const getTimeSlotStatus = (timeSlot: TimeSlot) => {
    const bookedCount = timeSlot.bookedCount || 0;
    const hasBooked = myBookings.some(
      b => b.sessionId === sessionId && b.timeSlotId === timeSlot.id && b.status === 'confirmed'
    );

    if (hasBooked) return 'booked';
    if (bookedCount >= timeSlot.capacity) return 'full';
    return 'available';
  };

  const handleTimeSlotClick = (timeSlotId: string) => {
    const timeSlot = session?.timeSlots.find(t => t.id === timeSlotId);
    if (!timeSlot) return;
    
    const status = getTimeSlotStatus(timeSlot);
    if (status === 'full') {
      Taro.showToast({ title: '该时段已满', icon: 'none' });
      return;
    }
    if (status === 'booked') {
      Taro.showToast({ title: '您已预约该时段', icon: 'none' });
      return;
    }

    setSelectedTimeSlot(timeSlotId);
  };

  const handleBook = () => {
    if (!session || !selectedTimeSlot) return;

    if (!canBook.canBook) {
      Taro.showModal({
        title: '无法预约',
        content: canBook.reasons.join('\n'),
        showCancel: false
      });
      return;
    }

    Taro.navigateTo({
      url: `/pages/booking-confirm/index?sessionId=${session.id}&timeSlotId=${selectedTimeSlot}`
    });
  };

  if (loading) {
    return (
      <View className={styles.container} style={{ padding: '48rpx', textAlign: 'center' }}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View className={styles.container} style={{ padding: '48rpx', textAlign: 'center' }}>
        <Text>场次不存在</Text>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      <View className={styles.hero}>
        <Text className={styles.title}>{session.title}</Text>
        <View className={styles.metaRow}>
          <View className={styles.metaItem}>
            <Text className={styles.metaIcon}>📅</Text>
            <Text>{session.date}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaIcon}>📍</Text>
            <Text>{session.siteName}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaIcon}>🚜</Text>
            <Text>{VEHICLE_TYPE_MAP[session.vehicleType]}</Text>
          </View>
        </View>

        {session.description && (
          <Text className={styles.description}>{session.description}</Text>
        )}

        <View className={styles.infoCards}>
          <View className={styles.infoCard}>
            <Text className={styles.infoValue}>{session.timeSlots.length}</Text>
            <Text className={styles.infoLabel}>时段</Text>
          </View>
          <View className={styles.infoCard}>
            <Text className={styles.infoValue}>{session.vehicleIds.length}</Text>
            <Text className={styles.infoLabel}>车辆</Text>
          </View>
          <View className={styles.infoCard}>
            <Text className={styles.infoValue}>{session.coachIds.length}</Text>
            <Text className={styles.infoLabel}>教练</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>🚜</Text>
            培训车辆
          </Text>
          {sessionVehicles.length > 0 ? (
            sessionVehicles.map(vehicle => (
              <View key={vehicle.id} className={styles.vehicleCard}>
                <Text className={styles.vehicleIcon}>🚜</Text>
                <View className={styles.vehicleInfo}>
                  <Text className={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
                  <Text className={styles.vehicleDesc}>
                    {vehicle.brand || vehicle.typeName || ''} {vehicle.model || ''}
                    {vehicle.year ? ` · ${vehicle.year}年` : ''}
                  </Text>
                </View>
                <View
                  className={classnames(
                    styles.vehicleStatus,
                    vehicle.status === 'available' ? 'tagSuccess' : 'tagError'
                  )}
                >
                  {vehicle.status === 'available' ? '可用' : vehicle.status === 'in_use' ? '使用中' : '不可用'}
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: '24rpx', textAlign: 'center', color: '#90A4AE' }}>
              <Text>暂无车辆信息</Text>
            </View>
          )}
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>👨‍🏫</Text>
            培训教练
          </Text>
          {sessionCoaches.length > 0 ? (
            sessionCoaches.map(coach => {
              const quals = coach.qualifications || coach.coachQualification || [];
              return (
                <View key={coach.id} className={styles.coachCard}>
                  <View className={styles.coachAvatar}>
                    {coach.name?.charAt(0) || '教'}
                  </View>
                  <View className={styles.coachInfo}>
                    <Text className={styles.coachName}>{coach.name || '未知教练'}</Text>
                    <Text className={styles.coachQual}>
                      资质：{quals.map((q: string) => VEHICLE_TYPE_MAP[q as keyof typeof VEHICLE_TYPE_MAP] || q).join('、') || '无'}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ padding: '24rpx', textAlign: 'center', color: '#90A4AE' }}>
              <Text>暂无教练信息</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.timeSlotsSection}>
        <Text className={styles.sectionTitle}>
          <Text className={styles.sectionIcon}>⏰</Text>
          选择时段
        </Text>
        <View className={styles.timeSlotGrid}>
          {session.timeSlots.map(timeSlot => {
            const status = getTimeSlotStatus(timeSlot);
            const bookedCount = timeSlot.bookedCount || 0;
            return (
              <View
                key={timeSlot.id}
                className={classnames(
                  styles.timeSlotItem,
                  selectedTimeSlot === timeSlot.id && styles.selected,
                  status !== 'available' && status !== 'booked' && styles.disabled
                )}
                onClick={() => handleTimeSlotClick(timeSlot.id)}
              >
                <Text className={styles.timeSlotTime}>
                  {timeSlot.startTime} - {timeSlot.endTime}
                </Text>
                <Text className={styles.timeSlotCapacity}>
                  {bookedCount}/{timeSlot.capacity}人
                </Text>
                <View
                  className={classnames(
                    styles.timeSlotStatus,
                    status === 'available' && styles.statusAvailable,
                    status === 'full' && styles.statusFull,
                    status === 'booked' && styles.statusBooked
                  )}
                >
                  {status === 'available' && '可预约'}
                  {status === 'full' && '已满'}
                  {status === 'booked' && '已预约'}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View className={styles.rulesAlert}>
        <Text className={styles.rulesTitle}>📋 预约须知</Text>
        <View className={styles.rulesList}>
          <View className={styles.ruleItem}>
            <Text className={styles.ruleIcon}>✓</Text>
            <Text>理论考试通过后方可预约实操培训</Text>
          </View>
          <View className={styles.ruleItem}>
            <Text className={styles.ruleIcon}>✓</Text>
            <Text>同一车辆同一时段不可重复预约</Text>
          </View>
          <View className={styles.ruleItem}>
            <Text className={styles.ruleIcon}>✓</Text>
            <Text>缺席将进入补训名单，影响后续预约</Text>
          </View>
          <View className={styles.ruleItem}>
            <Text className={styles.ruleIcon}>✓</Text>
            <Text>车辆故障时系统自动安排换车或补训</Text>
          </View>
        </View>
      </View>

      <View className={styles.bookButtonContainer}>
        {!canBook.canBook && selectedTimeSlot && (
          <Text
            style={{
              fontSize: '24rpx',
              color: '#C62828',
              marginBottom: '16rpx',
              textAlign: 'center'
            }}
          >
            {canBook.reasons[0]}
          </Text>
        )}
        <Button
          className={styles.bookBtn}
          disabled={!selectedTimeSlot || !canBook.canBook}
          onClick={handleBook}
        >
          {selectedTimeSlot
            ? canBook.canBook
              ? '确认预约'
              : '不符合预约条件'
            : '请选择时段'}
        </Button>
      </View>
    </View>
  );
};

export default SessionDetailPage;
