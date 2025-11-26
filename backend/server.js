const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy para rate limiting detrás de proxy/load balancer
app.set('trust proxy', 1);

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002', 
    'http://148.230.90.103:3002'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});
app.use('/api/', limiter);

// Configuración de base de datos principal
const mainDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'romedicals_main',
  charset: 'utf8mb4'
};

// Pool de conexiones para la base de datos principal
const mainDbPool = mysql.createPool(mainDbConfig);

// Middleware para verificar autenticación
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ No se encontró token en el header Authorization');
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'romedicals_secret_key';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    console.log('✅ Token verificado correctamente para usuario:', decoded.email);
    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado', error: error.message });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token inválido', error: error.message });
    }
    return res.status(403).json({ message: 'Token inválido', error: error.message });
  }
};

// Middleware para verificar roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acceso denegado. Rol insuficiente.' });
    }
    next();
  };
};

// Función para crear conexión a base de datos de empresa específica
const getCompanyDbConnection = async (companyId) => {
  // Limpiar el companyId para que sea válido como nombre de base de datos
  const cleanCompanyId = companyId.replace(/-/g, '_');
  const companyDbConfig = {
    ...mainDbConfig,
    database: `romedicals_company_${cleanCompanyId}`
  };
  return mysql.createConnection(companyDbConfig);
};

