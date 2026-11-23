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

  router.post('/', auth.reportIdentity, async (req, res, next) => {
    const { idEscenario, descripcionDeterioro, usuarioComunidad } = req.body ?? {};
    if (typeof idEscenario !== 'string' || !uuid.test(idEscenario) || !validText(descripcionDeterioro)) {
      res.status(400).json({ error: 'Selecciona un escenario y describe su deterioro.' });
      return;
    }

    const athleteId: string | undefined = res.locals.athleteId;
    const community = usuarioComunidad ?? {};
    const limits = { nombreCompleto: 150, numeroIdentificacion: 20, genero: 20,
                     direccionResidencia: 200, correoElectronico: 100 };
    if (!athleteId && (
      Object.entries(limits).some(([key, limit]) => !validText(community[key]) || community[key].length > limit) ||
      !Number.isInteger(community.edad) || community.edad < 0 || community.edad > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(community.correoElectronico)
    )) {
      res.status(400).json({ error: 'Completa los datos de contacto del reportante.' });
      return;
    }

    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [facilities] = await connection.execute<RowDataPacket[]>(
          'SELECT id_escenario FROM escenario_deportivo WHERE id_escenario = ? FOR SHARE', [idEscenario],
        );
        if (facilities.length === 0) {
          await connection.rollback();
          res.status(404).json({ error: 'El escenario ya no está disponible.' });
          return;
        }
        const reporter = athleteId ?? randomUUID();
        if (athleteId) {
          const [athletes] = await connection.execute<RowDataPacket[]>(
            'SELECT id_usuario FROM deportista WHERE id_usuario = ? FOR SHARE', [athleteId],
          );
          if (athletes.length === 0) {
            await connection.rollback();
            res.status(403).json({ error: 'La cuenta de deportista ya no está disponible.' });
            return;
          }
        } else {
          await connection.execute(`
            INSERT INTO usuario_comunidad
              (id_comunidad, numero_identificacion, nombre_completo, genero, edad, direccion_residencia, correo_electronico)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [reporter, community.numeroIdentificacion.trim(), community.nombreCompleto.trim(),
              community.genero.trim(), community.edad, community.direccionResidencia.trim(), community.correoElectronico.trim()]);
        }
        const idReporte = randomUUID();
        await connection.execute(`
          INSERT INTO reporte_veeduria
            (id_reporte, id_escenario, tipo_reportante, id_reportante, descripcion_deterioro, estado_reporte)
          VALUES (?, ?, ?, ?, ?, 'PENDIENTE')
        `, [idReporte, idEscenario, athleteId ? 'DEPORTISTA' : 'COMUNIDAD', reporter, descripcionDeterioro.trim()]);
        await connection.commit();
        res.status(201).json({ data: { idReporte, estado: 'PENDIENTE' } });
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

  router.get('/historico/:idEscenario', async (req, res, next) => {
    if (!uuid.test(req.params.idEscenario)) {
      res.status(400).json({ error: 'Selecciona un escenario válido.' });
      return;
    }
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(`
        SELECT r.id_reporte AS idReporte, r.estado_reporte AS estado, r.fecha_reporte AS fecha,
               u.nombre_completo AS validador, r.fecha_revision AS fechaRevision,
               h.estado_anterior AS colorAnterior, h.estado_nuevo AS color, h.fecha_cambio AS fechaCambio
        FROM reporte_veeduria r
        LEFT JOIN usuario u ON u.id_usuario = r.id_revisor_cmj
        LEFT JOIN historico_estado_semaforo h ON h.id_reporte_origen = r.id_reporte
        WHERE r.id_escenario = ?
        ORDER BY r.fecha_reporte DESC, r.id_reporte, h.fecha_cambio DESC
      `, [req.params.idEscenario]);
      res.json({ data: rows });
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
    const { estado, observaciones } = req.body ?? {};
    if (!uuid.test(req.params.id) || !validText(observaciones) ||
        (estado !== 'RECHAZADO' && estado !== 'VALIDADO')) {
      res.status(400).json({ error: 'Indica una decisión y las observaciones del CMJ.' });
      return;
    }
    try {
      const [result] = await pool.execute<ResultSetHeader>(`
        UPDATE reporte_veeduria
        SET estado_reporte = ?, observaciones_cmj = ?, id_revisor_cmj = ?, fecha_revision = CURRENT_TIMESTAMP
        WHERE id_reporte = ? AND estado_reporte = 'PENDIENTE'
      `, [estado, observaciones.trim(), res.locals.cmjId, req.params.id]);
      if (result.affectedRows === 0) {
        res.status(409).json({ error: 'El reporte ya fue revisado o no existe.' });
        return;
      }
      res.json({ data: { idReporte: req.params.id, estado } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/por-oficializar', auth.requireCmj, async (_req, res, next) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT r.id_reporte AS idReporte, e.nombre AS escenario, r.descripcion_deterioro AS descripcion
        FROM reporte_veeduria r
        JOIN escenario_deportivo e ON e.id_escenario = r.id_escenario
        WHERE r.estado_reporte = 'VALIDADO'
          AND NOT EXISTS (SELECT 1 FROM historico_estado_semaforo h WHERE h.id_reporte_origen = r.id_reporte)
        ORDER BY r.fecha_revision, r.id_reporte
      `);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/semaforo', auth.requireCmj, async (req, res, next) => {
    const { nuevoEstadoSemaforo, observaciones } = req.body ?? {};
    if (!uuid.test(req.params.id) || !colors.includes(nuevoEstadoSemaforo) || !validText(observaciones)) {
      res.status(400).json({ error: 'Indica el color y las observaciones oficiales.' });
      return;
    }
    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [reports] = await connection.execute<RowDataPacket[]>(`
          SELECT id_escenario
          FROM reporte_veeduria
          WHERE id_reporte = ? AND estado_reporte = 'VALIDADO'
          FOR UPDATE
        `, [req.params.id]);
        const [changes] = await connection.execute<RowDataPacket[]>(
          'SELECT id_historico FROM historico_estado_semaforo WHERE id_reporte_origen = ? LIMIT 1',
          [req.params.id],
        );
        if (reports.length === 0 || changes.length > 0) {
          await connection.rollback();
          res.status(409).json({ error: 'Se requiere un reporte validado y sin cambio oficial previo.' });
          return;
        }

        // El disparador obtiene el estado anterior y actualiza el escenario.
        await connection.execute(`
          INSERT INTO historico_estado_semaforo
            (id_escenario, id_reporte_origen, id_oficializador_cmj, estado_anterior, estado_nuevo, observaciones_oficiales)
          VALUES (?, ?, ?, 'VERDE', ?, ?)
        `, [reports[0].id_escenario, req.params.id, res.locals.cmjId, nuevoEstadoSemaforo, observaciones.trim()]);
        await connection.commit();
        res.json({ data: { idReporte: req.params.id, color: nuevoEstadoSemaforo } });
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
