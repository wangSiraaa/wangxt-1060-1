import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import { VEHICLE_TYPE_MAP } from '@/types/training';
import type { TrainingSession, TimeSlot, RuleCheckResult } from '@/types/training';
import styles from './index.module.scss';

const BookingConfirmPage: React.FC = () => {
  const router = useRouter();
  const sessionId = router.params.sessionId as string;
  const timeSlotId = router.params.timeSlotId as string;

  const {
    getSessionById,
    getCurrentUser,
    canBookSession,
    createBooking,
    getVehicles,
    getUsers
  } = useTrainingStore();

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkResults, setCheckResults] = useState<RuleCheckResult[]>([]);

  const currentUser = getCurrentUser();
  const vehicles = getVehicles() || [];
  const users = getUsers() || [];

  useEffect(() => {
    if (sessionId) {
      const s = getSessionById(sessionId);
      setSession(s || null);
      
      if (s && timeSlotId) {
        const ts = s.timeSlots.find(t => t.id === timeSlotId);
        setTimeSlot(ts || null);
      }
    }

    if (sessionId && timeSlotId) {
      const { reasons } = canBookSession(sessionId, timeSlotId);
      setCheckResults(reasons.map(r => ({
        passed: false,
        rule: '',
        message: r,
        code: ''
      })));
    }
  }, [sessionId, timeSlotId, getSessionById, canBookSession]);

  const canBook = useMemo(() => {
    if (!session || !timeSlot) return false;
    const result = canBookSession(session.id, timeSlot.id);
    return result.canBook;
  }, [session, timeSlot, canBookSession]);

  const assignedVehicle = useMemo(() => {
    if (!session) return null;
    return vehicles.find(v => session.vehicleIds.includes(v.id) && v.status === 'available');
  }, [session, vehicles]);

  const assignedCoach = useMemo(() => {
    if (!session) return null;
    return users.find(u => session.coachIds.includes(u.id));
  }, [session, users]);

  const handleConfirm = async () => {
    if (!session || !timeSlot) return;

    Taro.showModal({
      title: '确认预约',
      content: `确认预约「${session.title}」${timeSlot.startTime}-${timeSlot.endTime} 的培训吗？`,
      success: async (res) => {
        if (res.confirm) {
          setLoading(true);
          
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const result = createBooking(session.id, timeSlot.id);
          
          setLoading(false);
          
          if (result.success) {
            Taro.showToast({
              title: '预约成功',
              icon: 'success',
              duration: 2000
            });
            
            setTimeout(() => {
              Taro.switchTab({ url: '/pages/booking/index' });
            }, 1500);
          } else {
            Taro.showModal({
              title: '预约失败',
              content: result.message,
              showCancel: false
            });
          }
        }
      }
    });
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  if (!session || !timeSlot) {
    return (
      <View className={styles.container} style={{ padding: '60rpx', textAlign: 'center' }}>
        <Text>信息加载失败</Text>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <View className={styles.confirmCard}>
          <Text className={styles.confirmTitle}>✓ 预约信息确认</Text>

          <View className={styles.infoGroup}>
            <Text className={styles.groupTitle}>
              <Text className={styles.groupIcon}>📅</Text>
              场次信息
            </Text>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>场次名称</Text>
              <Text className={styles.infoValue}>{session.title}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>培训日期</Text>
              <Text className={`${styles.infoValue} ${styles.valueHighlight}`}>{session.date}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>培训时段</Text>
              <Text className={`${styles.infoValue} ${styles.valueHighlight}`}>
                {timeSlot.startTime} - {timeSlot.endTime}
              </Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>培训场地</Text>
              <Text className={styles.infoValue}>{session.siteName}</Text>
            </View>
          </View>

          <View className={styles.infoGroup}>
            <Text className={styles.groupTitle}>
              <Text className={styles.groupIcon}>🚜</Text>
              培训资源
            </Text>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>车型</Text>
              <Text className={styles.infoValue}>{VEHICLE_TYPE_MAP[session.vehicleType]}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>车辆牌号</Text>
              <Text className={styles.infoValue}>
                {assignedVehicle?.plateNumber || '系统自动分配'}
              </Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>培训教练</Text>
              <Text className={styles.infoValue}>
                {assignedCoach?.name || '系统自动分配'}
              </Text>
            </View>
          </View>

          <View className={styles.infoGroup}>
            <Text className={styles.groupTitle}>
              <Text className={styles.groupIcon}>👤</Text>
              学员信息
            </Text>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>姓名</Text>
              <Text className={styles.infoValue}>{currentUser?.name}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>身份证号</Text>
              <Text className={styles.infoValue}>
                {currentUser?.idCard?.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2') || '-'}
              </Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>联系电话</Text>
              <Text className={styles.infoValue}>{currentUser?.phone || '-'}</Text>
            </View>
          </View>
        </View>

        <View className={styles.rulesCheck}>
          <Text className={styles.groupTitle}>
            <Text className={styles.groupIcon}>✅</Text>
            资格校验
          </Text>
          {checkResults.length > 0 ? (
            checkResults.map((result, idx) => (
              <View key={idx} className={styles.checkItem}>
                <View className={classnames(styles.checkIcon, result.passed ? styles.checkPass : styles.checkFail)}>
                  {result.passed ? '✓' : '✗'}
                </View>
                <Text className={styles.checkText}>{result.message}</Text>
              </View>
            ))
          ) : (
            <>
              <View className={styles.checkItem}>
                <View className={classnames(styles.checkIcon, styles.checkPass)}>✓</View>
                <Text className={styles.checkText}>理论考试已通过</Text>
              </View>
              <View className={styles.checkItem}>
                <View className={classnames(styles.checkIcon, styles.checkPass)}>✓</View>
                <Text className={styles.checkText}>无待处理补训</Text>
              </View>
              <View className={styles.checkItem}>
                <View className={classnames(styles.checkIcon, styles.checkPass)}>✓</View>
                <Text className={styles.checkText}>该时段无冲突</Text>
              </View>
              <View className={styles.checkItem}>
                <View className={classnames(styles.checkIcon, styles.checkPass)}>✓</View>
                <Text className={styles.checkText}>车辆可用</Text>
              </View>
            </>
          )}
        </View>

        <View className={styles.noticeBox}>
          <Text className={styles.noticeTitle}>
            <Text>⚠️</Text>
            预约须知
          </Text>
          <View className={styles.noticeContent}>
            <View className={styles.noticeItem}>• 请提前15分钟到达培训场地，携带有效身份证件</View>
            <View className={styles.noticeItem}>• 如需取消预约，请提前24小时操作</View>
            <View className={styles.noticeItem}>• 缺席将进入补训名单，缺席3次将暂停预约资格</View>
            <View className={styles.noticeItem}>• 培训时请穿着合适的服装，服从教练指挥</View>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.priceRow}>
          <Text className={styles.priceLabel}>培训费用</Text>
          <Text className={styles.priceValue}>0</Text>
          <Text className={styles.priceUnit}>元</Text>
        </View>
        <View className={styles.btnRow}>
          <Button className={classnames(styles.btn, styles.btnCancel)} onClick={handleCancel}>
            取消
          </Button>
          <Button
            className={classnames(styles.btn, styles.btnConfirm)}
            disabled={!canBook}
            onClick={handleConfirm}
          >
            {canBook ? '确认预约' : '不可预约'}
          </Button>
        </View>
      </View>

      {loading && (
        <View className={styles.loadingOverlay}>
          <View className={styles.loadingBox}>
            <Text className={styles.loadingIcon}>⏳</Text>
            <Text className={styles.loadingText}>预约处理中...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default BookingConfirmPage;
