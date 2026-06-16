import type {
  User,
  TrainingSession,
  TimeSlot,
  Booking,
  Vehicle,
  RuleCheckResult
} from '@/types/training';

export class BookingRuleEngine {
  static checkAll(
    student: User,
    session: TrainingSession,
    timeSlot: TimeSlot,
    vehicle: Vehicle,
    existingBookings: Booking[]
  ): RuleCheckResult[] {
    const results: RuleCheckResult[] = [];

    results.push(this.checkTheoryPassed(student));
    results.push(this.checkAbsentLimit(student));
    results.push(this.checkRetrainingStatus(student, session));
    results.push(this.checkVehicleAvailability(timeSlot, vehicle));
    results.push(this.checkTimeSlotConflict(student, timeSlot, existingBookings));
    results.push(this.checkTimeSlotCapacity(timeSlot));
    results.push(this.checkVehicleTypeMatch(student, session));

    return results;
  }

  static checkTheoryPassed(student: User): RuleCheckResult {
    const passed = student.theoryPassed === true;
    return {
      passed,
      message: passed ? '理论考试已通过' : '理论考试未通过，不能预约实操培训',
      code: 'THEORY_NOT_PASSED'
    };
  }

  static checkAbsentLimit(student: User): RuleCheckResult {
    const absentCount = student.absentCount || 0;
    const limit = 3;
    const passed = absentCount < limit;
    return {
      passed,
      message: passed
        ? `缺席次数正常（${absentCount}/${limit}）`
        : `缺席次数已达${absentCount}次，超过限制${limit}次，请先完成补训`,
      code: 'ABSENT_EXCEED_LIMIT'
    };
  }

  static checkRetrainingStatus(student: User, session: TrainingSession): RuleCheckResult {
    const hasRetraining = student.retrainingCount && student.retrainingCount > 0;
    const isPractical = session.type === 'practical';
    const passed = !hasRetraining || isPractical;
    return {
      passed,
      message: passed ? '补训状态正常' : '存在未完成的补训，请先完成补训',
      code: 'RETRAINING_PENDING'
    };
  }

  static checkVehicleAvailability(timeSlot: TimeSlot, vehicle: Vehicle): RuleCheckResult {
    const passed = vehicle.status === 'available' && timeSlot.status === 'available';
    let message = '车辆状态正常';
    if (vehicle.status === 'maintenance') {
      message = '车辆正在维护保养中';
    } else if (vehicle.status === 'fault') {
      message = `车辆故障：${vehicle.faultDescription || '未知故障'}`;
    } else if (vehicle.status === 'in_use') {
      message = '车辆正在使用中';
    } else if (timeSlot.status === 'full') {
      message = '该时段已满员';
    }
    return { passed, message, code: 'VEHICLE_NOT_AVAILABLE' };
  }

  static checkTimeSlotConflict(
    student: User,
    timeSlot: TimeSlot,
    existingBookings: Booking[]
  ): RuleCheckResult {
    const conflict = existingBookings.find(b => {
      if (b.studentId !== student.id) return false;
      if (b.status === 'cancelled' || b.status === 'completed') return false;
      return b.timeSlotId === timeSlot.id;
    });

    const passed = !conflict;
    return {
      passed,
      message: passed ? '无时间冲突' : '您已预约该时段，请选择其他时段',
      code: 'TIMESLOT_CONFLICT'
    };
  }

  static checkTimeSlotCapacity(timeSlot: TimeSlot): RuleCheckResult {
    const passed = timeSlot.bookedCount < timeSlot.capacity;
    return {
      passed,
      message: passed
        ? `剩余名额 ${timeSlot.capacity - timeSlot.bookedCount}/${timeSlot.capacity}`
        : '该时段已满员，请选择其他时段',
      code: 'TIMESLOT_FULL'
    };
  }

  static checkVehicleTypeMatch(student: User, session: TrainingSession): RuleCheckResult {
    return {
      passed: true,
      message: `培训车型：${session.vehicleTypeName}`,
      code: 'VEHICLE_TYPE_CHECK'
    };
  }

  static getFailedRules(results: RuleCheckResult[]): RuleCheckResult[] {
    return results.filter(r => !r.passed);
  }

  static getAllPassed(results: RuleCheckResult[]): boolean {
    return results.every(r => r.passed);
  }
}

export default BookingRuleEngine;
