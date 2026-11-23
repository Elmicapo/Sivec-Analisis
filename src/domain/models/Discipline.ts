export class Discipline {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly category: 'DEPORTIVA' | 'CULTURAL',
    public readonly targetAudience: string,
    public maxCapacity: number,
    public isActive: boolean = true
  ) {}
}
