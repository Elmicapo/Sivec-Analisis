import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Pool, RowDataPacket } from 'mysql2/promise';
import { verifyPassword } from '../../../infrastructure/auth/password';

interface UserRow extends RowDataPacket {
  id_usuario: string;
  nombre_completo: string;
  tipo_rol: string;
  credenciales_password_hash: string;
}

export class AuthController {
  constructor(private readonly pool: Pool, private readonly secret: string) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { credencialesLogin, credencialesClave } = req.body ?? {};
    if (typeof credencialesLogin !== 'string' || !credencialesLogin.trim() || credencialesLogin.length > 50 ||
        typeof credencialesClave !== 'string' || !credencialesClave || credencialesClave.length > 256) {
      res.status(400).json({ error: 'Indica un usuario y una contraseña válidos.' });
      return;
    }
    try {
      const [[user]] = await this.pool.execute<UserRow[]>(`
        SELECT id_usuario, nombre_completo, tipo_rol, credenciales_password_hash
        FROM usuario WHERE credenciales_login = ?
      `, [credencialesLogin.trim()]);

      const valid = await verifyPassword(credencialesClave, user?.credenciales_password_hash ?? '');
      if (!user || !valid) {
        res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        return;
      }
      const token = jwt.sign({ role: user.tipo_rol }, this.secret, {
        algorithm: 'HS256', subject: user.id_usuario, expiresIn: '1h',
      });
      res.json({ data: { token, usuario: {
        idUsuario: user.id_usuario,
        nombreCompleto: user.nombre_completo,
        tipoRol: user.tipo_rol,
      } } });
    } catch (error) {
      next(error);
    }
  };

  requireAthlete = (req: Request, res: Response, next: NextFunction): void => {
    const token = /^Bearer (\S+)$/i.exec(req.get('authorization') ?? '')?.[1];
    try {
      const claims = jwt.verify(token ?? '', this.secret, { algorithms: ['HS256'] });
      if (typeof claims === 'string' || !claims.sub) {
        res.status(401).json({ error: 'Token inválido.' });
        return;
      }
      if (claims.role !== 'DEPORTISTA') {
        res.status(403).json({ error: 'Esta operación requiere el rol DEPORTISTA.' });
        return;
      }
      res.locals.athleteId = claims.sub;
    } catch {
      res.status(401).json({ error: 'Token ausente, inválido o vencido.' });
      return;
    }
    next();
  };
}
