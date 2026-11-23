import {
  IOversightReportRepository,
  ISportsFacilityRepository
} from '../../domain/repositories/IRepositories';
import { TrafficLightStatus } from '../../domain/value-objects/TrafficLightStatus';

export class ValidateTrafficLightUseCase {
  constructor(
    private reportRepo: IOversightReportRepository,
    private facilityRepo: ISportsFacilityRepository
  ) {}

  async execute(reportId: string, cmjId: string, approved: boolean, observations: string, newStatus?: TrafficLightStatus): Promise<void> {
    const report = await this.reportRepo.findById(reportId);
    if (!report) throw new Error('El reporte de veeduría no existe.');

    const facility = await this.facilityRepo.findById(report.facilityId);
    if (!facility) throw new Error('El escenario deportivo no existe.');

    if (approved) {
      if (!newStatus) throw new Error('Debe especificar el nuevo estado del semáforo al aprobar.');
      report.validateByCMJ(observations, newStatus);
      
      // Regla RN-03: Actualizar semáforo únicamente tras validación oficial CMJ
      facility.updateTrafficLight(newStatus);
      await this.facilityRepo.save(facility);
    } else {
      report.rejectByCMJ(observations);
    }

    await this.reportRepo.save(report);
  }
}
