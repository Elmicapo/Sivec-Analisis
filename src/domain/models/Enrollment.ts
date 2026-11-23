export class Enrollment {
  constructor(
    public readonly id: string,
    public readonly athleteId: string,
    public readonly scheduleId: string,
    public readonly enrollmentDate: Date = new Date(),
    public status: 'CONFIRMADA' | 'CANCELADA' = 'CONFIRMADA'
  ) {}
}
