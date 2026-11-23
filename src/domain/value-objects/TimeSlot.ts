export class TimeSlot {
  constructor(
    public readonly daysOfWeek: string[], // e.g. ['LUNES', 'MIERCOLES']
    public readonly startTime: string,     // '14:00'
    public readonly endTime: string        // '15:30'
  ) {}

  public overlapsWith(other: TimeSlot): boolean {
    const commonDays = this.daysOfWeek.some(day => other.daysOfWeek.includes(day));
    if (!commonDays) return false;

    const start1 = this.timeToMinutes(this.startTime);
    const end1 = this.timeToMinutes(this.endTime);
    const start2 = this.timeToMinutes(other.startTime);
    const end2 = this.timeToMinutes(other.endTime);

    return (start1 < end2 && start2 < end1);
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
