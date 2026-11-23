export abstract class User {
  constructor(
    public readonly id: string,
    public readonly identification: string,
    public readonly fullName: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly role: 'ADMINISTRATIVO' | 'ENTRENADOR' | 'DEPORTISTA' | 'CMJ'
  ) {}
}

export class Athlete extends User {
  constructor(
    id: string,
    identification: string,
    fullName: string,
    email: string,
    phone: string,
    public readonly gender: string,
    public readonly age: number
  ) {
    super(id, identification, fullName, email, phone, 'DEPORTISTA');
  }
}

export class Trainer extends User {
  constructor(
    id: string,
    identification: string,
    fullName: string,
    email: string,
    phone: string,
    public readonly mainSport: string,
    public readonly allowsMultipleSports: boolean
  ) {
    super(id, identification, fullName, email, phone, 'ENTRENADOR');
  }
}
