import { User, Athlete, Trainer } from '../../../domain/models/User';
import { Discipline } from '../../../domain/models/Discipline';
import { SportsFacility } from '../../../domain/models/SportsFacility';
import { Schedule } from '../../../domain/models/Schedule';
import { Enrollment } from '../../../domain/models/Enrollment';
import { OversightReport, ReportStatus } from '../../../domain/models/OversightReport';
import { TimeSlot } from '../../../domain/value-objects/TimeSlot';
import { TrafficLightStatus } from '../../../domain/value-objects/TrafficLightStatus';
import {
  IUserRepository,
  IDisciplineRepository,
  ISportsFacilityRepository,
  IScheduleRepository,
  IEnrollmentRepository,
  IOversightReportRepository
} from '../../../domain/repositories/IRepositories';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    // Seed initial users
    const athlete = new Athlete('ath-1', '1098111222', 'Andres Silva', 'andres@email.com', '3181112222', 'Masculino', 20);
    this.users.set(athlete.id, athlete);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

export class InMemoryDisciplineRepository implements IDisciplineRepository {
  private disciplines: Map<string, Discipline> = new Map();

  constructor() {
    const d1 = new Discipline('disc-1', 'Baloncesto Formativo', 'DEPORTIVA', 'Categoria Abierta', 25);
    const d2 = new Discipline('disc-2', 'Futbol Municipal', 'DEPORTIVA', 'Categoria Abierta', 30);
    this.disciplines.set(d1.id, d1);
    this.disciplines.set(d2.id, d2);
  }

  async findById(id: string): Promise<Discipline | null> {
    return this.disciplines.get(id) || null;
  }

  async findAll(): Promise<Discipline[]> {
    return Array.from(this.disciplines.values());
  }

  async save(discipline: Discipline): Promise<void> {
    this.disciplines.set(discipline.id, discipline);
  }
}

export class InMemorySportsFacilityRepository implements ISportsFacilityRepository {
  private facilities: Map<string, SportsFacility> = new Map();

  constructor() {
    const f1 = new SportsFacility('fac-1', 'Coliseo Bicentenario', 'Calle 10 # 20-00', 1500, TrafficLightStatus.VERDE);
    const f2 = new SportsFacility('fac-2', 'Polideportivo Los Pinos', 'Avenida 8 # 33-10', 200, TrafficLightStatus.AMARILLO);
    this.facilities.set(f1.id, f1);
    this.facilities.set(f2.id, f2);
  }

  async findById(id: string): Promise<SportsFacility | null> {
    return this.facilities.get(id) || null;
  }

  async findAll(): Promise<SportsFacility[]> {
    return Array.from(this.facilities.values());
  }

  async save(facility: SportsFacility): Promise<void> {
    this.facilities.set(facility.id, facility);
  }
}

export class InMemoryScheduleRepository implements IScheduleRepository {
  private schedules: Map<string, Schedule> = new Map();

  constructor() {
    const s1 = new Schedule('sch-1', 'disc-1', 'fac-1', 'tr-1', new TimeSlot(['LUNES', 'MIERCOLES'], '14:00', '15:30'), new Date('2026-01-01'), new Date('2026-12-31'));
    const s2 = new Schedule('sch-2', 'disc-2', 'fac-2', 'tr-2', new TimeSlot(['LUNES', 'MIERCOLES'], '14:30', '16:00'), new Date('2026-01-01'), new Date('2026-12-31'));
    this.schedules.set(s1.id, s1);
    this.schedules.set(s2.id, s2);
  }

  async findById(id: string): Promise<Schedule | null> {
    return this.schedules.get(id) || null;
  }

  async findByAthleteId(athleteId: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async save(schedule: Schedule): Promise<void> {
    this.schedules.set(schedule.id, schedule);
  }
}

export class InMemoryEnrollmentRepository implements IEnrollmentRepository {
  private enrollments: Map<string, Enrollment> = new Map();

  async findByAthleteAndSchedule(athleteId: string, scheduleId: string): Promise<Enrollment | null> {
    return Array.from(this.enrollments.values()).find(e => e.athleteId === athleteId && e.scheduleId === scheduleId && e.status === 'CONFIRMADA') || null;
  }

  async findByAthleteId(athleteId: string): Promise<Enrollment[]> {
    return Array.from(this.enrollments.values()).filter(e => e.athleteId === athleteId && e.status === 'CONFIRMADA');
  }

  async countByScheduleId(scheduleId: string): Promise<number> {
    return Array.from(this.enrollments.values()).filter(e => e.scheduleId === scheduleId && e.status === 'CONFIRMADA').length;
  }

  async save(enrollment: Enrollment): Promise<void> {
    this.enrollments.set(enrollment.id, enrollment);
  }
}

export class InMemoryOversightReportRepository implements IOversightReportRepository {
  private reports: Map<string, OversightReport> = new Map();

  async findById(id: string): Promise<OversightReport | null> {
    return this.reports.get(id) || null;
  }

  async findPending(): Promise<OversightReport[]> {
    return Array.from(this.reports.values()).filter(r => r.status === ReportStatus.PENDIENTE);
  }

  async save(report: OversightReport): Promise<void> {
    this.reports.set(report.id, report);
  }
}
