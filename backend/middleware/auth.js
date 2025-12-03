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
    
    // Intentar verificar que el usuario existe y está activo en PostgreSQL
    // Si no existe en PostgreSQL, usar la información del token (puede estar en MySQL)
    try {
      const userResult = await query(
        'SELECT id, email, role, is_active, last_login FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length > 0) {
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
          role: user.role,
          companyId: decoded.companyId // Incluir companyId del token
        };
      } else {
        // Usuario no encontrado en PostgreSQL, usar información del token
        // Esto puede pasar si el usuario está en MySQL (base de datos de empresas)
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          companyId: decoded.companyId // Incluir companyId del token
        };
      }
    } catch (dbError) {
      // Si hay error de base de datos, usar información del token
      console.warn('No se pudo verificar usuario en PostgreSQL, usando información del token:', dbError.message);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        companyId: decoded.companyId // Incluir companyId del token
      };
    }

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

// Middleware para autenticación con API Key
const authenticateApiKey = async (req, res, next) => {
  const mysql = require('mysql2/promise');
  
  // Obtener API key y secret de los headers
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];

  if (!apiKey || !apiSecret) {
    return res.status(401).json({
      error: 'API credentials requeridas',
      message: 'Debe proporcionar X-API-Key y X-API-Secret en los headers'
    });
  }

  try {
    const mainDbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'romedicals_main',
      charset: 'utf8mb4'
    };

    const connection = await mysql.createConnection(mainDbConfig);

    // Buscar API key en la base de datos
    const [apiKeys] = await connection.execute(
      `SELECT 
        ak.id,
        ak.company_id,
        ak.api_key,
        ak.api_secret,
        ak.is_active,
        ak.expires_at,
        ak.last_used_at,
        c.companyName
      FROM api_keys ak
      JOIN companies c ON ak.company_id = c.id
      WHERE ak.api_key = ? AND ak.is_active = true`,
      [apiKey]
    );

    await connection.close();

    if (apiKeys.length === 0) {
      return res.status(401).json({
        error: 'API key inválida',
        message: 'La API key proporcionada no existe o está desactivada'
      });
    }

    const apiKeyData = apiKeys[0];

    // Verificar que el secret coincida
    if (apiKeyData.api_secret !== apiSecret) {
      return res.status(401).json({
        error: 'API secret inválido',
        message: 'El API secret proporcionado no es correcto'
      });
    }

    // Verificar expiración
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'API key expirada',
        message: 'La API key ha expirado'
      });
    }

    // Actualizar último uso
    try {
      const updateConnection = await mysql.createConnection(mainDbConfig);
      await updateConnection.execute(
        'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
        [apiKeyData.id]
      );
      await updateConnection.close();
    } catch (updateError) {
      console.warn('Error actualizando last_used_at:', updateError.message);
    }

    // Agregar información al request
    req.user = {
      id: null, // No hay usuario específico con API key
      email: null,
      role: 'api_user', // Rol especial para API keys
      companyId: apiKeyData.company_id,
      apiKeyId: apiKeyData.id,
      apiKeyName: apiKeyData.name || null
    };

    next();
  } catch (error) {
    console.error('Error en autenticación con API key:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al verificar las credenciales de API'
    });
  }
};

// Middleware que acepta tanto JWT como API Key
const authenticateTokenOrApiKey = async (req, res, next) => {
  // Verificar si hay API key en los headers
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];

  if (apiKey && apiSecret) {
    // Usar autenticación con API key
    return authenticateApiKey(req, res, next);
  } else {
    // Usar autenticación con JWT
    return authenticateToken(req, res, next);
  }
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  authenticateTokenOrApiKey,
  requireRole,
  requirePermission,
  hashPassword,
  comparePassword,
  generateToken,
  ROLES,
  PERMISSIONS
}; 