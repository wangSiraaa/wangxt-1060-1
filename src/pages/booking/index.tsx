import React, { useState, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import BookingCard from '@/components/BookingCard';
import type { BookingStatus, Booking } from '@/types/training';
import styles from './index.module.scss';

const BookingPage: React.FC = () => {
  const {
    getMyBookings,
    cancelBooking,
    getSessions
  } = useTrainingStore();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const allBookings = getMyBookings() || [];

  const filteredBookings = useMemo(() => {
    const statusMap: Record<number, BookingStatus[]> = {
      0: ['confirmed'],
      1: ['completed'],
      2: ['cancelled', 'absent', 'failed'],
      3: ['retraining']
    };
    return allBookings.filter(b => statusMap[activeTab]?.includes(b.status));
  }, [allBookings, activeTab]);

  const stats = useMemo(() => ({
    upcoming: allBookings.filter(b => b.status === 'confirmed').length,
    completed: allBookings.filter(b => b.status === 'completed').length,
    retraining: allBookings.filter(b => b.status === 'retraining').length
  }), [allBookings]);

  const tabs = [
    { label: '待培训', count: stats.upcoming },
    { label: '已完成', count: stats.completed },
    { label: '已取消', count: allBookings.filter(b => ['cancelled', 'absent', 'failed'].includes(b.status)).length },
    { label: '待补训', count: stats.retraining }
  ];

  const handleCancelBooking = (booking: Booking) => {
    Taro.showModal({
      title: '取消预约',
      content: `确定要取消「${booking.sessionTitle}」的预约吗？`,
      success: (res) => {
        if (res.confirm) {
          const result = cancelBooking(booking.id, '用户主动取消');
          if (result) {
            Taro.showToast({ title: '已取消', icon: 'success' });
          }
        }
      }
    });
  };

  const goToBook = () => {
    Taro.switchTab({ url: '/pages/home/index' });
  };

  const renderEmpty = () => (
    <View className={styles.emptyState}>
      <Text className={styles.emptyIcon}>📋</Text>
      <Text className={styles.emptyText}>
        {activeTab === 0 && '暂无待培训的预约'}
        {activeTab === 1 && '暂无已完成的培训记录'}
        {activeTab === 2 && '暂无已取消的预约记录'}
        {activeTab === 3 && '暂无待补训的记录'}
      </Text>
      {activeTab === 0 && (
        <Button className={styles.emptyBtn} onClick={goToBook}>
          去预约
        </Button>
      )}
    </View>
  );

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View className={styles.statCards}>
          <View className={styles.statCard}>
            <Text className={styles.statCardNumber}>{stats.upcoming}</Text>
            <Text className={styles.statCardLabel}>待培训</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statCardNumber}>{stats.completed}</Text>
            <Text className={styles.statCardLabel}>已完成</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statCardNumber}>{stats.retraining}</Text>
            <Text className={styles.statCardLabel}>待补训</Text>
          </View>
        </View>

        <View className={styles.tabs}>
          {tabs.map((tab, index) => (
            <View
              key={index}
              className={classnames(styles.tab, activeTab === index && styles.active)}
              onClick={() => setActiveTab(index)}
            >
              {tab.label}
              {tab.count > 0 && (
                <Text style={{ marginLeft: '8rpx', color: activeTab === index ? '#1E88E5' : '#90A4AE' }}>
                  ({tab.count})
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.content}>
        {[0, 1, 2, 3].map(tabIndex => (
          <View
            key={tabIndex}
            className={classnames(styles.tabContent, activeTab === tabIndex && styles.active)}
          >
            {filteredBookings.length > 0 ? (
              <View className={styles.listContainer}>
                {filteredBookings.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    showActions={tabIndex === 0}
                    onCancel={handleCancelBooking}
                    onDetail={() => {
                      Taro.navigateTo({
                        url: `/pages/session-detail/index?sessionId=${booking.sessionId}`
                      });
                    }}
                  />
                ))}
              </View>
            ) : (
              renderEmpty()
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export default BookingPage;
