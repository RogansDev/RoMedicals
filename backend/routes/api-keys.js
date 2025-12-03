const express = require('express');
const Joi = require('joi');
const mysql = require('mysql2/promise');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const router = express.Router();

// Configuración de base de datos principal
const getMainDbConfig = () => {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'romedicals_main',
    charset: 'utf8mb4'
  };
};

// Función para generar API key y secret
const generateApiCredentials = () => {
  // API Key: prefijo + UUID sin guiones
  const apiKey = `rm_${uuidv4().replace(/-/g, '')}`;
  
  // API Secret: 64 caracteres aleatorios
  const apiSecret = crypto.randomBytes(32).toString('hex');
  
  return { apiKey, apiSecret };
};

// Esquema de validación
const apiKeySchema = Joi.object({
  name: Joi.string().min(2).max(255).optional().allow('', null),
  description: Joi.string().max(500).optional().allow('', null),
  expiresAt: Joi.alternatives().try(
    Joi.date(),
    Joi.string().allow('', null),
    Joi.valid(null)
  ).optional().allow(null)
});

// GET /api/api-keys - Listar API keys de la empresa
router.get('/', authenticateToken, requirePermission('USERS', 'READ'), async (req, res) => {
  let connection = null;
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'Usuario no tiene companyId asignado' 
      });
    }

    connection = await mysql.createConnection(getMainDbConfig());

    const [apiKeys] = await connection.execute(
      `SELECT 
        id,
        company_id,
        api_key,
        name,
        description,
        is_active,
        last_used_at,
        expires_at,
        created_at,
        updated_at
      FROM api_keys
      WHERE company_id = ?
      ORDER BY created_at DESC`,
      [companyId]
    );

    // Ocultar el secret completo, solo mostrar los últimos 4 caracteres
    const formattedKeys = apiKeys.map(key => ({
      ...key,
      api_key: key.api_key.substring(0, 8) + '...' + key.api_key.substring(key.api_key.length - 4),
      api_secret: '••••••••' // No mostrar el secret
    }));

    res.json({
      apiKeys: formattedKeys
    });

  } catch (error) {
    console.error('Error listando API keys:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al listar las API keys'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/api-keys - Crear nueva API key
router.post('/', authenticateToken, requirePermission('USERS', 'CREATE'), async (req, res) => {
  let connection = null;
  try {
    console.log('📥 POST /api/api-keys - Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('👤 Usuario:', JSON.stringify(req.user, null, 2));
    
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      console.error('❌ Usuario no tiene companyId:', req.user);
      return res.status(400).json({ 
        error: 'Usuario no tiene companyId asignado',
        message: 'El usuario autenticado no está asociado a una empresa'
      });
    }

    // Validar datos de entrada
    const { error, value } = apiKeySchema.validate(req.body);
    if (error) {
      console.error('❌ Error de validación:', error.details);
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }
    
    console.log('✅ Datos validados:', JSON.stringify(value, null, 2));

    connection = await mysql.createConnection(getMainDbConfig());

    // Verificar que la empresa existe
    const [company] = await connection.execute(
      'SELECT id FROM companies WHERE id = ?',
      [companyId]
    );

    if (company.length === 0) {
      return res.status(404).json({
        error: 'Empresa no encontrada'
      });
    }

    // Generar credenciales
    const { apiKey, apiSecret } = generateApiCredentials();
    const keyId = uuidv4();

    // Procesar fecha de expiración
    let expiresAt = null;
    if (value.expiresAt) {
      if (typeof value.expiresAt === 'string') {
        expiresAt = new Date(value.expiresAt);
      } else {
        expiresAt = value.expiresAt;
      }
      // Validar que la fecha sea válida
      if (isNaN(expiresAt.getTime())) {
        expiresAt = null;
      }
    }

    // Insertar API key
    await connection.execute(
      `INSERT INTO api_keys (
        id, company_id, api_key, api_secret, name, description, 
        is_active, expires_at, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, true, ?, ?, NOW())`,
      [
        keyId,
        companyId,
        apiKey,
        apiSecret,
        value.name && value.name.trim() ? value.name.trim() : null,
        value.description && value.description.trim() ? value.description.trim() : null,
        expiresAt,
        req.user.id
      ]
    );

    // Devolver la API key y secret (solo se muestra una vez)
    res.status(201).json({
      message: 'API key creada exitosamente',
      apiKey: {
        id: keyId,
        api_key: apiKey,
        api_secret: apiSecret, // Solo se muestra al crear
        name: value.name || null,
        description: value.description || null,
        expires_at: value.expiresAt || null,
        created_at: new Date()
      },
      warning: 'Guarda estas credenciales de forma segura. El secret no se mostrará nuevamente.'
    });

  } catch (error) {
    console.error('Error creando API key:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la API key'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// PUT /api/api-keys/:id - Actualizar API key (solo nombre y descripción)
router.put('/:id', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'Usuario no tiene companyId asignado' 
      });
    }

    // Validar datos de entrada
    const { error, value } = apiKeySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    connection = await mysql.createConnection(getMainDbConfig());

    // Verificar que la API key existe y pertenece a la empresa
    const [apiKey] = await connection.execute(
      'SELECT id FROM api_keys WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (apiKey.length === 0) {
      return res.status(404).json({
        error: 'API key no encontrada'
      });
    }

    // Actualizar
    await connection.execute(
      `UPDATE api_keys 
       SET name = ?, description = ?, expires_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        value.name || null,
        value.description || null,
        value.expiresAt || null,
        id
      ]
    );

    res.json({
      message: 'API key actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando API key:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar la API key'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// POST /api/api-keys/:id/regenerate - Regenerar API secret
router.post('/:id/regenerate', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'Usuario no tiene companyId asignado' 
      });
    }

    connection = await mysql.createConnection(getMainDbConfig());

    // Verificar que la API key existe y pertenece a la empresa
    const [apiKey] = await connection.execute(
      'SELECT id FROM api_keys WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (apiKey.length === 0) {
      return res.status(404).json({
        error: 'API key no encontrada'
      });
    }

    // Generar nuevo secret
    const newSecret = crypto.randomBytes(32).toString('hex');

    // Actualizar
    await connection.execute(
      `UPDATE api_keys 
       SET api_secret = ?, updated_at = NOW()
       WHERE id = ?`,
      [newSecret, id]
    );

    res.json({
      message: 'API secret regenerado exitosamente',
      api_secret: newSecret,
      warning: 'Guarda este secret de forma segura. No se mostrará nuevamente.'
    });

  } catch (error) {
    console.error('Error regenerando API secret:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al regenerar el API secret'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// PATCH /api/api-keys/:id/toggle - Activar/desactivar API key
router.patch('/:id/toggle', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'Usuario no tiene companyId asignado' 
      });
    }

    connection = await mysql.createConnection(getMainDbConfig());

    // Verificar que la API key existe y pertenece a la empresa
    const [apiKey] = await connection.execute(
      'SELECT id, is_active FROM api_keys WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (apiKey.length === 0) {
      return res.status(404).json({
        error: 'API key no encontrada'
      });
    }

    // Cambiar estado
    const newStatus = !apiKey[0].is_active;

    await connection.execute(
      `UPDATE api_keys 
       SET is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStatus, id]
    );

    res.json({
      message: `API key ${newStatus ? 'activada' : 'desactivada'} exitosamente`,
      is_active: newStatus
    });

  } catch (error) {
    console.error('Error cambiando estado de API key:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al cambiar el estado de la API key'
    });
  } finally {
    if (connection) await connection.close();
  }
});

// DELETE /api/api-keys/:id - Eliminar API key
router.delete('/:id', authenticateToken, requirePermission('USERS', 'DELETE'), async (req, res) => {
  let connection = null;
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      return res.status(400).json({ 
        error: 'Usuario no tiene companyId asignado' 
      });
    }

    connection = await mysql.createConnection(getMainDbConfig());

    // Verificar que la API key existe y pertenece a la empresa
    const [apiKey] = await connection.execute(
      'SELECT id FROM api_keys WHERE id = ? AND company_id = ?',
      [id, companyId]
    );

    if (apiKey.length === 0) {
      return res.status(404).json({
        error: 'API key no encontrada'
      });
    }

    // Eliminar
    await connection.execute(
      'DELETE FROM api_keys WHERE id = ?',
      [id]
    );

    res.json({
      message: 'API key eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando API key:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la API key'
    });
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;

