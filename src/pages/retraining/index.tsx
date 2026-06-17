import React, { useState, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import {
  RETRAINING_PRIORITY_MAP,
  VEHICLE_TYPE_MAP,
  RETRAINING_REASON_MAP
} from '@/types/training';
import type { RetrainingPriority } from '@/types/training';
import styles from './index.module.scss';

const RetrainingPage: React.FC = () => {
  const { getMyRetraining, getSessions, getAvailableSessions } = useTrainingStore();
  const [selectedPriority, setSelectedPriority] = useState<RetrainingPriority | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const retrainingItems = getMyRetraining() || [];
  const availableSessions = getAvailableSessions() || [];

  const filteredItems = useMemo(() => {
    let items = [...retrainingItems];
    
    if (selectedPriority !== 'all') {
      items = items.filter(item => item.priority === selectedPriority);
    }
    
    return items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [retrainingItems, selectedPriority]);

  const priorityTabs = [
    { key: 'all' as const, label: '全部' },
    { key: 'high' as const, label: '高优先级' },
    { key: 'medium' as const, label: '中优先级' },
    { key: 'low' as const, label: '低优先级' }
  ];

  const getPriorityClass = (priority: RetrainingPriority) => {
    switch (priority) {
      case 'high': return styles.priorityHigh;
      case 'medium': return styles.priorityMedium;
      case 'low': return styles.priorityLow;
      default: return styles.priorityMedium;
    }
  };

  const handleBookNow = (retrainingItem: any) => {
    const availableForType = availableSessions.filter(
      s => s.vehicleType === retrainingItem.vehicleType
    );

    if (availableForType.length === 0) {
      Taro.showModal({
        title: '暂无可用场次',
        content: `当前没有${VEHICLE_TYPE_MAP[retrainingItem.vehicleType]}的可预约场次，请稍后再试。`,
        showCancel: false
      });
      return;
    }

    Taro.showActionSheet({
      itemList: availableForType.map(s => `${s.title} - ${s.date}`),
      success: (res) => {
        const selectedSession = availableForType[res.tapIndex];
        Taro.navigateTo({
          url: `/pages/session-detail/index?sessionId=${selectedSession.id}&retrainingId=${retrainingItem.id}`
        });
      }
    });
  };

  const getReasonText = (reason: string) => {
    return RETRAINING_REASON_MAP[reason as keyof typeof RETRAINING_REASON_MAP] || reason;
  };

  const stats = useMemo(() => ({
    total: retrainingItems.length,
    high: retrainingItems.filter(i => i.priority === 'high').length,
    medium: retrainingItems.filter(i => i.priority === 'medium').length,
    low: retrainingItems.filter(i => i.priority === 'low').length
  }), [retrainingItems]);

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>补训安排</Text>
        <Text className={styles.subtitle}>
          {stats.total > 0
            ? `您有 ${stats.total} 项待补训，请尽快安排`
            : '暂无待补训项目，继续保持！'}
        </Text>
        <View className={styles.statsRow}>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{stats.high}</Text>
            <Text className={styles.statLabel}>高优先</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{stats.medium}</Text>
            <Text className={styles.statLabel}>中优先</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{stats.low}</Text>
            <Text className={styles.statLabel}>低优先</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.explanation}>
          <Text className={styles.explanationTitle}>补训优先级说明</Text>
          <View className={styles.explanationItem}>
            <Text className={styles.explanationIcon}>🔴</Text>
            <Text><strong>高优先级：</strong>缺席2次及以上、设备故障中断、教练停课</Text>
          </View>
          <View className={styles.explanationItem}>
            <Text className={styles.explanationIcon}>🟡</Text>
            <Text><strong>中优先级：</strong>考核不合格、首次缺席</Text>
          </View>
          <View className={styles.explanationItem}>
            <Text className={styles.explanationIcon}>🟢</Text>
            <Text><strong>低优先级：</strong>自愿申请补训</Text>
          </View>
        </View>

        <View className={styles.priorityTabs}>
          {priorityTabs.map(tab => (
            <View
              key={tab.key}
              className={classnames(styles.priorityTab, selectedPriority === tab.key && styles.active)}
              onClick={() => setSelectedPriority(tab.key)}
            >
              {tab.label}
            </View>
          ))}
        </View>

        <View className={styles.retrainingList}>
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <View key={item.id} className={styles.retrainingCard}>
                <View className={styles.retrainingHeader}>
                  <Text className={styles.retrainingTitle}>{item.sessionTitle || '补训安排'}</Text>
                  <View className={classnames(styles.priorityTag, getPriorityClass(item.priority))}>
                    {RETRAINING_PRIORITY_MAP[item.priority]}
                  </View>
                </View>

                {item.needsManualReview && (
                  <View style={{
                    background: '#FFF3E0',
                    padding: '12rpx 16rpx',
                    borderRadius: '8rpx',
                    marginBottom: '16rpx',
                    border: '2rpx dashed #FF9800'
                  }}>
                    <Text style={{ color: '#E65100', fontSize: '26rpx', fontWeight: '500' }}>
                      ⚠️ 连续缺席 {item.consecutiveAbsentCount || 2} 次，需人工审核后才能预约
                    </Text>
                  </View>
                )}

                <View className={styles.infoRow}>
                  <Text className={styles.infoIcon}>📅</Text>
                  <Text>原培训日期：{item.originalDate || '-'}</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoIcon}>🚜</Text>
                  <Text>培训车型：{VEHICLE_TYPE_MAP[item.vehicleType]}</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoIcon}>⏰</Text>
                  <Text>创建时间：{new Date(item.createdAt || item.createTime).toLocaleDateString()}</Text>
                </View>
                {item.expiresAt && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoIcon}>⚠️</Text>
                    <Text style={{ color: '#C62828' }}>
                      有效期至：{new Date(item.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View className={styles.reasonBox}>
                  <Text className={styles.reasonText}>
                    补训原因：{getReasonText(item.reason)}
                    {item.remarks && ` - ${item.remarks}`}
                  </Text>
                </View>

                <View className={styles.actionRow}>
                  <Button
                    className={classnames(styles.btn, styles.btnSecondary)}
                    onClick={() => {
                      let detail = `场次：${item.sessionTitle || '补训安排'}\n原因：${getReasonText(item.reason)}\n优先级：${RETRAINING_PRIORITY_MAP[item.priority]}`;
                      if (item.consecutiveAbsentCount) {
                        detail += `\n连续缺席：${item.consecutiveAbsentCount} 次`;
                      }
                      if (item.needsManualReview) {
                        detail += `\n审核状态：需要人工审核`;
                      }
                      if (item.remarks) {
                        detail += `\n备注：${item.remarks}`;
                      }
                      Taro.showModal({
                        title: '补训详情',
                        content: detail,
                        showCancel: false
                      });
                    }}
                  >
                    查看详情
                  </Button>
                  <Button
                    className={classnames(styles.btn, item.needsManualReview ? styles.btnSecondary : styles.btnPrimary)}
                    onClick={() => {
                      if (item.needsManualReview) {
                        Taro.showModal({
                          title: '需要人工审核',
                          content: '您的补训申请需要管理员审核，请联系培训站负责人处理。',
                          showCancel: false
                        });
                        return;
                      }
                      handleBookNow(item);
                    }}
                  >
                    {item.needsManualReview ? '待审核' : '立即预约'}
                  </Button>
                </View>
              </View>
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>✅</Text>
              <Text className={styles.emptyText}>
                {selectedPriority !== 'all'
                  ? `暂无${RETRAINING_PRIORITY_MAP[selectedPriority]}补训`
                  : '暂无待补训项目'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default RetrainingPage;
