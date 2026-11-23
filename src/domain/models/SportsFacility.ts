import { TrafficLightStatus } from '../value-objects/TrafficLightStatus';

export class SportsFacility {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly location: string,
    public readonly capacity: number,
    public trafficLight: TrafficLightStatus = TrafficLightStatus.VERDE,
    public lastUpdated: Date = new Date()
  ) {}

  public updateTrafficLight(newStatus: TrafficLightStatus): void {
    this.trafficLight = newStatus;
    this.lastUpdated = new Date();
  }
}
