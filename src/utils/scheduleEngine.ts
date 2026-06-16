import type {
  TrainingSession,
  TimeSlot,
  Booking,
  Vehicle,
  RetrainingItem,
  ExceptionRecord,
  User
} from '@/types/training';
import dayjs from 'dayjs';

export class ScheduleEngine {
  static checkVehicleTimeConflict(
    vehicleId: string,
    date: string,
    startTime: string,
    endTime: string,
    sessions: TrainingSession[],
    excludeSessionId?: string
  ): boolean {
    const targetStart = dayjs(`${date} ${startTime}`);
    const targetEnd = dayjs(`${date} ${endTime}`);

    for (const session of sessions) {
      if (session.id === excludeSessionId) continue;
      if (session.date !== date) continue;

      for (const slot of session.timeSlots) {
        if (slot.vehicleId !== vehicleId) continue;
        if (slot.status === 'completed') continue;

        const slotStart = dayjs(`${session.date} ${slot.startTime}`);
        const slotEnd = dayjs(`${session.date} ${slot.endTime}`);

        if (this.isTimeOverlap(targetStart, targetEnd, slotStart, slotEnd)) {
          return true;
        }
      }
    }
    return false;
  }

  static checkCoachTimeConflict(
    coachId: string,
    date: string,
    startTime: string,
    endTime: string,
    sessions: TrainingSession[],
    excludeSessionId?: string
  ): boolean {
    const targetStart = dayjs(`${date} ${startTime}`);
    const targetEnd = dayjs(`${date} ${endTime}`);

    for (const session of sessions) {
      if (session.id === excludeSessionId) continue;
      if (session.date !== date) continue;
      if (!session.coachIds.includes(coachId)) continue;

      for (const slot of session.timeSlots) {
        if (slot.coachId !== coachId) continue;
        if (slot.status === 'completed') continue;

        const slotStart = dayjs(`${session.date} ${slot.startTime}`);
        const slotEnd = dayjs(`${session.date} ${slot.endTime}`);

        if (this.isTimeOverlap(targetStart, targetEnd, slotStart, slotEnd)) {
          return true;
        }
      }
    }
    return false;
  }

  private static isTimeOverlap(
    start1: dayjs.Dayjs,
    end1: dayjs.Dayjs,
    start2: dayjs.Dayjs,
    end2: dayjs.Dayjs
  ): boolean {
    return start1.isBefore(end2) && start2.isBefore(end1);
  }

  static findAvailableVehicle(
    vehicleType: string,
    date: string,
    startTime: string,
    endTime: string,
    vehicles: Vehicle[],
    sessions: TrainingSession[],
    excludeVehicleId?: string
  ): Vehicle | null {
    const availableVehicles = vehicles.filter(v => {
      if (v.id === excludeVehicleId) return false;
      if (v.type !== vehicleType) return false;
      if (v.status !== 'available') return false;
      return !this.checkVehicleTimeConflict(v.id, date, startTime, endTime, sessions);
    });

    return availableVehicles.length > 0 ? availableVehicles[0] : null;
  }

  static findAvailableCoach(
    qualification: string[],
    date: string,
    startTime: string,
    endTime: string,
    coaches: User[],
    sessions: TrainingSession[],
    excludeCoachId?: string
  ): User | null {
    const availableCoaches = coaches.filter(c => {
      if (c.id === excludeCoachId) return false;
      if (c.role !== 'coach') return false;
      if (!c.coachQualification?.some(q => qualification.includes(q))) return false;
      return !this.checkCoachTimeConflict(c.id, date, startTime, endTime, sessions);
    });

    return availableCoaches.length > 0 ? availableCoaches[0] : null;
  }

