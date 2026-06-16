import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import type {
  User,
  Vehicle,
  TrainingSession,
  Booking,
  TrainingResult,
  RetrainingItem,
  ExceptionRecord,
  TrainingSite,
  ResultStatus,
  RetrainingPriority,
  RescheduleItem,
  TrainingSuspension,
  CoachLeaveRecord,
  WeatherCondition
} from '@/types/training';
import { getMockData } from '@/data/mockData';
import storage from '@/utils/storage';
import BookingRuleEngine from '@/utils/bookingRules';
import ScheduleEngine from '@/utils/scheduleEngine';

interface TrainingState {
  currentUserId: string;
  users: User[];
  vehicles: Vehicle[];
  sessions: TrainingSession[];
  bookings: Booking[];
  results: TrainingResult[];
  retraining: RetrainingItem[];
  exceptions: ExceptionRecord[];
  sites: TrainingSite[];
  reschedule: RescheduleItem[];
  suspensions: TrainingSuspension[];
  coachLeaves: CoachLeaveRecord[];
  initialized: boolean;

  getCurrentUser: () => User | undefined;
  getCoaches: () => User[];
  getStudents: () => User[];

  initializeData: () => void;
  clearAllData: () => void;

  createBooking: (
    sessionId: string,
    timeSlotId: string,
    studentId?: string
  ) => { success: boolean; message: string; booking?: Booking };

  cancelBooking: (bookingId: string, reason?: string) => boolean;

  registerResult: (
    bookingId: string,
    status: ResultStatus,
    score?: number,
    remarks?: string,
    equipmentFault?: string
  ) => { success: boolean; message: string };

  addRetraining: (
    studentId: string,
    originalBookingId: string,
    reason: 'absent' | 'failed' | 'equipment_failure' | 'weather' | 'coach_absent',
    vehicleType: string,
    priority?: RetrainingPriority
  ) => RetrainingItem;

  updateRetrainingPriority: (retrainId: string, priority: RetrainingPriority) => void;
  markRetrainingForReview: (retrainId: string, needsReview: boolean) => void;

  assignRetrainingSession: (retrainId: string, sessionId: string) => void;

  completeRetraining: (retrainId: string) => void;

  createException: (
    type: ExceptionRecord['type'],
    sessionId: string,
    description: string,
    timeSlotId?: string,
    vehicleId?: string,
    coachId?: string
  ) => ExceptionRecord;

  handleVehicleFaultException: (exceptionId: string) => void;

  handleCoachAbsentException: (exceptionId: string) => void;

  handleWeatherSuspension: (
    date: string,
    siteId: string,
    weatherCondition: WeatherCondition,
    description: string
  ) => TrainingSuspension | null;

  handleCoachLeave: (
    coachId: string,
    startDate: string,
    endDate: string,
    reason: string
  ) => { leaveRecord: CoachLeaveRecord | null; reassignedCount: number };

  resolveSuspension: (suspensionId: string) => void;

  getSuspensionById: (id: string) => TrainingSuspension | undefined;
  getSuspensionImpact: (suspensionId: string) => ReturnType<typeof ScheduleEngine.getSuspensionImpact> | null;

  getRescheduleList: (studentId?: string) => RescheduleItem[];
  updateRescheduleStatus: (rescheduleId: string, status: RescheduleItem['status'], newSessionId?: string) => void;

  getSessionById: (id: string) => TrainingSession | undefined;
  getVehicleById: (id: string) => Vehicle | undefined;
  getCoachById: (id: string) => User | undefined;
  getBookingById: (id: string) => Booking | undefined;

  getMyBookings: (studentId?: string) => Booking[];
  getMyRetraining: (studentId?: string) => RetrainingItem[];
  getAvailableSessions: (vehicleType?: string) => TrainingSession[];

  canBookSession: (
    sessionId: string,
    timeSlotId: string,
    studentId?: string
  ) => { canBook: boolean; reasons: string[] };

  getStatistics: (startDate: string, endDate: string) => ReturnType<typeof ScheduleEngine.getStatistics>;

  updateVehicleStatus: (vehicleId: string, status: Vehicle['status'], faultDescription?: string) => void;
}

