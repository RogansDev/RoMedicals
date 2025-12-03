const express = require('express');
const Joi = require('joi');
const mysql = require('mysql2/promise');
const { authenticateToken, authenticateTokenOrApiKey, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Configuración de base de datos MySQL (usar la misma que server.js)
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

// Validación de horario
const scheduleSchema = Joi.object().pattern(
  Joi.string().valid(
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
  ),
  Joi.object({
    isWorking: Joi.boolean().required(),
    startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    breakStart: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(''),
    breakEnd: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(''),
    hasBreak: Joi.boolean().default(false),
    simultaneousPatients: Joi.number().integer().min(1).max(10).default(3),
    interval: Joi.number().integer().min(5).max(120).default(15),
    box: Joi.string().max(50).allow('', null).default('Box 1'),
    modality: Joi.string().valid('both','in-person','virtual').default('both')
  })
);

// Función para crear tabla de horarios si no existe
const ensureScheduleTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS specialist_schedules (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      schedule JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_schedule (user_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

// GET /api/specialists - Lista de especialistas (usuarios médicos) - acepta JWT o API Key
router.get('/', authenticateTokenOrApiKey, async (req, res) => {
  let connection = null;
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    connection = await getCompanyConnection(companyId);
    await ensureScheduleTable(connection);

    const [specialists] = await connection.execute(
      `SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.specialtyId,
        u.isActive,
        u.phone,
        u.title,
        s.name as specialtyName,
        ss.schedule
      FROM users u
      LEFT JOIN specialties s ON u.specialtyId = s.id
      LEFT JOIN specialist_schedules ss ON ss.user_id = u.id
      WHERE u.role = 'medical_user'
      ORDER BY u.firstName, u.lastName`
    );

    const formattedSpecialists = specialists.map(r => ({
      id: r.id,
      title: r.title || 'Dr',
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone || null,
      isActive: r.isActive,
      specialtyId: r.specialtyId,
      specialtyName: r.specialtyName || null,
      specialties: r.specialtyId ? [{ id: r.specialtyId, name: r.specialtyName || '' }] : [],
      schedule: r.schedule ? (typeof r.schedule === 'string' ? JSON.parse(r.schedule) : r.schedule) : null
    }));

    res.json(formattedSpecialists);
  } catch (err) {
    console.error('Error listando especialistas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// GET /api/specialists/:id/schedule - Obtener horario de un especialista
router.get('/:id/schedule', authenticateToken, async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      console.error('Usuario sin companyId:', req.user);
      return res.status(400).json({ 
        error: 'Usuario no tiene companyId asignado',
        message: 'El usuario no está asociado a una empresa'
      });
    }

    connection = await getCompanyConnection(companyId);
    await ensureScheduleTable(connection);

    const [rows] = await connection.execute(
      'SELECT schedule FROM specialist_schedules WHERE user_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.json({ schedule: null });
    }

    const schedule = rows[0].schedule;
    const parsedSchedule = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
    
    return res.json({ schedule: parsedSchedule });
  } catch (err) {
    console.error('Error obteniendo horario:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el horario'
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// PUT /api/specialists/:id/schedule - Guardar/actualizar horario
router.put('/:id/schedule', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const { schedule } = req.body || {};
    const companyId = req.user?.companyId;
    const { v4: uuidv4 } = require('uuid');

    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    const { error, value } = scheduleSchema.validate(schedule || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Datos de horario inválidos',
        details: error.details.map(d => d.message)
      });
    }

    connection = await getCompanyConnection(companyId);
    await ensureScheduleTable(connection);

    // Verificar que el usuario existe y es médico (opcional, puede estar en otra tabla)
    try {
      const [users] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role = ?',
        [id, 'medical_user']
      );
      if (users.length === 0) {
        console.warn(`Usuario ${id} no encontrado como médico, pero continuando con el guardado`);
      }
    } catch (dbError) {
      console.warn('No se pudo verificar usuario, continuando:', dbError.message);
    }

    // Upsert por user_id
    const [existing] = await connection.execute(
      'SELECT id FROM specialist_schedules WHERE user_id = ?',
      [id]
    );

    const scheduleJson = JSON.stringify(value || {});

    if (existing.length > 0) {
      await connection.execute(
        'UPDATE specialist_schedules SET schedule = ?, updated_at = NOW() WHERE user_id = ?',
        [scheduleJson, id]
      );
      
      const [updated] = await connection.execute(
        'SELECT schedule FROM specialist_schedules WHERE user_id = ?',
        [id]
      );
      
      const updatedSchedule = updated[0].schedule;
      const parsedSchedule = typeof updatedSchedule === 'string' ? JSON.parse(updatedSchedule) : updatedSchedule;
      
      return res.json({ 
        message: 'Horario actualizado', 
        schedule: parsedSchedule 
      });
    } else {
      const scheduleId = uuidv4();
      await connection.execute(
        'INSERT INTO specialist_schedules (id, user_id, schedule) VALUES (?, ?, ?)',
        [scheduleId, id, scheduleJson]
      );
      
      const [inserted] = await connection.execute(
        'SELECT schedule FROM specialist_schedules WHERE user_id = ?',
        [id]
      );
      
      const insertedSchedule = inserted[0].schedule;
      const parsedSchedule = typeof insertedSchedule === 'string' ? JSON.parse(insertedSchedule) : insertedSchedule;
      
      return res.status(201).json({ 
        message: 'Horario guardado', 
        schedule: parsedSchedule 
      });
    }
  } catch (err) {
    console.error('Error guardando horario:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'No se pudo guardar el horario'
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// POST /api/specialists/import - Importar múltiples especialistas/doctores (acepta JWT o API Key)
router.post('/import', authenticateTokenOrApiKey, async (req, res) => {
  let connection = null;
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene companyId asignado' });
    }

    const { specialists, options = {} } = req.body;
    const { skipDuplicates = true, updateExisting = false, generatePasswords = true } = options;

    if (!Array.isArray(specialists) || specialists.length === 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'Se requiere un array de especialistas con al menos un elemento'
      });
    }

    if (specialists.length > 200) {
      return res.status(400).json({
        error: 'Límite excedido',
        message: 'No se pueden importar más de 200 especialistas a la vez'
      });
    }

    connection = await getCompanyConnection(companyId);
    await ensureScheduleTable(connection);

    // Función auxiliar para migrar tabla users si es necesario
    const migrateUsersTable = async (conn) => {
      try {
        const [columns] = await conn.execute("SHOW COLUMNS FROM users");
        const columnNames = columns.map(col => col.Field);
        
        if (!columnNames.includes('idType')) {
          await conn.execute("ALTER TABLE users ADD COLUMN idType VARCHAR(10)");
        }
        if (!columnNames.includes('idNumber')) {
          await conn.execute("ALTER TABLE users ADD COLUMN idNumber VARCHAR(50)");
        }
        if (!columnNames.includes('providerCode')) {
          await conn.execute("ALTER TABLE users ADD COLUMN providerCode VARCHAR(50)");
        }
        if (!columnNames.includes('title')) {
          await conn.execute("ALTER TABLE users ADD COLUMN title VARCHAR(10) DEFAULT 'Dr'");
        }
        if (!columnNames.includes('signature')) {
          await conn.execute("ALTER TABLE users ADD COLUMN signature LONGTEXT");
        }
        if (!columnNames.includes('profilePhoto')) {
          await conn.execute("ALTER TABLE users ADD COLUMN profilePhoto LONGTEXT");
        }
        if (!columnNames.includes('onboardingCompleted')) {
          await conn.execute("ALTER TABLE users ADD COLUMN onboardingCompleted BOOLEAN DEFAULT FALSE");
        }
      } catch (error) {
        console.warn('Error en migración de tabla users:', error.message);
      }
    };

    await migrateUsersTable(connection);

    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    const results = {
      total: specialists.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      credentials: [] // Array para almacenar credenciales de usuarios creados
    };

    // Función para generar contraseña temporal
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    // Procesar cada especialista
    for (let i = 0; i < specialists.length; i++) {
      const specialistData = specialists[i];
      
      try {
        // Validaciones básicas
        if (!specialistData.firstName || !specialistData.lastName || !specialistData.email) {
          results.errors.push({
            index: i,
            data: specialistData,
            error: 'Datos inválidos',
            message: 'Nombre, apellido y email son requeridos'
          });
          results.skipped++;
          continue;
        }

        const email = specialistData.email.toLowerCase().trim();
        const firstName = specialistData.firstName.trim();
        const lastName = specialistData.lastName.trim();

        // Verificar si ya existe un usuario con el mismo email
        const [existingUser] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );

        if (existingUser.length > 0) {
          if (skipDuplicates && !updateExisting) {
            results.skipped++;
            continue;
          }

          if (updateExisting) {
            // Actualizar usuario existente
            const specialtyId = specialistData.specialtyId || specialistData.specialties?.[0] || null;
            
            await connection.execute(
              `UPDATE users SET
                firstName = ?, lastName = ?, phone = ?, idType = ?, idNumber = ?,
                providerCode = ?, title = ?, specialtyId = ?, updatedAt = NOW()
              WHERE id = ?`,
              [
                firstName,
                lastName,
                specialistData.phone || null,
                specialistData.idType || null,
                specialistData.idNumber || null,
                specialistData.providerCode || null,
                specialistData.title || 'Dr',
                specialtyId,
                existingUser[0].id
              ]
            );
            results.updated++;
          } else {
            results.skipped++;
          }
          continue;
        }

        // Crear nuevo especialista
        const userId = uuidv4();
        const specialtyId = specialistData.specialtyId || specialistData.specialties?.[0] || null;
        
        // Generar o usar contraseña
        let password = specialistData.password;
        let passwordGenerated = false;
        if (!password && generatePasswords) {
          password = generateTempPassword();
          passwordGenerated = true;
        }
        
        if (!password) {
          results.errors.push({
            index: i,
            data: specialistData,
            error: 'Contraseña requerida',
            message: 'Se requiere una contraseña o habilitar generatePasswords'
          });
          results.skipped++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await connection.execute(
          `INSERT INTO users (
            id, email, password, firstName, lastName, role, 
            phone, idType, idNumber, providerCode, title, 
            specialtyId, signature, profilePhoto, isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, 'medical_user', ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
          [
            userId,
            email,
            hashedPassword,
            firstName,
            lastName,
            specialistData.phone || null,
            specialistData.idType || null,
            specialistData.idNumber || null,
            specialistData.providerCode || null,
            specialistData.title || 'Dr',
            specialtyId,
            specialistData.signature || null,
            specialistData.profilePhoto || null
          ]
        );

        // Si se proporciona un horario, guardarlo
        if (specialistData.schedule) {
          const { error: scheduleError, value: scheduleValue } = scheduleSchema.validate(specialistData.schedule || {}, { abortEarly: false });
          if (!scheduleError) {
            const scheduleJson = JSON.stringify(scheduleValue);
            const scheduleId = uuidv4();
            await connection.execute(
              'INSERT INTO specialist_schedules (id, user_id, schedule) VALUES (?, ?, ?)',
              [scheduleId, userId, scheduleJson]
            );
          }
        }

        // Guardar credenciales para devolver en la respuesta
        results.credentials.push({
          email: email,
          firstName: firstName,
          lastName: lastName,
          password: password, // Contraseña en texto plano (solo se devuelve en la respuesta)
          passwordGenerated: passwordGenerated,
          userId: userId
        });

        results.created++;

      } catch (error) {
        console.error(`Error procesando especialista ${i}:`, error);
        results.errors.push({
          index: i,
          data: specialistData,
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
    console.error('Error en importación de especialistas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al importar los especialistas',
      details: error.message
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

module.exports = router;
