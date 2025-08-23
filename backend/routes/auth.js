const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  authenticateToken,
  ROLES 
} = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El formato del email no es válido',
    'any.required': 'El email es requerido'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es requerida'
  })
});

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El formato del email no es válido',
    'any.required': 'El email es requerido'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es requerida'
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
  specialty: Joi.string().when('role', {
    is: ROLES.MEDICAL_USER,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'La especialidad es requerida para usuarios médicos'
  })
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const { email, password } = value;

    // Buscar usuario en la base de datos
    const userResult = await query(
      `SELECT u.id, u.email, u.password, u.first_name, u.last_name, 
              u.role, u.is_active, u.last_login, s.name as specialty_name
       FROM users u 
       LEFT JOIN specialties s ON u.specialty_id = s.id 
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    const user = userResult.rows[0];

    // Verificar si el usuario está activo
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Cuenta desactivada',
        message: 'Su cuenta ha sido desactivada. Contacte al administrador.'
      });
    }

    // Verificar contraseña
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Actualizar último login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generar token JWT
    const token = generateToken(user.id, user.email, user.role);

    // Respuesta exitosa
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        specialty: user.specialty_name
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante el proceso de login'
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const { email, password, firstName, lastName, role, specialty } = value;

    // Verificar si el email ya existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email ya registrado',
        message: 'Ya existe una cuenta con este email'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);

    // Obtener specialty_id si se proporciona
    let specialtyId = null;
    if (specialty && role === ROLES.MEDICAL_USER) {
      const specialtyResult = await query(
        'SELECT id FROM specialties WHERE name = $1',
        [specialty]
      );
      if (specialtyResult.rows.length > 0) {
        specialtyId = specialtyResult.rows[0].id;
      }
    }

    // Insertar nuevo usuario
    const newUserResult = await query(
      `INSERT INTO users (email, password, first_name, last_name, role, specialty_id, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
       RETURNING id, email, first_name, last_name, role`,
      [email, hashedPassword, firstName, lastName, role, specialtyId]
    );

    const newUser = newUserResult.rows[0];

    // Generar token JWT
    const token = generateToken(newUser.id, newUser.email, newUser.role);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante el proceso de registro'
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
              u.is_active, u.last_login, s.name as specialty_name
       FROM users u 
       LEFT JOIN specialties s ON u.specialty_id = s.id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe'
      });
    }

    const user = userResult.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        specialty: user.specialty_name,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener el perfil'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  // En una implementación más robusta, podrías invalidar el token
  // Por ahora, solo respondemos exitosamente
  res.json({
    message: 'Logout exitoso'
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validar nueva contraseña
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Contraseña inválida',
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario actual
    const userResult = await query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await comparePassword(currentPassword, userResult.rows[0].password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Contraseña actual incorrecta',
        message: 'La contraseña actual proporcionada es incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const hashedNewPassword = await hashPassword(newPassword);

    // Actualizar contraseña
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al cambiar la contraseña'
    });
  }
});

module.exports = router; 