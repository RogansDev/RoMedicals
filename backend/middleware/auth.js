const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acceso requerido',
      message: 'Debe proporcionar un token de autenticación'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Verificar que el usuario existe y está activo
    const userResult = await query(
      'SELECT id, email, role, is_active, last_login FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado',
        message: 'El usuario asociado al token no existe'
      });
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Usuario inactivo',
        message: 'Su cuenta ha sido desactivada'
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'Su sesión ha expirado, inicie sesión nuevamente'
      });
    }
    
    return res.status(403).json({ 
      error: 'Token inválido',
      message: 'El token proporcionado no es válido'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        message: 'Debe iniciar sesión para acceder a este recurso'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'No tiene permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// Roles disponibles
const ROLES = {
  SUPER_USER: 'super_user',
  MEDICAL_USER: 'medical_user',
  ADMINISTRATIVE: 'administrative',
  NURSING: 'nursing'
};

// Permisos específicos por módulo
const PERMISSIONS = {
  // Módulo de pacientes
  PATIENTS: {
    CREATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.ADMINISTRATIVE],
    READ: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.ADMINISTRATIVE, ROLES.NURSING],
    UPDATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.ADMINISTRATIVE],
    DELETE: [ROLES.SUPER_USER]
  },
  
  // Módulo de citas
  APPOINTMENTS: {
    CREATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.ADMINISTRATIVE],
    READ: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.ADMINISTRATIVE, ROLES.NURSING],
    UPDATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.ADMINISTRATIVE],
    DELETE: [ROLES.SUPER_USER, ROLES.ADMINISTRATIVE]
  },
  
  // Módulo de notas clínicas
  CLINICAL_NOTES: {
    CREATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER],
    READ: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.NURSING],
    UPDATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER],
    DELETE: [ROLES.SUPER_USER]
  },
  
  // Módulo de evoluciones
  EVOLUTIONS: {
    CREATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER],
    READ: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.NURSING],
    UPDATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER],
    DELETE: [ROLES.SUPER_USER]
  },
  
  // Módulo de prescripciones
  PRESCRIPTIONS: {
    CREATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER],
    READ: [ROLES.SUPER_USER, ROLES.MEDICAL_USER, ROLES.NURSING],
    UPDATE: [ROLES.SUPER_USER, ROLES.MEDICAL_USER],
    DELETE: [ROLES.SUPER_USER]
  },
  
  // Módulo de RIPS
  RIPS: {
    CREATE: [ROLES.SUPER_USER, ROLES.ADMINISTRATIVE],
    READ: [ROLES.SUPER_USER, ROLES.ADMINISTRATIVE],
    UPDATE: [ROLES.SUPER_USER, ROLES.ADMINISTRATIVE],
    DELETE: [ROLES.SUPER_USER]
  },
  
  // Módulo de usuarios
  USERS: {
    CREATE: [ROLES.SUPER_USER],
    READ: [ROLES.SUPER_USER, ROLES.ADMINISTRATIVE],
    UPDATE: [ROLES.SUPER_USER],
    DELETE: [ROLES.SUPER_USER]
  }
};

// Middleware para verificar permisos específicos
const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        message: 'Debe iniciar sesión para acceder a este recurso'
      });
    }

    const allowedRoles = PERMISSIONS[module]?.[action];
    
    if (!allowedRoles || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: `No tiene permisos para ${action} en el módulo ${module}`
      });
    }

    next();
  };
};

// Función para generar hash de contraseñas
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Función para comparar contraseñas
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Función para generar token JWT
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  hashPassword,
  comparePassword,
  generateToken,
  ROLES,
  PERMISSIONS
}; 