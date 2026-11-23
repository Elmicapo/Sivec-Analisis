import { Pool, RowDataPacket } from 'mysql2/promise';
import { SportsFacility } from '../../../domain/models/SportsFacility';
import { ISportsFacilityRepository } from '../../../domain/repositories/IRepositories';
import { TrafficLightStatus } from '../../../domain/value-objects/TrafficLightStatus';

interface FacilityRow extends RowDataPacket {
  id_escenario: string;
  nombre: string;
  ubicacion: string;
  capacidad_aforo: number;
  estado_semaforo: TrafficLightStatus;
  fecha_ultima_actualizacion: Date;
}

export class MySqlFacilityRepository implements Pick<ISportsFacilityRepository, 'findAll'> {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<SportsFacility[]> {
    const [rows] = await this.pool.query<FacilityRow[]>(`
      SELECT id_escenario, nombre, ubicacion, capacidad_aforo,
             estado_semaforo, fecha_ultima_actualizacion
      FROM escenario_deportivo
      ORDER BY nombre, id_escenario
    `);
    return rows.map((row) => new SportsFacility(
      row.id_escenario,
      row.nombre,
      row.ubicacion,
      row.capacidad_aforo,
      row.estado_semaforo,
      row.fecha_ultima_actualizacion,
    ));
  }
}