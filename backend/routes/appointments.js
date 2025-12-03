const express = require('express');
const Joi = require('joi');
const mysql = require('mysql2/promise');
const { authenticateToken, authenticateTokenOrApiKey, requirePermission } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configuración de base de datos MySQL
const getMainDbConfig = () => {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'romedicals_main',
    charset: 'utf8mb4'
  };
};

// Función para obtener conexión a la base de datos de la empresa
const getCompanyConnection = async (companyId) => {
  if (!companyId) {
    throw new Error('companyId es requerido');
  }
  const cleanCompanyId = companyId.replace(/-/g, '_');
  const companyDbConfig = {
    ...getMainDbConfig(),
    database: `romedicals_company_${cleanCompanyId}`
  };
  return await mysql.createConnection(companyDbConfig);
};

// Función para crear tablas si no existen y migrar estructura antigua
const ensureTables = async (connection) => {
  // Verificar si la tabla existe y qué estructura tiene
  const [tables] = await connection.execute(
    "SHOW TABLES LIKE 'appointments'"
  );
  
  if (tables.length === 0) {
    // Crear tabla nueva
    await connection.execute(`
      CREATE TABLE appointments (
        id VARCHAR(36) PRIMARY KEY,
        patient_id VARCHAR(36) NOT NULL,
        doctor_id VARCHAR(36) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        duration INT DEFAULT 30,
        type ENUM('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO') NOT NULL,
        modality ENUM('TELEMEDICINA', 'PRESENCIAL') DEFAULT 'PRESENCIAL',
        status ENUM('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO') DEFAULT 'PROGRAMADA',
        reason TEXT,
        notes TEXT,
        insurance JSON,
        specialty_id VARCHAR(36),
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient (patient_id),
        INDEX idx_doctor (doctor_id),
        INDEX idx_date (appointment_date),
        INDEX idx_status (status),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    // Verificar columnas existentes y migrar si es necesario
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM appointments LIKE 'appointmentDate'"
    );
    
    if (columns.length > 0) {
      // La tabla tiene estructura antigua, migrar
      try {
        // Verificar y agregar columnas nuevas una por una
        const [allColumns] = await connection.execute("SHOW COLUMNS FROM appointments");
        const columnNames = allColumns.map(col => col.Field);
        
        if (!columnNames.includes('appointment_date')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN appointment_date DATE AFTER doctorId`);
        }
        if (!columnNames.includes('appointment_time')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN appointment_time TIME AFTER appointment_date`);
        }
        if (!columnNames.includes('duration')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN duration INT DEFAULT 30 AFTER appointment_time`);
        }
        if (!columnNames.includes('type')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN type ENUM('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO') DEFAULT 'CONSULTA' AFTER duration`);
        }
        if (!columnNames.includes('modality')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN modality ENUM('TELEMEDICINA', 'PRESENCIAL') DEFAULT 'PRESENCIAL' AFTER type`);
        }
        if (!columnNames.includes('reason')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN reason TEXT AFTER modality`);
        }
        if (!columnNames.includes('insurance')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN insurance JSON AFTER notes`);
        }
        if (!columnNames.includes('specialty_id')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN specialty_id VARCHAR(36) AFTER insurance`);
        }
        if (!columnNames.includes('created_by')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN created_by VARCHAR(36) AFTER specialty_id`);
        }
        
        // Migrar datos de appointmentDate a appointment_date y appointment_time
        if (columnNames.includes('appointmentDate')) {
          await connection.execute(`
            UPDATE appointments 
            SET appointment_date = DATE(appointmentDate),
                appointment_time = TIME(appointmentDate)
            WHERE appointmentDate IS NOT NULL AND (appointment_date IS NULL OR appointment_time IS NULL)
          `);
          
          // Eliminar la columna antigua appointmentDate después de migrar los datos
          console.log('🔄 Eliminando columna antigua appointmentDate...');
          await connection.execute(`ALTER TABLE appointments DROP COLUMN appointmentDate`);
          console.log('✅ Columna appointmentDate eliminada correctamente');
        }
        
        // Renombrar columnas si existen
        if (columnNames.includes('patientId') && !columnNames.includes('patient_id')) {
          await connection.execute(`ALTER TABLE appointments CHANGE COLUMN patientId patient_id VARCHAR(36) NOT NULL`);
        }
        if (columnNames.includes('doctorId') && !columnNames.includes('doctor_id')) {
          await connection.execute(`ALTER TABLE appointments CHANGE COLUMN doctorId doctor_id VARCHAR(36) NOT NULL`);
        }
        if (columnNames.includes('createdAt') && !columnNames.includes('created_at')) {
          await connection.execute(`ALTER TABLE appointments CHANGE COLUMN createdAt created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        }
        if (columnNames.includes('updatedAt') && !columnNames.includes('updated_at')) {
          await connection.execute(`ALTER TABLE appointments CHANGE COLUMN updatedAt updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        }
        
        // Si no existen created_at o updated_at, crearlas
        if (!columnNames.includes('created_at') && !columnNames.includes('createdAt')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        }
        if (!columnNames.includes('updated_at') && !columnNames.includes('updatedAt')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        }
      } catch (migrateError) {
        console.warn('Error en migración automática:', migrateError.message);
      }
    } else {
      // Verificar si tiene appointment_date (estructura nueva)
      const [newColumns] = await connection.execute(
        "SHOW COLUMNS FROM appointments LIKE 'appointment_date'"
      );
      
      if (newColumns.length === 0) {
        // No tiene ninguna estructura conocida, crear columnas
        const [allColumns] = await connection.execute("SHOW COLUMNS FROM appointments");
        const columnNames = allColumns.map(col => col.Field);
        
        // Si existe appointmentDate (antigua), migrar datos y eliminarla
        if (columnNames.includes('appointmentDate') && !columnNames.includes('appointment_date')) {
          // Crear las nuevas columnas primero
          await connection.execute(`ALTER TABLE appointments ADD COLUMN appointment_date DATE`);
          await connection.execute(`ALTER TABLE appointments ADD COLUMN appointment_time TIME`);
          
          // Migrar datos
          await connection.execute(`
            UPDATE appointments 
            SET appointment_date = DATE(appointmentDate),
                appointment_time = TIME(appointmentDate)
            WHERE appointmentDate IS NOT NULL
          `);
          
          // Eliminar columna antigua
          console.log('🔄 Eliminando columna antigua appointmentDate...');
          await connection.execute(`ALTER TABLE appointments DROP COLUMN appointmentDate`);
          console.log('✅ Columna appointmentDate eliminada correctamente');
        } else {
          // Si no existe appointmentDate, solo crear las nuevas columnas si no existen
          if (!columnNames.includes('appointment_date')) {
            await connection.execute(`ALTER TABLE appointments ADD COLUMN appointment_date DATE`);
          }
          if (!columnNames.includes('appointment_time')) {
            await connection.execute(`ALTER TABLE appointments ADD COLUMN appointment_time TIME`);
          }
        }
        
        // Eliminar appointmentDate si todavía existe (por si acaso)
        if (columnNames.includes('appointmentDate')) {
          console.log('🔄 Eliminando columna antigua appointmentDate (verificación adicional)...');
          try {
            await connection.execute(`ALTER TABLE appointments DROP COLUMN appointmentDate`);
            console.log('✅ Columna appointmentDate eliminada correctamente');
          } catch (dropError) {
            console.warn('⚠️ No se pudo eliminar appointmentDate (puede que ya no exista):', dropError.message);
          }
        }
        if (!columnNames.includes('duration')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN duration INT DEFAULT 30`);
        }
        if (!columnNames.includes('type')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN type ENUM('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO') DEFAULT 'CONSULTA'`);
        }
        if (!columnNames.includes('modality')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN modality ENUM('TELEMEDICINA', 'PRESENCIAL') DEFAULT 'PRESENCIAL'`);
        }
        if (!columnNames.includes('reason')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN reason TEXT`);
        }
        if (!columnNames.includes('insurance')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN insurance JSON`);
        }
        if (!columnNames.includes('specialty_id')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN specialty_id VARCHAR(36)`);
        }
        if (!columnNames.includes('created_by')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN created_by VARCHAR(36)`);
        }
        if (!columnNames.includes('created_at') && !columnNames.includes('createdAt')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        }
        if (!columnNames.includes('updated_at') && !columnNames.includes('updatedAt')) {
          await connection.execute(`ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        }
      }
    }
    
    // Verificación final: eliminar appointmentDate si todavía existe
    try {
      const [allColumnsFinal] = await connection.execute("SHOW COLUMNS FROM appointments");
      const columnNamesFinal = allColumnsFinal.map(col => col.Field);
      if (columnNamesFinal.includes('appointmentDate')) {
        console.log('🔄 Eliminando columna antigua appointmentDate (verificación final)...');
        await connection.execute(`ALTER TABLE appointments DROP COLUMN appointmentDate`);
        console.log('✅ Columna appointmentDate eliminada correctamente');
      }
    } catch (finalCheckError) {
      console.warn('⚠️ Error en verificación final de appointmentDate:', finalCheckError.message);
    }
    
    // Verificar y migrar el ENUM de status SIEMPRE (fuera de los bloques condicionales)
    try {
      const [statusColumn] = await connection.execute(
        "SHOW COLUMNS FROM appointments WHERE Field = 'status'"
      );
      
      if (statusColumn.length > 0) {
        const statusType = statusColumn[0].Type;
        console.log('Tipo actual de columna status:', statusType);
        
        // Verificar si tiene valores antiguos (en inglés/minúsculas)
        const hasOldValues = statusType.includes("'scheduled'") || 
                             statusType.includes("'completed'") || 
                             statusType.includes("'cancelled'") ||
                             statusType.includes("'no_show'");
        
        // Verificar si tiene los valores nuevos
        const hasNewValues = statusType.includes("'PROGRAMADA'") && 
                             statusType.includes("'CONFIRMADA'") && 
                             statusType.includes("'EN_PROGRESO'");
        
        if (hasOldValues) {
          console.log('🔄 Migrando ENUM de status de valores antiguos a nuevos...');
          
          // Paso 1: Expandir el ENUM para incluir ambos conjuntos de valores
          await connection.execute(`
            ALTER TABLE appointments 
            MODIFY COLUMN status ENUM('scheduled', 'completed', 'cancelled', 'no_show', 'PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO') 
            DEFAULT 'PROGRAMADA'
          `);
          
          // Paso 2: Migrar los datos existentes a los nuevos valores
          await connection.execute(`
            UPDATE appointments 
            SET status = CASE 
              WHEN status = 'scheduled' THEN 'PROGRAMADA'
              WHEN status = 'completed' THEN 'COMPLETADA'
              WHEN status = 'cancelled' THEN 'CANCELADA'
              WHEN status = 'no_show' THEN 'NO_ASISTIO'
              ELSE status
            END
          `);
          
          // Paso 3: Modificar el ENUM para incluir solo los nuevos valores
          await connection.execute(`
            ALTER TABLE appointments 
            MODIFY COLUMN status ENUM('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO') 
            DEFAULT 'PROGRAMADA'
          `);
          console.log('✅ ENUM de status migrado correctamente');
        } else if (!hasNewValues) {
          // El ENUM no tiene los valores correctos, actualizarlo
          console.log('🔄 Actualizando ENUM de status a valores correctos...');
          await connection.execute(`
            ALTER TABLE appointments 
            MODIFY COLUMN status ENUM('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO') 
            DEFAULT 'PROGRAMADA'
          `);
          console.log('✅ ENUM de status actualizado correctamente');
        } else {
          console.log('✅ ENUM de status ya tiene los valores correctos');
        }
      } else {
        // No existe la columna status, crearla
        console.log('🔄 Creando columna status con valores correctos...');
        await connection.execute(`
          ALTER TABLE appointments 
          ADD COLUMN status ENUM('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO') 
          DEFAULT 'PROGRAMADA'
        `);
        console.log('✅ Columna status creada correctamente');
      }
    } catch (statusError) {
      console.error('❌ Error migrando/actualizando columna status:', statusError.message);
      console.error('Stack:', statusError.stack);
      // Si falla, intentar crear la columna como VARCHAR temporalmente
      try {
        const [allColumns] = await connection.execute("SHOW COLUMNS FROM appointments");
        const columnNames = allColumns.map(col => col.Field);
        if (!columnNames.includes('status')) {
          await connection.execute(`
            ALTER TABLE appointments 
            ADD COLUMN status VARCHAR(20) DEFAULT 'PROGRAMADA'
          `);
          console.log('✅ Columna status creada como VARCHAR (fallback)');
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback de status:', fallbackError.message);
      }
    }
    
    // Verificación final: asegurar que la columna modality existe SIEMPRE
    try {
      const [modalityColumn] = await connection.execute(
        "SHOW COLUMNS FROM appointments WHERE Field = 'modality'"
      );
      
      if (modalityColumn.length === 0) {
        console.log('🔄 Creando columna modality...');
        await connection.execute(`
          ALTER TABLE appointments 
          ADD COLUMN modality ENUM('TELEMEDICINA', 'PRESENCIAL') DEFAULT 'PRESENCIAL'
        `);
        console.log('✅ Columna modality creada correctamente');
      } else {
        console.log('✅ Columna modality ya existe');
      }
    } catch (modalityError) {
      console.error('❌ Error verificando/creando columna modality:', modalityError.message);
      console.error('Stack:', modalityError.stack);
    }
  }

  // Tabla appointment_custom_forms
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS appointment_custom_forms (
      id VARCHAR(36) PRIMARY KEY,
      appointment_id VARCHAR(36) NOT NULL,
      specialty_id VARCHAR(36),
      form_id VARCHAR(36) NOT NULL,
      \`values\` JSON,
      created_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_appointment_form (appointment_id, form_id),
      INDEX idx_appointment (appointment_id),
      INDEX idx_form (form_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// --- Fichas personalizadas por atención ---
const customFormPayloadSchema = Joi.object({
  specialtyId: Joi.string().optional().allow(null),
  formId: Joi.string().required(),
  values: Joi.object().default({})
});

// GET /api/appointments/:id/custom-forms
router.get('/:id/custom-forms', authenticateToken, requirePermission('APPOINTMENTS', 'READ'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    const [rows] = await connection.execute(
      'SELECT id, appointment_id, specialty_id, form_id, `values`, created_at, updated_at FROM appointment_custom_forms WHERE appointment_id = ?',
      [id]
    );

    const forms = rows.map(row => ({
      ...row,
      values: typeof row.values === 'string' ? JSON.parse(row.values) : row.values
    }));

    return res.json({ forms });
  } catch (err) {
    console.error('Error obteniendo fichas de atención:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// PUT /api/appointments/:id/custom-forms
router.put('/:id/custom-forms', authenticateToken, requirePermission('APPOINTMENTS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { error, value } = customFormPayloadSchema.validate(req.body);
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    if (error) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.details.map(d => d.message) });
    }

    const payload = value;
    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    // Verificar existencia de la cita
    const [appt] = await connection.execute('SELECT id FROM appointments WHERE id = ?', [id]);
    if (appt.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

    // Upsert por (appointment_id, form_id)
    const [existing] = await connection.execute(
      'SELECT id FROM appointment_custom_forms WHERE appointment_id = ? AND form_id = ?',
      [id, payload.formId]
    );

    const valuesJson = JSON.stringify(payload.values || {});
    let saved;

    if (existing.length > 0) {
      await connection.execute(
        'UPDATE appointment_custom_forms SET specialty_id = ?, `values` = ?, updated_at = NOW() WHERE id = ?',
        [payload.specialtyId, valuesJson, existing[0].id]
      );
      const [updated] = await connection.execute(
        'SELECT * FROM appointment_custom_forms WHERE id = ?',
        [existing[0].id]
      );
      saved = updated[0];
    } else {
      const formId = uuidv4();
      await connection.execute(
        'INSERT INTO appointment_custom_forms (id, appointment_id, specialty_id, form_id, `values`, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [formId, id, payload.specialtyId, payload.formId, valuesJson, req.user.id]
      );
      const [inserted] = await connection.execute(
        'SELECT * FROM appointment_custom_forms WHERE id = ?',
        [formId]
      );
      saved = inserted[0];
    }

    saved.values = typeof saved.values === 'string' ? JSON.parse(saved.values) : saved.values;
    return res.json({ message: 'Ficha guardada', form: saved });
  } catch (err) {
    console.error('Error guardando ficha de atención:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Esquemas de validación
const appointmentCreateSchema = Joi.object({
  patientId: Joi.string().required().messages({
    'any.required': 'El ID del paciente es requerido'
  }),
  doctorId: Joi.string().required().messages({
    'any.required': 'El ID del doctor es requerido'
  }),
  appointmentDate: Joi.date().custom((value, helpers) => {
    // Permitir el día de hoy y fechas futuras, pero no fechas pasadas
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Inicio del día de hoy
    
    const appointmentDate = new Date(value);
    appointmentDate.setHours(0, 0, 0, 0); // Inicio del día de la cita
    
    if (appointmentDate < today) {
      return helpers.error('date.min');
    }
    return value;
  }).required().messages({
    'date.min': 'La fecha de la cita no puede ser pasada',
    'any.required': 'La fecha de la cita es requerida'
  }),
  appointmentTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'El formato de hora debe ser HH:MM',
    'any.required': 'La hora de la cita es requerida'
  }),
  duration: Joi.number().integer().min(15).max(480).default(30).messages({
    'number.min': 'La duración mínima es 15 minutos',
    'number.max': 'La duración máxima es 480 minutos (8 horas)'
  }),
  type: Joi.string().valid('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO').required().messages({
    'any.only': 'El tipo debe ser CONSULTA, CONTROL, URGENCIA, PROCEDIMIENTO u OTRO',
    'any.required': 'El tipo de cita es requerido'
  }),
  modality: Joi.string().valid('TELEMEDICINA', 'PRESENCIAL').default('PRESENCIAL').messages({
    'any.only': 'La modalidad debe ser TELEMEDICINA o PRESENCIAL'
  }),
  status: Joi.string().valid('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO').default('PROGRAMADA').messages({
    'any.only': 'El estado debe ser PROGRAMADA, CONFIRMADA, EN_PROGRESO, COMPLETADA, CANCELADA o NO_ASISTIO'
  }),
  reason: Joi.string().max(500).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  insurance: Joi.object({
    company: Joi.string().max(100).optional().allow(''),
    policyNumber: Joi.string().max(50).optional().allow(''),
    coverage: Joi.string().max(200).optional().allow('')
  }).optional(),
  specialtyId: Joi.string().optional().allow(null)
});

const appointmentUpdateSchema = Joi.object({
  patientId: Joi.string().required(),
  doctorId: Joi.string().required(),
  appointmentDate: Joi.date().required(),
  appointmentTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration: Joi.number().integer().min(15).max(480).default(30),
  type: Joi.string().valid('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO').required(),
  modality: Joi.string().valid('TELEMEDICINA', 'PRESENCIAL').default('PRESENCIAL').messages({
    'any.only': 'La modalidad debe ser TELEMEDICINA o PRESENCIAL'
  }),
  status: Joi.string().valid('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO').required(),
  reason: Joi.string().max(500).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  insurance: Joi.object({
    company: Joi.string().max(100).optional().allow(''),
    policyNumber: Joi.string().max(50).optional().allow(''),
    coverage: Joi.string().max(200).optional().allow('')
  }).optional(),
  specialtyId: Joi.string().optional().allow(null)
});

const appointmentDoctorSchema = Joi.object({
  doctorId: Joi.string().required().messages({
    'any.required': 'El ID del doctor es requerido'
  })
});

// GET /api/appointments - Listar citas con filtros
// GET /api/appointments - Listar citas (acepta JWT o API Key)
router.get('/', authenticateTokenOrApiKey, async (req, res) => {
  let connection = null;
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    const { 
      page = 1, 
      limit = 20, 
      patientId = '', 
      doctorId = '', 
      status = '',
      type = '',
      dateFrom = '',
      dateTo = '',
      patientDocument = '',
      sortBy = 'appointment_date',
      sortOrder = 'ASC'
    } = req.query;

    // Convertir page y limit a números
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    
    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);
    
    // Verificar si la columna modality existe
    let hasModalityColumn = false;
    try {
      const [columns] = await connection.execute("SHOW COLUMNS FROM appointments WHERE Field = 'modality'");
      hasModalityColumn = columns.length > 0;
      console.log('🔍 Verificación de columna modality:', {
        existe: hasModalityColumn,
        columnasEncontradas: columns.length,
        detalles: columns.length > 0 ? columns[0] : null
      });
    } catch (err) {
      console.warn('Error verificando columna modality:', err.message);
      hasModalityColumn = false;
    }
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];

    if (patientId) {
      whereConditions.push('a.patient_id = ?');
      queryParams.push(patientId);
    }

    if (doctorId) {
      whereConditions.push('a.doctor_id = ?');
      queryParams.push(doctorId);
    }

    if (status) {
      whereConditions.push('a.status = ?');
      queryParams.push(status);
    }

    if (type) {
      whereConditions.push('a.type = ?');
      queryParams.push(type);
    }

    if (dateFrom) {
      whereConditions.push('a.appointment_date >= ?');
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('a.appointment_date <= ?');
      queryParams.push(dateTo);
    }

    if (patientDocument) {
      whereConditions.push('(p.documentNumber = ? OR po.documentNumber = ?)');
      queryParams.push(patientDocument, patientDocument);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['appointment_date', 'appointment_time', 'created_at', 'status'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'appointment_date';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Consulta para obtener total de registros
    const countQuery = `SELECT COUNT(*) as total FROM appointments a ${whereClause}`;
    const [countResult] = await connection.execute(countQuery, [...queryParams]);
    const total = parseInt(countResult[0].total);

    // Verificar qué columnas de timestamp existen
    const [timestampColumns] = await connection.execute("SHOW COLUMNS FROM appointments WHERE Field IN ('created_at', 'createdAt', 'updated_at', 'updatedAt')");
    const timestampColNames = timestampColumns.map(col => col.Field);
    const hasCreatedAt = timestampColNames.includes('created_at');
    const hasCreatedAtOld = timestampColNames.includes('createdAt');
    const hasUpdatedAt = timestampColNames.includes('updated_at');
    const hasUpdatedAtOld = timestampColNames.includes('updatedAt');
    
    // Construir SELECT con columnas disponibles
    const createdAtSelect = hasCreatedAt ? 'a.created_at' : (hasCreatedAtOld ? 'a.createdAt as created_at' : 'NULL as created_at');
    const updatedAtSelect = hasUpdatedAt ? 'a.updated_at' : (hasUpdatedAtOld ? 'a.updatedAt as updated_at' : 'NULL as updated_at');
    
    // Crear una copia nueva de los parámetros para la consulta principal
    const mainQueryParams = [...queryParams];
    
    // En MySQL, LIMIT con parámetros preparados puede ser problemático
    // Usar valores directos en lugar de parámetros para LIMIT y OFFSET
    const safeOffset = parseInt(offset) || 0;
    const safeLimit = parseInt(limitNum) || 20;
    
    // Consulta principal - usar valores directos para LIMIT y OFFSET
    // Incluir modality solo si la columna existe, usando COALESCE para manejar NULL
    const modalitySelect = hasModalityColumn 
      ? "COALESCE(a.modality, 'PRESENCIAL') as modality," 
      : "'PRESENCIAL' as modality,";
    console.log('🔍 Modality SELECT usado:', modalitySelect, '| hasModalityColumn:', hasModalityColumn);
    const mainQuery = `
      SELECT 
        a.id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.duration,
        a.type,
        ${modalitySelect}
        a.status,
        a.reason,
        a.notes,
        a.insurance,
        a.specialty_id,
        ${createdAtSelect},
        ${updatedAtSelect},
        COALESCE(p.firstName, po.firstName) as patient_first_name,
        COALESCE(p.lastName, po.lastName) as patient_last_name,
        COALESCE(p.documentNumber, po.documentNumber) as patient_document,
        COALESCE(p.birthDate, po.birthDate) as patient_birth_date,
        d.firstName as doctor_first_name,
        d.lastName as doctor_last_name,
        s.name as specialty_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN patients po ON a.patient_id = po.id
      JOIN users d ON a.doctor_id = d.id
      LEFT JOIN specialties s ON a.specialty_id = s.id
      ${whereClause}
      ORDER BY a.${finalSortBy} ${finalSortOrder}
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;
    
    const [appointmentsResult] = await connection.execute(mainQuery, mainQueryParams);
    
    // Log para debug de modality
    if (appointmentsResult.length > 0) {
      console.log('📋 Citas devueltas por el backend:');
      appointmentsResult.forEach((apt, idx) => {
        console.log(`  Cita ${idx + 1}:`, {
          id: apt.id,
          modality: apt.modality,
          type: apt.type,
          date: apt.appointment_date,
          time: apt.appointment_time
        });
      });
    }

    const appointments = appointmentsResult.map(appointment => ({
      ...appointment,
      patientFullName: `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim(),
      doctorFullName: `${appointment.doctor_first_name || ''} ${appointment.doctor_last_name || ''}`.trim(),
      appointmentDateTime: `${appointment.appointment_date}T${appointment.appointment_time}`,
      insurance: typeof appointment.insurance === 'string' ? JSON.parse(appointment.insurance || '{}') : (appointment.insurance || {})
    }));

    res.json({
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las citas'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/appointments/:id - Obtener cita específica
// GET /api/appointments/:id - Obtener cita por ID (acepta JWT o API Key)
router.get('/:id', authenticateTokenOrApiKey, async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    const [appointmentResult] = await connection.execute(
      `SELECT 
        a.*,
        COALESCE(p.firstName, po.firstName) as patient_first_name,
        COALESCE(p.lastName, po.lastName) as patient_last_name,
        COALESCE(p.documentNumber, po.documentNumber) as patient_document,
        COALESCE(p.birthDate, po.birthDate) as patient_birth_date,
        COALESCE(p.phone, po.phone) as patient_phone,
        COALESCE(p.email, po.email) as patient_email,
        d.firstName as doctor_first_name,
        d.lastName as doctor_last_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN patients po ON a.patient_id = po.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.id = ?`,
      [id]
    );

    if (appointmentResult.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    const appointment = appointmentResult[0];
    appointment.patientFullName = `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim();
    appointment.doctorFullName = `${appointment.doctor_first_name || ''} ${appointment.doctor_last_name || ''}`.trim();
    appointment.appointmentDateTime = `${appointment.appointment_date}T${appointment.appointment_time}`;
    appointment.insurance = typeof appointment.insurance === 'string' ? JSON.parse(appointment.insurance || '{}') : (appointment.insurance || {});

    res.json({ appointment });

  } catch (error) {
    console.error('Error obteniendo cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la cita'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/appointments - Crear nueva cita
router.post('/', authenticateToken, requirePermission('APPOINTMENTS', 'CREATE'), async (req, res) => {
  let connection = null;
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    console.log('📥 POST /api/appointments - Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('📥 Modality recibido:', req.body.modality);
    
    // Validar datos de entrada
    const { error, value } = appointmentCreateSchema.validate(req.body);
    if (error) {
      console.error('❌ Error de validación:', error.details);
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const appointmentData = value;
    console.log('✅ Datos validados:', JSON.stringify(appointmentData, null, 2));
    console.log('✅ Modality validado:', appointmentData.modality);
    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    // Verificar si el paciente existe
    const [patientResult] = await connection.execute(
      'SELECT id FROM patients WHERE id = ?',
      [appointmentData.patientId]
    );

    if (patientResult.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente especificado no existe'
      });
    }

    // Verificar si el doctor existe y es médico
    const [doctorResult] = await connection.execute(
      'SELECT id, role FROM users WHERE id = ? AND role = ?',
      [appointmentData.doctorId, 'medical_user']
    );

    if (doctorResult.length === 0) {
      return res.status(404).json({
        error: 'Doctor no encontrado',
        message: 'El doctor especificado no existe o no es un usuario médico'
      });
    }

    // Verificar conflictos de horario (simplificado para MySQL)
    const [conflictResult] = await connection.execute(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? 
       AND appointment_date = ? 
       AND status NOT IN ('CANCELADA', 'NO_ASISTIO')
       AND appointment_time = ?`,
      [
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        appointmentData.appointmentTime
      ]
    );

    if (conflictResult.length > 0) {
      return res.status(409).json({
        error: 'Conflicto de horario',
        message: 'El doctor ya tiene una cita programada en ese horario'
      });
    }

    // Insertar nueva cita
    const appointmentId = uuidv4();
    const insuranceJson = appointmentData.insurance ? JSON.stringify(appointmentData.insurance) : null;
    
    const modalityValue = appointmentData.modality || 'PRESENCIAL';
    console.log('💾 Insertando cita con modality:', modalityValue);
    
    await connection.execute(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, appointment_date, appointment_time, duration,
        type, modality, status, reason, notes, insurance, specialty_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointmentId,
        appointmentData.patientId,
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        appointmentData.appointmentTime,
        appointmentData.duration,
        appointmentData.type,
        modalityValue,
        appointmentData.status,
        appointmentData.reason || null,
        appointmentData.notes || null,
        insuranceJson,
        appointmentData.specialtyId || null,
        req.user.id
      ]
    );
    
    console.log('✅ Cita creada con ID:', appointmentId, 'y modality:', modalityValue);

    const [newAppointment] = await connection.execute(
      `SELECT 
        a.*,
        COALESCE(p.firstName, po.firstName) as patient_first_name,
        COALESCE(p.lastName, po.lastName) as patient_last_name,
        COALESCE(p.documentNumber, po.documentNumber) as patient_document,
        d.firstName as doctor_first_name,
        d.lastName as doctor_last_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN patients po ON a.patient_id = po.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.id = ?`,
      [appointmentId]
    );

    const appointment = newAppointment[0];
    const formattedAppointment = {
      ...appointment,
      patientFullName: `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim(),
      doctorFullName: `${appointment.doctor_first_name || ''} ${appointment.doctor_last_name || ''}`.trim(),
      appointmentDateTime: appointment.appointment_date && appointment.appointment_time 
        ? `${appointment.appointment_date}T${appointment.appointment_time}` 
        : null,
      insurance: typeof appointment.insurance === 'string' ? JSON.parse(appointment.insurance || '{}') : (appointment.insurance || {})
    };
    
    console.log('✅ Cita creada, datos devueltos:', {
      id: formattedAppointment.id,
      appointment_date: formattedAppointment.appointment_date,
      appointment_time: formattedAppointment.appointment_time,
      appointmentDateTime: formattedAppointment.appointmentDateTime
    });

    res.status(201).json({
      message: 'Cita creada exitosamente',
      appointment: formattedAppointment
    });

  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la cita'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// PUT /api/appointments/:id - Actualizar cita
router.put('/:id', authenticateToken, requirePermission('APPOINTMENTS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    // Validar datos de entrada
    const { error, value } = appointmentUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const appointmentData = value;
    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    // Verificar si la cita existe
    const [existingAppointment] = await connection.execute(
      'SELECT id, status FROM appointments WHERE id = ?',
      [id]
    );

    if (existingAppointment.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    // No permitir modificar citas completadas o canceladas
    if (existingAppointment[0].status === 'COMPLETADA' || existingAppointment[0].status === 'CANCELADA') {
      return res.status(400).json({
        error: 'Cita no modificable',
        message: 'No se puede modificar una cita completada o cancelada'
      });
    }

    // Verificar conflictos de horario (excluyendo la cita actual)
    const [conflictResult] = await connection.execute(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? 
       AND appointment_date = ? 
       AND id != ?
       AND status NOT IN ('CANCELADA', 'NO_ASISTIO')
       AND appointment_time = ?`,
      [
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        id,
        appointmentData.appointmentTime
      ]
    );

    if (conflictResult.length > 0) {
      return res.status(409).json({
        error: 'Conflicto de horario',
        message: 'El doctor ya tiene una cita programada en ese horario'
      });
    }

    // Actualizar cita
    const insuranceJson = appointmentData.insurance ? JSON.stringify(appointmentData.insurance) : null;
    
    await connection.execute(
      `UPDATE appointments SET
        patient_id = ?, doctor_id = ?, appointment_date = ?, appointment_time = ?,
        duration = ?, type = ?, modality = ?, status = ?, reason = ?, notes = ?, 
        insurance = ?, specialty_id = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        appointmentData.patientId,
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        appointmentData.appointmentTime,
        appointmentData.duration,
        appointmentData.type,
        appointmentData.modality || 'PRESENCIAL',
        appointmentData.status,
        appointmentData.reason || null,
        appointmentData.notes || null,
        insuranceJson,
        appointmentData.specialtyId || null,
        id
      ]
    );

    const [updatedAppointment] = await connection.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Cita actualizada exitosamente',
      appointment: {
        ...updatedAppointment[0],
        insurance: typeof updatedAppointment[0].insurance === 'string' ? JSON.parse(updatedAppointment[0].insurance || '{}') : (updatedAppointment[0].insurance || {})
      }
    });

  } catch (error) {
    console.error('Error actualizando cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar la cita'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// PATCH /api/appointments/:id/doctor - Actualizar solo el profesional asignado
router.patch('/:id/doctor', authenticateToken, requirePermission('APPOINTMENTS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { error, value } = appointmentDoctorSchema.validate(req.body);
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(d => d.message)
      });
    }

    const doctorId = value.doctorId;
    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    // Verificar existencia de la cita
    const [apptResult] = await connection.execute('SELECT id, status FROM appointments WHERE id = ?', [id]);
    if (apptResult.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada', message: 'La cita no existe' });
    }

    // Verificar doctor válido y rol médico
    const [doctorResult] = await connection.execute('SELECT id FROM users WHERE id = ? AND role = ?', [doctorId, 'medical_user']);
    if (doctorResult.length === 0) {
      return res.status(404).json({ error: 'Doctor no encontrado', message: 'El profesional no existe o no es médico' });
    }

    // Actualizar doctor
    await connection.execute('UPDATE appointments SET doctor_id = ?, updated_at = NOW() WHERE id = ?', [doctorId, id]);
    const [updated] = await connection.execute('SELECT * FROM appointments WHERE id = ?', [id]);
    const appointment = updated[0];
    
    appointment.insurance = typeof appointment.insurance === 'string' ? JSON.parse(appointment.insurance || '{}') : (appointment.insurance || {});
    
    return res.json({ message: 'Profesional actualizado', appointment });
  } catch (err) {
    console.error('Error actualizando doctor de cita:', err);
    return res.status(500).json({ error: 'Error interno del servidor', message: 'No se pudo actualizar el profesional' });
  } finally {
    if (connection) await connection.close();
  }
});

// PATCH /api/appointments/:id/status - Cambiar estado de la cita
router.patch('/:id/status', authenticateToken, requirePermission('APPOINTMENTS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { status } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    // Validar estado
    const validStatuses = ['PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: 'El estado debe ser uno de: PROGRAMADA, CONFIRMADA, EN_PROGRESO, COMPLETADA, CANCELADA, NO_ASISTIO'
      });
    }

    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    // Verificar si la cita existe
    const [existingAppointment] = await connection.execute(
      'SELECT id, status FROM appointments WHERE id = ?',
      [id]
    );

    if (existingAppointment.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    // Actualizar estado
    await connection.execute(
      'UPDATE appointments SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    const [updatedAppointment] = await connection.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [id]
    );

    const appointment = updatedAppointment[0];
    appointment.insurance = typeof appointment.insurance === 'string' ? JSON.parse(appointment.insurance || '{}') : (appointment.insurance || {});

    res.json({
      message: 'Estado de cita actualizado exitosamente',
      appointment
    });

  } catch (error) {
    console.error('Error actualizando estado de cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el estado de la cita'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// DELETE /api/appointments/:id - Eliminar cita
router.delete('/:id', authenticateToken, requirePermission('APPOINTMENTS', 'DELETE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    // Verificar si la cita existe
    const [existingAppointment] = await connection.execute(
      'SELECT id, status FROM appointments WHERE id = ?',
      [id]
    );

    if (existingAppointment.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    // No permitir eliminar citas en progreso o completadas
    if (existingAppointment[0].status === 'EN_PROGRESO' || existingAppointment[0].status === 'COMPLETADA') {
      return res.status(400).json({
        error: 'Cita no eliminable',
        message: 'No se puede eliminar una cita en progreso o completada'
      });
    }

    // Eliminar cita
    await connection.execute('DELETE FROM appointments WHERE id = ?', [id]);

    res.json({
      message: 'Cita eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la cita'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/appointments/import - Importar múltiples citas médicas (acepta JWT o API Key)
router.post('/import', authenticateTokenOrApiKey, async (req, res) => {
  let connection = null;
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    const { appointments, options = {} } = req.body;
    const { skipDuplicates = true, skipConflicts = true, allowPastDates = false } = options;

    if (!Array.isArray(appointments) || appointments.length === 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'Se requiere un array de citas con al menos un elemento'
      });
    }

    if (appointments.length > 500) {
      return res.status(400).json({
        error: 'Límite excedido',
        message: 'No se pueden importar más de 500 citas a la vez'
      });
    }

    connection = await getCompanyConnection(companyId);
    await ensureTables(connection);

    const results = {
      total: appointments.length,
      created: 0,
      skipped: 0,
      errors: []
    };

    // Procesar cada cita
    for (let i = 0; i < appointments.length; i++) {
      const appointmentData = appointments[i];
      
      try {
        // Crear un esquema de validación que permita fechas pasadas si allowPastDates es true
        const importSchema = appointmentCreateSchema.keys({
          appointmentDate: allowPastDates 
            ? Joi.date().required().messages({
                'any.required': 'La fecha de la cita es requerida'
              })
            : appointmentCreateSchema.extract('appointmentDate')
        });

        // Validar datos de la cita
        const { error, value } = importSchema.validate(appointmentData);
        if (error) {
          results.errors.push({
            index: i,
            data: appointmentData,
            error: 'Datos inválidos',
            details: error.details.map(detail => detail.message)
          });
          results.skipped++;
          continue;
        }

        const validatedData = value;

        // Verificar si el paciente existe
        const [patientResult] = await connection.execute(
          'SELECT id FROM patients WHERE id = ?',
          [validatedData.patientId]
        );

        if (patientResult.length === 0) {
          results.errors.push({
            index: i,
            data: appointmentData,
            error: 'Paciente no encontrado',
            message: `El paciente con ID ${validatedData.patientId} no existe`
          });
          results.skipped++;
          continue;
        }

        // Verificar si el doctor existe y es médico
        const [doctorResult] = await connection.execute(
          'SELECT id, role FROM users WHERE id = ? AND role = ?',
          [validatedData.doctorId, 'medical_user']
        );

        if (doctorResult.length === 0) {
          results.errors.push({
            index: i,
            data: appointmentData,
            error: 'Doctor no encontrado',
            message: `El doctor con ID ${validatedData.doctorId} no existe o no es un usuario médico`
          });
          results.skipped++;
          continue;
        }

        // Verificar conflictos de horario si skipConflicts es true
        if (skipConflicts) {
          const [conflictResult] = await connection.execute(
            `SELECT id FROM appointments 
             WHERE doctor_id = ? 
             AND appointment_date = ? 
             AND status NOT IN ('CANCELADA', 'NO_ASISTIO')
             AND appointment_time = ?`,
            [
              validatedData.doctorId,
              validatedData.appointmentDate,
              validatedData.appointmentTime
            ]
          );

          if (conflictResult.length > 0) {
            results.errors.push({
              index: i,
              data: appointmentData,
              error: 'Conflicto de horario',
              message: 'El doctor ya tiene una cita programada en ese horario'
            });
            results.skipped++;
            continue;
          }
        }

        // Insertar nueva cita
        const appointmentId = uuidv4();
        const insuranceJson = validatedData.insurance ? JSON.stringify(validatedData.insurance) : null;
        const modalityValue = validatedData.modality || 'PRESENCIAL';
        
        await connection.execute(
          `INSERT INTO appointments (
            id, patient_id, doctor_id, appointment_date, appointment_time, duration,
            type, modality, status, reason, notes, insurance, specialty_id, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            appointmentId,
            validatedData.patientId,
            validatedData.doctorId,
            validatedData.appointmentDate,
            validatedData.appointmentTime,
            validatedData.duration || 30,
            validatedData.type,
            modalityValue,
            validatedData.status || 'PROGRAMADA',
            validatedData.reason || null,
            validatedData.notes || null,
            insuranceJson,
            validatedData.specialtyId || null,
            req.user.id
          ]
        );
        
        results.created++;

      } catch (error) {
        console.error(`Error procesando cita ${i}:`, error);
        results.errors.push({
          index: i,
          data: appointmentData,
          error: error.message || 'Error desconocido'
        });
        results.skipped++;
      }
    }

    res.status(200).json({
      message: 'Importación completada',
      results
    });

  } catch (error) {
    console.error('Error en importación de citas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al importar las citas',
      details: error.message
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;
