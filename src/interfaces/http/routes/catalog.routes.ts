import { Router } from 'express';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { AuthController } from '../controllers/AuthController';

export function createCatalogRouter(pool: Pool, auth: AuthController): Router {
  const router = Router();

  router.get('/disciplinas', async (_req, res, next) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT d.id_disciplina AS id, d.nombre AS nombre, d.categoria AS categoria,
               d.poblacion_objetivo AS poblacion, d.cupo_maximo AS cupo,
               COALESCE((SELECT GROUP_CONCAT(DISTINCT e.ubicacion ORDER BY e.ubicacion SEPARATOR ' · ')
                 FROM cronograma_entrenamiento c
                 JOIN escenario_deportivo e ON e.id_escenario = c.id_escenario
                 WHERE c.id_disciplina = d.id_disciplina), '') AS ubicaciones,
               COALESCE((SELECT GROUP_CONCAT(DISTINCT u.nombre_completo ORDER BY u.nombre_completo SEPARATOR ' · ')
                 FROM entrenador_disciplina ed JOIN usuario u ON u.id_usuario = ed.id_entrenador
                 WHERE ed.id_disciplina = d.id_disciplina), '') AS entrenadores,
               (SELECT COUNT(DISTINCT i.id_deportista) FROM inscripcion i
                 JOIN cronograma_entrenamiento c ON c.id_cronograma = i.id_cronograma
                 WHERE c.id_disciplina = d.id_disciplina AND i.estado_inscripcion = 'CONFIRMADA') AS inscritos
        FROM disciplina d
        WHERE d.estado = 'ACTIVA'
        ORDER BY d.nombre, d.id_disciplina
      `);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/entrenadores', async (_req, res, next) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT u.id_usuario AS id, u.nombre_completo AS nombre, e.deporte_principal AS deporte,
               e.duracion_entrenamiento_min AS duracion, e.permite_multiples_deportes AS multiples
        FROM entrenador e JOIN usuario u ON u.id_usuario = e.id_usuario
        ORDER BY u.nombre_completo
      `);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/inscripciones/mi-historial', auth.requireAthlete, async (_req, res, next) => {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(`
        SELECT i.id_inscripcion AS id, i.estado_inscripcion AS estado,
               i.fecha_inscripcion AS fecha, d.nombre AS disciplina, e.nombre AS escenario,
               c.dias_semana AS dias, c.hora_inicio AS inicio, c.hora_fin AS fin
        FROM inscripcion i
        JOIN cronograma_entrenamiento c ON c.id_cronograma = i.id_cronograma
        JOIN disciplina d ON d.id_disciplina = c.id_disciplina
        JOIN escenario_deportivo e ON e.id_escenario = c.id_escenario
        WHERE i.id_deportista = ?
        ORDER BY i.fecha_inscripcion DESC, i.id_inscripcion
      `, [res.locals.athleteId]);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
