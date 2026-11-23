import { Pool, RowDataPacket } from 'mysql2/promise';

export class MySqlScheduleCatalog {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<RowDataPacket[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(`
      SELECT c.id_cronograma AS id, d.nombre AS discipline, e.nombre AS facility,
             c.dias_semana AS days, c.hora_inicio AS startTime, c.hora_fin AS endTime,
             u.nombre_completo AS coach, DATE_FORMAT(c.fecha_inicio_vigencia, '%Y-%m-%d') AS validFrom,
             DATE_FORMAT(c.fecha_fin_vigencia, '%Y-%m-%d') AS validUntil
      FROM cronograma_entrenamiento c
      JOIN disciplina d ON d.id_disciplina = c.id_disciplina
      JOIN escenario_deportivo e ON e.id_escenario = c.id_escenario
      JOIN usuario u ON u.id_usuario = c.id_entrenador
      WHERE d.estado = 'ACTIVA'
      ORDER BY d.nombre, c.hora_inicio, c.id_cronograma
    `);
    return rows;
  }
}
