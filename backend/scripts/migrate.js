const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function createTables() {
  try {
    console.log('🚀 Iniciando migración de base de datos...');

    // Crear tabla de especialidades
    await query(`
      CREATE TABLE IF NOT EXISTS specialties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        code VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla specialties creada');

    // Crear tabla de usuarios
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('super_user', 'medical_user', 'administrative', 'nursing')),
        specialty_id INTEGER REFERENCES specialties(id),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla users creada');

    // Crear tabla de pacientes
    await query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        document_type VARCHAR(5) NOT NULL CHECK (document_type IN ('CC', 'CE', 'TI', 'PP', 'RC')),
        document_number VARCHAR(20) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        birth_date DATE NOT NULL,
        gender VARCHAR(1) NOT NULL CHECK (gender IN ('M', 'F', 'O')),
        email VARCHAR(100),
        phone VARCHAR(15),
        address TEXT,
        city VARCHAR(50),
        department VARCHAR(50),
        emergency_contact JSONB,
        blood_type VARCHAR(3) CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
        allergies TEXT,
        medical_history TEXT,
        insurance JSONB,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(document_type, document_number)
      )
    `);
    console.log('✅ Tabla patients creada');

    // Asegurar columnas opcionales recientes en patients
    await query("ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT");
    console.log('✅ Columna medical_history verificada en patients');

    // Crear tabla de citas
    await query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        duration INTEGER DEFAULT 30,
        type VARCHAR(20) NOT NULL CHECK (type IN ('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO')),
        status VARCHAR(20) DEFAULT 'PROGRAMADA' CHECK (status IN ('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO')),
        reason TEXT,
        notes TEXT,
        insurance JSONB,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla appointments creada');

    // Asegurar columna specialty_id en appointments
    await query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS specialty_id INTEGER REFERENCES specialties(id)`);
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_specialty ON appointments(specialty_id)');
    console.log('✅ Columna specialty_id verificada en appointments');

    // Crear tabla de notas clínicas
    await query(`
      CREATE TABLE IF NOT EXISTS clinical_notes (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        appointment_id INTEGER REFERENCES appointments(id),
        type VARCHAR(20) NOT NULL CHECK (type IN ('PRIMERA_VEZ', 'EVOLUCION', 'CONTROL', 'URGENCIA')),
        chief_complaint TEXT NOT NULL,
        present_illness TEXT NOT NULL,
        physical_examination TEXT NOT NULL,
        diagnosis TEXT,
        treatment TEXT,
        recommendations TEXT,
        vital_signs JSONB,
        images JSONB,
        is_confidential BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla clinical_notes creada');

    // Crear tabla de evoluciones
    await query(`
      CREATE TABLE IF NOT EXISTS evolutions (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        appointment_id INTEGER REFERENCES appointments(id),
        clinical_note_id INTEGER REFERENCES clinical_notes(id),
        evolution_date DATE NOT NULL,
        subjective TEXT NOT NULL,
        objective TEXT NOT NULL,
        assessment TEXT NOT NULL,
        plan TEXT NOT NULL,
        vital_signs JSONB,
        images JSONB,
        is_confidential BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla evolutions creada');

    // Crear tabla de prescripciones
    await query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        appointment_id INTEGER REFERENCES appointments(id),
        clinical_note_id INTEGER REFERENCES clinical_notes(id),
        type VARCHAR(30) NOT NULL CHECK (type IN ('MEDICAMENTO', 'PROCEDIMIENTO', 'EXAMEN', 'CONSULTA_ESPECIALISTA', 'OTRO')),
        status VARCHAR(20) DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA', 'COMPLETADA', 'CANCELADA', 'VENCIDA')),
        priority VARCHAR(10) DEFAULT 'MEDIA' CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
        diagnosis TEXT,
        notes TEXT,
        is_confidential BOOLEAN DEFAULT false,
        valid_until DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla prescriptions creada');

    // Crear tabla de items de prescripción
    await query(`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        dosage VARCHAR(100),
        frequency VARCHAR(100),
        duration VARCHAR(100),
        instructions TEXT,
        quantity INTEGER,
        unit VARCHAR(20),
        cost DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla prescription_items creada');

    // Crear tablas de plantillas por especialidad
    await query(`
      CREATE TABLE IF NOT EXISTS prescriptions_template (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        content TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla prescriptions_template creada');

    await query(`
      CREATE TABLE IF NOT EXISTS evolutions_template (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        content TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla evolutions_template creada');

    await query(`
      CREATE TABLE IF NOT EXISTS medical_orders_template (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        content TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla medical_orders_template creada');

    await query(`
      CREATE TABLE IF NOT EXISTS custom_forms_template (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        fields JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla custom_forms_template creada');

    // Crear tabla de plantillas de consentimientos globales
    await query(`
      CREATE TABLE IF NOT EXISTS consents_template (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla consents_template creada');

    // Crear tabla de diagnósticos CIE-10
    await query(`
      CREATE TABLE IF NOT EXISTS diagnoses (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        description VARCHAR(500) NOT NULL,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla diagnoses creada');

    // Crear tabla de RIPS
    await query(`
      CREATE TABLE IF NOT EXISTS rips (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        appointment_id INTEGER REFERENCES appointments(id),
        clinical_note_id INTEGER REFERENCES clinical_notes(id),
        type VARCHAR(5) NOT NULL CHECK (type IN ('AC', 'AP', 'US', 'AU', 'AT', 'AM', 'AH')),
        date DATE NOT NULL,
        provider_code VARCHAR(20) NOT NULL,
        provider_name VARCHAR(200) NOT NULL,
        service_code VARCHAR(20) NOT NULL,
        service_name VARCHAR(200) NOT NULL,
        diagnosis TEXT,
        cost DECIMAL(10,2) NOT NULL,
        copayment DECIMAL(10,2) DEFAULT 0,
        insurance JSONB,
        status VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla rips creada');

    // Crear tabla de uploads
    await query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        patient_id INTEGER REFERENCES patients(id),
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        upload_type VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla uploads creada');

    // Asegurar columna appointment_id en uploads
    await query(`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id)`);
    console.log('✅ Columna appointment_id verificada en uploads');

    // Crear índices para mejorar rendimiento
    // Índices de patients según esquema presente
    const patientsColumnsResult = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'patients'
    `);
    const patientsColumns = patientsColumnsResult.rows.map(r => r.column_name);
    if (patientsColumns.includes('document_type') && patientsColumns.includes('document_number')) {
      await query('CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document_type, document_number)');
    } else if (patientsColumns.includes('identification_type') && patientsColumns.includes('identification_number')) {
      await query('CREATE INDEX IF NOT EXISTS idx_patients_identification ON patients(identification_type, identification_number)');
    }
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
    await query('CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_evolutions_patient ON evolutions(patient_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_rips_patient ON rips(patient_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_rips_date ON rips(date)');
    await query('CREATE INDEX IF NOT EXISTS idx_uploads_patient ON uploads(patient_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_prescriptions_template_specialty ON prescriptions_template(specialty_id)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS ux_prescriptions_template_default ON prescriptions_template(specialty_id) WHERE is_default = true');
    await query('CREATE INDEX IF NOT EXISTS idx_evolutions_template_specialty ON evolutions_template(specialty_id)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS ux_evolutions_template_default ON evolutions_template(specialty_id) WHERE is_default = true');
    await query('CREATE INDEX IF NOT EXISTS idx_medical_orders_template_specialty ON medical_orders_template(specialty_id)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS ux_medical_orders_template_default ON medical_orders_template(specialty_id) WHERE is_default = true');
    await query('CREATE INDEX IF NOT EXISTS idx_custom_forms_template_specialty ON custom_forms_template(specialty_id)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS ux_custom_forms_template_default ON custom_forms_template(specialty_id) WHERE is_default = true');
    console.log('✅ Índices creados');

    // Tabla para fichas personalizadas por atención
    await query(`
      CREATE TABLE IF NOT EXISTS appointment_custom_forms (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
        form_id INTEGER NOT NULL,
        values JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(appointment_id, form_id)
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_appt_custom_forms_appt ON appointment_custom_forms(appointment_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_appt_custom_forms_spec ON appointment_custom_forms(specialty_id)');
    console.log('✅ Tabla appointment_custom_forms creada');

    console.log('🎉 Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

async function createDefaultData() {
  try {
    console.log('🌱 Creando datos por defecto...');

    // Crear especialidades por defecto
    const specialties = [
      { name: 'Medicina General', description: 'Medicina general y familiar', code: 'MG' },
      { name: 'Cardiología', description: 'Especialidad del corazón y sistema cardiovascular', code: 'CAR' },
      { name: 'Dermatología', description: 'Especialidad de la piel', code: 'DER' },
      { name: 'Ginecología', description: 'Especialidad de la salud femenina', code: 'GIN' },
      { name: 'Pediatría', description: 'Medicina infantil', code: 'PED' },
      { name: 'Ortopedia', description: 'Especialidad de huesos y articulaciones', code: 'ORT' },
      { name: 'Neurología', description: 'Especialidad del sistema nervioso', code: 'NEU' },
      { name: 'Psiquiatría', description: 'Especialidad de la salud mental', code: 'PSI' },
      { name: 'Oftalmología', description: 'Especialidad de los ojos', code: 'OFT' },
      { name: 'Otorrinolaringología', description: 'Especialidad de oído, nariz y garganta', code: 'OTO' }
    ];

    for (const specialty of specialties) {
      await query(
        'INSERT INTO specialties (name, description, code) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [specialty.name, specialty.description, specialty.code]
      );
    }
    console.log('✅ Especialidades creadas');

    // Crear usuario super administrador
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await query(
      `INSERT INTO users (email, password, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING`,
      ['admin@romedicals.com', hashedPassword, 'Administrador', 'Sistema', 'super_user']
    );
    console.log('✅ Usuario administrador creado (admin@romedicals.com / admin123)');

    // Crear algunos diagnósticos CIE-10 de ejemplo
    const diagnoses = [
      { code: 'A00.0', description: 'Cólera debido a Vibrio cholerae 01, biotipo cholerae', category: 'Enfermedades infecciosas' },
      { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones', category: 'Enfermedades endocrinas' },
      { code: 'I10', description: 'Hipertensión esencial (primaria)', category: 'Enfermedades cardiovasculares' },
      { code: 'J45.9', description: 'Asma no especificada', category: 'Enfermedades respiratorias' },
      { code: 'K29.7', description: 'Gastritis no especificada', category: 'Enfermedades digestivas' },
      { code: 'M79.3', description: 'Dolor en el brazo', category: 'Enfermedades del sistema osteomuscular' },
      { code: 'R50.9', description: 'Fiebre no especificada', category: 'Síntomas y signos generales' },
      { code: 'Z00.0', description: 'Examen médico general de rutina', category: 'Factores que influyen en el estado de salud' }
    ];

    for (const diagnosis of diagnoses) {
      await query(
        'INSERT INTO diagnoses (code, description, category) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
        [diagnosis.code, diagnosis.description, diagnosis.category]
      );
    }
    console.log('✅ Diagnósticos CIE-10 de ejemplo creados');

    // Crear tabla de Documentos CIE asociados a atenciones
    await query(`
      CREATE TABLE IF NOT EXISTS cie_documents (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        version VARCHAR(20) NOT NULL DEFAULT 'CIE-10',
        code VARCHAR(20) NOT NULL,
        name VARCHAR(600) NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_cie_documents_patient ON cie_documents(patient_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_cie_documents_appt ON cie_documents(appointment_id)");
    console.log('✅ Tabla cie_documents creada/verificada');

    console.log('🎉 Datos por defecto creados exitosamente!');

  } catch (error) {
    console.error('❌ Error creando datos por defecto:', error);
    throw error;
  }
}

async function runMigration() {
  try {
    await createTables();
    await createDefaultData();
    console.log('🎊 Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error fatal durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración si el script se ejecuta directamente
if (require.main === module) {
  runMigration();
}

module.exports = { createTables, createDefaultData, runMigration }; 