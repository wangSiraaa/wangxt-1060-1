import Taro from '@tarojs/taro';

const STORAGE_KEYS = {
  USER: 'training_user',
  VEHICLES: 'training_vehicles',
  SESSIONS: 'training_sessions',
  BOOKINGS: 'training_bookings',
  RESULTS: 'training_results',
  RETRAINING: 'training_retraining',
  EXCEPTIONS: 'training_exceptions',
  CURRENT_USER_ID: 'training_current_user_id',
  INITIALIZED: 'training_initialized'
};

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const value = Taro.getStorageSync(key);
      if (value === '' || value === null || value === undefined) {
        return defaultValue;
      }
      return value as T;
    } catch (error) {
      console.error('[Storage] 获取数据失败', key, error);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      Taro.setStorageSync(key, value);
    } catch (error) {
      console.error('[Storage] 保存数据失败', key, error);
    }
  },

  remove(key: string): void {
    try {
      Taro.removeStorageSync(key);
    } catch (error) {
      console.error('[Storage] 删除数据失败', key, error);
    }
  },

  clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        Taro.removeStorageSync(key);
      });
    } catch (error) {
      console.error('[Storage] 清空数据失败', error);
    }
  },

  keys: STORAGE_KEYS
};

export default storage;
