import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import SessionCard from '@/components/SessionCard';
import { VEHICLE_TYPE_MAP } from '@/types/training';
import type { VehicleType } from '@/types/training';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const {
    initializeData,
    getCurrentUser,
    getAvailableSessions,
    getMyBookings,
    getMyRetraining
  } = useTrainingStore();

  const [selectedType, setSelectedType] = useState<VehicleType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  useDidShow(() => {
    console.log('[Home] 页面显示');
  });

  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const currentUser = getCurrentUser();
  const sessions = getAvailableSessions(selectedType === 'all' ? undefined : selectedType);
  const myBookings = getMyBookings();
  const myRetraining = getMyRetraining();

  const filteredSessions = useMemo(() => {
    return sessions;
  }, [sessions, selectedType]);

  const upcomingBookings = useMemo(() => {
    return myBookings.filter(b => b.status === 'confirmed').slice(0, 2);
  }, [myBookings]);

  const stats = useMemo(() => ({
    totalBookings: myBookings.length,
    completed: myBookings.filter(b => b.status === 'completed').length,
    retraining: myRetraining.length
  }), [myBookings, myRetraining]);

  const vehicleTypes = [
    { key: 'all' as const, label: '全部' },
    { key: 'tractor' as const, label: '拖拉机' },
    { key: 'harvester' as const, label: '联合收割机' },
    { key: 'transplanter' as const, label: '插秧机' }
  ];

  const quickActions = [
    { icon: '📅', text: '场次列表', action: () => {} },
    { icon: '📝', text: '培训记录', action: () => Taro.switchTab({ url: '/pages/training/index' }) },
    { icon: '🚨', text: '异常处理', action: () => Taro.navigateTo({ url: '/pages/exception/index' }) },
    { icon: '📊', text: '数据统计', action: () => Taro.navigateTo({ url: '/pages/statistics/index' }) }
  ];

  const goToRetraining = () => {
    Taro.navigateTo({ url: '/pages/retraining/index' });
  };

  return (
    <ScrollView
      className={styles.container}
      scrollY
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
      }}
    >
      <View className={styles.hero}>
        <Text className={styles.heroTitle}>
          您好，{currentUser?.name || '学员'}
        </Text>
        <Text className={styles.heroSubtitle}>
          {currentUser?.theoryPassed
            ? '理论已通过，可以预约实操培训'
            : '请先通过理论考试，再预约实操培训'}
        </Text>

        <View className={styles.quickStats}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.totalBookings}</Text>
            <Text className={styles.statLabel}>总预约</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.completed}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.retraining}</Text>
            <Text className={styles.statLabel}>待补训</Text>
          </View>
        </View>
      </View>

      {myRetraining.length > 0 && (
        <View className={styles.retrainingBanner}>
          <Text className={styles.bannerTitle}>
            <Text className={styles.bannerIcon}>⚠️</Text>
            您有 {myRetraining.length} 项补训待安排
          </Text>
          <Text className={styles.bannerText}>
            请及时安排补训，以免影响后续培训进度
          </Text>
          <Button className={styles.bannerBtn} onClick={goToRetraining}>
            查看补训
          </Button>
        </View>
      )}

      {upcomingBookings.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>近期培训</Text>
            <Text className={styles.viewAll} onClick={() => Taro.switchTab({ url: '/pages/booking/index' })}>
              查看全部
            </Text>
          </View>
          {upcomingBookings.map(booking => (
            <View key={booking.id} className="card">
              <View className="flexBetween">
                <Text style={{ fontSize: '30rpx', fontWeight: '600' }}>{booking.sessionTitle}</Text>
                <View className={classnames('tag', 'tagInfo')}>已预约</View>
              </View>
              <View style={{ marginTop: '16rpx', color: '#546E7A', fontSize: '26rpx' }}>
                📅 {booking.date} {booking.timeSlot}
              </View>
              <View style={{ marginTop: '8rpx', color: '#546E7A', fontSize: '26rpx' }}>
                🚜 {booking.vehiclePlate} | 👨‍🏫 {booking.coachName}
              </View>
            </View>
          ))}
        </View>
      )}

      <View className={styles.quickActions}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>快捷功能</Text>
        </View>
        <View className={styles.actionGrid}>
          {quickActions.map((action, index) => (
            <View key={index} className={styles.actionItem} onClick={action.action}>
              <Text className={styles.actionIcon}>{action.icon}</Text>
              <Text className={styles.actionText}>{action.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>可预约场次</Text>
          <Text className={styles.viewAll}>共 {filteredSessions.length} 场</Text>
        </View>

        <ScrollView className={styles.filterRow} scrollX>
          {vehicleTypes.map(type => (
            <View
              key={type.key}
              className={classnames(styles.filterItem, selectedType === type.key && styles.active)}
              onClick={() => setSelectedType(type.key)}
            >
              {type.label}
            </View>
          ))}
        </ScrollView>

        <View className={styles.sessionList}>
          {filteredSessions.length > 0 ? (
            filteredSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))
          ) : (
            <View className={styles.emptyState}>
              暂无{selectedType !== 'all' ? VEHICLE_TYPE_MAP[selectedType] : ''}可预约场次
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default HomePage;
