import { User, Athlete } from '../models/User';
import { Discipline } from '../models/Discipline';
import { SportsFacility } from '../models/SportsFacility';
import { Schedule } from '../models/Schedule';
import { Enrollment } from '../models/Enrollment';
import { OversightReport } from '../models/OversightReport';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface IDisciplineRepository {
  findById(id: string): Promise<Discipline | null>;
  findAll(): Promise<Discipline[]>;
  save(discipline: Discipline): Promise<void>;
}

export interface ISportsFacilityRepository {
  findById(id: string): Promise<SportsFacility | null>;
  findAll(): Promise<SportsFacility[]>;
  save(facility: SportsFacility): Promise<void>;
}

export interface IScheduleRepository {
  findById(id: string): Promise<Schedule | null>;
  findByAthleteId(athleteId: string): Promise<Schedule[]>;
  save(schedule: Schedule): Promise<void>;
}

export interface IEnrollmentRepository {
  findByAthleteAndSchedule(athleteId: string, scheduleId: string): Promise<Enrollment | null>;
  findByAthleteId(athleteId: string): Promise<Enrollment[]>;
  countByScheduleId(scheduleId: string): Promise<number>;
  save(enrollment: Enrollment): Promise<void>;
}

export interface IOversightReportRepository {
  findById(id: string): Promise<OversightReport | null>;
  findPending(): Promise<OversightReport[]>;
  save(report: OversightReport): Promise<void>;
}
