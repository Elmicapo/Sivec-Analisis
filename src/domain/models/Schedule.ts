import { TimeSlot } from '../value-objects/TimeSlot';

export class Schedule {
  constructor(
    public readonly id: string,
    public readonly disciplineId: string,
    public readonly facilityId: string,
    public readonly trainerId: string,
    public readonly timeSlot: TimeSlot,
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {}
}