const storageAdapter = {
  getItem: (name: string) => {
    try {
      return Taro.getStorageSync(name);
    } catch (e) {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      Taro.setStorageSync(name, value);
    } catch (e) {
      console.error('[Store] 保存失败', e);
    }
  },
  removeItem: (name: string) => {
    try {
      Taro.removeStorageSync(name);
    } catch (e) {
      console.error('[Store] 删除失败', e);
    }
  }
};

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
      currentUserId: 'stu_001',
      users: [],
      vehicles: [],
      sessions: [],
      bookings: [],
      results: [],
      retraining: [],
      exceptions: [],
      sites: [],
      reschedule: [],
      suspensions: [],
      coachLeaves: [],
      initialized: false,

      getCurrentUser: () => {
        const { currentUserId, users } = get();
        return users.find(u => u.id === currentUserId);
      },

      getCoaches: () => {
        return get().users.filter(u => u.role === 'coach');
      },

      getStudents: () => {
        return get().users.filter(u => u.role === 'student');
      },

      initializeData: () => {
        const { initialized } = get();
        if (initialized) {
          console.log('[Store] 数据已初始化');
          return;
        }

        const mockData = getMockData();
        console.log('[Store] 初始化Mock数据');

        set({
          currentUserId: mockData.currentUserId,
          users: mockData.users,
          vehicles: mockData.vehicles,
          sessions: mockData.sessions,
          bookings: mockData.bookings,
          results: mockData.results,
          retraining: mockData.retraining,
          exceptions: mockData.exceptions,
          sites: mockData.sites,
          initialized: true
        });

        storage.set(storage.keys.INITIALIZED, true);
      },

      clearAllData: () => {
        console.log('[Store] 清空所有数据');
        storage.clearAll();
        set({
          currentUserId: 'stu_001',
          users: [],
          vehicles: [],
          sessions: [],
          bookings: [],
          results: [],
          retraining: [],
          exceptions: [],
          sites: [],
          reschedule: [],
          suspensions: [],
          coachLeaves: [],
          initialized: false
        });
      },

      createBooking: (sessionId, timeSlotId, studentId) => {
        const state = get();
        const sid = studentId || state.currentUserId;
        const student = state.users.find(u => u.id === sid);
        const session = state.sessions.find(s => s.id === sessionId);
        const timeSlot = session?.timeSlots.find(s => s.id === timeSlotId);
        const vehicle = state.vehicles.find(v => v.id === timeSlot?.vehicleId);

        if (!student || !session || !timeSlot || !vehicle) {
          return { success: false, message: '参数错误，无法创建预约' };
        }

        const checkResult = BookingRuleEngine.checkAll(
          student,
          session,
          timeSlot,
          vehicle,
          state.bookings,
          state.retraining
        );

        const failedRules = BookingRuleEngine.getFailedRules(checkResult);
        if (failedRules.length > 0) {
          console.log('[Booking] 预约校验失败', failedRules);
          return { success: false, message: failedRules[0].message };
        }

        const booking: Booking = {
          id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          studentId: sid,
          studentName: student.name,
          sessionId: session.id,
          sessionTitle: session.title,
          timeSlotId: timeSlot.id,
          timeSlot: `${timeSlot.startTime}-${timeSlot.endTime}`,
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plateNumber,
          coachId: timeSlot.coachId,
          coachName: state.users.find(u => u.id === timeSlot.coachId)?.name || '',
          date: session.date,
          status: 'confirmed',
          bookingTime: new Date().toISOString(),
          isRetraining: false
        };

        const updatedSessions = state.sessions.map(s => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            bookedCount: s.bookedCount + 1,
            timeSlots: s.timeSlots.map(slot => {
              if (slot.id !== timeSlotId) return slot;
              const newBookedCount = slot.bookedCount + 1;
              return {
                ...slot,
                bookedCount: newBookedCount,
                status: newBookedCount >= slot.capacity ? 'full' : slot.status
              };
            })
          };
        });

        set({
          bookings: [...state.bookings, booking],
          sessions: updatedSessions
        });

        console.log('[Booking] 预约成功', booking.id);
        return { success: true, message: '预约成功', booking };
      },

      cancelBooking: (bookingId, reason) => {
        const state = get();
        const booking = state.bookings.find(b => b.id === bookingId);
        if (!booking) return false;

        const updatedBookings = state.bookings.map(b => {
          if (b.id !== bookingId) return b;
          return { ...b, status: 'cancelled' as const };
        });

        const updatedSessions = state.sessions.map(s => {
          if (s.id !== booking.sessionId) return s;
          return {
            ...s,
            bookedCount: Math.max(0, s.bookedCount - 1),
            timeSlots: s.timeSlots.map(slot => {
              if (slot.id !== booking.timeSlotId) return slot;
              return {
                ...slot,
                bookedCount: Math.max(0, slot.bookedCount - 1),
                status: 'available' as const
              };
            })
          };
        });

        set({ bookings: updatedBookings, sessions: updatedSessions });
        console.log('[Booking] 取消预约', bookingId, reason);
        return true;
      },

      registerResult: (bookingId, status, score, remarks, equipmentFault) => {
        const state = get();
        const booking = state.bookings.find(b => b.id === bookingId);
        if (!booking) {
          return { success: false, message: '预约记录不存在' };
        }

        const result: TrainingResult = {
          id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          bookingId,
          studentId: booking.studentId,
          studentName: booking.studentName,
          sessionId: booking.sessionId,
          timeSlotId: booking.timeSlotId,
          coachId: booking.coachId,
          coachName: booking.coachName,
          vehicleId: booking.vehicleId,
          date: booking.date,
          status,
          score,
          remarks,
          equipmentFault,
          createTime: new Date().toISOString()
        };

        let updatedBookings = state.bookings.map(b => {
          if (b.id !== bookingId) return b;
          switch (status) {
            case 'passed':
              return { ...b, status: 'completed' as const };
            case 'failed':
              return { ...b, status: 'failed' as const };
            case 'absent':
              return { ...b, status: 'absent' as const };
            case 'equipment_failure':
            case 'coach_absent':
              return { ...b, status: 'retraining' as const };
            default:
              return b;
          }
        });

        let newRetrainingItems: RetrainingItem[] = [...state.retraining];

        if (status === 'absent' || status === 'failed') {
          const allResults = [...state.results, result];
          const absenceCheck = ScheduleEngine.checkConsecutiveAbsence(
            booking.studentId,
            allResults.map(r => ({
              studentId: r.studentId,
              status: r.status,
              date: r.date
            }))
          );

          const retrain: RetrainingItem = {
            id: `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            studentId: booking.studentId,
            studentName: booking.studentName,
            originalBookingId: bookingId,
            reason: status === 'absent' ? 'absent' : 'failed',
            priority: status === 'absent' ? 'high' : 'medium',
            vehicleType: state.sessions.find(s => s.id === booking.sessionId)?.vehicleType || 'other',
            status: 'pending',
            createTime: new Date().toISOString(),
            needsManualReview: absenceCheck.needsManualReview,
            consecutiveAbsentCount: absenceCheck.consecutiveCount
          };
          newRetrainingItems.push(retrain);
          console.log('[Result] 自动加入补训名单', retrain.id, 
            absenceCheck.needsManualReview ? '需要人工审核' : '');
        }

        if (status === 'equipment_failure') {
          const updatedVehicles = state.vehicles.map(v => {
            if (v.id !== booking.vehicleId) return v;
            return {
              ...v,
              status: 'fault' as const,
              faultDescription: equipmentFault || '设备故障'
            };
          });
          set({ vehicles: updatedVehicles });

          const retrain: RetrainingItem = {
            id: `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            studentId: booking.studentId,
            studentName: booking.studentName,
            originalBookingId: bookingId,
            reason: 'equipment_failure',
            priority: 'high',
            vehicleType: state.sessions.find(s => s.id === booking.sessionId)?.vehicleType || 'other',
            status: 'pending',
            createTime: new Date().toISOString()
          };
          newRetrainingItems.push(retrain);
        }

        const updatedUsers = state.users.map(u => {
          if (u.id !== booking.studentId) return u;
          const updates: Partial<User> = {};
          if (status === 'absent') {
            updates.absentCount = (u.absentCount || 0) + 1;
          }
          if (status === 'absent' || status === 'failed' || status === 'equipment_failure') {
            updates.retrainingCount = (u.retrainingCount || 0) + 1;
          }
          return { ...u, ...updates };
        });

        set({
          results: [...state.results, result],
          bookings: updatedBookings,
          retraining: newRetrainingItems,
          users: updatedUsers
        });

        console.log('[Result] 成绩登记成功', result.id, status);
        return { success: true, message: '登记成功' };
      },

      addRetraining: (studentId, originalBookingId, reason, vehicleType, priority = 'medium') => {
        const state = get();
        const student = state.users.find(u => u.id === studentId);
        const retrain: RetrainingItem = {
          id: `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          studentId,
          studentName: student?.name || '',
          originalBookingId,
          reason,
          priority,
          vehicleType: vehicleType as any,
          status: 'pending',
          createTime: new Date().toISOString()
        };

        set({ retraining: [...state.retraining, retrain] });
        console.log('[Retraining] 添加补训', retrain.id);
        return retrain;
      },

      updateRetrainingPriority: (retrainId, priority) => {
        const state = get();
        set({
          retraining: state.retraining.map(r =>
            r.id === retrainId ? { ...r, priority } : r
          )
        });
      },

      assignRetrainingSession: (retrainId, sessionId) => {
        const state = get();
        set({
          retraining: state.retraining.map(r =>
            r.id === retrainId ? { ...r, status: 'scheduled', assignedSessionId: sessionId } : r
          )
        });
      },

      completeRetraining: (retrainId) => {
        const state = get();
        const retrain = state.retraining.find(r => r.id === retrainId);
        if (!retrain) return;

        const updatedUsers = state.users.map(u => {
          if (u.id !== retrain.studentId) return u;
          return {
            ...u,
            retrainingCount: Math.max(0, (u.retrainingCount || 0) - 1)
          };
        });

        set({
          retraining: state.retraining.map(r =>
            r.id === retrainId ? { ...r, status: 'completed' } : r
          ),
          users: updatedUsers
        });
      },

      createException: (type, sessionId, description, timeSlotId, vehicleId, coachId) => {
        const exception: ExceptionRecord = {
          id: `exception_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          sessionId,
          timeSlotId,
          vehicleId,
          coachId,
          description,
          handled: false,
          createTime: new Date().toISOString()
        };

        set(state => ({ exceptions: [...state.exceptions, exception] }));
        console.log('[Exception] 创建异常', exception.id, type);
        return exception;
      },

      handleVehicleFaultException: (exceptionId) => {
        const state = get();
        const exception = state.exceptions.find(e => e.id === exceptionId);
        if (!exception || exception.handled) return;

        const result = ScheduleEngine.handleVehicleFault(
          exception,
          state.sessions,
          state.vehicles,
          state.bookings
        );

        set({
          sessions: result.updatedSessions,
          bookings: result.updatedBookings,
          exceptions: state.exceptions.map(e =>
            e.id === exceptionId ? result.newException : e
          ),
          retraining: [...state.retraining, ...result.retrainingItems]
        });

        console.log('[Exception] 处理车辆故障异常', exceptionId, result.newException.handleMethod);
      },

      handleCoachAbsentException: (exceptionId) => {
        const state = get();
        const exception = state.exceptions.find(e => e.id === exceptionId);
        if (!exception || exception.handled) return;

        const result = ScheduleEngine.handleCoachAbsent(
          exception,
          state.sessions,
          state.getCoaches(),
          state.bookings
        );

        set({
          sessions: result.updatedSessions,
          bookings: result.updatedBookings,
          exceptions: state.exceptions.map(e =>
            e.id === exceptionId ? result.newException : e
          ),
          retraining: [...state.retraining, ...result.retrainingItems]
        });

        console.log('[Exception] 处理教练缺席异常', exceptionId, result.newException.handleMethod);
      },

      markRetrainingForReview: (retrainId, needsReview) => {
        const state = get();
        set({
          retraining: state.retraining.map(r =>
            r.id === retrainId ? { ...r, needsManualReview: needsReview } : r
          )
        });
        console.log('[Retraining] 设置人工审核标记', retrainId, needsReview);
      },

      handleWeatherSuspension: (date, siteId, weatherCondition, description) => {
        const state = get();
        const site = state.sites.find(s => s.id === siteId);
        if (!site) {
          console.error('[Suspension] 场地不存在', siteId);
          return null;
        }

        const result = ScheduleEngine.handleWeatherSuspension(
          date,
          siteId,
          site.name,
          weatherCondition,
          description,
          state.sessions,
          state.bookings,
          state.vehicles
        );

        set({
          sessions: result.updatedSessions,
          bookings: result.updatedBookings,
          reschedule: [...state.reschedule, ...result.rescheduleItems],
          retraining: [...state.retraining, ...result.retrainingItems],
          suspensions: [...state.suspensions, result.suspension]
        });

        console.log('[Suspension] 天气停训处理完成', result.suspension.id, 
          '影响场次:', result.suspension.affectedSessionIds.length,
          '影响学员:', result.suspension.affectedStudentIds.length);
        return result.suspension;
      },

      handleCoachLeave: (coachId, startDate, endDate, reason) => {
        const state = get();
        const coach = state.getCoachById(coachId);
        if (!coach) {
          console.error('[CoachLeave] 教练不存在', coachId);
          return { leaveRecord: null, reassignedCount: 0 };
        }

        const result = ScheduleEngine.handleCoachLeave(
          coachId,
          coach.name,
          startDate,
          endDate,
          reason,
          state.sessions,
          state.getCoaches(),
          state.bookings,
          state.vehicles
        );

        set({
          sessions: result.updatedSessions,
          bookings: result.updatedBookings,
          reschedule: [...state.reschedule, ...result.rescheduleItems],
          coachLeaves: [...state.coachLeaves, result.leaveRecord]
        });

        console.log('[CoachLeave] 教练请假处理完成', result.leaveRecord.id,
          '已重新分配:', result.reassignedCount,
          '待改期:', result.rescheduleItems.length);
        return { leaveRecord: result.leaveRecord, reassignedCount: result.reassignedCount };
      },

      resolveSuspension: (suspensionId) => {
        const state = get();
        set({
          suspensions: state.suspensions.map(s =>
            s.id === suspensionId
              ? { ...s, status: 'resolved' as const, resolveTime: new Date().toISOString() }
              : s
          )
        });
        console.log('[Suspension] 停训记录已解决', suspensionId);
      },

      getSuspensionById: (id) => get().suspensions.find(s => s.id === id),

      getSuspensionImpact: (suspensionId) => {
        const state = get();
        const suspension = state.suspensions.find(s => s.id === suspensionId);
        if (!suspension) return null;

        return ScheduleEngine.getSuspensionImpact(
          suspension,
          state.sessions,
          state.bookings,
          state.vehicles,
          state.users
        );
      },

      getRescheduleList: (studentId) => {
        const state = get();
        const sid = studentId || state.currentUserId;
        let items = state.reschedule;
        if (studentId || state.getCurrentUser()?.role === 'student') {
          items = items.filter(r => r.studentId === sid);
        }
        return ScheduleEngine.sortRescheduleByVehiclePriority(items);
      },

      updateRescheduleStatus: (rescheduleId, status, newSessionId) => {
        const state = get();
        set({
          reschedule: state.reschedule.map(r =>
            r.id === rescheduleId
              ? { ...r, status, newSessionId: newSessionId || r.newSessionId }
              : r
          )
        });
        console.log('[Reschedule] 状态更新', rescheduleId, status);
      },

      getSessionById: (id) => get().sessions.find(s => s.id === id),
      getVehicleById: (id) => get().vehicles.find(v => v.id === id),
      getCoachById: (id) => get().users.find(u => u.id === id && u.role === 'coach'),
      getBookingById: (id) => get().bookings.find(b => b.id === id),

      getMyBookings: (studentId) => {
        const sid = studentId || get().currentUserId;
        return get().bookings.filter(b => b.studentId === sid);
      },

      getMyRetraining: (studentId) => {
        const sid = studentId || get().currentUserId;
        return ScheduleEngine.sortRetrainingByPriority(
          get().retraining.filter(r => r.studentId === sid && r.status !== 'completed')
        );
      },

      getAvailableSessions: (vehicleType) => {
        let sessions = get().sessions.filter(s =>
          s.status === 'available' || s.status === 'full'
        );
        if (vehicleType) {
          sessions = sessions.filter(s => s.vehicleType === vehicleType);
        }
        return sessions.sort((a, b) => a.date.localeCompare(b.date));
      },

      canBookSession: (sessionId, timeSlotId, studentId) => {
        const state = get();
        const sid = studentId || state.currentUserId;
        const student = state.users.find(u => u.id === sid);
        const session = state.sessions.find(s => s.id === sessionId);
        const timeSlot = session?.timeSlots.find(s => s.id === timeSlotId);
        const vehicle = state.vehicles.find(v => v.id === timeSlot?.vehicleId);

        if (!student || !session || !timeSlot || !vehicle) {
          return { canBook: false, reasons: ['数据不完整'] };
        }

        const checkResult = BookingRuleEngine.checkAll(
          student,
          session,
          timeSlot,
          vehicle,
          state.bookings,
          state.retraining
        );

        const failedRules = BookingRuleEngine.getFailedRules(checkResult);
        return {
          canBook: failedRules.length === 0,
          reasons: failedRules.map(r => r.message)
        };
      },

      getStatistics: (startDate, endDate) => {
        const state = get();
        return ScheduleEngine.getStatistics(
          state.sessions,
          state.bookings,
          state.vehicles,
          startDate,
          endDate
        );
      },

      updateVehicleStatus: (vehicleId, status, faultDescription) => {
        const state = get();
        set({
          vehicles: state.vehicles.map(v =>
            v.id === vehicleId
              ? { ...v, status, faultDescription: faultDescription || v.faultDescription }
              : v
          )
        });
      }
    }),
    {
      name: 'training-storage',
      storage: storageAdapter,
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        users: state.users,
        vehicles: state.vehicles,
        sessions: state.sessions,
        bookings: state.bookings,
        results: state.results,
        retraining: state.retraining,
        exceptions: state.exceptions,
        sites: state.sites,
        reschedule: state.reschedule,
        suspensions: state.suspensions,
        coachLeaves: state.coachLeaves,
        initialized: state.initialized
      })
    }
  )
);

export default useTrainingStore;
