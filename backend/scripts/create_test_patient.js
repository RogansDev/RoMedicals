const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuración de la base de datos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'romedicals_db',
  password: 'postgres123',
  port: 5432,
});

async function createTestPatient() {
  const client = await pool.connect();
  
  try {
    console.log('Creando paciente de prueba...');
    
    // Crear paciente de prueba
    const patientQuery = `
      INSERT INTO patients (
        first_name, last_name, identification_type, identification_number, email, 
        mobile_phone, birth_date, gender, address, city, department, 
        blood_type, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) 
      ON CONFLICT (identification_number) 
      DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        mobile_phone = EXCLUDED.mobile_phone,
        updated_at = NOW()
      RETURNING id, first_name, last_name, identification_number;
    `;
    
    const patientData = [
      'María',                    // first_name
      'González Pérez',           // last_name
      'CC',                       // identification_type
      '12345678',                 // identification_number
      'maria.gonzalez@email.com', // email
      '3001234567',               // mobile_phone
      '1985-03-15',               // birth_date
      'Femenino',                 // gender
      'Calle 123 #45-67',         // address
      'Bogotá',                   // city
      'Cundinamarca',             // department
      'O+'                        // blood_type
    ];
    
    const result = await client.query(patientQuery, patientData);
    const patient = result.rows[0];
    
    console.log('✅ Paciente creado exitosamente:');
    console.log(`   ID: ${patient.id}`);
    console.log(`   Nombre: ${patient.first_name} ${patient.last_name}`);
    console.log(`   Documento: ${patient.identification_number}`);
    
    // Crear una cita de prueba para hoy
    const appointmentQuery = `
      INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, appointment_time, 
        duration, type, status, reason, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      )
      RETURNING id, appointment_date, appointment_time;
    `;
    
    const today = new Date();
    const appointmentData = [
      patient.id,                    // patient_id
      1,                             // doctor_id (asumiendo que existe un doctor con ID 1)
      today.toISOString().split('T')[0], // appointment_date (hoy)
      '10:00:00',                    // appointment_time
      30,                            // duration
      'CONSULTA',                    // type
      'PROGRAMADA',                  // status
      'Consulta de rutina',          // reason
      'Paciente de prueba para consultas' // notes
    ];
    
    const appointmentResult = await client.query(appointmentQuery, appointmentData);
    const appointment = appointmentResult.rows[0];
    
    console.log('✅ Cita creada exitosamente:');
    console.log(`   ID: ${appointment.id}`);
    console.log(`   Fecha: ${appointment.appointment_date}`);
    console.log(`   Hora: ${appointment.appointment_time}`);
    
    console.log('\n🎉 Paciente de prueba creado exitosamente!');
    console.log('Ahora puedes:');
    console.log('1. Ir al dashboard del médico');
    console.log('2. Hacer clic en "Nueva consulta"');
    console.log('3. Buscar "María González" o documento "12345678"');
    console.log('4. Iniciar la consulta médica');
    
  } catch (error) {
    console.error('❌ Error creando paciente de prueba:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestPatient();
