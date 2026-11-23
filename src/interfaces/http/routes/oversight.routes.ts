import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { AuthController } from '../controllers/AuthController';

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const colors = ['VERDE', 'AMARILLO', 'ROJO'];

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
}

export function createOversightRouter(pool: Pool, auth: AuthController): Router {
  const router = Router();

  router.post('/', auth.requireAthlete, async (req, res, next) => {
    const { idEscenario, descripcionDeterioro } = req.body ?? {};
    if (typeof idEscenario !== 'string' || !uuid.test(idEscenario) || !validText(descripcionDeterioro)) {
      res.status(400).json({ error: 'Selecciona un escenario y describe su deterioro.' });
      return;
    }
    try {
      const idReporte = randomUUID();
      const [result] = await pool.execute<ResultSetHeader>(`
        INSERT INTO reporte_veeduria
          (id_reporte, id_escenario, tipo_reportante, id_reportante, descripcion_deterioro, estado_reporte)
        SELECT ?, e.id_escenario, 'DEPORTISTA', d.id_usuario, ?, 'PENDIENTE'
        FROM escenario_deportivo e
        JOIN deportista d ON d.id_usuario = ?
        WHERE e.id_escenario = ?
      `, [idReporte, descripcionDeterioro.trim(), res.locals.athleteId, idEscenario]);
      if (!result.affectedRows) {
        res.status(404).json({ error: 'El escenario o el deportista ya no está disponible.' });
        return;
      }
      res.status(201).json({ data: { idReporte, estado: 'PENDIENTE' } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/pendientes', auth.requireCmj, async (_req, res, next) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT r.id_reporte AS idReporte, e.nombre AS escenario,
               r.descripcion_deterioro AS descripcion, r.fecha_reporte AS fecha
        FROM reporte_veeduria r
        JOIN escenario_deportivo e ON e.id_escenario = r.id_escenario
        WHERE r.estado_reporte = 'PENDIENTE'
        ORDER BY r.fecha_reporte, r.id_reporte
      `);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id/validacion', auth.requireCmj, async (req, res, next) => {
    const { estado, observaciones, nuevoEstadoSemaforo } = req.body ?? {};
    if (!uuid.test(req.params.id) || !validText(observaciones) ||
        (estado !== 'RECHAZADO' && estado !== 'VALIDADO') ||
        (estado === 'VALIDADO' && !colors.includes(nuevoEstadoSemaforo))) {
      res.status(400).json({ error: 'Indica una decisión, observaciones y el color si validas el reporte.' });
      return;
    }
    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const reviewer = res.locals.cmjId;
        const [result] = await connection.execute<ResultSetHeader>(`
          UPDATE reporte_veeduria
          SET estado_reporte = ?, observaciones_cmj = ?, id_revisor_cmj = ?, fecha_revision = CURRENT_TIMESTAMP
          WHERE id_reporte = ? AND estado_reporte = 'PENDIENTE'
        `, [estado, observaciones.trim(), reviewer, req.params.id]);
        if (result.affectedRows === 0) {
          await connection.rollback();
          res.status(409).json({ error: 'El reporte ya fue revisado o no existe.' });
          return;
        }

        if (estado === 'VALIDADO') {
          // El disparador valida RN-03, registra el estado anterior y actualiza el escenario.
          await connection.execute(`
            INSERT INTO historico_estado_semaforo
              (id_escenario, id_reporte_origen, id_oficializador_cmj, estado_anterior, estado_nuevo, observaciones_oficiales)
            SELECT r.id_escenario, r.id_reporte, ?, 'VERDE', ?, ?
            FROM reporte_veeduria r
            WHERE r.id_reporte = ?
          `, [reviewer, nuevoEstadoSemaforo, observaciones.trim(), req.params.id]);
        }
        await connection.commit();
        res.json({ data: { idReporte: req.params.id, estado } });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}
