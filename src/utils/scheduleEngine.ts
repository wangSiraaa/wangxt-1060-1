import type {
  TrainingSession,
  TimeSlot,
  Booking,
  Vehicle,
  RetrainingItem,
  ExceptionRecord,
  User,
  RescheduleItem,
  TrainingSuspension,
  CoachLeaveRecord,
  WeatherCondition,
  VehicleType
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

  static handleWeatherSuspension(
    date: string,
    siteId: string,
    siteName: string,
    weatherCondition: WeatherCondition,
    description: string,
    sessions: TrainingSession[],
    bookings: Booking[],
    vehicles: Vehicle[]
  ): {
    suspension: TrainingSuspension;
    updatedSessions: TrainingSession[];
    updatedBookings: Booking[];
    rescheduleItems: RescheduleItem[];
    retrainingItems: RetrainingItem[];
  } {
    const affectedSessions = sessions.filter(
      s => s.date === date && s.siteId === siteId && s.status !== 'completed' && s.status !== 'cancelled'
    );

    const affectedSessionIds = affectedSessions.map(s => s.id);
    const affectedVehicleIds = [...new Set(affectedSessions.flatMap(s => s.vehicleIds))];
    const affectedBookings = bookings.filter(
      b => affectedSessionIds.includes(b.sessionId) && (b.status === 'confirmed' || b.status === 'pending')
    );
    const affectedStudentIds = [...new Set(affectedBookings.map(b => b.studentId))];

    const updatedSessions = sessions.map(s => {
      if (!affectedSessionIds.includes(s.id)) return s;
      return {
        ...s,
        status: 'cancelled' as const,
        timeSlots: s.timeSlots.map(slot => ({ ...slot, status: 'completed' as const }))
      };
    });

    const updatedBookings = bookings.map(b => {
      if (!affectedBookings.find(ab => ab.id === b.id)) return b;
      return { ...b, status: 'retraining' as const };
    });

    const vehiclePriorityMap = this.buildVehiclePriorityMap(vehicles, affectedSessions);

    const rescheduleItems: RescheduleItem[] = affectedBookings.map((booking, index) => ({
      id: `reschedule_${Date.now()}_${index}`,
      originalBookingId: booking.id,
      studentId: booking.studentId,
      studentName: booking.studentName,
      sessionId: booking.sessionId,
      sessionTitle: booking.sessionTitle,
      originalDate: booking.date,
      originalTimeSlotId: booking.timeSlotId,
      originalTimeSlot: booking.timeSlot,
      originalVehicleId: booking.vehicleId,
      originalVehiclePlate: booking.vehiclePlate,
      originalCoachId: booking.coachId,
      originalCoachName: booking.coachName,
      vehicleType: sessions.find(s => s.id === booking.sessionId)?.vehicleType || 'other',
      vehiclePriority: vehiclePriorityMap.get(booking.vehicleId) || 999,
      reason: 'weather',
      status: 'pending',
      createTime: new Date().toISOString()
    }));

    const retrainingItems: RetrainingItem[] = affectedBookings.map(booking => ({
      id: `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: booking.studentId,
      studentName: booking.studentName,
      originalBookingId: booking.id,
      reason: 'weather',
      priority: 'high',
      vehicleType: sessions.find(s => s.id === booking.sessionId)?.vehicleType || 'other',
      vehicleId: booking.vehicleId,
      status: 'pending',
      createTime: new Date().toISOString()
    }));

    const suspension: TrainingSuspension = {
      id: `suspension_${Date.now()}`,
      date,
      siteId,
      siteName,
      reason: 'weather',
      weatherCondition,
      description,
      affectedSessionIds,
      affectedVehicleIds,
      affectedStudentIds,
      affectedBookingIds: affectedBookings.map(b => b.id),
      rescheduledCount: 0,
      status: 'active',
      createTime: new Date().toISOString()
    };

    return {
      suspension,
      updatedSessions,
      updatedBookings,
      rescheduleItems: this.sortRescheduleByVehiclePriority(rescheduleItems),
      retrainingItems
    };
  }

  private static buildVehiclePriorityMap(
    vehicles: Vehicle[],
    sessions: TrainingSession[]
  ): Map<string, number> {
    const usageCount = new Map<string, number>();
    
    sessions.forEach(session => {
      session.timeSlots.forEach(slot => {
        usageCount.set(slot.vehicleId, (usageCount.get(slot.vehicleId) || 0) + 1);
      });
    });

    const priorityMap = new Map<string, number>();
    const sortedByUsage = [...usageCount.entries()].sort((a, b) => b[1] - a[1]);
    
    sortedByUsage.forEach(([vehicleId], index) => {
      priorityMap.set(vehicleId, index + 1);
    });

    vehicles.forEach(v => {
      if (!priorityMap.has(v.id)) {
        priorityMap.set(v.id, 999);
      }
    });

    return priorityMap;
  }

  static sortRescheduleByVehiclePriority(items: RescheduleItem[]): RescheduleItem[] {
    return [...items].sort((a, b) => {
      if (a.vehiclePriority !== b.vehiclePriority) {
        return a.vehiclePriority - b.vehiclePriority;
      }
      return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
    });
  }

  static handleCoachLeave(
    coachId: string,
    coachName: string,
    startDate: string,
    endDate: string,
    reason: string,
    sessions: TrainingSession[],
    coaches: User[],
    bookings: Booking[],
    vehicles: Vehicle[]
  ): {
    leaveRecord: CoachLeaveRecord;
    updatedSessions: TrainingSession[];
    updatedBookings: Booking[];
    rescheduleItems: RescheduleItem[];
    reassignedCount: number;
  } {
    const affectedSessions = sessions.filter(s => {
      if (s.date < startDate || s.date > endDate) return false;
      if (!s.coachIds.includes(coachId)) return false;
      return s.status === 'available' || s.status === 'full' || s.status === 'pending';
    });

    const affectedSessionIds = affectedSessions.map(s => s.id);
    let reassignedCount = 0;

    const updatedSessions = sessions.map(session => {
      if (!affectedSessionIds.includes(session.id)) return session;

      const newTimeSlots = session.timeSlots.map(slot => {
        if (slot.coachId !== coachId) return slot;

        const replacementCoach = this.findReplacementCoach(
          session.vehicleType,
          session.requirements,
          session.date,
          slot.startTime,
          slot.endTime,
          coaches,
          sessions,
          coachId
        );

        if (replacementCoach) {
          reassignedCount++;
          return { ...slot, coachId: replacementCoach.id };
        }
        return slot;
      });

      const newCoachIds = [...new Set(newTimeSlots.map(s => s.coachId))];
      const newCoachNames = newCoachIds.map(
        id => coaches.find(c => c.id === id)?.name || ''
      ).filter(Boolean);

      return {
        ...session,
        coachIds: newCoachIds,
        coachNames: newCoachNames,
        timeSlots: newTimeSlots
      };
    });

    const unresolvedSlots: { sessionId: string; slot: TimeSlot }[] = [];
    affectedSessions.forEach(session => {
      const updatedSession = updatedSessions.find(s => s.id === session.id);
      if (!updatedSession) return;
      session.timeSlots.forEach((slot, idx) => {
        if (slot.coachId === coachId && updatedSession.timeSlots[idx].coachId === coachId) {
          unresolvedSlots.push({ sessionId: session.id, slot });
        }
      });
    });

    const vehiclePriorityMap = this.buildVehiclePriorityMap(vehicles, affectedSessions);

    const rescheduleItems: RescheduleItem[] = [];
    unresolvedSlots.forEach(({ sessionId, slot }) => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const slotBookings = bookings.filter(
        b => b.sessionId === sessionId && b.timeSlotId === slot.id && 
             (b.status === 'confirmed' || b.status === 'pending')
      );

      slotBookings.forEach((booking, index) => {
        rescheduleItems.push({
          id: `reschedule_${Date.now()}_${rescheduleItems.length}_${index}`,
          originalBookingId: booking.id,
          studentId: booking.studentId,
          studentName: booking.studentName,
          sessionId: booking.sessionId,
          sessionTitle: booking.sessionTitle,
          originalDate: booking.date,
          originalTimeSlotId: booking.timeSlotId,
          originalTimeSlot: booking.timeSlot,
          originalVehicleId: booking.vehicleId,
          originalVehiclePlate: booking.vehiclePlate,
          originalCoachId: booking.coachId,
          originalCoachName: booking.coachName,
          vehicleType: session.vehicleType,
          vehiclePriority: vehiclePriorityMap.get(booking.vehicleId) || 999,
          reason: 'coach_leave',
          status: 'pending',
          createTime: new Date().toISOString()
        });
      });
    });

    const updatedBookings = bookings.map(b => {
      const needsReschedule = rescheduleItems.find(r => r.originalBookingId === b.id);
      if (!needsReschedule) return b;
      return { ...b, status: 'retraining' as const };
    });

    const leaveRecord: CoachLeaveRecord = {
      id: `leave_${Date.now()}`,
      coachId,
      coachName,
      startDate,
      endDate,
      reason,
      affectedSessionIds,
      reassignedCount,
      status: reassignedCount > 0 ? 'in_progress' : 'pending',
      createTime: new Date().toISOString()
    };

    return {
      leaveRecord,
      updatedSessions,
      updatedBookings,
      rescheduleItems: this.sortRescheduleByVehiclePriority(rescheduleItems),
      reassignedCount
    };
  }

  static findReplacementCoach(
    vehicleType: VehicleType,
    qualifications: string[],
    date: string,
    startTime: string,
    endTime: string,
    coaches: User[],
    sessions: TrainingSession[],
    excludeCoachId?: string
  ): User | null {
    const requiredQuals = [...qualifications];
    if (!requiredQuals.includes(vehicleType)) {
      requiredQuals.push(vehicleType);
    }

    const availableCoaches = coaches.filter(c => {
      if (c.id === excludeCoachId) return false;
      if (c.role !== 'coach') return false;
      if (!c.coachQualification) return false;
      
      const hasRequiredQual = requiredQuals.some(q => 
        c.coachQualification!.includes(q)
      );
      if (!hasRequiredQual) return false;

      return !this.checkCoachTimeConflict(c.id, date, startTime, endTime, sessions);
    });

    return availableCoaches.length > 0 ? availableCoaches[0] : null;
  }

  static getSuspensionImpact(
    suspension: TrainingSuspension,
    sessions: TrainingSession[],
    bookings: Booking[],
    vehicles: Vehicle[],
    users: User[]
  ): {
    affectedVehicles: Vehicle[];
    affectedStudents: User[];
    affectedBookings: Booking[];
    subsequentSessions: TrainingSession[];
  } {
    const affectedVehicles = vehicles.filter(v => 
      suspension.affectedVehicleIds.includes(v.id)
    );

    const affectedStudents = users.filter(u => 
      suspension.affectedStudentIds.includes(u.id)
    );

    const affectedBookings = bookings.filter(b => 
      suspension.affectedBookingIds.includes(b.id)
    );

    const subsequentSessions = sessions.filter(s => {
      if (s.date <= suspension.date) return false;
      if (s.siteId !== suspension.siteId) return false;
      if (s.status === 'completed' || s.status === 'cancelled') return false;
      
      const sharesVehicle = s.vehicleIds.some(vid => 
        suspension.affectedVehicleIds.includes(vid)
      );
      const sharesStudent = s.timeSlots.some(slot =>
        bookings.some(b => 
          b.timeSlotId === slot.id && 
          suspension.affectedStudentIds.includes(b.studentId) &&
          (b.status === 'confirmed' || b.status === 'pending')
        )
      );
      return sharesVehicle || sharesStudent;
    }).sort((a, b) => a.date.localeCompare(b.date));

    return {
      affectedVehicles,
      affectedStudents,
      affectedBookings,
      subsequentSessions
    };
  }

  static checkConsecutiveAbsence(
    studentId: string,
    results: { studentId: string; status: string; date: string }[]
  ): {
    consecutiveCount: number;
    needsManualReview: boolean;
  } {
    const studentResults = results
      .filter(r => r.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));

    let consecutiveCount = 0;
    for (const result of studentResults) {
      if (result.status === 'absent') {
        consecutiveCount++;
      } else {
        break;
      }
    }

    return {
      consecutiveCount,
      needsManualReview: consecutiveCount >= 2
    };
  }
}

export default ScheduleEngine;
