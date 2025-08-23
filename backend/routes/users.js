const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission, hashPassword, ROLES } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const userSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El formato del email no es válido',
    'any.required': 'El email es requerido'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 50 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede exceder 50 caracteres',
    'any.required': 'El apellido es requerido'
  }),
  role: Joi.string().valid(...Object.values(ROLES)).required().messages({
    'any.only': 'El rol debe ser uno de los valores permitidos',
    'any.required': 'El rol es requerido'
  }),
  specialtyId: Joi.number().integer().positive().optional().allow(null).messages({
    'number.base': 'El ID de especialidad debe ser un número',
    'number.integer': 'El ID de especialidad debe ser un número entero',
    'number.positive': 'El ID de especialidad debe ser positivo'
  }),
  isActive: Joi.boolean().default(true)
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 50 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede exceder 50 caracteres',
    'any.required': 'El apellido es requerido'
  }),
  role: Joi.string().valid(...Object.values(ROLES)).required().messages({
    'any.only': 'El rol debe ser uno de los valores permitidos',
    'any.required': 'El rol es requerido'
  }),
  specialtyId: Joi.number().integer().positive().optional().allow(null).messages({
    'number.base': 'El ID de especialidad debe ser un número',
    'number.integer': 'El ID de especialidad debe ser un número entero',
    'number.positive': 'El ID de especialidad debe ser positivo'
  }),
  isActive: Joi.boolean().default(true)
});

// GET /api/users - Listar usuarios con filtros
router.get('/', authenticateToken, requirePermission('USERS', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role = '', 
      specialtyId = '',
      isActive = '',
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (specialtyId) {
      whereConditions.push(`u.specialty_id = $${paramIndex}`);
      queryParams.push(parseInt(specialtyId));
      paramIndex++;
    }

    if (isActive !== '') {
      whereConditions.push(`u.is_active = $${paramIndex}`);
      queryParams.push(isActive === 'true');
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['first_name', 'last_name', 'email', 'role', 'created_at', 'last_login'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.specialty_id,
        u.is_active,
        u.last_login,
        u.created_at,
        u.updated_at,
        s.name as specialty_name
      FROM users u
      LEFT JOIN specialties s ON u.specialty_id = s.id
      ${whereClause}
      ORDER BY u.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const usersResult = await query(mainQuery, queryParams);

    const users = usersResult.rows.map(user => ({
      ...user,
      fullName: `${user.first_name} ${user.last_name}`
    }));

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los usuarios'
    });
  }
});

