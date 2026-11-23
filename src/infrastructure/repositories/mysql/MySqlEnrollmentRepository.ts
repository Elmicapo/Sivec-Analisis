import { randomUUID } from 'node:crypto';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { Enrollment } from '../../../domain/models/Enrollment';

interface ScheduleRow extends RowDataPacket {
  estado: string;
  cupo_maximo: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

export class MySqlEnrollmentRepository {
  constructor(private readonly pool: Pool) {}

  async execute(athleteId: string, scheduleId: string): Promise<Enrollment> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Serializa las altas del mismo deportista, incluso entre cronogramas.
      const [athletes] = await connection.execute<RowDataPacket[]>(
        'SELECT id_usuario FROM deportista WHERE id_usuario = ? FOR UPDATE',
        [athleteId],
      );
      if (athletes.length === 0) throw new Error('El deportista no existe.');

      // El bloqueo del cronograma evita que dos altas agoten el mismo cupo.
      const [schedules] = await connection.execute<ScheduleRow[]>(`
        SELECT d.estado, d.cupo_maximo
        FROM cronograma_entrenamiento c
        JOIN disciplina d ON d.id_disciplina = c.id_disciplina
        WHERE c.id_cronograma = ?
        FOR UPDATE
      `, [scheduleId]);
      const schedule = schedules[0];
      if (!schedule) throw new Error('El cronograma especificado no existe.');
      if (schedule.estado !== 'ACTIVA') throw new Error('La disciplina no se encuentra activa.');

      const [[count]] = await connection.execute<CountRow[]>(`
        SELECT COUNT(*) AS total FROM inscripcion
        WHERE id_cronograma = ? AND estado_inscripcion = 'CONFIRMADA'
      `, [scheduleId]);
      if (count.total >= schedule.cupo_maximo) throw new Error('No hay cupos disponibles.');

      const enrollment = new Enrollment(randomUUID(), athleteId, scheduleId);
      // El disparador trg_validar_cruce_horarios aplica RN-01.
      await connection.execute(`
        INSERT INTO inscripcion
          (id_inscripcion, id_deportista, id_cronograma, fecha_inscripcion, estado_inscripcion)
        VALUES (?, ?, ?, ?, ?)
      `, [enrollment.id, athleteId, scheduleId, enrollment.enrollmentDate, enrollment.status]);

      await connection.commit();
      return enrollment;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
