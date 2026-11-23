import { v4 as uuidv4 } from 'uuid';
import { Enrollment } from '../../domain/models/Enrollment';
import {
  IEnrollmentRepository,
  IScheduleRepository,
  IDisciplineRepository
} from '../../domain/repositories/IRepositories';

export class EnrollAthleteUseCase {
  constructor(
    private enrollmentRepo: IEnrollmentRepository,
    private scheduleRepo: IScheduleRepository,
    private disciplineRepo: IDisciplineRepository
  ) {}

  async execute(athleteId: string, scheduleId: string): Promise<Enrollment> {
    const targetSchedule = await this.scheduleRepo.findById(scheduleId);
    if (!targetSchedule) throw new Error('El cronograma especificado no existe.');

    const discipline = await this.disciplineRepo.findById(targetSchedule.disciplineId);
    if (!discipline || !discipline.isActive) throw new Error('La disciplina no se encuentra activa.');

    // Validar Aforo
    const currentEnrolled = await this.enrollmentRepo.countByScheduleId(scheduleId);
    if (currentEnrolled >= discipline.maxCapacity) {
      throw new Error(`Cupo máximo alcanzado (${discipline.maxCapacity}). No hay vacantes.`);
    }

    // Regla RN-01: Validar no cruce de horarios
    const activeEnrollments = await this.enrollmentRepo.findByAthleteId(athleteId);
    for (const enrollment of activeEnrollments) {
      const existingSchedule = await this.scheduleRepo.findById(enrollment.scheduleId);
      if (existingSchedule && existingSchedule.timeSlot.overlapsWith(targetSchedule.timeSlot)) {
        throw new Error(`REGLA RN-01 VIOLADA: El horario (${targetSchedule.timeSlot.startTime}-${targetSchedule.timeSlot.endTime}) se cruza con otra disciplina previamente inscrita.`);
      }
    }

    const newEnrollment = new Enrollment(uuidv4(), athleteId, scheduleId);
    await this.enrollmentRepo.save(newEnrollment);
    return newEnrollment;
  }
}
