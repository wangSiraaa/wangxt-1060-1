import React, { useState, useEffect } from 'react';
import { View, Text, Button, Input, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import useTrainingStore from '@/store/useTrainingStore';
import type { Booking, ResultStatus } from '@/types/training';
import styles from './index.module.scss';

const ResultRegisterPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.bookingId as string;

  const { getBookingById, registerResult } = useTrainingStore();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState<ResultStatus | null>(null);
  const [score, setScore] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [equipmentFault, setEquipmentFault] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (bookingId) {
      const b = getBookingById(bookingId);
      setBooking(b || null);
    }
  }, [bookingId, getBookingById]);

  const statusOptions = [
    { value: 'passed' as const, label: '合格通过', icon: '✅', color: '#2E7D32' },
    { value: 'failed' as const, label: '不合格', icon: '❌', color: '#C62828' },
    { value: 'absent' as const, label: '学员缺席', icon: '⏰', color: '#EF6C00' },
    { value: 'equipment_fault' as const, label: '设备故障', icon: '🔧', color: '#1565C0' }
  ];

  const canSubmit = () => {
    if (!status) return false;
    if (status === 'passed' && (!score || parseInt(score) < 60)) return false;
    if (status === 'failed' && (!score || parseInt(score) > 0)) return true;
    return true;
  };

  const handleSubmit = async () => {
    if (!booking || !status) return;

    const scoreNum = status === 'passed' || status === 'failed' ? parseInt(score) || 0 : undefined;

    let confirmMsg = `确认登记「${booking.sessionTitle}」的培训结果为「${statusOptions.find(o => o.value === status)?.label}」吗？`;
    if (scoreNum !== undefined) {
      confirmMsg += `\n成绩：${scoreNum}分`;
    }
    if (equipmentFault) {
      confirmMsg += `\n存在设备故障，系统将自动安排换车或补训`;
    }

    Taro.showModal({
      title: '确认登记',
      content: confirmMsg,
      success: async (res) => {
        if (res.confirm) {
          setLoading(true);
          
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const result = registerResult(
            booking.id,
            status,
            scoreNum,
            remarks || undefined,
            equipmentFault
          );
          
          setLoading(false);
          
          if (result.success) {
            let successMsg = '登记成功';
            if (status === 'absent' || status === 'failed' || status === 'equipment_fault') {
              successMsg += '，学员已加入补训名单';
            }
            if (equipmentFault) {
              successMsg += '，已创建异常处理记录';
            }
            
            Taro.showToast({
              title: successMsg,
              icon: 'success',
              duration: 2500
            });
            
            setTimeout(() => {
              Taro.navigateBack();
            }, 1500);
          } else {
            Taro.showModal({
              title: '登记失败',
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

  if (!booking) {
    return (
      <View className={styles.container} style={{ padding: '60rpx', textAlign: 'center' }}>
        <Text>预约信息不存在</Text>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <View className={styles.bookingInfo}>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>场次名称</Text>
            <Text className={styles.infoValue}>{booking.sessionTitle}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>培训日期</Text>
            <Text className={styles.infoValue}>{booking.date}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>培训时段</Text>
            <Text className={styles.infoValue}>{booking.timeSlot}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>学员姓名</Text>
            <Text className={styles.infoValue}>{booking.studentName}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>培训车辆</Text>
            <Text className={styles.infoValue}>{booking.vehiclePlate}</Text>
          </View>
          {booking.isRetraining && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>补训原因</Text>
              <Text className={styles.infoValue} style={{ color: '#C62828' }}>
                {booking.retrainingReason}
              </Text>
            </View>
          )}
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>培训结果</Text>
          <View className={styles.statusOptions}>
            {statusOptions.map(option => (
              <View
                key={option.value}
                className={classnames(styles.statusOption, status === option.value && styles.selected)}
                onClick={() => setStatus(option.value)}
              >
                <Text className={styles.statusIcon}>{option.icon}</Text>
                <Text className={styles.statusText} style={{ color: option.color }}>
                  {option.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {(status === 'passed' || status === 'failed') && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>培训成绩</Text>
            <View className={styles.scoreSection}>
              <Input
                className={styles.scoreInput}
                type="number"
                placeholder="请输入分数"
                value={score}
                onInput={(e) => setScore(e.detail.value)}
                maxLength={3}
              />
              <Text className={styles.scoreUnit}>分</Text>
            </View>
            <Text style={{ fontSize: '24rpx', color: '#90A4AE', marginTop: '16rpx' }}>
              60分及以上为合格，满分100分
            </Text>
          </View>
        )}

        {status === 'failed' && (
          <View className={styles.equipmentSection}>
            <Text className={styles.sectionWarning}>
              ⚠️ 不合格学员将自动进入补训名单
            </Text>
          </View>
        )}

        {status === 'absent' && (
          <View className={styles.equipmentSection}>
            <Text className={styles.sectionWarning}>
              ⚠️ 缺席学员将自动进入补训名单，并记录缺席次数
            </Text>
          </View>
        )}

        {(status === 'equipment_fault' || (status !== 'absent' && status !== 'equipment_fault')) && (
          <View className={styles.section}>
            <View
              className={styles.checkboxRow}
              onClick={() => setEquipmentFault(!equipmentFault)}
            >
              <View className={classnames(styles.checkbox, equipmentFault && styles.checked)}>
                {equipmentFault && '✓'}
              </View>
              <Text className={styles.checkboxLabel}>
                是否存在设备故障（勾选后将创建异常记录，安排换车或补训）
              </Text>
            </View>
          </View>
        )}

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>备注信息</Text>
          <Textarea
            className={styles.remarksInput}
            placeholder="请输入备注信息（可选）"
            value={remarks}
            onInput={(e) => setRemarks(e.detail.value)}
            maxlength={200}
          />
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.btnRow}>
          <Button className={classnames(styles.btn, styles.btnCancel)} onClick={handleCancel}>
            取消
          </Button>
          <Button
            className={classnames(styles.btn, styles.btnSubmit)}
            disabled={!canSubmit()}
            onClick={handleSubmit}
          >
            确认登记
          </Button>
        </View>
      </View>

      {loading && (
        <View className={styles.loadingOverlay}>
          <View className={styles.loadingBox}>
            <Text className={styles.loadingIcon}>⏳</Text>
            <Text className={styles.loadingText}>登记处理中...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default ResultRegisterPage;
