const { Pool } = require('pg');
const winston = require('winston');

// Configuración de logging para base de datos
const dbLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' })
  ]
});

// Configuración del pool de conexiones
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'romedicals_db',
  password: process.env.DB_PASSWORD || 'postgres123',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo máximo que una conexión puede estar inactiva
  connectionTimeoutMillis: 2000, // tiempo máximo para establecer conexión
});

// Eventos del pool
pool.on('connect', (client) => {
  dbLogger.info('Nueva conexión establecida con la base de datos');
});

pool.on('error', (err, client) => {
  dbLogger.error('Error inesperado en el pool de conexiones:', err);
});

pool.on('remove', (client) => {
  dbLogger.info('Cliente removido del pool de conexiones');
});

// Función para ejecutar consultas con logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    dbLogger.info('Consulta ejecutada', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rowCount: result.rowCount
    });
    return result;
  } catch (error) {
    dbLogger.error('Error en consulta:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Función para transacciones
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  transaction,
  pool,
  dbLogger
}; 