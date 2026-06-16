import React, { useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import useTrainingStore from '@/store/useTrainingStore';
import { ROLE_MAP } from '@/types/training';
import styles from './index.module.scss';

const MinePage: React.FC = () => {
  const {
    getCurrentUser,
    getMyBookings,
    getMyRetraining,
    getVehicles,
    getSessions,
    getExceptions,
    clearAllData,
    exportData,
    importDemoData,
    switchCurrentUser
  } = useTrainingStore();

  const currentUser = getCurrentUser();
  const myBookings = getMyBookings();
  const myRetraining = getMyRetraining();
  const vehicles = getVehicles();
  const sessions = getSessions();
  const exceptions = getExceptions();

  const stats = useMemo(() => ({
    total: myBookings.length,
    completed: myBookings.filter(b => b.status === 'completed').length,
    retraining: myRetraining.length,
    absent: myBookings.filter(b => b.status === 'absent').length
  }), [myBookings, myRetraining]);

  const menuItems = [
    {
      group: '培训管理',
      items: [
        {
          icon: '📅',
          iconBg: '#E3F2FD',
          title: '我的预约',
          desc: '查看和管理预约记录',
          action: () => Taro.switchTab({ url: '/pages/booking/index' })
        },
        {
          icon: '📝',
          iconBg: '#E8F5E9',
          title: '培训记录',
          desc: '查看历史培训成绩',
          action: () => Taro.switchTab({ url: '/pages/training/index' })
        },
        {
          icon: '🔄',
          iconBg: '#FFF3E0',
          title: '补训安排',
          desc: `待补训 ${myRetraining.length} 项`,
          badge: myRetraining.length,
          action: () => Taro.navigateTo({ url: '/pages/retraining/index' })
        },
        {
          icon: '🚨',
          iconBg: '#FFEBEE',
          title: '异常处理',
          desc: `待处理 ${exceptions.filter(e => e.status === 'pending').length} 项`,
          badge: exceptions.filter(e => e.status === 'pending').length,
          action: () => Taro.navigateTo({ url: '/pages/exception/index' })
        }
      ]
    },
    {
      group: '数据统计',
      items: [
        {
          icon: '📊',
          iconBg: '#F3E5F5',
          title: '场次统计',
          desc: '查看培训数据分析',
          action: () => Taro.navigateTo({ url: '/pages/statistics/index' })
        }
      ]
    },
    {
      group: '车辆管理',
      items: [
        {
          icon: '🚜',
          iconBg: '#ECEFF1',
          title: '车辆状态',
          desc: `共 ${vehicles.length} 台车辆，${vehicles.filter(v => v.status === 'available').length} 台可用`,
          action: () => {
            Taro.showModal({
              title: '车辆状态',
              content: `总计：${vehicles.length}台\n可用：${vehicles.filter(v => v.status === 'available').length}台\n使用中：${vehicles.filter(v => v.status === 'in_use').length}台\n维修中：${vehicles.filter(v => v.status === 'maintenance').length}台\n故障：${vehicles.filter(v => v.status === 'fault').length}台`,
              showCancel: false
            });
          }
        }
      ]
    }
  ];

  const handleClearData = () => {
    Taro.showModal({
      title: '清除数据',
      content: '确定要清除所有本地数据吗？此操作不可恢复！',
      confirmText: '确定清除',
      confirmColor: '#C62828',
      success: (res) => {
        if (res.confirm) {
          clearAllData();
          Taro.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  };

  const handleExportData = () => {
    const data = exportData();
    Taro.setClipboardData({
      data: JSON.stringify(data, null, 2),
      success: () => {
        Taro.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  };

  const handleImportDemo = () => {
    Taro.showModal({
      title: '导入演示数据',
      content: '导入预设的演示数据，用于体验系统功能。是否继续？',
      success: (res) => {
        if (res.confirm) {
          importDemoData();
          Taro.showToast({ title: '已导入', icon: 'success' });
        }
      }
    });
  };

  const handleSwitchUser = () => {
    const users = [
      { id: 'stu_001', name: '张三（学员-理论通过）' },
      { id: 'stu_003', name: '王五（学员-理论未通过）' },
      { id: 'coach_001', name: '李教练（教练）' },
      { id: 'admin_001', name: '王站长（负责人）' }
    ];
    
    Taro.showActionSheet({
      itemList: users.map(u => u.name),
      success: (res) => {
        switchCurrentUser(users[res.tapIndex].id);
        Taro.showToast({ title: '已切换', icon: 'success' });
      }
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.profileHeader}>
        <View className={styles.avatar}>
          {currentUser?.name?.charAt(0) || '用'}
        </View>
        <View className={styles.profileInfo}>
          <Text className={styles.profileName}>{currentUser?.name || '用户'}</Text>
          <Text className={styles.profileRole}>
            {ROLE_MAP[currentUser?.role || 'student']}
          </Text>
          {currentUser?.role === 'student' && (
            <View className={styles.theoryStatus}>
              <View
                className={`${styles.statusDot} ${currentUser.theoryPassed ? styles.dotPass : styles.dotFail}`}
              />
              <Text>{currentUser.theoryPassed ? '理论已通过' : '理论未通过'}</Text>
            </View>
          )}
          <Text className={styles.profileMeta}>
            {currentUser?.role === 'student' && `缺席次数：${currentUser.absentCount || 0}次`}
            {currentUser?.role === 'coach' && `资质：${currentUser.qualifications?.join('、') || '无'}`}
          </Text>
        </View>
      </View>

      <View className={styles.statsSection}>
        <View className={styles.statsGrid}>
          <View className={styles.statsItem}>
            <Text className={styles.statsNumber}>{stats.total}</Text>
            <Text className={styles.statsLabel}>总预约</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsNumber}>{stats.completed}</Text>
            <Text className={styles.statsLabel}>已完成</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsNumber}>{stats.retraining}</Text>
            <Text className={styles.statsLabel}>待补训</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsNumber}>{stats.absent}</Text>
            <Text className={styles.statsLabel}>缺席</Text>
          </View>
        </View>
      </View>

      {menuItems.map((group, groupIdx) => (
        <View key={groupIdx} className={styles.menuSection}>
          <View className={styles.menuGroup}>
            {group.items.map((item, idx) => (
              <View key={idx} className={styles.menuItem} onClick={item.action}>
                <View className={styles.menuIcon} style={{ background: item.iconBg }}>
                  <Text>{item.icon}</Text>
                </View>
                <View className={styles.menuContent}>
                  <Text className={styles.menuTitle}>{item.title}</Text>
                  {item.desc && <Text className={styles.menuDesc}>{item.desc}</Text>}
                </View>
                {item.badge && item.badge > 0 && (
                  <View className={styles.menuBadge}>{item.badge}</View>
                )}
                <Text className={styles.menuArrow}>›</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View className={styles.switchRoleBtn} onClick={handleSwitchUser}>
        <View>
          <Text className={styles.switchLabel}>切换角色</Text>
          <Text className={styles.switchHint}>体验不同角色的功能</Text>
        </View>
        <Text className={styles.menuArrow}>›</Text>
      </View>

      <View className={styles.dataManagement}>
        <Text className={styles.dataTitle}>📦 数据管理</Text>
        <Text className={styles.dataDesc}>
          所有数据保存在本地浏览器存储中。你可以导出数据进行备份，或导入演示数据体验完整功能。
        </Text>
        <View className={styles.dataActions}>
          <Button className={styles.dataBtn} onClick={handleImportDemo}>
            导入演示数据
          </Button>
          <Button className={styles.dataBtn} onClick={handleExportData}>
            导出数据
          </Button>
          <Button className={`${styles.dataBtn} ${styles.dangerBtn}`} onClick={handleClearData}>
            清除数据
          </Button>
        </View>
      </View>
    </View>
  );
};

export default MinePage;
