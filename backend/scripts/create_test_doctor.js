// Crea o actualiza un usuario MÉDICO de pruebas para login
// Uso: node backend/scripts/create_test_doctor.js

const { query } = require('../config/database');
const { hashPassword } = require('../middleware/auth');

const TEST_EMAIL = process.env.TEST_DOCTOR_EMAIL || 'medico@clinicaeps.com';
const TEST_PASSWORD = process.env.TEST_DOCTOR_PASSWORD || 'Medico#123';
const FIRST_NAME = process.env.TEST_DOCTOR_FIRST || 'Rafael';
const LAST_NAME = process.env.TEST_DOCTOR_LAST || 'Yepes Martinez';

async function upsertDoctor() {
  try {
    console.log('Creando/actualizando usuario médico de pruebas...');

    const exists = await query('SELECT id FROM users WHERE email = $1', [TEST_EMAIL]);
    const passwordHash = await hashPassword(TEST_PASSWORD);

    if (exists.rows.length > 0) {
      const id = exists.rows[0].id;
      await query(
        `UPDATE users
         SET password = $1, first_name = $2, last_name = $3, role = 'medical_user',
             is_active = true, updated_at = NOW()
         WHERE id = $4`,
        [passwordHash, FIRST_NAME, LAST_NAME, id]
      );
      console.log(`Usuario médico actualizado: ${TEST_EMAIL}`);
    } else {
      await query(
        `INSERT INTO users (email, password, first_name, last_name, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, 'medical_user', true, NOW())`,
        [TEST_EMAIL, passwordHash, FIRST_NAME, LAST_NAME]
      );
      console.log(`Usuario médico creado: ${TEST_EMAIL}`);
    }

    console.log('Credenciales de acceso de pruebas:');
    console.log(`  Email: ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    console.log('Inicia sesión en /doctor');
    process.exit(0);
  } catch (err) {
    console.error('Error creando usuario de pruebas:', err);
    process.exit(1);
  }
}

upsertDoctor();


