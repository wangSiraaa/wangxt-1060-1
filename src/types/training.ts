export type UserRole = 'student' | 'coach' | 'vehicleAdmin' | 'stationManager';

export type TrainingType = 'theory' | 'practical';

export type VehicleType = 'tractor' | 'harvester' | 'transplanter' | 'drier' | 'other';

export type SessionStatus = 'pending' | 'available' | 'full' | 'ongoing' | 'completed' | 'cancelled';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'absent' | 'failed' | 'retraining';

export type ResultStatus = 'passed' | 'failed' | 'absent' | 'equipment_failure' | 'coach_absent';

export type RetrainingPriority = 'high' | 'medium' | 'low';

export type ExceptionType = 'vehicle_failure' | 'coach_absent' | 'site_issue' | 'weather' | 'other';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'heavy_rain' | 'storm' | 'snow' | 'fog';

export type RescheduleStatus = 'pending' | 'rescheduled' | 'cancelled' | 'completed';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  idCard: string;
  avatar?: string;
  stationId: string;
  coachQualification?: string[];
  theoryPassed?: boolean;
  theoryScore?: number;
  absentCount?: number;
  retrainingCount?: number;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: VehicleType;
  typeName: string;
  model: string;
  status: 'available' | 'in_use' | 'maintenance' | 'fault';
  stationId: string;
  currentSessionId?: string;
  faultDescription?: string;
  lastMaintenanceDate?: string;
}

export interface TrainingSite {
  id: string;
  name: string;
  address: string;
  capacity: number;
  stationManagerId: string;
}

export interface TimeSlot {
  id: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  vehicleId: string;
  coachId: string;
  capacity: number;
  bookedCount: number;
  status: 'available' | 'full' | 'ongoing' | 'completed';
}

export interface TrainingSession {
  id: string;
  title: string;
  type: TrainingType;
  stationId: string;
  siteId: string;
  siteName: string;
  vehicleType: VehicleType;
  vehicleTypeName: string;
  date: string;
  timeSlots: TimeSlot[];
  coachIds: string[];
  coachNames: string[];
  vehicleIds: string[];
  capacity: number;
  bookedCount: number;
  status: SessionStatus;
  requirements: string[];
  createTime: string;
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  sessionTitle: string;
  timeSlotId: string;
  timeSlot: string;
  vehicleId: string;
  vehiclePlate: string;
  coachId: string;
  coachName: string;
  date: string;
  status: BookingStatus;
  bookingTime: string;
  isRetraining: boolean;
  retrainingReason?: string;
  retrainingPriority?: RetrainingPriority;
}

export interface TrainingResult {
  id: string;
  bookingId: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  timeSlotId: string;
  coachId: string;
  coachName: string;
  vehicleId: string;
  date: string;
  status: ResultStatus;
  score?: number;
  remarks?: string;
  equipmentFault?: string;
  createTime: string;
}

export interface RetrainingItem {
  id: string;
  studentId: string;
  studentName: string;
  originalBookingId: string;
  reason: 'absent' | 'failed' | 'equipment_failure' | 'weather' | 'coach_absent';
  priority: RetrainingPriority;
  vehicleType: VehicleType;
  vehicleId?: string;
  preferredDate?: string;
  status: 'pending' | 'scheduled' | 'completed';
  assignedSessionId?: string;
  createTime: string;
  needsManualReview?: boolean;
  consecutiveAbsentCount?: number;
}

export interface RescheduleItem {
  id: string;
  originalBookingId: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  sessionTitle: string;
  originalDate: string;
  originalTimeSlotId: string;
  originalTimeSlot: string;
  originalVehicleId: string;
  originalVehiclePlate: string;
  originalCoachId: string;
  originalCoachName: string;
  vehicleType: VehicleType;
  vehiclePriority: number;
  reason: 'weather' | 'coach_leave' | 'vehicle_failure';
  status: RescheduleStatus;
  newSessionId?: string;
  newTimeSlotId?: string;
  createTime: string;
}