  static handleVehicleFault(
    exception: ExceptionRecord,
    sessions: TrainingSession[],
    vehicles: Vehicle[],
    bookings: Booking[]
  ): {
    updatedSessions: TrainingSession[];
    updatedBookings: Booking[];
    newException: ExceptionRecord;
    retrainingItems: RetrainingItem[];
  } {
    const updatedSessions = [...sessions];
    const updatedBookings = [...bookings];
    const retrainingItems: RetrainingItem[] = [];

    const sessionIndex = updatedSessions.findIndex(s => s.id === exception.sessionId);
    if (sessionIndex === -1) {
      return { updatedSessions, updatedBookings, newException: exception, retrainingItems };
    }

    const session = { ...updatedSessions[sessionIndex] };

    if (exception.timeSlotId) {
      const slotIndex = session.timeSlots.findIndex(s => s.id === exception.timeSlotId);
      if (slotIndex !== -1) {
        const slot = { ...session.timeSlots[slotIndex] };
        const newVehicle = this.findAvailableVehicle(
          session.vehicleType,
          session.date,
          slot.startTime,
          slot.endTime,
          vehicles,
          sessions,
          exception.vehicleId
        );

        if (newVehicle) {
          slot.vehicleId = newVehicle.id;
          exception.newVehicleId = newVehicle.id;
          exception.handleMethod = '更换车辆';
          exception.handled = true;
          exception.handleTime = new Date().toISOString();
        } else {
          slot.status = 'completed';
          exception.handleMethod = '取消时段，学员进入补训';
          exception.handled = true;
          exception.handleTime = new Date().toISOString();

          const affectedBookings = updatedBookings.filter(
            b => b.timeSlotId === slot.id && b.status === 'confirmed'
          );

          affectedBookings.forEach(b => {
            b.status = 'retraining';
            retrainingItems.push({
              id: `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              studentId: b.studentId,
              studentName: b.studentName,
              originalBookingId: b.id,
              reason: 'equipment_failure',
              priority: 'high',
              vehicleType: session.vehicleType,
              status: 'pending',
              createTime: new Date().toISOString()
            });
          });
        }
        session.timeSlots[slotIndex] = slot;
      }
    }

    updatedSessions[sessionIndex] = session;

    return { updatedSessions, updatedBookings, newException: exception, retrainingItems };
  }

  static handleCoachAbsent(
    exception: ExceptionRecord,
    sessions: TrainingSession[],
    coaches: User[],
    bookings: Booking[]
  ): {
    updatedSessions: TrainingSession[];
    updatedBookings: Booking[];
    newException: ExceptionRecord;
    retrainingItems: RetrainingItem[];
  } {
    const updatedSessions = [...sessions];
    const updatedBookings = [...bookings];
    const retrainingItems: RetrainingItem[] = [];

    const sessionIndex = updatedSessions.findIndex(s => s.id === exception.sessionId);
    if (sessionIndex === -1) {
      return { updatedSessions, updatedBookings, newException: exception, retrainingItems };
    }

    const session = { ...updatedSessions[sessionIndex] };

    if (exception.timeSlotId) {
      const slotIndex = session.timeSlots.findIndex(s => s.id === exception.timeSlotId);
      if (slotIndex !== -1) {
        const slot = { ...session.timeSlots[slotIndex] };
        const newCoach = this.findAvailableCoach(
          session.requirements,
          session.date,
          slot.startTime,
          slot.endTime,
          coaches,
          sessions,
          exception.coachId
        );

        if (newCoach) {
          slot.coachId = newCoach.id;
          exception.newCoachId = newCoach.id;
          exception.handleMethod = '更换教练';
          exception.handled = true;
          exception.handleTime = new Date().toISOString();
        } else {
          slot.status = 'completed';
          exception.handleMethod = '取消时段，学员进入补训';
          exception.handled = true;
          exception.handleTime = new Date().toISOString();

          const affectedBookings = updatedBookings.filter(
            b => b.timeSlotId === slot.id && b.status === 'confirmed'
          );

          affectedBookings.forEach(b => {
            b.status = 'retraining';
            retrainingItems.push({
              id: `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              studentId: b.studentId,
              studentName: b.studentName,
              originalBookingId: b.id,
              reason: 'equipment_failure',
              priority: 'high',
              vehicleType: session.vehicleType,
              status: 'pending',
              createTime: new Date().toISOString()
            });
          });
        }
        session.timeSlots[slotIndex] = slot;
      }
    }

    updatedSessions[sessionIndex] = session;

    return { updatedSessions, updatedBookings, newException: exception, retrainingItems };
  }

  static sortRetrainingByPriority(items: RetrainingItem[]): RetrainingItem[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...items].sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
    });
  }

  static getStatistics(
    sessions: TrainingSession[],
    bookings: Booking[],
    vehicles: Vehicle[],
    startDate: string,
    endDate: string
  ) {
    const filteredSessions = sessions.filter(s => s.date >= startDate && s.date <= endDate);
    const filteredBookings = bookings.filter(b => b.date >= startDate && b.date <= endDate);

    const totalSessions = filteredSessions.length;
    const totalBookings = filteredBookings.length;
    const totalCapacity = filteredSessions.reduce((sum, s) => sum + s.capacity, 0);
    const bookingRate = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;

    const completedBookings = filteredBookings.filter(b => b.status === 'completed');
    const passedBookings = completedBookings.filter(b => {
      return true;
    });
    const passRate = completedBookings.length > 0
      ? (passedBookings.length / completedBookings.length) * 100
      : 0;

    const absentBookings = filteredBookings.filter(b => b.status === 'absent');
    const absentRate = totalBookings > 0
      ? (absentBookings.length / totalBookings) * 100
      : 0;

    const retrainingCount = filteredBookings.filter(b => b.status === 'retraining').length;

    const totalSlots = filteredSessions.reduce((sum, s) => sum + s.timeSlots.length, 0);
    const usedSlots = filteredSessions.reduce(
      (sum, s) => sum + s.timeSlots.filter(slot => slot.status !== 'available').length,
      0
    );
    const vehicleUtilization = totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0;

    return {
      totalSessions,
      totalBookings,
      bookingRate: Math.round(bookingRate * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      absentRate: Math.round(absentRate * 10) / 10,
      vehicleUtilization: Math.round(vehicleUtilization * 10) / 10,
      retrainingCount,
      periodStart: startDate,
      periodEnd: endDate
    };
  }
}

export default ScheduleEngine;