// GET /api/users/:id - Obtener usuario específico
router.get('/:id', authenticateToken, requirePermission('USERS', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      `SELECT 
        u.*,
        s.name as specialty_name
      FROM users u
      LEFT JOIN specialties s ON u.specialty_id = s.id
      WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario con el ID especificado no existe'
      });
    }

    const user = userResult.rows[0];
    user.fullName = `${user.first_name} ${user.last_name}`;

    // No enviar la contraseña en la respuesta
    delete user.password;

    res.json({ user });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener el usuario'
    });
  }
});

// POST /api/users - Crear nuevo usuario
router.post('/', authenticateToken, requirePermission('USERS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const userData = value;

    // Verificar si el email ya existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [userData.email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email ya registrado',
        message: 'Ya existe un usuario con este email'
      });
    }

    // Verificar si la especialidad existe (si se proporciona)
    if (userData.specialtyId) {
      const specialtyResult = await query(
        'SELECT id FROM specialties WHERE id = $1',
        [userData.specialtyId]
      );

      if (specialtyResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Especialidad no encontrada',
          message: 'La especialidad especificada no existe'
        });
      }
    }

    // Generar contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(tempPassword);

    // Insertar nuevo usuario
    const newUserResult = await query(
      `INSERT INTO users (email, password, first_name, last_name, role, specialty_id, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, email, first_name, last_name, role, specialty_id, is_active`,
      [
        userData.email,
        hashedPassword,
        userData.firstName,
        userData.lastName,
        userData.role,
        userData.specialtyId || null,
        userData.isActive
      ]
    );

    const newUser = newUserResult.rows[0];
    newUser.fullName = `${newUser.first_name} ${newUser.last_name}`;
    newUser.tempPassword = tempPassword; // Solo para la respuesta inicial

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: newUser,
      note: 'La contraseña temporal se muestra solo en esta respuesta. El usuario debe cambiarla en su primer login.'
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear el usuario'
    });
  }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const userData = value;

    // Verificar si el usuario existe
    const existingUser = await query(
      'SELECT id, email FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario con el ID especificado no existe'
      });
    }

    // Verificar si la especialidad existe (si se proporciona)
    if (userData.specialtyId) {
      const specialtyResult = await query(
        'SELECT id FROM specialties WHERE id = $1',
        [userData.specialtyId]
      );

      if (specialtyResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Especialidad no encontrada',
          message: 'La especialidad especificada no existe'
        });
      }
    }

    // Actualizar usuario
    const updatedUserResult = await query(
      `UPDATE users SET
        first_name = $1, last_name = $2, role = $3, specialty_id = $4, 
        is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, first_name, last_name, role, specialty_id, is_active, created_at, updated_at`,
      [
        userData.firstName,
        userData.lastName,
        userData.role,
        userData.specialtyId || null,
        userData.isActive,
        id
      ]
    );

    const updatedUser = updatedUserResult.rows[0];
    updatedUser.fullName = `${updatedUser.first_name} ${updatedUser.last_name}`;

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el usuario'
    });
  }
});

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', authenticateToken, requirePermission('USERS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const existingUser = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario con el ID especificado no existe'
      });
    }

    // No permitir eliminar super usuarios
    if (existingUser.rows[0].role === 'super_user') {
      return res.status(400).json({
        error: 'No se puede eliminar el usuario',
        message: 'No se pueden eliminar super usuarios'
      });
    }

    // Verificar si el usuario tiene registros relacionados
    const relatedRecords = await query(
      `SELECT 
        (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1) as appointments_count,
        (SELECT COUNT(*) FROM clinical_notes WHERE doctor_id = $1) as clinical_notes_count,
        (SELECT COUNT(*) FROM prescriptions WHERE doctor_id = $1) as prescriptions_count`,
      [id]
    );

    const counts = relatedRecords.rows[0];
    if (counts.appointments_count > 0 || counts.clinical_notes_count > 0 || counts.prescriptions_count > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el usuario',
        message: 'El usuario tiene registros médicos asociados y no puede ser eliminado'
      });
    }

    // Eliminar usuario
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar el usuario'
    });
  }
});

// PATCH /api/users/:id/status - Cambiar estado del usuario
router.patch('/:id/status', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validar estado
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Estado inválido',
        message: 'El estado debe ser true o false'
      });
    }

    // Verificar si el usuario existe
    const existingUser = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario con el ID especificado no existe'
      });
    }

    // No permitir desactivar super usuarios
    if (existingUser.rows[0].role === 'super_user' && !isActive) {
      return res.status(400).json({
        error: 'No se puede desactivar el usuario',
        message: 'No se pueden desactivar super usuarios'
      });
    }

    // Actualizar estado
    const updatedUserResult = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isActive, id]
    );

    const updatedUser = updatedUserResult.rows[0];
    updatedUser.fullName = `${updatedUser.first_name} ${updatedUser.last_name}`;

    res.json({
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error actualizando estado de usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el estado del usuario'
    });
  }
});

// POST /api/users/:id/reset-password - Resetear contraseña de usuario
router.post('/:id/reset-password', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const existingUser = await query(
      'SELECT id, email FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario con el ID especificado no existe'
      });
    }

    // Generar nueva contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(tempPassword);

    // Actualizar contraseña
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, id]
    );

    res.json({
      message: 'Contraseña reseteada exitosamente',
      tempPassword,
      note: 'La contraseña temporal se muestra solo en esta respuesta. El usuario debe cambiarla en su próximo login.'
    });

  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al resetear la contraseña'
    });
  }
});

// GET /api/users/doctors - Obtener solo doctores
router.get('/doctors/list', authenticateToken, async (req, res) => {
  try {
    const { specialtyId = '', isActive = '' } = req.query;
    
    let whereConditions = [`u.role = 'medical_user'`];
    let queryParams = [];
    let paramIndex = 1;

    if (specialtyId) {
      whereConditions.push(`u.specialty_id = $${paramIndex}`);
      queryParams.push(parseInt(specialtyId));
      paramIndex++;
    }

    if (isActive !== '') {
      whereConditions.push(`u.is_active = $${paramIndex}`);
      queryParams.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const doctorsResult = await query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.specialty_id,
        u.is_active,
        s.name as specialty_name
      FROM users u
      LEFT JOIN specialties s ON u.specialty_id = s.id
      WHERE ${whereClause}
      ORDER BY u.first_name, u.last_name`,
      queryParams
    );

    const doctors = doctorsResult.rows.map(doctor => ({
      ...doctor,
      fullName: `${doctor.first_name} ${doctor.last_name}`
    }));

    res.json({ doctors });

  } catch (error) {
    console.error('Error obteniendo doctores:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los doctores'
    });
  }
});

module.exports = router; 