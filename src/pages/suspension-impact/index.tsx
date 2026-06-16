import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { usePullDownRefresh, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import {
  WEATHER_CONDITION_MAP,
  SUSPENSION_REASON_MAP,
  VEHICLE_TYPE_MAP,
  SESSION_STATUS_MAP,
  RETRAINING_REASON_MAP
} from '@/types/training';
import type { TrainingSuspension } from '@/types/training';
import styles from './index.module.scss';

const SuspensionImpactPage: React.FC = () => {
  const router = useRouter();
  const {
    suspensions,
    getSuspensionById,
    getSuspensionImpact,
    resolveSuspension,
    getVehicleById,
    getCoachById
  } = useTrainingStore();

  const [selectedSuspensionId, setSelectedSuspensionId] = useState<string | null>(
    router.params.suspensionId || null
  );
  const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');
  const [refreshing, setRefreshing] = useState(false);

  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const sortedSuspensions = useMemo(() => {
    return [...suspensions].sort(
      (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );
  }, [suspensions]);

  const selectedSuspension = useMemo(() => {
    if (!selectedSuspensionId) return null;
    return getSuspensionById(selectedSuspensionId);
  }, [selectedSuspensionId, getSuspensionById]);

  const impactData = useMemo(() => {
    if (!selectedSuspensionId) return null;
    return getSuspensionImpact(selectedSuspensionId);
  }, [selectedSuspensionId, getSuspensionImpact]);

  const handleViewDetail = (suspensionId: string) => {
    setSelectedSuspensionId(suspensionId);
    setActiveTab('detail');
  };

  const handleBackToList = () => {
    setSelectedSuspensionId(null);
    setActiveTab('list');
  };

  const handleResolve = () => {
    if (!selectedSuspensionId) return;
    Taro.showModal({
      title: '确认解决',
      content: '确认该停训事件已处理完毕？所有受影响学员应已完成改期或补训。',
      success: (res) => {
        if (res.confirm) {
          resolveSuspension(selectedSuspensionId);
          Taro.showToast({ title: '已标记为解决', icon: 'success' });
        }
      }
    });
  };

  const getVehicleStatusClass = (status: string) => {
    switch (status) {
      case 'available':
        return styles.statusAvailable;
      case 'in_use':
        return styles.statusInUse;
      case 'fault':
        return styles.statusFault;
      default:
        return styles.statusAvailable;
    }
  };

  const getVehicleStatusText = (status: string) => {
    const map: Record<string, string> = {
      available: '可用',
      in_use: '使用中',
      maintenance: '维护中',
      fault: '故障'
    };
    return map[status] || status;
  };

  const renderSuspensionList = () => {
    if (sortedSuspensions.length === 0) {
      return (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>☀️</Text>
          <Text className={styles.emptyText}>暂无停训记录，训练正常进行中</Text>
        </View>
      );
    }

    return (
      <View>
        {sortedSuspensions.map((suspension) => (
          <View
            key={suspension.id}
            className={classnames(
              styles.suspensionCard,
              suspension.status === 'resolved' && styles.resolved
            )}
            onClick={() => handleViewDetail(suspension.id)}
          >
            <View className={styles.suspensionHeader}>
              <View>
                <Text className={styles.suspensionTitle}>
                  {SUSPENSION_REASON_MAP[suspension.reason]}
                </Text>
                <Text className={styles.suspensionDate}>
                  {'  '}
                  {suspension.date} · {suspension.siteName}
                </Text>
              </View>
              <View
                className={classnames(
                  styles.statusTag,
                  suspension.status === 'resolved' ? styles.handled : styles.pending
                )}
              >
                {suspension.status === 'resolved' ? '已解决' : '进行中'}
              </View>
            </View>
            <View className={styles.suspensionDesc}>
              {suspension.weatherCondition && (
                <Text className={styles.weatherBadge}>
                  🌤️ {WEATHER_CONDITION_MAP[suspension.weatherCondition]}
                </Text>
              )}
              <Text style={{ marginLeft: '16rpx' }}>{suspension.description}</Text>
            </View>
            <View className={styles.suspensionStats}>
              <Text>🚜 影响车辆：{suspension.affectedVehicleIds.length}</Text>
              <Text>👥 影响学员：{suspension.affectedStudentIds.length}</Text>
              <Text>📋 影响场次：{suspension.affectedSessionIds.length}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderDetail = () => {
    if (!selectedSuspension || !impactData) {
      return (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📊</Text>
          <Text className={styles.emptyText}>请选择停训记录查看详情</Text>
        </View>
      );
    }

    const { affectedVehicles, affectedStudents, affectedBookings, subsequentSessions } =
      impactData;

    return (
      <View>
        <View className={styles.warningBox}>
          <Text className={styles.warningText}>
            ⚠️ 本次停训影响 {affectedVehicles.length} 辆车、{affectedStudents.length} 名学员、
            {subsequentSessions.length} 个后续场次。请尽快安排改期或补训。
          </Text>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>
              <Text className={styles.sectionIcon}>🚜</Text> 受影响车辆
            </Text>
            <Text className={styles.sectionCount}>{affectedVehicles.length} 辆</Text>
          </View>
          {affectedVehicles.length > 0 ? (
            <View className={styles.vehicleList}>
              {affectedVehicles.map((vehicle) => (
                <View key={vehicle.id} className={styles.vehicleItem}>
                  <View className={styles.vehicleInfo}>
                    <Text className={styles.vehiclePlate}>{vehicle.plateNumber}</Text>
                    <Text className={styles.vehicleType}>
                      {VEHICLE_TYPE_MAP[vehicle.type]} · {vehicle.model}
                    </Text>
                  </View>
                  <View
                    className={classnames(styles.vehicleStatus, getVehicleStatusClass(vehicle.status))}
                  >
                    {getVehicleStatusText(vehicle.status)}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>无受影响车辆</Text>
            </View>
          )}
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>
              <Text className={styles.sectionIcon}>👥</Text> 受影响学员
            </Text>
            <Text className={styles.sectionCount}>{affectedStudents.length} 人</Text>
          </View>
          {affectedStudents.length > 0 ? (
            <View className={styles.studentList}>
              {affectedStudents.map((student) => {
                const studentBookings = affectedBookings.filter(
                  (b) => b.studentId === student.id
                );
                const hasRetraining = studentBookings.some((b) => b.status === 'retraining');
                return (
                  <View key={student.id} className={styles.studentItem}>
                    <View className={styles.studentInfo}>
                      <Text className={styles.studentName}>{student.name}</Text>
                      <Text className={styles.studentDetail}>
                        缺席次数：{student.absentCount || 0} · 补训次数：
                        {student.retrainingCount || 0}
                      </Text>
                    </View>
                    {hasRetraining && (
                      <View className={styles.reviewBadge}>待补训</View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>无受影响学员</Text>
            </View>
          )}
        </View>

        {subsequentSessions.length > 0 && (
          <View>
            <View className={styles.chainArrow}>⬇️ 连锁影响 ⬇️</View>

            <View className={styles.section}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>
                  <Text className={styles.sectionIcon}>📅</Text> 受影响的后续场次
                </Text>
                <Text className={styles.sectionCount}>{subsequentSessions.length} 场</Text>
              </View>
              <View className={styles.sessionList}>
                {subsequentSessions.map((session) => (
                  <View key={session.id} className={styles.sessionItem}>
                    <Text className={styles.sessionTitle}>{session.title}</Text>
                    <View className={styles.sessionMeta}>
                      <View className={styles.metaItem}>📅 {session.date}</View>
                      <View className={styles.metaItem}>
                        📍 {session.siteName}
                      </View>
                      <View className={styles.metaItem}>
                        👥 {session.bookedCount}/{session.capacity}
                      </View>
                      <View className={styles.metaItem}>
                        🚜 {session.vehicleTypeName}
                      </View>
                      <View className={styles.metaItem}>
                        状态：{SESSION_STATUS_MAP[session.status]}
                      </View>
                    </View>
                    <View className={styles.sessionMeta}>
                      <View className={styles.metaItem}>
                        👨‍🏫 {session.coachNames.join('、')}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {selectedSuspension.status === 'active' && (
          <View className={styles.actionRow}>
            <Button className={classnames(styles.btn, styles.btnSecondary)} onClick={handleBackToList}>
              返回列表
            </Button>
            <Button className={classnames(styles.btn, styles.btnPrimary)} onClick={handleResolve}>
              标记已解决
            </Button>
          </View>
        )}
      </View>
    );
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
      <View className={styles.header}>
        <Text className={styles.title}>停训影响分析</Text>
        <Text className={styles.subtitle}>
          {activeTab === 'list'
            ? `共 ${suspensions.length} 条停训记录`
            : selectedSuspension
            ? `${SUSPENSION_REASON_MAP[selectedSuspension.reason]} · ${selectedSuspension.date}`
            : '查看停训详情'}
        </Text>

        {selectedSuspension && activeTab === 'detail' && (
          <View className={styles.suspensionInfo}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>停训原因：</Text>
              <Text className={styles.infoValue}>
                {SUSPENSION_REASON_MAP[selectedSuspension.reason]}
              </Text>
            </View>
            {selectedSuspension.weatherCondition && (
              <View className={styles.infoItem}>
                <Text className={styles.infoLabel}>天气状况：</Text>
                <Text className={classnames(styles.infoValue, styles.weatherBadge)}>
                  🌤️ {WEATHER_CONDITION_MAP[selectedSuspension.weatherCondition]}
                </Text>
              </View>
            )}
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>场地：</Text>
              <Text className={styles.infoValue}>{selectedSuspension.siteName}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>情况说明：</Text>
              <Text className={styles.infoValue}>{selectedSuspension.description}</Text>
            </View>
          </View>
        )}

        <View className={styles.statsRow}>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{suspensions.filter((s) => s.status === 'active').length}</Text>
            <Text className={styles.statLabel}>进行中</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>
              {suspensions.reduce((sum, s) => sum + s.affectedVehicleIds.length, 0)}
            </Text>
            <Text className={styles.statLabel}>影响车辆</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>
              {suspensions.reduce((sum, s) => sum + s.affectedStudentIds.length, 0)}
            </Text>
            <Text className={styles.statLabel}>影响学员</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.tabs}>
          <View
            className={classnames(styles.tab, activeTab === 'list' && styles.active)}
            onClick={handleBackToList}
          >
            停训列表
          </View>
          <View
            className={classnames(styles.tab, activeTab === 'detail' && styles.active)}
            onClick={() => selectedSuspensionId && setActiveTab('detail')}
          >
            影响详情
          </View>
        </View>

        {activeTab === 'list' ? renderSuspensionList() : renderDetail()}
      </View>
    </ScrollView>
  );
};

export default SuspensionImpactPage;
