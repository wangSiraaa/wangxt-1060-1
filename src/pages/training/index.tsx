import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import { RESULT_STATUS_MAP, VEHICLE_TYPE_MAP } from '@/types/training';
import type { ResultStatus, VehicleType } from '@/types/training';
import styles from './index.module.scss';

const TrainingPage: React.FC = () => {
  const { getMyBookings, getMyResults } = useTrainingStore();
  const [activeType, setActiveType] = useState<'all' | VehicleType>('all');
  const [refreshing, setRefreshing] = useState(false);

  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const allResults = getMyResults();

  const filteredResults = useMemo(() => {
    return allResults.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allResults, activeType]);

  const stats = useMemo(() => {
    const completed = allResults.filter(r => r.status === 'passed' || r.status === 'failed').length;
    const passed = allResults.filter(r => r.status === 'passed').length;
    const avgScore = completed > 0
      ? allResults.filter(r => r.score !== undefined)
          .reduce((sum, r) => sum + (r.score || 0), 0) / completed
      : 0;
    const passRate = completed > 0 ? Math.round((passed / completed) * 100) : 0;
    return { total: allResults.length, completed, passed, avgScore: avgScore.toFixed(1), passRate };
  }, [allResults]);

  const types = [
    { key: 'all' as const, label: '全部' },
    { key: 'tractor' as const, label: '拖拉机' },
    { key: 'harvester' as const, label: '联合收割机' },
    { key: 'transplanter' as const, label: '插秧机' }
  ];

  const getStatusColor = (status: ResultStatus) => {
    switch (status) {
      case 'passed': return '#2E7D32';
      case 'failed': return '#C62828';
      case 'absent': return '#EF6C00';
      case 'equipment_fault': return '#1565C0';
      default: return '#546E7A';
    }
  };

  const emptyState = () => (
    <View className={styles.emptyState}>
      <Text className={styles.emptyIcon}>📝</Text>
      <Text className={styles.emptyText}>暂无培训记录</Text>
    </View>
  );

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
      <View className={styles.statsBar}>
        <Text className={styles.statsTitle}>培训统计</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statBox}>
            <Text className={styles.statBoxValue}>{stats.completed}</Text>
            <Text className={styles.statBoxLabel}>已完成培训</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statBoxValue}>{stats.passRate}%</Text>
            <Text className={styles.statBoxLabel}>通过率</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statBoxValue}>{stats.avgScore}</Text>
            <Text className={styles.statBoxLabel}>平均分</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statBoxValue}>{stats.total}</Text>
            <Text className={styles.statBoxLabel}>总场次</Text>
          </View>
        </View>
      </View>

      <View className={styles.progressSection}>
        <Text className={styles.progressTitle}>培训进度</Text>
        <View className={styles.progressBar}>
          <View
            className={styles.progressFill}
            style={{ width: `${Math.min(stats.passRate, 100)}%` }}
          />
        </View>
        <Text className={styles.progressText}>
          已完成 {stats.completed} 场，通过 {stats.passed} 场
        </Text>
      </View>

      <View className={styles.filterSection}>
        <ScrollView className={styles.tabs} scrollX>
          {types.map(type => (
            <View
              key={type.key}
              className={classnames(styles.tab, activeType === type.key && styles.active)}
              onClick={() => setActiveType(type.key)}
            >
              {type.label}
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.recordList}>
        {filteredResults.length > 0 ? (
          filteredResults.map(result => (
            <View key={result.id} className={styles.recordItem}>
              <View className={styles.recordHeader}>
                <Text className={styles.recordTitle}>{result.sessionTitle}</Text>
                <View
                  className={classnames('tag', 
                    result.status === 'passed' ? 'tagSuccess' : 
                    result.status === 'failed' ? 'tagError' : 'tagWarning')}
                >
                  {RESULT_STATUS_MAP[result.status]}
                </View>
              </View>

              <View className={styles.recordContent}>
                <View className={styles.recordRow}>
                  <Text className={styles.recordIcon}>📅</Text>
                  <Text>{result.date} {result.timeSlot}</Text>
                </View>
                <View className={styles.recordRow}>
                  <Text className={styles.recordIcon}>🚜</Text>
                  <Text>{result.vehiclePlate} · {result.vehicleType ? VEHICLE_TYPE_MAP[result.vehicleType] : ''}</Text>
                </View>
                <View className={styles.recordRow}>
                  <Text className={styles.recordIcon}>👨‍🏫</Text>
                  <Text>{result.coachName}</Text>
                </View>
                {result.remarks && (
                  <View className={styles.recordRow} style={{ color: '#C62828' }}>
                    <Text className={styles.recordIcon}>📝</Text>
                    <Text>{result.remarks}</Text>
                  </View>
                )}
              </View>

              <View className={styles.recordFooter}>
                <View className={styles.scoreBox}>
                  {result.score !== undefined ? (
                    <>
                      <Text
                        className={styles.scoreValue}
                        style={{ color: getStatusColor(result.status) }}
                      >
                        {result.score}
                      </Text>
                      <Text className={styles.scoreLabel}>分</Text>
                    </>
                  ) : (
                    <Text className={styles.scoreLabel} style={{ color: getStatusColor(result.status) }}>
                      {RESULT_STATUS_MAP[result.status]}
                    </Text>
                  )}
                </View>
                <Text className={styles.recordDate}>
                  登记于 {new Date(result.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          emptyState()
        )}
      </View>
    </ScrollView>
  );
};

export default TrainingPage;
