import type {
  User,
  Vehicle,
  TrainingSession,
  Booking,
  TrainingResult,
  RetrainingItem,
  ExceptionRecord,
  TrainingSite
} from '@/types/training';

export const mockUsers: User[] = [
  {
    id: 'stu_001',
    name: '张三',
    role: 'student',
    phone: '13800138001',
    idCard: '110101199001010001',
    stationId: 'station_001',
    theoryPassed: true,
    theoryScore: 92,
    absentCount: 0,
    retrainingCount: 0
  },
  {
    id: 'stu_002',
    name: '李四',
    role: 'student',
    phone: '13800138002',
    idCard: '110101199002020002',
    stationId: 'station_001',
    theoryPassed: true,
    theoryScore: 85,
    absentCount: 1,
    retrainingCount: 0
  },
  {
    id: 'stu_003',
    name: '王五',
    role: 'student',
    phone: '13800138003',
    idCard: '110101199003030003',
    stationId: 'station_001',
    theoryPassed: false,
    theoryScore: 58,
    absentCount: 2,
    retrainingCount: 1
  },
  {
    id: 'coach_001',
    name: '赵教练',
    role: 'coach',
    phone: '13900139001',
    idCard: '110101198001010001',
    stationId: 'station_001',
    coachQualification: ['tractor', 'harvester']
  },
  {
    id: 'coach_002',
    name: '钱教练',
    role: 'coach',
    phone: '13900139002',
    idCard: '110101198002020002',
    stationId: 'station_001',
    coachQualification: ['tractor', 'transplanter']
  },
  {
    id: 'admin_001',
    name: '孙管理员',
    role: 'vehicleAdmin',
    phone: '13700137001',
    idCard: '110101197501010001',
    stationId: 'station_001'
  },
  {
    id: 'manager_001',
    name: '周站长',
    role: 'stationManager',
    phone: '13600136001',
    idCard: '110101197001010001',
    stationId: 'station_001'
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'veh_001',
    plateNumber: '京A00001',
    type: 'tractor',
    typeName: '拖拉机',
    model: '东方红-LX904',
    status: 'available',
    stationId: 'station_001',
    lastMaintenanceDate: '2025-05-15'
  },
  {
    id: 'veh_002',
    plateNumber: '京A00002',
    type: 'tractor',
    typeName: '拖拉机',
    model: '雷沃-M1004',
    status: 'available',
    stationId: 'station_001',
    lastMaintenanceDate: '2025-05-20'
  },
  {
    id: 'veh_003',
    plateNumber: '京A00003',
    type: 'harvester',
    typeName: '联合收割机',
    model: '久保田-PRO100',
    status: 'available',
    stationId: 'station_001',
    lastMaintenanceDate: '2025-06-01'
  },
  {
    id: 'veh_004',
    plateNumber: '京A00004',
    type: 'transplanter',
    typeName: '插秧机',
    model: '洋马-VP6',
    status: 'maintenance',
    stationId: 'station_001',
    lastMaintenanceDate: '2025-06-10'
  },
  {
    id: 'veh_005',
    plateNumber: '京A00005',
    type: 'harvester',
    typeName: '联合收割机',
    model: '沃得-DR150',
    status: 'fault',
    stationId: 'station_001',
    faultDescription: '发动机故障，正在维修',
    lastMaintenanceDate: '2025-05-25'
  },
  {
    id: 'veh_006',
    plateNumber: '京A00006',
    type: 'tractor',
    typeName: '拖拉机',
    model: '东风-1204',
    status: 'available',
    stationId: 'station_001',
    lastMaintenanceDate: '2025-06-05'
  }
];

export const mockSites: TrainingSite[] = [
  {
    id: 'site_001',
    name: '主训练场',
    address: '北京市海淀区农业园区A区',
    capacity: 20,
    stationManagerId: 'manager_001'
  },
  {
    id: 'site_002',
    name: '田间训练场',
    address: '北京市顺义区示范田B区',
    capacity: 15,
    stationManagerId: 'manager_001'
  }
];

const generateTimeSlots = (sessionId: string, vehicleIds: string[], coachIds: string[]) => {
  const timeSlots = [];
  const timeRanges = [
    { start: '08:00', end: '10:00' },
    { start: '10:30', end: '12:30' },
    { start: '14:00', end: '16:00' },
    { start: '16:30', end: '18:30' }
  ];

  for (let i = 0; i < Math.min(timeRanges.length, vehicleIds.length); i++) {
    timeSlots.push({
      id: `slot_${sessionId}_${i}`,
      sessionId,
      startTime: timeRanges[i].start,
      endTime: timeRanges[i].end,
      vehicleId: vehicleIds[i],
      coachId: coachIds[i % coachIds.length],
      capacity: 4,
      bookedCount: Math.floor(Math.random() * 4),
      status: 'available' as const
    });
  }
  return timeSlots;
};

