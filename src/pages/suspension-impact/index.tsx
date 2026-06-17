import React, { useState, useMemo } from 'react';
import { View, Text, Button, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { usePullDownRefresh, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import {
  WEATHER_CONDITION_MAP,
  SUSPENSION_REASON_MAP,
  VEHICLE_TYPE_MAP,
  SESSION_STATUS_MAP
} from '@/types/training';
import type {
  WeatherCondition
} from '@/types/training';
import styles from './index.module.scss';

type ModalType = 'weather' | 'coachLeave' | null;

const SuspensionImpactPage: React.FC = () => {
  const router = useRouter();
  const {
    suspensions,
    coachLeaves,
    sites,
    getSuspensionById,
    getSuspensionImpact,
    resolveSuspension,
    getCoaches,
    handleWeatherSuspension,
    handleCoachLeave
  } = useTrainingStore();

  const [selectedSuspensionId, setSelectedSuspensionId] = useState<string | null>(
    router.params.suspensionId || null
  );
  const [activeTab, setActiveTab] = useState<'list' | 'detail' | 'leave'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState<ModalType>(null);

  const [weatherDate, setWeatherDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [weatherSiteId, setWeatherSiteId] = useState('');
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('rain');
  const [weatherDescription, setWeatherDescription] = useState('');

  const [leaveCoachId, setLeaveCoachId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [leaveEndDate, setLeaveEndDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [leaveReason, setLeaveReason] = useState('');

  const coaches = useMemo(() => getCoaches(), [getCoaches]);

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

  const sortedCoachLeaves = useMemo(() => {
    return [...coachLeaves].sort(
      (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );
  }, [coachLeaves]);

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

  const handleOpenWeatherModal = () => {
    if (sites.length > 0 && !weatherSiteId) {
      setWeatherSiteId(sites[0].id);
    }
    setShowModal('weather');
  };

  const handleSubmitWeatherSuspension = () => {
    if (!weatherSiteId) {
      Taro.showToast({ title: '请选择场地', icon: 'none' });
      return;
    }
    if (!weatherDescription.trim()) {
      Taro.showToast({ title: '请填写情况说明', icon: 'none' });
      return;
    }

    const suspension = handleWeatherSuspension(
      weatherDate,
      weatherSiteId,
      weatherCondition,
      weatherDescription
    );

    if (suspension) {
      setShowModal(null);
      setWeatherDescription('');
      setSelectedSuspensionId(suspension.id);
      setActiveTab('detail');
      Taro.showToast({
        title: `影响 ${suspension.affectedSessionIds.length} 场次`,
        icon: 'none',
        duration: 2000
      });
    } else {
      Taro.showToast({ title: '停训处理失败', icon: 'none' });
    }
  };

  const handleOpenCoachLeaveModal = () => {
    if (coaches.length > 0 && !leaveCoachId) {
      setLeaveCoachId(coaches[0].id);
    }
    setShowModal('coachLeave');
  };

  const handleSubmitCoachLeave = () => {
    if (!leaveCoachId) {
      Taro.showToast({ title: '请选择教练', icon: 'none' });
      return;
    }
    if (!leaveReason.trim()) {
      Taro.showToast({ title: '请填写请假原因', icon: 'none' });
      return;
    }
    if (leaveEndDate < leaveStartDate) {
      Taro.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }

    const result = handleCoachLeave(
      leaveCoachId,
      leaveStartDate,
      leaveEndDate,
      leaveReason
    );

    if (result.leaveRecord) {
      setShowModal(null);
      setLeaveReason('');
      setActiveTab('leave');
      Taro.showToast({
        title: `重分配 ${result.reassignedCount} 场次`,
        icon: 'none',
        duration: 2000
      });
    } else {
      Taro.showToast({ title: '请假登记失败', icon: 'none' });
    }
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

  const renderCoachLeaveList = () => {
    if (sortedCoachLeaves.length === 0) {
      return (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>👨‍🏫</Text>
          <Text className={styles.emptyText}>暂无教练请假记录</Text>
        </View>
      );
    }

    return (
      <View>
        {sortedCoachLeaves.map((leave) => (
          <View
            key={leave.id}
            className={classnames(
              styles.suspensionCard,
              leave.status === 'completed' && styles.resolved
            )}
          >
            <View className={styles.suspensionHeader}>
              <View>
                <Text className={styles.suspensionTitle}>{leave.coachName}</Text>
                <Text className={styles.suspensionDate}>
                  {'  '}
                  {leave.startDate} 至 {leave.endDate}
                </Text>
              </View>
              <View
                className={classnames(
                  styles.statusTag,
                  leave.status === 'completed' ? styles.handled : styles.pending
                )}
              >
                {leave.status === 'in_progress'
                  ? '部分替换'
                  : leave.status === 'completed'
                  ? '已完成'
                  : '待处理'}
              </View>
            </View>
            <View className={styles.suspensionDesc}>
              <Text>请假原因：{leave.reason}</Text>
            </View>
            <View className={styles.suspensionStats}>
              <Text>📋 影响场次：{leave.affectedSessionIds.length}</Text>
              <Text>✅ 已重分配：{leave.reassignedCount}</Text>
              <Text>⏳ 待改期：{leave.affectedSessionIds.length - leave.reassignedCount}</Text>
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
                const needsReview = studentBookings.some(
                  (b) => b.status === 'retraining' && (student.absentCount || 0) >= 2
                );
                return (
                  <View key={student.id} className={styles.studentItem}>
                    <View className={styles.studentInfo}>
                      <Text className={styles.studentName}>{student.name}</Text>
                      <Text className={styles.studentDetail}>
                        缺席次数：{student.absentCount || 0} · 补训次数：
                        {student.retrainingCount || 0}
                      </Text>
                    </View>
                    {needsReview ? (
                      <View className={styles.reviewBadge}>需人工审核</View>
                    ) : hasRetraining ? (
                      <View className={styles.reviewBadge} style={{
                        background: '#E3F2FD',
                        color: '#1565C0'
                      }}>
                        待补训
                      </View>
                    ) : null}
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

  const renderWeatherModal = () => {
    if (showModal !== 'weather') return null;

    const weatherOptions: WeatherCondition[] = [
      'rain', 'heavy_rain', 'storm', 'snow', 'fog', 'cloudy'
    ];

    return (
      <View className={styles.modalOverlay} onClick={() => setShowModal(null)}>
        <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <View className={styles.modalHeader}>
            <Text className={styles.modalTitle}>发起雨天停训</Text>
          </View>

          <View className={styles.modalBody}>
            <View className={styles.formItem}>
              <Text className={styles.formLabel}>停训日期</Text>
              <Input
                className={styles.formInput}
                type="text"
                value={weatherDate}
                placeholder="请选择日期"
                onInput={(e) => setWeatherDate(e.detail.value)}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>选择场地</Text>
              <View className={styles.pickerBox} onClick={() => {
                if (sites.length > 0) {
                  const currentIndex = sites.findIndex(s => s.id === weatherSiteId);
                  const nextIndex = (currentIndex + 1) % sites.length;
                  setWeatherSiteId(sites[nextIndex].id);
                }
              }}>
                <Text>{sites.find(s => s.id === weatherSiteId)?.name || '请选择场地'}</Text>
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>天气状况</Text>
              <View className={styles.weatherOptions}>
                {weatherOptions.map((cond) => (
                  <View
                    key={cond}
                    className={classnames(
                      styles.weatherOption,
                      weatherCondition === cond && styles.weatherOptionActive
                    )}
                    onClick={() => setWeatherCondition(cond)}
                  >
                    <Text className={styles.weatherOptionText}>
                      {WEATHER_CONDITION_MAP[cond]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>情况说明</Text>
              <Textarea
                className={styles.formTextarea}
                value={weatherDescription}
                placeholder="请简要描述停训原因，如：暴雨红色预警，场地积水严重"
                onInput={(e) => setWeatherDescription(e.detail.value)}
                maxlength={200}
              />
            </View>
          </View>

          <View className={styles.modalFooter}>
            <Button
              className={classnames(styles.modalBtn, styles.modalBtnSecondary)}
              onClick={() => setShowModal(null)}
            >
              取消
            </Button>
            <Button
              className={classnames(styles.modalBtn, styles.modalBtnPrimary)}
              onClick={handleSubmitWeatherSuspension}
            >
              确认停训
            </Button>
          </View>
        </View>
      </View>
    );
  };

  const renderCoachLeaveModal = () => {
    if (showModal !== 'coachLeave') return null;

    return (
      <View className={styles.modalOverlay} onClick={() => setShowModal(null)}>
        <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <View className={styles.modalHeader}>
            <Text className={styles.modalTitle}>登记教练请假</Text>
          </View>

          <View className={styles.modalBody}>
            <View className={styles.formItem}>
              <Text className={styles.formLabel}>请假教练</Text>
              <View className={styles.pickerBox} onClick={() => {
                if (coaches.length > 0) {
                  const currentIndex = coaches.findIndex(c => c.id === leaveCoachId);
                  const nextIndex = (currentIndex + 1) % coaches.length;
                  setLeaveCoachId(coaches[nextIndex].id);
                }
              }}>
                <Text>{coaches.find(c => c.id === leaveCoachId)?.name || '请选择教练'}</Text>
              </View>
            </View>

            <View className={styles.formRow}>
              <View className={styles.formItem} style={{ flex: 1 }}>
                <Text className={styles.formLabel}>开始日期</Text>
                <Input
                  className={styles.formInput}
                  type="text"
                  value={leaveStartDate}
                  placeholder="开始日期"
                  onInput={(e) => setLeaveStartDate(e.detail.value)}
                />
              </View>
              <View className={styles.formItem} style={{ flex: 1, marginLeft: '20rpx' }}>
                <Text className={styles.formLabel}>结束日期</Text>
                <Input
                  className={styles.formInput}
                  type="text"
                  value={leaveEndDate}
                  placeholder="结束日期"
                  onInput={(e) => setLeaveEndDate(e.detail.value)}
                />
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>请假原因</Text>
              <Textarea
                className={styles.formTextarea}
                value={leaveReason}
                placeholder="请填写请假原因，如：家中有事，需请假3天"
                onInput={(e) => setLeaveReason(e.detail.value)}
                maxlength={200}
              />
            </View>

            <View className={styles.tipBox}>
              <Text className={styles.tipText}>
                💡 系统将自动查找同资质替补教练，无法替换的场次转入待改期名单
              </Text>
            </View>
          </View>

          <View className={styles.modalFooter}>
            <Button
              className={classnames(styles.modalBtn, styles.modalBtnSecondary)}
              onClick={() => setShowModal(null)}
            >
              取消
            </Button>
            <Button
              className={classnames(styles.modalBtn, styles.modalBtnPrimary)}
              onClick={handleSubmitCoachLeave}
            >
              确认登记
            </Button>
          </View>
        </View>
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
            : activeTab === 'leave'
            ? `共 ${coachLeaves.length} 条请假记录`
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

        <View className={styles.actionButtons}>
          <Button
            className={classnames(styles.actionBtn, styles.actionBtnWeather)}
            onClick={handleOpenWeatherModal}
          >
            🌧️ 雨天停训
          </Button>
          <Button
            className={classnames(styles.actionBtn, styles.actionBtnCoach)}
            onClick={handleOpenCoachLeaveModal}
          >
            👨‍🏫 教练请假
          </Button>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>
              {suspensions.filter((s) => s.status === 'active').length}
            </Text>
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
        {activeTab !== 'detail' && (
          <View className={styles.tabs}>
            <View
              className={classnames(styles.tab, activeTab === 'list' && styles.active)}
              onClick={() => setActiveTab('list')}
            >
              停训记录
            </View>
            <View
              className={classnames(styles.tab, activeTab === 'leave' && styles.active)}
              onClick={() => setActiveTab('leave')}
            >
              教练请假
            </View>
          </View>
        )}

        {activeTab === 'list' && renderSuspensionList()}
        {activeTab === 'leave' && renderCoachLeaveList()}
        {activeTab === 'detail' && renderDetail()}
      </View>

      {renderWeatherModal()}
      {renderCoachLeaveModal()}
    </ScrollView>
  );
};

export default SuspensionImpactPage;