// Función para generar contraseña temporal
const generateTempPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Función helper para agregar columna si no existe en una conexión
const addColumnIfNotExists = async (connection, tableName, columnName, columnDefinition) => {
  try {
    const [columns] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = ? 
       AND column_name = ?`,
      [tableName, columnName]
    );
    if (columns[0].count === 0) {
      await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      console.log(`✅ Columna ${columnName} agregada a ${tableName}`);
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`⚠️ No se pudo agregar la columna ${columnName}:`, e.message);
    return false;
  }
};

// Función helper para modificar columna si existe
const modifyColumnIfExists = async (connection, tableName, columnName, newDefinition) => {
  try {
    const [columns] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = ? 
       AND column_name = ?`,
      [tableName, columnName]
    );
    if (columns[0].count > 0) {
      await connection.execute(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${newDefinition}`);
      console.log(`✅ Columna ${columnName} modificada a ${newDefinition}`);
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`⚠️ No se pudo modificar la columna ${columnName}:`, e.message);
    return false;
  }
};

// Función para migrar columnas faltantes en la tabla users
const migrateUsersTable = async (connection) => {
  try {
    console.log('🔧 Verificando y migrando columnas de tabla users...');
    await addColumnIfNotExists(connection, 'users', 'idType', 'VARCHAR(10)');
    await addColumnIfNotExists(connection, 'users', 'idNumber', 'VARCHAR(50)');
    await addColumnIfNotExists(connection, 'users', 'providerCode', 'VARCHAR(50)');
    await addColumnIfNotExists(connection, 'users', 'title', 'VARCHAR(10)');
    await addColumnIfNotExists(connection, 'users', 'signature', 'LONGTEXT');
    await addColumnIfNotExists(connection, 'users', 'profilePhoto', 'LONGTEXT');
    await addColumnIfNotExists(connection, 'users', 'onboardingCompleted', 'BOOLEAN DEFAULT FALSE');
    
    // Actualizar columnas existentes que sean TEXT a LONGTEXT para soportar imágenes base64 grandes
    await modifyColumnIfExists(connection, 'users', 'signature', 'LONGTEXT');
    await modifyColumnIfExists(connection, 'users', 'profilePhoto', 'LONGTEXT');
    
    console.log('✅ Migración de tabla users completada');
  } catch (error) {
    console.error('❌ Error en migración de tabla users:', error);
    throw error;
  }
};

// Función para crear base de datos de empresa
const createCompanyDatabase = async (companyId, companyName) => {
  try {
    const connection = await mysql.createConnection(mainDbConfig);
    
    // Limpiar el companyId para que sea válido como nombre de base de datos
    const cleanCompanyId = companyId.replace(/-/g, '_');
    
    // Crear base de datos
    await connection.execute(`CREATE DATABASE IF NOT EXISTS romedicals_company_${cleanCompanyId} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    // Otorgar permisos a la nueva base de datos
    const { exec } = require('child_process');
    const grantPermissions = () => {
      return new Promise((resolve, reject) => {
        exec(`/var/www/romedicals.com/backend/scripts/grant_company_permissions.sh romedicals_company_${cleanCompanyId}`, (error, stdout, stderr) => {
          if (error) {
            console.warn('Advertencia: No se pudieron otorgar permisos automáticamente:', error.message);
            resolve(); // No fallar por esto, continuar
          } else {
            console.log('✅ Permisos otorgados automáticamente');
            resolve();
          }
        });
      });
    };
    
    await grantPermissions();
    
    // Cerrar conexión actual y crear nueva para la base de datos específica
    await connection.close();
    
    // Crear nueva conexión a la base de datos específica
    const companyConnection = await mysql.createConnection({
      ...mainDbConfig,
      database: `romedicals_company_${cleanCompanyId}`
    });
    
    // Crear tablas básicas
    await companyConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(100),
        lastName VARCHAR(100),
        role ENUM('super_user', 'medical_user', 'administrative', 'nursing') NOT NULL,
        specialtyId VARCHAR(36),
        phone VARCHAR(20),
        idType VARCHAR(10),
        idNumber VARCHAR(50),
        providerCode VARCHAR(50),
        title VARCHAR(10),
        signature LONGTEXT,
        profilePhoto LONGTEXT,
        onboardingCompleted BOOLEAN DEFAULT FALSE,
        isActive BOOLEAN DEFAULT TRUE,
        lastLogin TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Migrar columnas que pueden no existir (usar función global)
    await migrateUsersTable(companyConnection);
    
    await companyConnection.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(36) PRIMARY KEY,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        documentType VARCHAR(20),
        documentNumber VARCHAR(50),
        birthDate DATE,
        address TEXT,
        emergencyContact VARCHAR(255),
        emergencyPhone VARCHAR(20),
        medicalHistory TEXT,
        allergies TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await companyConnection.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(36) PRIMARY KEY,
        patientId VARCHAR(36) NOT NULL,
        doctorId VARCHAR(36) NOT NULL,
        appointmentDate DATETIME NOT NULL,
        status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
        notes TEXT,
        diagnosis TEXT,
        treatment TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await companyConnection.execute(`
      CREATE TABLE IF NOT EXISTS specialties (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await companyConnection.execute(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id VARCHAR(36) PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL,
        companyType VARCHAR(100),
        legalName VARCHAR(255),
        contactPhone VARCHAR(20),
        address TEXT,
        logoUrl VARCHAR(500),
        settings JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await companyConnection.execute(`
      CREATE TABLE IF NOT EXISTS consultation_templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        fields JSON NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Insertar especialidades por defecto
    const defaultSpecialties = [
      { id: uuidv4(), name: 'Medicina General', description: 'Atención médica general' },
      { id: uuidv4(), name: 'Pediatría', description: 'Especialidad en medicina infantil' },
      { id: uuidv4(), name: 'Ginecología', description: 'Especialidad en salud femenina' },
      { id: uuidv4(), name: 'Cardiología', description: 'Especialidad en enfermedades del corazón' },
      { id: uuidv4(), name: 'Dermatología', description: 'Especialidad en enfermedades de la piel' },
      { id: uuidv4(), name: 'Psiquiatría', description: 'Especialidad en salud mental' },
      { id: uuidv4(), name: 'Endocrinología', description: 'Especialidad en sistema endocrino' },
      { id: uuidv4(), name: 'Medicina Interna', description: 'Especialidad en medicina interna' }
    ];
    
    for (const specialty of defaultSpecialties) {
      await companyConnection.execute(
        `INSERT INTO specialties (id, name, description, isActive, createdAt) 
         VALUES (?, ?, ?, ?, NOW())`,
        [specialty.id, specialty.name, specialty.description, true]
      );
    }
    
    await companyConnection.close();
    
    return true;
  } catch (error) {
    console.error('Error creando base de datos de empresa:', error);
    throw error;
  }
};

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
    
    // Buscar usuario en base de datos principal primero
    let [users] = await mainDbPool.execute(
      'SELECT * FROM users WHERE email = ? AND isActive = TRUE',
      [email]
    );
    
    let user = null;
    let connection = null;
    
    // Si no se encuentra en la base principal, buscar en bases de empresas
    if (users.length === 0) {
      console.log(`Usuario ${email} no encontrado en base principal, buscando en empresas...`);
      // Obtener todas las empresas
      const [companies] = await mainDbPool.execute('SELECT id FROM companies');
      console.log(`Buscando en ${companies.length} empresas...`);
      
      for (const company of companies) {
        try {
          const cleanCompanyId = company.id.replace(/-/g, '_');
          const companyDbConfig = {
            ...mainDbConfig,
            database: `romedicals_company_${cleanCompanyId}`
          };
          
          connection = await mysql.createConnection(companyDbConfig);
          const [companyUsers] = await connection.execute(
            'SELECT *, ? as companyId FROM users WHERE email = ? AND isActive = TRUE',
            [company.id, email]
          );
          
          console.log(`Empresa ${company.id}: ${companyUsers.length} usuarios encontrados`);
          
          if (companyUsers.length > 0) {
            console.log(`Usuario encontrado en empresa ${company.id}:`, companyUsers[0].email);
            user = companyUsers[0];
            break;
          }
        } catch (error) {
          console.error(`Error buscando en empresa ${company.id}:`, error.message);
        } finally {
          if (connection) {
            await connection.close();
            connection = null;
          }
        }
      }
    } else {
      user = users[0];
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    console.log(`Verificando contraseña para usuario ${user.email}...`);
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(`Contraseña válida: ${isValidPassword}`);
    if (!isValidPassword) {
      console.log(`Contraseña inválida para usuario ${user.email}`);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        companyId: user.companyId 
      },
      process.env.JWT_SECRET || 'romedicals_secret_key',
      { expiresIn: '24h' }
    );
    
    // Actualizar último acceso y obtener especialidades
    let specialties = [];
    console.log('🔍 Usuario specialtyId:', user.specialtyId);
    
    if (user.companyId) {
      // Usuario de empresa - actualizar en su base de datos
      try {
        const cleanCompanyId = user.companyId.replace(/-/g, '_');
        const companyDbConfig = {
          ...mainDbConfig,
          database: `romedicals_company_${cleanCompanyId}`
        };
        
        const companyConnection = await mysql.createConnection(companyDbConfig);
        await companyConnection.execute(
          'UPDATE users SET lastLogin = NOW() WHERE id = ?',
          [user.id]
        );
        
        // Obtener especialidad del usuario (si tiene specialtyId asignada)
        if (user.specialtyId) {
          specialties = [user.specialtyId];
          console.log('✅ Especialidad asignada:', specialties);
        } else {
          console.log('⚠️ Usuario no tiene specialtyId asignada');
        }
        
        await companyConnection.close();
      } catch (error) {
        console.error('Error actualizando lastLogin en empresa:', error);
      }
    } else {
      // Usuario de base principal
      await mainDbPool.execute(
        'UPDATE users SET lastLogin = NOW() WHERE id = ?',
        [user.id]
      );
      
      // Obtener especialidad del usuario (si tiene specialtyId asignada)
      if (user.specialtyId) {
        specialties = [user.specialtyId];
        console.log('✅ Especialidad asignada:', specialties);
      } else {
        console.log('⚠️ Usuario no tiene specialtyId asignada');
      }
    }
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        onboardingCompleted: user.onboardingCompleted,
        needsOnboarding: !user.onboardingCompleted,
        idType: user.idType || 'CC',
        idNumber: user.idNumber || '',
        providerCode: user.providerCode || '',
        phone: user.phone || '',
        title: user.title || 'Dr',
        specialties: specialties || []
      }
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE ADMINISTRACIÓN ROMEDICALS ====================

// Crear superadmin de empresa cliente
app.post('/api/admin/superadmins', authenticateToken, requireRole(['romedicals_admin']), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    }
    
    // Verificar si el email ya existe
    const [existingUsers] = await mainDbPool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Este email ya está registrado' });
    }
    
    // Generar ID único para la empresa
    const companyId = uuidv4();
    const userId = uuidv4();
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Crear usuario superadmin
    await mainDbPool.execute(
      `INSERT INTO users (id, email, password, firstName, lastName, role, companyId, onboardingCompleted, isActive, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, email, hashedPassword, 'Superadmin', 'Empresa', 'super_user', companyId, false, true]
    );
    
    // Crear base de datos de la empresa
    await createCompanyDatabase(companyId, 'Nueva Empresa');
    
    res.status(201).json({
      message: 'Superadmin creado exitosamente',
      superadmin: {
        id: userId,
        email: email,
        companyId: companyId,
        onboardingCompleted: false
      }
    });
    
  } catch (error) {
    console.error('Error creando superadmin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Listar superadmins
app.get('/api/admin/superadmins', authenticateToken, requireRole(['romedicals_admin']), async (req, res) => {
  try {
    const [superAdmins] = await mainDbPool.execute(
      `SELECT u.id, u.email, u.firstName, u.lastName, u.lastLogin, u.onboardingCompleted, u.createdAt,
              c.companyName, c.companyType, c.contactPhone
       FROM users u
       LEFT JOIN companies c ON u.companyId = c.id
       WHERE u.role = 'super_user' AND u.isActive = TRUE
       ORDER BY u.createdAt DESC`
    );
    
    res.json({ superAdmins });
    
  } catch (error) {
    console.error('Error obteniendo superadmins:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Resetear contraseña de superadmin
app.post('/api/admin/superadmins/:id/reset-password', authenticateToken, requireRole(['romedicals_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const newPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await mainDbPool.execute(
      'UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ? AND role = "super_user"',
      [hashedPassword, id]
    );
    
    res.json({
      message: 'Contraseña reseteada exitosamente',
      newPassword: newPassword
    });
    
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar superadmin
app.delete('/api/admin/superadmins/:id', authenticateToken, requireRole(['romedicals_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener información de la empresa
    const [users] = await mainDbPool.execute(
      'SELECT companyId FROM users WHERE id = ? AND role = "super_user"',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Superadmin no encontrado' });
    }
    
    const companyId = users[0].companyId;
    
    // Eliminar usuario
    await mainDbPool.execute(
      'UPDATE users SET isActive = FALSE WHERE id = ?',
      [id]
    );
    
    // Eliminar base de datos de la empresa (opcional)
    // await dropCompanyDatabase(companyId);
    
    res.json({ message: 'Superadmin eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error eliminando superadmin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE ONBOARDING ====================

// Finalizar onboarding
app.post('/api/onboarding/finalize', authenticateToken, requireRole(['super_user']), async (req, res) => {
  try {
    const { adminData, orgData } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    
    if (!adminData || !orgData) {
      return res.status(400).json({ message: 'Datos de administrador y organización son requeridos' });
    }
    
    // Actualizar información del usuario
    await mainDbPool.execute(
      `UPDATE users SET 
       firstName = ?, lastName = ?, onboardingCompleted = TRUE, updatedAt = NOW()
       WHERE id = ?`,
      [adminData.nombres, adminData.apellidos, userId]
    );
    
    // Crear o actualizar registro de empresa
    await mainDbPool.execute(
      `INSERT INTO companies (id, companyName, companyType, legalName, contactPhone, adminId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
       companyName = VALUES(companyName),
       companyType = VALUES(companyType),
       legalName = VALUES(legalName),
       contactPhone = VALUES(contactPhone),
       adminId = VALUES(adminId),
       updatedAt = NOW()`,
      [companyId, orgData.nombreOrganizacion, orgData.tipoOrganizacion, orgData.razonSocial, orgData.contactoOrganizacion, userId]
    );
    
    // Actualizar configuración en base de datos de la empresa
    const companyConnection = await getCompanyDbConnection(companyId);
    await companyConnection.execute(
      `INSERT INTO company_settings (id, companyName, companyType, legalName, contactPhone, createdAt)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), orgData.nombreOrganizacion, orgData.tipoOrganizacion, orgData.razonSocial, orgData.contactoOrganizacion]
    );
    await companyConnection.close();
    
    res.json({
      message: 'Onboarding completado exitosamente',
      company: {
        id: companyId,
        name: orgData.nombreOrganizacion,
        type: orgData.tipoOrganizacion
      }
    });
    
  } catch (error) {
    console.error('Error finalizando onboarding:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE DASHBOARD ROMEDICALS ====================

// Obtener estadísticas generales
app.get('/api/admin/stats', authenticateToken, requireRole(['romedicals_admin']), async (req, res) => {
  try {
    const [totalCompanies] = await mainDbPool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "super_user" AND isActive = TRUE'
    );
    
    const [activeCompanies] = await mainDbPool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "super_user" AND onboardingCompleted = TRUE AND isActive = TRUE'
    );
    
    const [pendingOnboarding] = await mainDbPool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "super_user" AND onboardingCompleted = FALSE AND isActive = TRUE'
    );
    
    // Obtener total de usuarios de todas las empresas
    let totalUsers = 0;
    const [companies] = await mainDbPool.execute(
      'SELECT companyId FROM users WHERE role = "super_user" AND isActive = TRUE'
    );
    
    for (const company of companies) {
      try {
        const companyConnection = await getCompanyDbConnection(company.companyId);
        const [userCount] = await companyConnection.execute(
          'SELECT COUNT(*) as count FROM users WHERE isActive = TRUE'
        );
        totalUsers += userCount[0].count;
        await companyConnection.close();
      } catch (error) {
        console.error(`Error obteniendo usuarios de empresa ${company.companyId}:`, error);
      }
    }
    
    res.json({
      stats: {
        totalCompanies: totalCompanies[0].count,
        activeCompanies: activeCompanies[0].count,
        pendingOnboarding: pendingOnboarding[0].count,
        totalUsers: totalUsers
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener lista de empresas
app.get('/api/admin/companies', authenticateToken, requireRole(['romedicals_admin']), async (req, res) => {
  try {
    const [companies] = await mainDbPool.execute(
      `SELECT u.id, u.email, u.firstName, u.lastName, u.lastLogin, u.onboardingCompleted, u.createdAt,
              c.companyName, c.companyType, c.contactPhone
       FROM users u
       LEFT JOIN companies c ON u.companyId = c.id
       WHERE u.role = 'super_user' AND u.isActive = TRUE
       ORDER BY u.createdAt DESC`
    );
    
    // Agregar conteo de usuarios para cada empresa
    const companiesWithUserCount = await Promise.all(
      companies.map(async (company) => {
        try {
          const companyConnection = await getCompanyDbConnection(company.companyId);
          const [userCount] = await companyConnection.execute(
            'SELECT COUNT(*) as count FROM users WHERE isActive = TRUE'
          );
          await companyConnection.close();
          return {
            ...company,
            userCount: userCount[0].count
          };
        } catch (error) {
          return {
            ...company,
            userCount: 0
          };
        }
      })
    );
    
    res.json({ companies: companiesWithUserCount });
    
  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== CONFIGURACIÓN INICIAL ====================

// Crear administrador principal de ROMEDICALS
app.post('/api/admin/setup-romedicals-admin', authenticateToken, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
    
    // Verificar si ya existe un admin de ROMEDICALS
    const [existingAdmin] = await mainDbPool.execute(
      'SELECT id FROM users WHERE role = "romedicals_admin"'
    );
    
    if (existingAdmin.length > 0) {
      return res.status(400).json({ message: 'El administrador de ROMEDICALS ya existe' });
    }
    
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);
    
    await mainDbPool.execute(
      `INSERT INTO users (id, email, password, firstName, lastName, role, onboardingCompleted, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, email, hashedPassword, 'ROMEDICALS', 'Administrator', 'romedicals_admin', true, true]
    );
    
    res.json({
      message: 'Administrador de ROMEDICALS creado exitosamente',
      admin: {
        id: userId,
        email: email,
        role: 'romedicals_admin'
      }
    });
    
  } catch (error) {
    console.error('Error creando admin ROMEDICALS:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== HELPER FUNCTIONS ====================

// Función para obtener conexión a la base de datos de la empresa del usuario
const getCompanyConnection = async (req) => {
  const user = req.user;
  if (!user.companyId) {
    throw new Error('Usuario no tiene companyId asignado');
  }
  
  const cleanCompanyId = user.companyId.replace(/-/g, '_');
  const companyDbConfig = {
    ...mainDbConfig,
    database: `romedicals_company_${cleanCompanyId}`
  };
  
  return await mysql.createConnection(companyDbConfig);
};

// ==================== ENDPOINTS DE ONBOARDING ====================

// Completar onboarding de médico
app.post('/api/doctor-onboarding/complete', authenticateToken, requireRole(['medical_user']), async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    
    if (!companyId) {
      return res.status(400).json({ message: 'Usuario no tiene companyId asignado' });
    }
    
    // Conectar a la base de datos de la empresa
    const cleanCompanyId = companyId.replace(/-/g, '_');
    const companyDbConfig = {
      ...mainDbConfig,
      database: `romedicals_company_${cleanCompanyId}`
    };
    
    connection = await mysql.createConnection(companyDbConfig);
    
    // Marcar onboarding como completado
    await connection.execute(
      'UPDATE users SET onboardingCompleted = TRUE, updatedAt = NOW() WHERE id = ?',
      [userId]
    );
    
    res.json({ 
      message: 'Onboarding completado exitosamente',
      onboardingCompleted: true 
    });
    
  } catch (error) {
    console.error('Error completando onboarding de médico:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== ENDPOINTS DE EMPRESA ====================

// Obtener especialidades de la empresa
app.get('/api/specialties', authenticateToken, requireRole(['super_user', 'medical_user', 'administrative', 'nursing']), async (req, res) => {
  let connection;
  try {
    console.log('🔍 Obteniendo especialidades, req.user:', req.user);
    connection = await getCompanyConnection(req);
    console.log('✅ Conexión a base de datos creada');
    const [specialties] = await connection.execute(
      'SELECT id, name, description, isActive, createdAt FROM specialties WHERE isActive = true ORDER BY name'
    );
    console.log(`✅ Se encontraron ${specialties.length} especialidades`);
    res.json(specialties);
  } catch (error) {
    console.error('❌ Error obteniendo especialidades:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== PACIENTES (EMPRESA) ====================

// Listar pacientes con paginación básica
app.get('/api/patients', authenticateToken, requireRole(['super_user', 'medical_user', 'administrative', 'nursing']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);

    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    // Total de registros
    const [countRows] = await connection.execute('SELECT COUNT(*) as total FROM patients');
    const total = Number(countRows[0]?.total || 0);

    // Consulta principal (columnas adaptadas al esquema MySQL de empresa)
    const [rows] = await connection.execute(
      `SELECT 
         id,
         firstName,
         lastName,
         email,
         phone as mobilePhone,
         documentType,
         documentNumber,
         birthDate,
         address,
         emergencyContact,
         emergencyPhone,
         medicalHistory,
         allergies,
         isActive,
         createdAt,
         updatedAt
       FROM patients
       ORDER BY createdAt DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`
    );

    const patients = rows.map((p) => {
      const age = p.birthDate ? Math.max(0, new Date().getFullYear() - new Date(p.birthDate).getFullYear()) : 0;
      const allergies = p.allergies ? (typeof p.allergies === 'string' ? [p.allergies] : p.allergies) : [];
      const conditions = []; // Campo no disponible en este esquema
      const patientData = {
        id: p.id,
        first_name: p.firstName,
        last_name: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email,
        mobile_phone: p.mobilePhone,
        identification_type: p.documentType,
        identification_number: p.documentNumber,
        birth_date: p.birthDate,
        address: p.address,
        city: '',
        department: '',
        blood_type: '',
        patient_type: '',
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        age,
        allergies,
        conditions,
        last_visit: null,
        isMinor: age < 18,
        is_active: p.isActive !== undefined ? p.isActive : true
      };
      return patientData;
    });

    res.json({
      patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando pacientes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Obtener paciente por ID (empresa)
app.get('/api/patients/:id', authenticateToken, requireRole(['super_user', 'medical_user', 'administrative', 'nursing']), async (req, res) => {
  let connection;
  try {
    console.log('🔍 Obteniendo paciente por ID:', req.params.id);
    console.log('👤 Usuario autenticado:', {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      companyId: req.user.companyId
    });

    // Verificar que el usuario tenga companyId
    if (!req.user || !req.user.companyId) {
      console.error('❌ Usuario no tiene companyId asignado');
      return res.status(400).json({ 
        message: 'Usuario no tiene empresa asignada',
        error: 'El usuario autenticado no tiene una empresa asociada'
      });
    }

    connection = await getCompanyConnection(req);
    console.log('✅ Conexión a base de datos de empresa establecida');
    
    const { id } = req.params;
    console.log('🔎 Buscando paciente con ID:', id);

    const [rows] = await connection.execute(
      `SELECT 
         id,
         firstName,
         lastName,
         email,
         phone as mobilePhone,
         documentType,
         documentNumber,
         birthDate,
         address,
         medicalHistory,
         allergies,
         isActive,
         createdAt,
         updatedAt
       FROM patients
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    console.log('📊 Resultados de la consulta:', rows?.length || 0, 'paciente(s) encontrado(s)');

    if (!rows || rows.length === 0) {
      console.log('❌ Paciente no encontrado con ID:', id);
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    const p = rows[0];
    const age = p.birthDate ? Math.max(0, new Date().getFullYear() - new Date(p.birthDate).getFullYear()) : 0;
    const patient = {
      id: p.id,
      first_name: p.firstName,
      last_name: p.lastName,
      fullName: `${p.firstName} ${p.lastName}`.trim(),
      email: p.email,
      mobile_phone: p.mobilePhone,
      identification_type: p.documentType,
      identification_number: p.documentNumber,
      birth_date: p.birthDate,
      address: p.address,
      city: '',
      department: '',
      blood_type: '',
      patient_type: '',
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      age,
      allergies: p.allergies ? (typeof p.allergies === 'string' ? [p.allergies] : p.allergies) : [],
      conditions: [],
      last_visit: null,
      isMinor: age < 18,
      is_active: p.isActive !== undefined ? p.isActive : true
    };

    console.log('✅ Paciente obtenido exitosamente:', patient.fullName);
    res.json({ patient });
  } catch (error) {
    console.error('❌ Error obteniendo paciente:', error);
    console.error('   - Mensaje:', error.message);
    console.error('   - Stack:', error.stack);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
  }
});

// Crear nuevo paciente
app.post('/api/patients', authenticateToken, requireRole(['super_user', 'administrative']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    
    const {
      firstName,
      lastName,
      identificationType,
      identificationNumber,
      gender,
      birthDay,
      birthMonth,
      birthYear,
      bloodType,
      mobilePhoneCountry,
      mobilePhone,
      email,
      address
    } = req.body;

    // Validaciones básicas
    if (!firstName || !lastName || !identificationNumber) {
      return res.status(400).json({ 
        message: 'Nombre, apellido y número de identificación son requeridos' 
      });
    }

    // Verificar si ya existe un paciente con el mismo documento
    const [existing] = await connection.execute(
      'SELECT id FROM patients WHERE documentType = ? AND documentNumber = ?',
      [identificationType || 'CC', identificationNumber]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        message: 'Ya existe un paciente con este tipo y número de documento' 
      });
    }

    // Construir fecha de nacimiento
    const getMonthNumber = (monthName) => {
      const months = {
        'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
        'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
        'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
      };
      return months[monthName] || '01';
    };

    const birthDate = birthYear && birthMonth && birthDay
      ? `${birthYear}-${getMonthNumber(birthMonth)}-${String(birthDay).padStart(2, '0')}`
      : null;

    // Generar ID único para el paciente
    const patientId = require('uuid').v4();

    // Insertar nuevo paciente
    const [result] = await connection.execute(
      `INSERT INTO patients (
        id, firstName, lastName, documentType, documentNumber, 
        birthDate, phone, email, address, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        patientId,
        firstName,
        lastName,
        identificationType,
        identificationNumber,
        birthDate,
        mobilePhone ? `${mobilePhoneCountry || '+57'} ${mobilePhone}` : null,
        email || null,
        address || null,
        true // isActive por defecto
      ]
    );

    // Obtener el paciente creado
    const [patient] = await connection.execute(
      'SELECT * FROM patients WHERE id = ?',
      [patientId]
    );

    res.status(201).json({
      message: 'Paciente creado exitosamente',
      patient: patient[0]
    });
  } catch (error) {
    console.error('Error creando paciente:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Crear nueva especialidad
app.post('/api/specialties', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre de la especialidad es requerido' });
    }

    connection = await getCompanyConnection(req);
    
    // Verificar que no exista una especialidad con el mismo nombre
    const [existing] = await connection.execute(
      'SELECT id FROM specialties WHERE name = ?',
      [name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Ya existe una especialidad con este nombre' });
    }

    // Crear la especialidad
    const specialtyId = uuidv4();
    await connection.execute(`
      INSERT INTO specialties (id, name, description, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, true, NOW(), NOW())
    `, [specialtyId, name.trim(), description || null]);

    res.json({
      message: 'Especialidad creada exitosamente',
      specialty: {
        id: specialtyId,
        name: name.trim(),
        description: description || null,
        isActive: true
      }
    });

  } catch (error) {
    console.error('Error creando especialidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Actualizar especialidad
app.put('/api/specialties/:id', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre de la especialidad es requerido' });
    }

    connection = await getCompanyConnection(req);
    
    // Verificar que la especialidad existe
    const [existing] = await connection.execute(
      'SELECT id FROM specialties WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Especialidad no encontrada' });
    }

    // Verificar que no exista otra especialidad con el mismo nombre
    const [duplicate] = await connection.execute(
      'SELECT id FROM specialties WHERE name = ? AND id != ?',
      [name.trim(), id]
    );

    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'Ya existe una especialidad con este nombre' });
    }

    // Actualizar la especialidad
    await connection.execute(`
      UPDATE specialties 
      SET name = ?, description = ?, updatedAt = NOW()
      WHERE id = ?
    `, [name.trim(), description || null, id]);

    res.json({
      message: 'Especialidad actualizada exitosamente',
      specialty: {
        id,
        name: name.trim(),
        description: description || null
      }
    });

  } catch (error) {
    console.error('Error actualizando especialidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Eliminar especialidad (soft delete)
app.delete('/api/specialties/:id', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await getCompanyConnection(req);
    
    // Verificar que la especialidad existe
    const [existing] = await connection.execute(
      'SELECT id FROM specialties WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Especialidad no encontrada' });
    }

    // Verificar si hay usuarios usando esta especialidad
    const [usersWithSpecialty] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE specialtyId = ?',
      [id]
    );

    if (usersWithSpecialty[0].count > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar esta especialidad porque hay usuarios asignados a ella' 
      });
    }

    // Soft delete - marcar como inactiva
    await connection.execute(`
      UPDATE specialties 
      SET isActive = false, updatedAt = NOW()
      WHERE id = ?
    `, [id]);

    res.json({ message: 'Especialidad eliminada exitosamente' });

  } catch (error) {
    console.error('Error eliminando especialidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== RUTAS DE PLANTILLAS DE CONSULTA ====================

// Función helper para asegurar que la tabla consultation_templates existe
const ensureConsultationTemplatesTable = async (connection) => {
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS consultation_templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        fields JSON NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error creando tabla consultation_templates:', error);
    throw error;
  }
};

// GET /api/consultation-templates - Obtener todas las plantillas de consulta
app.get('/api/consultation-templates', authenticateToken, requireRole(['super_user', 'medical_user', 'administrative']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    await ensureConsultationTemplatesTable(connection);
    const [templates] = await connection.execute(
      'SELECT id, name, fields, isActive, createdAt, updatedAt FROM consultation_templates WHERE isActive = TRUE ORDER BY name'
    );
    
    const formattedTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      fields: typeof t.fields === 'string' ? JSON.parse(t.fields) : t.fields,
      isActive: t.isActive !== undefined ? t.isActive : true,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));
    
    res.json(formattedTemplates);
  } catch (error) {
    console.error('Error obteniendo plantillas de consulta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// GET /api/consultation-templates/:id - Obtener una plantilla por ID
app.get('/api/consultation-templates/:id', authenticateToken, requireRole(['super_user', 'medical_user', 'administrative']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    await ensureConsultationTemplatesTable(connection);
    const { id } = req.params;
    const [templates] = await connection.execute(
      'SELECT id, name, fields, isActive, createdAt, updatedAt FROM consultation_templates WHERE id = ? AND isActive = TRUE',
      [id]
    );
    
    if (templates.length === 0) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }
    
    const template = templates[0];
    res.json({
      id: template.id,
      name: template.name,
      fields: typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields,
      isActive: template.isActive !== undefined ? template.isActive : true,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    });
  } catch (error) {
    console.error('Error obteniendo plantilla de consulta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/consultation-templates - Crear nueva plantilla de consulta
app.post('/api/consultation-templates', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    await ensureConsultationTemplatesTable(connection);
    const { name, fields } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre de la plantilla es requerido' });
    }
    
    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'Los campos deben ser un array' });
    }
    
    const templateId = uuidv4();
    await connection.execute(
      'INSERT INTO consultation_templates (id, name, fields, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [templateId, name.trim(), JSON.stringify(fields), true]
    );
    
    const [newTemplate] = await connection.execute(
      'SELECT id, name, fields, isActive, createdAt, updatedAt FROM consultation_templates WHERE id = ?',
      [templateId]
    );
    
    const template = newTemplate[0];
    res.status(201).json({
      id: template.id,
      name: template.name,
      fields: typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields,
      isActive: template.isActive !== undefined ? template.isActive : true,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    });
  } catch (error) {
    console.error('Error creando plantilla de consulta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// PUT /api/consultation-templates/:id - Actualizar plantilla de consulta
app.put('/api/consultation-templates/:id', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    await ensureConsultationTemplatesTable(connection);
    const { id } = req.params;
    const { name, fields } = req.body;
    
    // Verificar que la plantilla existe
    const [existing] = await connection.execute(
      'SELECT id FROM consultation_templates WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre de la plantilla es requerido' });
    }
    
    if (!Array.isArray(fields)) {
      return res.status(400).json({ message: 'Los campos deben ser un array' });
    }
    
    await connection.execute(
      'UPDATE consultation_templates SET name = ?, fields = ?, updatedAt = NOW() WHERE id = ?',
      [name.trim(), JSON.stringify(fields), id]
    );
    
    const [updatedTemplate] = await connection.execute(
      'SELECT id, name, fields, isActive, createdAt, updatedAt FROM consultation_templates WHERE id = ?',
      [id]
    );
    
    const template = updatedTemplate[0];
    res.json({
      id: template.id,
      name: template.name,
      fields: typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields,
      isActive: template.isActive !== undefined ? template.isActive : true,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    });
  } catch (error) {
    console.error('Error actualizando plantilla de consulta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// DELETE /api/consultation-templates/:id - Eliminar plantilla de consulta (soft delete)
app.delete('/api/consultation-templates/:id', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    await ensureConsultationTemplatesTable(connection);
    const { id } = req.params;
    
    // Verificar que la plantilla existe
    const [existing] = await connection.execute(
      'SELECT id FROM consultation_templates WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }
    
    // Soft delete - marcar como inactiva
    await connection.execute(
      'UPDATE consultation_templates SET isActive = FALSE, updatedAt = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Plantilla eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando plantilla de consulta:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// ==================== IA: Procesamiento de transcripción con DeepSeek ====================

// POST /api/ai/consultation/process-transcript
// Body: { transcript: string, templateId: string, language?: string }
// Devuelve: { fields: { [fieldId]: string }, suggestions: { [fieldId]: string }, analysis: string, rips: { ... } }
app.post('/api/ai/consultation/process-transcript', authenticateToken, requireRole(['medical_user']), async (req, res) => {
  try {
    const deepseekKey = process.env.DEEPSEEK_API_KEY || req.headers['x-deepseek-key'];
    if (!deepseekKey) {
      return res.status(500).json({ message: 'Falta configurar DEEPSEEK_API_KEY en el servidor' });
    }

    const { transcript, templateId, language = 'es', templateDef, patientSummary, cie10Codes } = req.body || {};
    
    // Validaciones más estrictas
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return res.status(400).json({ message: 'transcript es requerido y debe ser un string no vacío' });
    }
    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({ message: 'templateId es requerido y debe ser un string' });
    }
    
    // Validar que templateDef tenga la estructura esperada si está presente
    if (templateDef && (!templateDef.fields || !Array.isArray(templateDef.fields))) {
      console.warn('⚠️ templateDef no tiene fields o no es un array, usando estructura vacía');
    }

    // Definir formato de salida estricto para que el modelo responda en JSON válido
    const systemPrompt = `Eres un asistente médico experto que procesa transcripciones de consultas médicas y las convierte en notas clínicas profesionales y estructuradas.

IMPORTANTE: 
- NO devuelvas "fields" autocompletados. Deja "fields" como objeto vacío {}.
- SOLO devuelve "suggestions" con texto mejorado, profesional y médico.
- Mejora la redacción de la transcripción literal: elimina repeticiones, corrige gramática, usa terminología médica apropiada, estructura la información de forma clara y concisa.

Devuelve SOLO un JSON válido en UTF-8 sin texto adicional, siguiendo este esquema:
{
  "fields": {},
  "suggestions": { "<fieldId>": "texto profesional mejorado" },
  "analysis": "texto analítico clínico conciso",
  "rips": {
    "diagnosticoPrincipal": "<codigo_cie10>",
    "tipoDiagnostico": "impresion_diagnostica|confirmado_nuevo|confirmado_repetido",
    "finalidadProcedimiento": "diagnostico|tratamiento|proteccion_especifica|deteccion_temprana_enfermedad_general|deteccion_temprana_enfermedad_laboral|valoracion_integral_promocion_mantenimiento|rehabilitacion|paliacion|planificacion_familiar_anticoncepcion|promocion_apoyo_lactancia_materna|atencion_basica_orientacion_familiar|atencion_cuidado_preconcepcional|atencion_cuidado_prenatal|interrupcion_voluntaria_embarazo|atencion_parto_puerperio|atencion_seguimiento_recien_nacido|preparacion_maternidad_paternidad|promocion_actividad_fisica|promocion_cesacion_tabaquismo|prevencion_consumo_sustancias_psicoactivas|promocion_alimentacion_saludable|promocion_derechos_sexuales_reproductivos|promocion_habilidades_para_la_vida|promocion_estrategias_afrontamiento|promocion_sana_convivencia_tejido_social|promocion_ambiente_seguro_cuidado|promocion_empoderamiento_derecho_salud|promocion_practicas_crianza_cuidado_salud|promocion_capacidad_agencia_cuidado_salud|desarrollo_habilidades_cognitivas|intervencion_colectiva|modificacion_estetica_corporal|otra",
    "finalidadConsulta": "valoracion_integral_promocion_mantenimiento|deteccion_temprana_enfermedad_general|deteccion_temprana_enfermedad_laboral|diagnostico|tratamiento|rehabilitacion|paliacion|planificacion_familiar_anticoncepcion|promocion_apoyo_lactancia_materna|atencion_basica_orientacion_familiar|atencion_cuidado_preconcepcional|atencion_cuidado_prenatal|interrupcion_voluntaria_embarazo|atencion_parto_puerperio|atencion_seguimiento_recien_nacido|modificacion_estetica_corporal|otra",
    "causaExterna": "accidente_trabajo|accidente_en_el_hogar|accidente_transito_origen_comun|accidente_transito_origen_laboral|accidente_entorno_educativo|otro_accidente|lesion_por_agresion|lesion_auto_infligida|sospecha_violencia_fisica|sospecha_violencia_psicologica|sospecha_violencia_sexual|sospecha_negligencia_abandono|ive_peligro_salud_vida|ive_malformacion_incompatible_vida|ive_violencia_sexual_incesto_inseminacion_no_consentida|evento_adverso_salud|enfermedad_general|enfermedad_laboral|promocion_mantenimiento_salud_intervenciones_individuales|intervencion_colectiva|atencion_poblacion_materno_perinatal|riesgo_ambiental|evento_catastrofico_origen_natural|otros_eventos_catastroficos|accidente_mina_antipersonal_map|accidente_artefacto_explosivo_improvisado_aei|accidente_municion_sin_explotar_muse|otra_victima_conflicto_armado_colombiano",
    "diagnosticoComplicacion": "<codigo_cie10> o vacío",
    "diagnosticoSecundario1": "<codigo_cie10> o vacío",
    "diagnosticoSecundario2": "<codigo_cie10> o vacío",
    "diagnosticoSecundario3": "<codigo_cie10> o vacío",
    "modalidadAtencion": "telemedicina|presencial",
    "ambitoAtencion": "consulta_general|internacion",
    "tipoServicio": "medicina_general|medicina_interna",
    "grupoServicios": "",
    "viaIngreso": ""
  }
}

IMPORTANTE: 
- Para diagnósticos (diagnosticoPrincipal, diagnosticoComplicacion, diagnosticoSecundario1-3): devuelve SOLO el código CIE-10 (ej: "A00.0", "I10", "E11.9"), NO la descripción.
- Para todos los demás campos: usa EXACTAMENTE los valores en formato snake_case listados arriba.
- Si no hay información suficiente para un campo, déjalo como string vacío "".
}`;

    // Preparar listado de códigos CIE-10 para el prompt
    let cie10Prompt = '';
    if (cie10Codes && Array.isArray(cie10Codes) && cie10Codes.length > 0) {
      console.log(`📋 CIE-10 recibidos: ${cie10Codes.length} códigos`);
      // Limitar a los primeros 2000 códigos para no exceder el límite del prompt
      const limitedCodes = cie10Codes.slice(0, 2000);
      
      // Crear un índice de códigos por categoría para facilitar la búsqueda
      const codesByCategory = {};
      limitedCodes.forEach(c => {
        const code = c.code || '';
        const firstChar = code.charAt(0).toUpperCase();
        if (!codesByCategory[firstChar]) codesByCategory[firstChar] = [];
        codesByCategory[firstChar].push(c);
      });
      
      cie10Prompt = `\n\n═══════════════════════════════════════════════════════════════════════════════
LISTADO DE CÓDIGOS CIE-10 DISPONIBLES (${limitedCodes.length} códigos)
═══════════════════════════════════════════════════════════════════════════════

IMPORTANTE: DEBES BUSCAR EN ESTE LISTADO el código CIE-10 MÁS APROPIADO para cada diagnóstico.

${limitedCodes.map(c => `${c.code}: ${c.description || c.name || ''}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
INSTRUCCIONES OBLIGATORIAS PARA SELECCIONAR CÓDIGOS CIE-10:
═══════════════════════════════════════════════════════════════════════════════

1. LEE COMPLETAMENTE la transcripción y identifica TODOS los síntomas, signos y condiciones médicas mencionadas.

2. PARA EL DIAGNÓSTICO PRINCIPAL (diagnosticoPrincipal) - ES OBLIGATORIO:
   - Identifica el MOTIVO PRINCIPAL de consulta o la condición MÁS IMPORTANTE mencionada
   - Busca en el listado anterior el código CIE-10 que MEJOR describa esa condición
   - Ejemplos de búsqueda:
     * Si menciona "alopecia areata" → busca "L63.9" (Alopecia areata, no especificada)
     * Si menciona "dermatitis seborreica" → busca "L21.9" (Dermatitis seborreica, no especificada)
     * Si menciona "dolor de cabeza" o "cefalea" → busca "R51" (Cefalea)
     * Si menciona "fiebre" → busca "R50.9" (Fiebre no especificada)
     * Si menciona "diabetes" → busca "E11.9" (Diabetes mellitus tipo 2)
     * Si menciona "hipertensión" → busca "I10" (Hipertensión esencial)
   - IMPORTANTE: Los códigos CIE-10 tienen formato con PUNTO: "L63.9" (NO "L639"), "L21.9" (NO "L219")
   - USA EXACTAMENTE el código tal como aparece en el listado, CON EL PUNTO incluido (ej: "L63.9", "L21.9", "R51", "I10", "E11.9")
   - NO dejes diagnosticoPrincipal vacío - SIEMPRE debe tener un código

3. PARA DIAGNÓSTICOS SECUNDARIOS (diagnosticoSecundario1, diagnosticoSecundario2, diagnosticoSecundario3):
   - Identifica condiciones ADICIONALES, comorbilidades o complicaciones mencionadas
   - Busca códigos CIE-10 apropiados para cada una
   - Solo incluye diagnósticos secundarios si realmente se mencionan en la transcripción
   - Si no hay condiciones secundarias, deja estos campos vacíos ""

4. PARA DIAGNÓSTICO DE COMPLICACIÓN (diagnosticoComplicacion):
   - Solo incluye si se menciona explícitamente una complicación
   - Si no hay complicaciones, deja vacío ""

5. MÉTODO DE BÚSQUEDA:
   - Lee la descripción de cada código en el listado
   - Busca palabras clave de la transcripción en las descripciones
   - Prioriza códigos más específicos sobre genéricos
   - Si encuentras múltiples códigos relevantes, elige el más específico

6. FORMATO: USA EXACTAMENTE el código tal como aparece en el listado (ej: "R51", "I10", "E11.9", "L21.9", "L63.9")
   - Los códigos CIE-10 tienen formato: Letra + 2 dígitos + punto + 1-2 dígitos (ej: L63.9, L21.9, R51)
   - NO agregues espacios, NO quites puntos, NO modifiques el formato
   - Copia el código EXACTAMENTE como aparece en el listado
   - Ejemplos correctos: "L63.9", "L21.9", "R51", "I10"
   - Ejemplos INCORRECTOS: "L639", "L219", "L63 9", "L 21.9"`;
    } else {
      console.warn('⚠️ No se recibieron códigos CIE-10');
    }

    // Incluir el templateId en el prompt para mapear por field.id cuando sea posible
    const userPrompt = `Idioma de trabajo: ${language}.
Plantilla activa con id: ${templateId}.
Definición de plantilla (JSON): ${templateDef ? JSON.stringify(templateDef).slice(0, 8000) : 'no provista'}
Resumen del paciente: ${patientSummary ? JSON.stringify(patientSummary) : 'no provisto'}${cie10Prompt}

Transcripción literal de la entrevista médico-paciente (puede contener repeticiones, errores gramaticales, lenguaje coloquial):
"""
${transcript}
"""

INSTRUCCIONES CRÍTICAS:
1. NO autocompletes "fields". Deja "fields": {}.
2. SOLO crea "suggestions" para campos que EXISTEN en la plantilla. Usa EXACTAMENTE los field.id que aparecen en la definición de plantilla.
3. SOLO crea "suggestions" con texto MEJORADO y PROFESIONAL:
   - Convierte el lenguaje coloquial a terminología médica apropiada
   - Elimina repeticiones y redundancias
   - Estructura la información de forma clara y concisa
   - Usa formato profesional de notas clínicas
   - Mantén la información médica relevante pero mejora la presentación

4. IMPORTANTE: Revisa la definición de plantilla y usa SOLO los field.id que aparecen allí. NO inventes field.id que no existan en la plantilla.
5. Si la transcripción menciona información que no corresponde a ningún campo de la plantilla, simplemente no la incluyas en "suggestions".
6. Usa la edad, antecedentes, alergias, condiciones y datos demográficos del paciente si están presentes para mejorar el análisis y el RIPS.

7. ⚠️ CRÍTICO PARA RIPS - DEBES LLENAR TODOS LOS CAMPOS OBLIGATORIOS:
   
   A. DIAGNÓSTICO PRINCIPAL (diagnosticoPrincipal) - ES OBLIGATORIO Y NO PUEDE ESTAR VACÍO:
      - Analiza la transcripción y identifica el MOTIVO PRINCIPAL de consulta
      - Busca en el listado de códigos CIE-10 el código que MEJOR describa esa condición
      - Ejemplos comunes:
        * Dolor de cabeza/cefalea → "R51"
        * Fiebre → "R50.9"
        * Dolor abdominal → "R10.9"
        * Tos → "R05"
        * Diabetes → "E11.9"
        * Hipertensión → "I10"
      - SIEMPRE debe tener un código - NO dejes vacío
   
   B. DIAGNÓSTICOS SECUNDARIOS (diagnosticoSecundario1, diagnosticoSecundario2, diagnosticoSecundario3):
      - Solo si se mencionan condiciones adicionales en la transcripción
      - Busca códigos apropiados para cada condición adicional
      - Si no hay condiciones secundarias, deja vacío ""
   
   C. DIAGNÓSTICO DE COMPLICACIÓN (diagnosticoComplicacion):
      - Solo si se menciona explícitamente una complicación
      - Si no hay, deja vacío ""
   
   D. USA EXACTAMENTE el código tal como aparece en el listado (ej: "R51", "I10", "E11.9")
   - Para tipoDiagnostico: usa "impresion_diagnostica" si es una primera consulta, "confirmado_nuevo" si se confirma un diagnóstico nuevo, "confirmado_repetido" si es un control de diagnóstico conocido
   - Para finalidadConsulta y finalidadProcedimiento: identifica el propósito principal de la consulta (tratamiento, diagnóstico, control, etc.) - NO dejes vacío
   - Para causaExterna: identifica si es enfermedad general, accidente, violencia, etc. - NO dejes vacío
   - Para modalidadAtencion: "presencial" por defecto, "telemedicina" si se menciona consulta virtual - NO dejes vacío
   - Para ambitoAtencion: "consulta_general" por defecto, "internacion" si se menciona hospitalización - NO dejes vacío
   - Para tipoServicio: "medicina_general" por defecto - NO dejes vacío
   - Llena TODOS los campos RIPS que puedas inferir de la transcripción, especialmente diagnosticoPrincipal que es OBLIGATORIO

EJEMPLO de mejora:
- Transcripción: "el paciente dice que le duele la cabeza desde hace como 3 días y que toma paracetamol pero no le hace nada"
- Sugerencia mejorada: "Paciente refiere cefalea de 3 días de evolución. Ha utilizado paracetamol sin mejoría sintomática."
- RIPS sugerido: {
    "diagnosticoPrincipal": "R51", // Cefalea
    "tipoDiagnostico": "impresion_diagnostica",
    "finalidadConsulta": "diagnostico",
    "finalidadProcedimiento": "diagnostico",
    "causaExterna": "enfermedad_general",
    "modalidadAtencion": "presencial",
    "ambitoAtencion": "consulta_general",
    "tipoServicio": "medicina_general"
  }
`;

    // Llamada a DeepSeek Chat Completions (axios)
    const axios = require('axios');
    let data;
    try {
      console.log('📤 Enviando solicitud a DeepSeek...');
      console.log('   - Transcript length:', transcript?.length || 0);
      console.log('   - Template ID:', templateId);
      console.log('   - Template fields:', templateDef?.fields?.length || 0);
      console.log('   - CIE-10 codes:', cie10Codes?.length || 0);
      console.log('   - Transcript preview:', transcript?.substring(0, 200));
      
      const resp = await axios.post('https://api.deepseek.com/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }, {
        headers: {
          'Authorization': `Bearer ${deepseekKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // Aumentar timeout a 60 segundos
      });
      data = resp.data;
      console.log('✅ Respuesta recibida de DeepSeek');
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data || err.message;
      console.error('❌ DeepSeek error:', status, detail);
      console.error('   - Error completo:', err);
      return res.status(502).json({ 
        message: 'Error llamando a DeepSeek API',
        detail: detail,
        status: status
      });
    }
    const content = data?.choices?.[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log('✅ JSON parseado correctamente');
      console.log('📋 RIPS recibido de la IA:', JSON.stringify(parsed.rips || {}, null, 2));
    } catch (e) {
      console.error('❌ Error parseando JSON de DeepSeek:', e);
      console.error('   - Contenido recibido:', content?.substring(0, 500));
      // Si por alguna razón no devuelve JSON limpio, intenta extraer
      parsed = { fields: {}, suggestions: {}, analysis: '', rips: {} };
    }

    // Filtrar sugerencias: SOLO devolver las que corresponden a campos reales de la plantilla
    const templateFields = (templateDef && Array.isArray(templateDef.fields)) ? templateDef.fields : [];
    const validFieldIds = templateFields.map(f => f?.id).filter(Boolean);
    const filteredSuggestions = {};
    
    if (parsed.suggestions && typeof parsed.suggestions === 'object') {
      Object.keys(parsed.suggestions).forEach(fieldId => {
        // Solo incluir si el fieldId existe en la plantilla
        if (validFieldIds.includes(fieldId)) {
          filteredSuggestions[fieldId] = parsed.suggestions[fieldId];
        } else {
          console.log(`⚠️ Sugerencia ignorada: campo "${fieldId}" no existe en la plantilla`);
        }
      });
    }

    // Sanitizar estructura mínima - NO devolver fields autocompletados
    const result = {
      fields: {}, // Siempre vacío - no autocompletar campos
      suggestions: filteredSuggestions, // Solo campos que existen en la plantilla
      analysis: parsed.analysis || '',
      rips: parsed.rips || {}
    };

    res.json(result);
  } catch (error) {
    console.error('❌ Error procesando transcripción:', error);
    console.error('   - Mensaje:', error.message);
    console.error('   - Stack:', error.stack);
    console.error('   - Response:', error.response?.data);
    console.error('   - Status:', error.response?.status);
    
    // Si es un error de DeepSeek, devolver información más específica
    if (error.response?.status) {
      return res.status(502).json({ 
        message: 'Error llamando a DeepSeek API',
        detail: error.response?.data || error.message,
        status: error.response?.status
      });
    }
    
    // Error general
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Obtener lista de doctores de la empresa
app.get('/api/users/doctors/list', authenticateToken, requireRole(['super_user', 'medical_user', 'administrative', 'nursing']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    const [doctors] = await connection.execute(`
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.isActive,
        u.lastLogin,
        u.createdAt,
        s.name as specialty
      FROM users u
      LEFT JOIN specialties s ON u.specialtyId = s.id
      WHERE u.role = 'medical_user' AND u.isActive = true
      ORDER BY u.firstName, u.lastName
    `);
    
    res.json(doctors);
  } catch (error) {
    console.error('Error obteniendo doctores:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Obtener lista de usuarios de la empresa (todos los roles)
app.get('/api/users/list', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    connection = await getCompanyConnection(req);
    const [users] = await connection.execute(`
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        u.isActive,
        u.lastLogin,
        u.createdAt,
        s.name as specialty
      FROM users u
      LEFT JOIN specialties s ON u.specialtyId = s.id
      WHERE u.role != 'super_user'
      ORDER BY u.role, u.firstName, u.lastName
    `);
    
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Obtener perfil del usuario actual
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;
    
    console.log('🔍 Obteniendo perfil del usuario:', { userId, companyId });
    
    if (companyId) {
      // Usuario de empresa - buscar en base de datos de la empresa
      connection = await getCompanyConnection(req);
      const result = await connection.query(`
        SELECT 
          u.id,
          u.firstName,
          u.lastName,
          u.email,
          u.phone,
          u.idType,
          u.idNumber,
          u.providerCode,
          u.title,
          u.role,
          u.isActive,
          u.createdAt,
          u.updatedAt
        FROM users u
        WHERE u.id = $1
      `, [userId]);
      const users = result.rows;
      
      if (users.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      const user = users[0];
      console.log('✅ Usuario encontrado en empresa:', user);
      
        res.json({
        success: true,
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          idType: user.idType,
          idNumber: user.idNumber,
          providerCode: user.providerCode,
          title: user.title,
          specialties: [], // Columna no existe, usar array vacío
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } else {
      // Usuario principal - buscar en base de datos principal
      const result = await mainDbPool.query(`
        SELECT 
          id,
          firstName,
          lastName,
          email,
          phone,
          idType,
          idNumber,
          providerCode,
          title,
          role,
          isActive,
          createdAt,
          updatedAt
        FROM users
        WHERE id = $1
      `, [userId]);
      const users = result.rows;
      
      if (users.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      
      const user = users[0];
      console.log('✅ Usuario encontrado en BD principal:', user);
      
        res.json({
        success: true,
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          idType: user.idType,
          idNumber: user.idNumber,
          providerCode: user.providerCode,
          title: user.title,
          specialties: [], // Columna no existe, usar array vacío
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    }
  } catch (error) {
    console.error('Error obteniendo perfil del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.close();
  }
});

// Crear nuevo doctor
app.post('/api/users/doctors', authenticateToken, requireRole(['super_user']), async (req, res) => {
  let connection;
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      idType,
      idNumber,
      providerCode,
      title,
      specialties,
      password,
      signature,
      profilePhoto
    } = req.body;

    console.log('📝 Datos recibidos para crear doctor:', {
      firstName,
      lastName,
      email,
      phone,
      idType,
      idNumber,
      providerCode,
      title,
      specialties: specialties?.length || 0,
      hasPassword: !!password,
      hasSignature: !!signature,
      hasProfilePhoto: !!profilePhoto
    });

    // Validaciones básicas
    if (!firstName || !lastName || !email || !phone || !password) {
      console.log('❌ Faltan campos requeridos');
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Verificar que el usuario tenga companyId
    if (!req.user || !req.user.companyId) {
      console.error('❌ Usuario no tiene companyId:', req.user);
      return res.status(400).json({ message: 'Usuario no tiene empresa asignada' });
    }

    console.log('🔗 Obteniendo conexión a base de datos de empresa:', req.user.companyId);

    // Obtener conexión y migrar tabla si es necesario
    connection = await getCompanyConnection(req);
    
    // Migrar columnas faltantes antes de continuar
    await migrateUsersTable(connection);
    
    // Verificar que el email no exista
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      console.log('❌ Email ya existe:', email);
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    console.log('🔐 Hasheando contraseña...');
    // Usar contraseña proporcionada por el frontend
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear el usuario
    const userId = uuidv4();
    const specialtyId = specialties && specialties.length > 0 ? specialties[0] : null;
    
    console.log('💾 Insertando usuario en base de datos...');
    console.log('   - userId:', userId);
    console.log('   - email:', email);
    console.log('   - specialtyId:', specialtyId);
    
    await connection.execute(`
      INSERT INTO users (
        id, email, password, firstName, lastName, role, 
        phone, idType, idNumber, providerCode, title, 
        specialtyId, signature, profilePhoto, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 'medical_user', ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())
    `, [
      userId, email, hashedPassword, firstName, lastName,
      phone || null, idType || null, idNumber || null, providerCode || null, title || 'Dr',
      specialtyId,
      signature || null,
      profilePhoto || null
    ]);

    console.log('✅ Doctor creado exitosamente:', userId);

    res.json({
      message: 'Doctor creado exitosamente',
      doctor: {
        id: userId,
        firstName,
        lastName,
        email,
        phone,
        idType,
        idNumber,
        providerCode,
        title,
        specialties: specialties || []
      }
    });

  } catch (error) {
    console.error('❌ Error creando doctor:', error);
    console.error('   - Mensaje:', error.message);
    console.error('   - Stack:', error.stack);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
  }
});

// Actualizar contraseña, firma y foto de perfil durante el onboarding
app.patch('/api/users/doctors/:id/onboarding', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { password, signature, profilePhoto } = req.body;

    console.log('🔄 Actualizando onboarding del doctor:', {
      id,
      hasPassword: !!password,
      hasSignature: !!signature,
      hasProfilePhoto: !!profilePhoto
    });

    // Conectar a la base de datos de la empresa
    connection = await getCompanyConnection(req);
    
    // Migrar columnas faltantes antes de actualizar
    await migrateUsersTable(connection);
    
    // Verificar que el usuario existe
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );
    
    if (existingUser.length === 0) {
      console.log('❌ Usuario no encontrado:', id);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Actualizar la contraseña (si se proporciona)
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await connection.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, id]
      );
      console.log('✅ Contraseña actualizada');
    }

    // Actualizar firma y foto de perfil
    await connection.execute(
      'UPDATE users SET signature = ?, profilePhoto = ?, onboardingCompleted = true WHERE id = ?',
      [signature || null, profilePhoto || null, id]
    );
    
    console.log('✅ Firma y foto de perfil actualizadas, onboarding completado');

    res.json({
      message: 'Onboarding completado exitosamente',
      doctor: {
        id,
        onboardingCompleted: true
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando onboarding:', error);
    console.error('   - Mensaje:', error.message);
    console.error('   - Stack:', error.stack);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
  }
});

// ==================== INICIALIZACIÓN DE BASE DE DATOS ====================

const initializeDatabase = async () => {
  try {
    // Crear tablas principales
    await mainDbPool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(100),
        lastName VARCHAR(100),
        role ENUM('romedicals_admin', 'super_user', 'medical_user', 'administrative', 'nursing') NOT NULL,
        companyId VARCHAR(36),
        onboardingCompleted BOOLEAN DEFAULT FALSE,
        lastLogin TIMESTAMP NULL,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await mainDbPool.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(36) PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL,
        companyType VARCHAR(100),
        legalName VARCHAR(255),
        contactPhone VARCHAR(20),
        adminId VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (adminId) REFERENCES users(id)
      )
    `);
    
    // Crear administrador principal por defecto
    const [existingAdmin] = await mainDbPool.execute(
      'SELECT id FROM users WHERE role = "romedicals_admin"'
    );
    
    if (existingAdmin.length === 0) {
      const adminId = uuidv4();
      const hashedPassword = await bcrypt.hash('Romedicals2024!', 12);
      
      await mainDbPool.execute(
        `INSERT INTO users (id, email, password, firstName, lastName, role, onboardingCompleted, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [adminId, 'romedicals@admin.com', hashedPassword, 'ROMEDICALS', 'Administrator', 'romedicals_admin', true, true]
      );
      
      console.log('✅ Administrador principal ROMEDICALS creado:');
      console.log('   Email: romedicals@admin.com');
      console.log('   Password: Romedicals2024!');
    }
    
    console.log('✅ Base de datos inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
};

// ==================== REGISTRO DE RUTAS ====================

// Registrar rutas de especialistas (MySQL)
const specialistsRouter = require('./routes/specialists');
const videosdkRouter = require('./routes/videosdk');
app.use('/api/specialists', specialistsRouter);

// Registrar rutas de citas (appointments)
const appointmentsRouter = require('./routes/appointments');
app.use('/api/appointments', appointmentsRouter);

// Registrar rutas de VideoSDK
app.use('/api/videosdk', videosdkRouter);
console.log('✅ Ruta /api/videosdk registrada');

// ==================== INICIO DEL SERVIDOR ====================

app.listen(PORT, async () => {
  console.log(`🚀 Servidor ROMEDICALS+ ejecutándose en puerto ${PORT}`);
  await initializeDatabase();
});

module.exports = app; 