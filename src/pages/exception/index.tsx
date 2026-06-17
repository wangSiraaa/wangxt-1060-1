import React, { useState, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import { VEHICLE_TYPE_MAP, EXCEPTION_TYPE_MAP } from '@/types/training';
import type { ExceptionType, ExceptionRecord } from '@/types/training';
import styles from './index.module.scss';

const EXCEPTION_TYPE_CLASS: Record<ExceptionType, string> = {
  vehicle_failure: 'typeVehicle',
  coach_absent: 'typeCoach',
  site_issue: 'typeSite',
  weather: 'typeSite',
  other: 'typeOther'
};

const ExceptionPage: React.FC = () => {
  const { getExceptions, handleVehicleFaultException, handleCoachAbsentException, getSessionById, getVehicleById, getCoachById } = useTrainingStore();
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'handled'>('all');
  const [selectedType, setSelectedType] = useState<ExceptionType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  usePullDownRefresh(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const exceptions = getExceptions() || [];

  const filteredExceptions = useMemo(() => {
    let items = [...exceptions];
    
    if (selectedStatus !== 'all') {
      items = items.filter(e => 
        selectedStatus === 'pending' ? !e.handled : e.handled
      );
    }
    
    if (selectedType !== 'all') {
      items = items.filter(e => e.type === selectedType);
    }
    
    return items.sort((a, b) => 
      new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );
  }, [exceptions, selectedStatus, selectedType]);

  const statusTabs = [
    { key: 'all' as const, label: '全部' },
    { key: 'pending' as const, label: '待处理' },
    { key: 'handled' as const, label: '已处理' }
  ];

  const typeTabs = [
    { key: 'all' as const, label: '全部类型' },
    { key: 'weather' as const, label: '天气停训' },
    { key: 'vehicle_failure' as const, label: '车辆故障' },
    { key: 'coach_absent' as const, label: '教练缺席' },
    { key: 'site_issue' as const, label: '场地问题' },
    { key: 'other' as const, label: '其他' }
  ];

  const getTypeClass = (type: ExceptionType) => {
    return EXCEPTION_TYPE_CLASS[type] || 'typeOther';
  };

  const handleException = (exception: ExceptionRecord) => {
    if (exception.type === 'weather') {
      Taro.showModal({
        title: '天气停训影响分析',
        content: '点击确定查看本次天气停训影响的车辆、学员和后续场次。',
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({
              url: `/pages/suspension-impact/index?suspensionId=${exception.id}`
            });
          }
        }
      });
    } else if (exception.type === 'vehicle_failure') {
      Taro.showModal({
        title: '处理车辆故障',
        content: '系统将自动查找可用车辆进行替换。无法替换时，已预约学员将自动转入补训名单。是否继续？',
        success: (res) => {
          if (res.confirm) {
            handleVehicleFaultException(exception.id);
            Taro.showToast({ title: '已处理', icon: 'success' });
          }
        }
      });
    } else if (exception.type === 'coach_absent') {
      Taro.showModal({
        title: '处理教练缺席',
        content: '系统将自动查找可用教练进行替换。无法替换时，已预约学员将自动转入补训名单。是否继续？',
        success: (res) => {
          if (res.confirm) {
            handleCoachAbsentException(exception.id);
            Taro.showToast({ title: '已处理', icon: 'success' });
          }
        }
      });
    } else {
      Taro.showModal({
        title: '异常处理',
        content: '请联系培训站负责人进行人工处理。',
        showCancel: false
      });
    }
  };

  const showDetail = (exception: ExceptionRecord) => {
    const session = getSessionById(exception.sessionId);
    const vehicle = exception.vehicleId ? getVehicleById(exception.vehicleId) : null;
    const coach = exception.coachId ? getCoachById(exception.coachId) : null;
    
    let detail = `异常类型：${EXCEPTION_TYPE_MAP[exception.type]}\n`;
    detail += `创建时间：${new Date(exception.createTime).toLocaleString()}\n`;
    detail += `场次：${session?.title || '未知'}\n`;
    if (vehicle) {
      detail += `车辆：${vehicle.plateNumber}（${VEHICLE_TYPE_MAP[vehicle.type]}）\n`;
      if (vehicle.faultDescription) {
        detail += `故障描述：${vehicle.faultDescription}\n`;
      }
    }
    if (coach) {
      detail += `教练：${coach.name}\n`;
    }
    detail += `\n异常描述：${exception.description}`;
    
    if (exception.handled && exception.handleMethod) {
      detail += `\n\n处理方式：${exception.handleMethod}`;
      if (exception.handleTime) {
        detail += `\n处理时间：${new Date(exception.handleTime).toLocaleString()}`;
      }
    }
    
    Taro.showModal({
      title: '异常详情',
      content: detail,
      showCancel: false
    });
  };

  const stats = useMemo(() => ({
    total: exceptions.length,
    pending: exceptions.filter(e => !e.handled).length,
    handled: exceptions.filter(e => e.handled).length,
    vehicleFault: exceptions.filter(e => e.type === 'vehicle_failure').length,
    coachAbsent: exceptions.filter(e => e.type === 'coach_absent').length
  }), [exceptions]);

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>异常处理中心</Text>
        <Text className={styles.subtitle}>
          {stats.pending > 0
            ? `您有 ${stats.pending} 项待处理异常，请及时处理`
            : '暂无待处理异常，运行正常'}
        </Text>
        <View className={styles.statsRow}>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{stats.total}</Text>
            <Text className={styles.statLabel}>全部</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{stats.pending}</Text>
            <Text className={styles.statLabel}>待处理</Text>
          </View>
          <View className={styles.statBox}>
            <Text className={styles.statValue}>{stats.handled}</Text>
            <Text className={styles.statLabel}>已处理</Text>
          </View>
        </View>
        <View style={{
          marginTop: '24rpx',
          display: 'flex',
          gap: '16rpx'
        }}>
          <Button
            style={{
              flex: 1,
              height: '72rpx',
              lineHeight: '72rpx',
              borderRadius: '16rpx',
              fontSize: '26rpx',
              background: 'rgba(255,255,255,0.25)',
              color: 'white',
              border: 'none',
              fontWeight: '500'
            }}
            onClick={() => Taro.navigateTo({ url: '/pages/suspension-impact/index' })}
          >
            📊 停训影响分析
          </Button>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.filterTabs}>
          {statusTabs.map(tab => (
            <View
              key={tab.key}
              className={classnames(styles.filterTab, selectedStatus === tab.key && styles.active)}
              onClick={() => setSelectedStatus(tab.key)}
            >
              {tab.label}
            </View>
          ))}
        </View>

        <View className={styles.typeTabs}>
          {typeTabs.map(tab => (
            <View
              key={tab.key}
              className={classnames(styles.typeTab, selectedType === tab.key && styles.active)}
              onClick={() => setSelectedType(tab.key)}
            >
              {tab.label}
            </View>
          ))}
        </View>

        <View className={styles.exceptionList}>
          {filteredExceptions.length > 0 ? (
            filteredExceptions.map(exception => (
              <View
                key={exception.id}
                className={classnames(
                  styles.exceptionCard,
                  exception.handled && styles.handled,
                  styles[getTypeClass(exception.type)]
                )}
              >
                <View className={styles.exceptionHeader}>
                  <Text className={styles.exceptionTitle}>
                    {EXCEPTION_TYPE_MAP[exception.type]}
                  </Text>
                  <View className={classnames(
                    styles.statusTag,
                    exception.handled ? styles.handled : styles.pending
                  )}>
                    {exception.handled ? '已处理' : '待处理'}
                  </View>
                </View>

                <View className={classnames(styles.typeTag, styles[getTypeClass(exception.type)])}>
                  {EXCEPTION_TYPE_MAP[exception.type]}
                </View>

                <View className={styles.infoRow}>
                  <Text className={styles.infoIcon}>📅</Text>
                  <Text>创建时间：{new Date(exception.createTime).toLocaleString()}</Text>
                </View>
                
                {exception.sessionId && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoIcon}>📋</Text>
                    <Text>关联场次：{getSessionById(exception.sessionId)?.title || '未知'}</Text>
                  </View>
                )}
                
                {exception.vehicleId && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoIcon}>🚜</Text>
                    <Text>
                      关联车辆：{getVehicleById(exception.vehicleId)?.plateNumber || '未知'}
                    </Text>
                  </View>
                )}
                
                {exception.coachId && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoIcon}>👨‍🏫</Text>
                    <Text>
                      关联教练：{getCoachById(exception.coachId)?.name || '未知'}
                    </Text>
                  </View>
                )}

                <View className={styles.descriptionBox}>
                  <Text>异常描述：{exception.description}</Text>
                </View>

                {exception.handled && exception.handleMethod && (
                  <View className={styles.handleBox}>
                    <Text className={styles.handleMethod}>
                      ✅ 处理方式：{exception.handleMethod}
                    </Text>
                    {exception.handleTime && (
                      <Text className={styles.handleDetail}>
                        处理时间：{new Date(exception.handleTime).toLocaleString()}
                      </Text>
                    )}
                    {exception.newVehicleId && (
                      <Text className={styles.handleDetail}>
                        替换车辆：{getVehicleById(exception.newVehicleId)?.plateNumber || '未知'}
                      </Text>
                    )}
                    {exception.newCoachId && (
                      <Text className={styles.handleDetail}>
                        替换教练：{getCoachById(exception.newCoachId)?.name || '未知'}
                      </Text>
                    )}
                  </View>
                )}

                <View className={styles.actionRow}>
                  <Button
                    className={classnames(styles.btn, styles.btnSecondary)}
                    onClick={() => showDetail(exception)}
                  >
                    查看详情
                  </Button>
                  {!exception.handled && (
                    exception.type === 'vehicle_failure' ||
                    exception.type === 'coach_absent' ||
                    exception.type === 'weather'
                  ) && (
                    <Button
                      className={classnames(
                        styles.btn,
                        exception.type === 'weather' ? styles.btnPrimary : styles.btnWarning
                      )}
                      onClick={() => handleException(exception)}
                    >
                      {exception.type === 'weather' ? '查看影响' : '立即处理'}
                    </Button>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>✅</Text>
              <Text className={styles.emptyText}>
                {selectedStatus === 'pending'
                  ? '暂无待处理异常'
                  : selectedStatus === 'handled'
                  ? '暂无已处理异常'
                  : selectedType !== 'all'
                  ? `暂无${EXCEPTION_TYPE_MAP[selectedType]}异常`
                  : '暂无异常记录'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default ExceptionPage;
