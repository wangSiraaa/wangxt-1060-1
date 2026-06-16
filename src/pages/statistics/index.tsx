import React, { useState, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import { VEHICLE_TYPE_MAP } from '@/types/training';
import styles from './index.module.scss';

const StatisticsPage: React.FC = () => {
  const { getStatistics, sessions, bookings, vehicles, results } = useTrainingStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: string;
    let endDate = now.toISOString().split('T')[0];

    switch (timeRange) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'all':
      default:
        startDate = '2020-01-01';
        break;
    }

    return { startDate, endDate };
  }, [timeRange]);

  const stats = useMemo(() => {
    return getStatistics(dateRange.startDate, dateRange.endDate);
  }, [dateRange, getStatistics]);

  const vehicleStats = useMemo(() => {
    return vehicles.map(vehicle => {
      const vehicleBookings = bookings.filter(b => b.vehicleId === vehicle.id);
      const completedBookings = vehicleBookings.filter(b => b.status === 'completed');
      const totalSlots = sessions.reduce((sum, s) => {
        return sum + s.timeSlots.filter(slot => slot.vehicleId === vehicle.id).length;
      }, 0);
      const usedSlots = sessions.reduce((sum, s) => {
        return sum + s.timeSlots.filter(slot => slot.vehicleId === vehicle.id && slot.status !== 'available').length;
      }, 0);
      const utilization = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 1000) / 10 : 0;

      return {
        ...vehicle,
        bookingCount: vehicleBookings.length,
        completedCount: completedBookings.length,
        utilization
      };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [vehicles, bookings, sessions]);

  const dailyStats = useMemo(() => {
    const last7Days: { date: string; bookings: number; completed: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayBookings = bookings.filter(b => b.date === dateStr);
      const completed = dayBookings.filter(b => b.status === 'completed' || b.status === 'failed' || b.status === 'absent');

      last7Days.push({
        date: dateStr,
        bookings: dayBookings.length,
        completed: completed.length
      });
    }

    return last7Days;
  }, [bookings]);

  const maxDailyValue = useMemo(() => {
    const maxBookings = Math.max(...dailyStats.map(d => d.bookings), 1);
    const maxCompleted = Math.max(...dailyStats.map(d => d.completed), 1);
    return Math.max(maxBookings, maxCompleted);
  }, [dailyStats]);

  const timeRangeTabs = [
    { key: 'week' as const, label: '本周' },
    { key: 'month' as const, label: '本月' },
    { key: 'all' as const, label: '全部' }
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#4CAF50';
      case 'in_use':
        return '#1E88E5';
      case 'maintenance':
        return '#FF9800';
      case 'fault':
        return '#C62828';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return '可用';
      case 'in_use':
        return '使用中';
      case 'maintenance':
        return '维护中';
      case 'fault':
        return '故障';
      default:
        return '未知';
    }
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>场次统计分析</Text>
        <Text className={styles.subtitle}>培训数据可视化展示</Text>
        <View className={styles.dateRange}>
          <Text>📅</Text>
          <Text>统计范围：{dateRange.startDate} 至 {dateRange.endDate}</Text>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.timeRangeTabs}>
          {timeRangeTabs.map(tab => (
            <View
              key={tab.key}
              className={classnames(styles.timeRangeTab, timeRange === tab.key && styles.active)}
              onClick={() => setTimeRange(tab.key)}
            >
              {tab.label}
            </View>
          ))}
        </View>

        <View className={styles.overviewCard}>
          <Text className={styles.overviewTitle}>📊 核心指标概览</Text>
          <View className={styles.statsGrid}>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>
                {stats.totalSessions}
                <Text className={styles.statUnit}>场</Text>
              </Text>
              <Text className={styles.statLabel}>总场次</Text>
            </View>
            <View className={styles.statCard}>
              <Text className={styles.statValue}>
                {stats.totalBookings}
                <Text className={styles.statUnit}>人次</Text>
              </Text>
              <Text className={styles.statLabel}>总预约</Text>
            </View>
            <View className={classnames(styles.statCard, styles.bookingRate)}>
              <Text className={styles.statValue}>
                {stats.bookingRate}
                <Text className={styles.statUnit}>%</Text>
              </Text>
              <Text className={styles.statLabel}>预约率</Text>
            </View>
            <View className={classnames(styles.statCard, styles.passRate)}>
              <Text className={classnames(styles.statValue, styles.highlight)}>
                {stats.passRate}
                <Text className={styles.statUnit}>%</Text>
              </Text>
              <Text className={styles.statLabel}>通过率</Text>
            </View>
            <View className={classnames(styles.statCard, styles.absentRate)}>
              <Text className={classnames(styles.statValue, styles.warning)}>
                {stats.absentRate}
                <Text className={styles.statUnit}>%</Text>
              </Text>
              <Text className={styles.statLabel}>缺席率</Text>
            </View>
            <View className={classnames(styles.statCard, styles.utilization)}>
              <Text className={styles.statValue}>
                {stats.vehicleUtilization}
                <Text className={styles.statUnit}>%</Text>
              </Text>
              <Text className={styles.statLabel}>车辆利用率</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📈</Text>
            培训完成进度
          </Text>
          <View className={styles.progressRow}>
            <View className={styles.progressHeader}>
              <Text className={styles.progressLabel}>预约完成率</Text>
              <Text className={styles.progressValue}>{stats.bookingRate}%</Text>
            </View>
            <View className={styles.progressBar}>
              <View
                className={styles.progressFill}
                style={{ width: `${Math.min(stats.bookingRate, 100)}%` }}
              />
            </View>
          </View>
          <View className={styles.progressRow}>
            <View className={styles.progressHeader}>
              <Text className={styles.progressLabel}>考核通过率</Text>
              <Text className={styles.progressValue}>{stats.passRate}%</Text>
            </View>
            <View className={styles.progressBar}>
              <View
                className={classnames(styles.progressFill, styles.success)}
                style={{ width: `${Math.min(stats.passRate, 100)}%` }}
              />
            </View>
          </View>
          <View className={styles.progressRow}>
            <View className={styles.progressHeader}>
              <Text className={styles.progressLabel}>车辆利用率</Text>
              <Text className={styles.progressValue}>{stats.vehicleUtilization}%</Text>
            </View>
            <View className={styles.progressBar}>
              <View
                className={classnames(styles.progressFill, styles.warning)}
                style={{ width: `${Math.min(stats.vehicleUtilization, 100)}%` }}
              />
            </View>
          </View>
        </View>

        <View className={styles.chartSection}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📊</Text>
            近7日预约趋势
          </Text>
          <View className={styles.barChart}>
            {dailyStats.map((day, index) => (
              <View key={index} className={styles.barColumn}>
                <View
                  className={styles.barFill}
                  style={{ height: `${(day.bookings / maxDailyValue) * 100}%` }}
                >
                  {day.bookings > 0 && (
                    <Text className={styles.barValue}>{day.bookings}</Text>
                  )}
                </View>
                <View
                  className={classnames(styles.barFill, styles.small)}
                  style={{ height: `${(day.completed / maxDailyValue) * 100}%` }}
                />
                <Text className={styles.barLabel}>{formatDate(day.date)}</Text>
              </View>
            ))}
          </View>
          <View className={styles.legend}>
            <View className={styles.legendItem}>
              <View className={classnames(styles.legendDot, styles.primary)} />
              <Text>预约数</Text>
            </View>
            <View className={styles.legendItem}>
              <View className={classnames(styles.legendDot, styles.success)} />
              <Text>完成数</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>🚜</Text>
            车辆使用统计
          </Text>
          <View className={styles.vehicleStats}>
            {vehicleStats.map(vehicle => (
              <View key={vehicle.id} className={styles.vehicleStatRow}>
                <View className={styles.vehicleIcon}>🚜</View>
                <View className={styles.vehicleInfo}>
                  <Text className={styles.vehicleName}>
                    {VEHICLE_TYPE_MAP[vehicle.type]} - {vehicle.model}
                  </Text>
                  <Text className={styles.vehiclePlate}>
                    {vehicle.plateNumber} · {getStatusText(vehicle.status)}
                  </Text>
                </View>
                <View className={styles.vehicleUtil}>
                  <Text
                    className={styles.vehicleUtilValue}
                    style={{ color: getStatusColor(vehicle.status) as string }}
                  >
                    {vehicle.utilization}%
                  </Text>
                  <Text className={styles.vehicleUtilLabel}>
                    {vehicle.bookingCount}次预约
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>
            <Text className={styles.sectionIcon}>📋</Text>
            数据汇总
          </Text>
          <View className={styles.summaryList}>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>总培训场次</Text>
              <Text className={styles.summaryValue}>{stats.totalSessions} 场</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>总预约人次</Text>
              <Text className={styles.summaryValue}>{stats.totalBookings} 人次</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>待补训人数</Text>
              <Text className={classnames(styles.summaryValue, styles.negative)}>
                {stats.retrainingCount} 人
              </Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>车辆总数</Text>
              <Text className={styles.summaryValue}>{vehicles.length} 台</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>可用车辆</Text>
              <Text className={classnames(styles.summaryValue, styles.positive)}>
                {vehicles.filter(v => v.status === 'available').length} 台
              </Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>故障车辆</Text>
              <Text className={classnames(styles.summaryValue, styles.negative)}>
                {vehicles.filter(v => v.status === 'fault').length} 台
              </Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>成绩登记数</Text>
              <Text className={styles.summaryValue}>{results.length} 条</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default StatisticsPage;
