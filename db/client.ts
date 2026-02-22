import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err, client) => {
  console.error('Error inesperado de PostgreSQL en un cliente inactivo', err);
  process.exit(-1);
});

// Exportamos un wrapper limpio para hacer queries en nuestros repositorios
export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  // getClient() obtiene una conexión dedicada del pool para transacciones (BEGIN/COMMIT/ROLLBACK)
  getClient: () => pool.connect(),
};