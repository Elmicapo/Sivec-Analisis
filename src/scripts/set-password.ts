import { ResultSetHeader } from 'mysql2/promise';
import { hashPassword } from '../infrastructure/auth/password';
import { pool } from '../infrastructure/config/database.config';

async function main(): Promise<void> {
  const login = process.argv[2];
  const password = process.env.SIVEC_NEW_PASSWORD;
  if (!login || !password || password.length < 12 || password.length > 256) {
    throw new Error('Indica el usuario y una contraseña de 12 a 256 caracteres.');
  }
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE usuario SET credenciales_password_hash = ? WHERE credenciales_login = ?',
    [await hashPassword(password), login],
  );
  if (result.affectedRows !== 1) throw new Error('El usuario no existe.');
  console.log('Contraseña actualizada.');
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
