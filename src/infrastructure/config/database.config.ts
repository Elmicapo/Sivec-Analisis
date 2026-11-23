import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sivec_db',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  timezone: '-05:00', // Cot / Colombia
});

export async function testDatabaseConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    console.log('[MySQL] Conexión establecida exitosamente a la base de datos:', process.env.DB_NAME);
    connection.release();
  } catch (error) {
    console.error('[MySQL] Error al conectar a la base de datos:', error);
    throw error;
  }
}