export const mockSessions: TrainingSession[] = [
  {
    id: 'session_001',
    title: '拖拉机实操培训（基础班）',
    type: 'practical',
    stationId: 'station_001',
    siteId: 'site_001',
    siteName: '主训练场',
    vehicleType: 'tractor',
    vehicleTypeName: '拖拉机',
    date: '2025-06-17',
    timeSlots: generateTimeSlots('session_001', ['veh_001', 'veh_002'], ['coach_001', 'coach_002']),
    coachIds: ['coach_001', 'coach_002'],
    coachNames: ['赵教练', '钱教练'],
    vehicleIds: ['veh_001', 'veh_002'],
    capacity: 8,
    bookedCount: 5,
    status: 'available',
    requirements: ['tractor'],
    createTime: '2025-06-10T09:00:00Z'
  },
  {
    id: 'session_002',
    title: '联合收割机实操培训',
    type: 'practical',
    stationId: 'station_001',
    siteId: 'site_002',
    siteName: '田间训练场',
    vehicleType: 'harvester',
    vehicleTypeName: '联合收割机',
    date: '2025-06-18',
    timeSlots: generateTimeSlots('session_002', ['veh_003'], ['coach_001']),
    coachIds: ['coach_001'],
    coachNames: ['赵教练'],
    vehicleIds: ['veh_003'],
    capacity: 4,
    bookedCount: 4,
    status: 'full',
    requirements: ['harvester'],
    createTime: '2025-06-10T10:00:00Z'
  },
  {
    id: 'session_003',
    title: '拖拉机实操培训（进阶班）',
    type: 'practical',
    stationId: 'station_001',
    siteId: 'site_001',
    siteName: '主训练场',
    vehicleType: 'tractor',
    vehicleTypeName: '拖拉机',
    date: '2025-06-19',
    timeSlots: generateTimeSlots('session_003', ['veh_001', 'veh_006'], ['coach_001', 'coach_002']),
    coachIds: ['coach_001', 'coach_002'],
    coachNames: ['赵教练', '钱教练'],
    vehicleIds: ['veh_001', 'veh_006'],
    capacity: 8,
    bookedCount: 3,
    status: 'available',
    requirements: ['tractor'],
    createTime: '2025-06-11T09:00:00Z'
  },
  {
    id: 'session_004',
    title: '插秧机实操培训',
    type: 'practical',
    stationId: 'station_001',
    siteId: 'site_002',
    siteName: '田间训练场',
    vehicleType: 'transplanter',
    vehicleTypeName: '插秧机',
    date: '2025-06-20',
    timeSlots: generateTimeSlots('session_004', ['veh_004'], ['coach_002']),
    coachIds: ['coach_002'],
    coachNames: ['钱教练'],
    vehicleIds: ['veh_004'],
    capacity: 4,
    bookedCount: 2,
    status: 'available',
    requirements: ['transplanter'],
    createTime: '2025-06-11T14:00:00Z'
  },
  {
    id: 'session_005',
    title: '农机驾驶理论复习',
    type: 'theory',
    stationId: 'station_001',
    siteId: 'site_001',
    siteName: '主训练场',
    vehicleType: 'other',
    vehicleTypeName: '其他',
    date: '2025-06-16',
    timeSlots: [{
      id: 'slot_session_005_0',
      sessionId: 'session_005',
      startTime: '09:00',
      endTime: '11:00',
      vehicleId: '',
      coachId: 'coach_001',
      capacity: 30,
      bookedCount: 15,
      status: 'available'
    }],
    coachIds: ['coach_001'],
    coachNames: ['赵教练'],
    vehicleIds: [],
    capacity: 30,
    bookedCount: 15,
    status: 'available',
    requirements: [],
    createTime: '2025-06-08T09:00:00Z'
  }
];

export const mockBookings: Booking[] = [
  {
    id: 'booking_001',
    studentId: 'stu_001',
    studentName: '张三',
    sessionId: 'session_001',
    sessionTitle: '拖拉机实操培训（基础班）',
    timeSlotId: 'slot_session_001_0',
    timeSlot: '08:00-10:00',
    vehicleId: 'veh_001',
    vehiclePlate: '京A00001',
    coachId: 'coach_001',
    coachName: '赵教练',
    date: '2025-06-17',
    status: 'confirmed',
    bookingTime: '2025-06-12T10:30:00Z',
    isRetraining: false
  },
  {
    id: 'booking_002',
    studentId: 'stu_002',
    studentName: '李四',
    sessionId: 'session_001',
    sessionTitle: '拖拉机实操培训（基础班）',
    timeSlotId: 'slot_session_001_0',
    timeSlot: '08:00-10:00',
    vehicleId: 'veh_001',
    vehiclePlate: '京A00001',
    coachId: 'coach_001',
    coachName: '赵教练',
    date: '2025-06-17',
    status: 'confirmed',
    bookingTime: '2025-06-12T11:00:00Z',
    isRetraining: false
  },
  {
    id: 'booking_003',
    studentId: 'stu_001',
    studentName: '张三',
    sessionId: 'session_002',
    sessionTitle: '联合收割机实操培训',
    timeSlotId: 'slot_session_002_0',
    timeSlot: '08:00-10:00',
    vehicleId: 'veh_003',
    vehiclePlate: '京A00003',
    coachId: 'coach_001',
    coachName: '赵教练',
    date: '2025-06-18',
    status: 'confirmed',
    bookingTime: '2025-06-12T14:00:00Z',
    isRetraining: false
  }
];

export const mockResults: TrainingResult[] = [];

export const mockRetraining: RetrainingItem[] = [
  {
    id: 'retrain_001',
    studentId: 'stu_003',
    studentName: '王五',
    originalBookingId: 'booking_004',
    reason: 'absent',
    priority: 'high',
    vehicleType: 'tractor',
    status: 'pending',
    createTime: '2025-06-10T16:00:00Z'
  }
];

export const mockExceptions: ExceptionRecord[] = [];

export const getMockData = () => ({
  users: mockUsers,
  vehicles: mockVehicles,
  sessions: mockSessions,
  bookings: mockBookings,
  results: mockResults,
  retraining: mockRetraining,
  exceptions: mockExceptions,
  sites: mockSites,
  currentUserId: 'stu_001'
});