export interface TrainingSuspension {
  id: string;
  date: string;
  siteId: string;
  siteName: string;
  reason: 'weather' | 'site_maintenance' | 'other';
  weatherCondition?: WeatherCondition;
  description: string;
  affectedSessionIds: string[];
  affectedVehicleIds: string[];
  affectedStudentIds: string[];
  affectedBookingIds: string[];
  rescheduledCount: number;
  status: 'active' | 'resolved';
  createTime: string;
  resolveTime?: string;
}

export interface CoachLeaveRecord {
  id: string;
  coachId: string;
  coachName: string;
  startDate: string;
  endDate: string;
  reason: string;
  affectedSessionIds: string[];
  reassignedCount: number;
  status: 'pending' | 'in_progress' | 'completed';
  createTime: string;
}

export interface ExceptionRecord {
  id: string;
  type: ExceptionType;
  sessionId: string;
  timeSlotId?: string;
  vehicleId?: string;
  coachId?: string;
  description: string;
  handled: boolean;
  handleMethod?: string;
  newVehicleId?: string;
  newCoachId?: string;
  createTime: string;
  handleTime?: string;
}

export interface Statistics {
  totalSessions: number;
  totalBookings: number;
  bookingRate: number;
  passRate: number;
  absentRate: number;
  vehicleUtilization: number;
  retrainingCount: number;
  periodStart: string;
  periodEnd: string;
}

export interface RuleCheckResult {
  passed: boolean;
  message: string;
  code: string;
}

export const VEHICLE_TYPE_MAP: Record<VehicleType, string> = {
  tractor: '拖拉机',
  harvester: '联合收割机',
  transplanter: '插秧机',
  drier: '烘干机',
  other: '其他'
};

export const SESSION_STATUS_MAP: Record<SessionStatus, string> = {
  pending: '待发布',
  available: '可预约',
  full: '已满员',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消'
};

export const BOOKING_STATUS_MAP: Record<BookingStatus, string> = {
  pending: '待确认',
  confirmed: '已预约',
  cancelled: '已取消',
  completed: '已完成',
  absent: '已缺席',
  failed: '未通过',
  retraining: '待补训'
};

export const RESULT_STATUS_MAP: Record<ResultStatus, string> = {
  passed: '合格',
  failed: '不合格',
  absent: '缺席',
  equipment_failure: '设备故障',
  coach_absent: '教练缺席'
};

export const PRIORITY_MAP: Record<RetrainingPriority, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export const RETRAINING_PRIORITY_MAP: Record<RetrainingPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级'
};

export const ROLE_MAP: Record<UserRole, string> = {
  student: '学员',
  coach: '教练',
  vehicleAdmin: '车辆管理员',
  stationManager: '培训站负责人'
};

export const WEATHER_CONDITION_MAP: Record<WeatherCondition, string> = {
  sunny: '晴天',
  cloudy: '多云',
  rain: '小雨',
  heavy_rain: '大雨',
  storm: '暴雨',
  snow: '下雪',
  fog: '大雾'
};

export const EXCEPTION_TYPE_MAP: Record<ExceptionType, string> = {
  vehicle_failure: '车辆故障',
  coach_absent: '教练缺席',
  site_issue: '场地问题',
  weather: '天气原因',
  other: '其他异常'
};

export const RESCHEDULE_STATUS_MAP: Record<RescheduleStatus, string> = {
  pending: '待改期',
  rescheduled: '已改期',
  cancelled: '已取消',
  completed: '已完成'
};

export const SUSPENSION_REASON_MAP: Record<TrainingSuspension['reason'], string> = {
  weather: '天气停训',
  site_maintenance: '场地维护',
  other: '其他原因'
};

export const RETRAINING_REASON_MAP: Record<RetrainingItem['reason'], string> = {
  absent: '培训缺席',
  failed: '考核不合格',
  equipment_failure: '设备故障中断',
  weather: '天气停训',
  coach_absent: '教练临时停课'
};
