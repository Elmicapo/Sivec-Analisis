import { TrafficLightStatus } from '../value-objects/TrafficLightStatus';

export enum ReportStatus {
  PENDIENTE = 'PENDIENTE',
  VALIDADO = 'VALIDADO',
  RECHAZADO = 'RECHAZADO'
}

export class OversightReport {
  constructor(
    public readonly id: string,
    public readonly facilityId: string,
    public readonly reporterId: string,
    public readonly reporterType: 'DEPORTISTA' | 'COMUNIDAD',
    public readonly description: string,
    public readonly photoUrl: string,
    public status: ReportStatus = ReportStatus.PENDIENTE,
    public cmjReviewDate?: Date,
    public cmjObservations?: string,
    public proposedStatus?: TrafficLightStatus
  ) {}

  public validateByCMJ(observations: string, newStatus?: TrafficLightStatus): void {
    this.status = ReportStatus.VALIDADO;
    this.cmjReviewDate = new Date();
    this.cmjObservations = observations;
    if (newStatus) this.proposedStatus = newStatus;
  }

  public rejectByCMJ(reason: string): void {
    this.status = ReportStatus.RECHAZADO;
    this.cmjReviewDate = new Date();
    this.cmjObservations = reason;
  }
}
