const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const specialtySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  description: Joi.string().max(500).optional().allow(''),
  code: Joi.string().max(20).optional().allow(''),
  isActive: Joi.boolean().default(true)
});

// Mapeo de tipos de plantilla a tablas
const TEMPLATE_TABLES = {
  prescriptions: 'prescriptions_template',
  evolutions: 'evolutions_template',
  medicalOrders: 'medical_orders_template',
  medical_orders: 'medical_orders_template',
  customForms: 'custom_forms_template',
  custom_forms: 'custom_forms_template'
};

const templateTypeSchema = Joi.string().valid('prescriptions', 'evolutions', 'medicalOrders', 'medical_orders', 'customForms', 'custom_forms').required();

const templateCreateSchema = Joi.object({
  type: templateTypeSchema,
  name: Joi.string().min(2).max(150).required(),
  content: Joi.string().allow('').when('type', { is: Joi.valid('customForms', 'custom_forms'), then: Joi.forbidden() }),
  fields: Joi.array().items(Joi.object()).default([]).when('type', { is: Joi.valid('customForms', 'custom_forms'), then: Joi.required(), otherwise: Joi.forbidden() }),
  isDefault: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true)
});

const templateUpdateSchema = Joi.object({
  type: templateTypeSchema,
  name: Joi.string().min(2).max(150).optional(),
  content: Joi.string().allow('').when('type', { is: Joi.valid('customForms', 'custom_forms'), then: Joi.forbidden() }),
  fields: Joi.array().items(Joi.object()).when('type', { is: Joi.valid('customForms', 'custom_forms'), then: Joi.optional(), otherwise: Joi.forbidden() }),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

// GET /api/specialties - Listar especialidades
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { isActive = '' } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (isActive !== '') {
      whereClause = 'WHERE is_active = $1';
      queryParams.push(isActive === 'true');
    }

    const specialtiesResult = await query(
      `SELECT 
        s.id,
        s.name,
        s.description,
        s.code,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(u.id) as doctors_count
      FROM specialties s
      LEFT JOIN users u ON s.id = u.specialty_id AND u.role = 'medical_user'
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.name ASC`,
      queryParams
    );

    res.json({
      specialties: specialtiesResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo especialidades:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las especialidades'
    });
  }
});

// GET /api/specialties/:id - Obtener especialidad específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const specialtyResult = await query(
      `SELECT 
        s.*,
        COUNT(u.id) as doctors_count
      FROM specialties s
      LEFT JOIN users u ON s.id = u.specialty_id AND u.role = 'medical_user'
      WHERE s.id = $1
      GROUP BY s.id`,
      [id]
    );

    if (specialtyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Especialidad no encontrada',
        message: 'La especialidad con el ID especificado no existe'
      });
    }

    // Obtener doctores de esta especialidad
    const doctorsResult = await query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_active,
        u.created_at
      FROM users u
      WHERE u.specialty_id = $1 AND u.role = 'medical_user'
      ORDER BY u.first_name, u.last_name`,
      [id]
    );

    const specialty = specialtyResult.rows[0];
    specialty.doctors = doctorsResult.rows.map(doctor => ({
      ...doctor,
      fullName: `${doctor.first_name} ${doctor.last_name}`
    }));

    res.json({ specialty });

  } catch (error) {
    console.error('Error obteniendo especialidad:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la especialidad'
    });
  }
});

// GET /api/specialties/:id/templates/:type - Listar plantillas por especialidad y tipo
router.get('/:id/templates/:type', authenticateToken, async (req, res) => {
  try {
    const { id, type } = req.params;
    const table = TEMPLATE_TABLES[type];
    if (!table) {
      return res.status(400).json({ error: 'Tipo de plantilla inválido' });
    }

    // Verificar especialidad
    const spec = await query('SELECT id FROM specialties WHERE id = $1', [id]);
    if (spec.rows.length === 0) {
      return res.status(404).json({ error: 'Especialidad no encontrada' });
    }

    const selectFields = table === 'custom_forms_template' ? 'id, name, fields as content, is_default, is_active, created_by, created_at, updated_at' : 'id, name, content, is_default, is_active, created_by, created_at, updated_at';
    const result = await query(`SELECT ${selectFields} FROM ${table} WHERE specialty_id = $1 ORDER BY is_default DESC, name ASC`, [id]);

    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Error listando plantillas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/specialties/:id/templates - Crear plantilla
router.post('/:id/templates', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = templateCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.details.map(d => d.message) });
    }

    const { type, name, content, fields, isDefault, isActive } = value;
    const table = TEMPLATE_TABLES[type];

    // Verificar especialidad
    const spec = await query('SELECT id FROM specialties WHERE id = $1', [id]);
    if (spec.rows.length === 0) {
      return res.status(404).json({ error: 'Especialidad no encontrada' });
    }

    // Si es default, desmarcar otras
    if (isDefault) {
      await query(`UPDATE ${table} SET is_default = false WHERE specialty_id = $1`, [id]);
    }

    const insertFields = table === 'custom_forms_template' ? ['specialty_id','name','fields','is_default','is_active','created_by'] : ['specialty_id','name','content','is_default','is_active','created_by'];
    const insertValues = table === 'custom_forms_template' ? [id, name, JSON.stringify(fields || []), isDefault || false, isActive, req.user.id] : [id, name, content || '', isDefault || false, isActive, req.user.id];
    const returning = table === 'custom_forms_template' ? 'id, name, fields as content, is_default, is_active, created_by, created_at, updated_at' : 'id, name, content, is_default, is_active, created_by, created_at, updated_at';

    const placeholders = insertFields.map((_, idx) => `$${idx + 1}`).join(', ');
    const result = await query(
      `INSERT INTO ${table} (${insertFields.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`,
      insertValues
    );

    const created = result.rows[0];
    // Si se marcó como default, forzar exclusividad a nivel de datos ya está, pero devolvemos estado actualizado
    res.status(201).json({ template: created });
  } catch (error) {
    console.error('Error creando plantilla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/specialties/:id/templates/:type/:templateId - Actualizar plantilla
router.put('/:id/templates/:type/:templateId', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id, type, templateId } = req.params;
    const { error, value } = templateUpdateSchema.validate({ ...req.body, type });
    if (error) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.details.map(d => d.message) });
    }
    const table = TEMPLATE_TABLES[type];
    if (!table) return res.status(400).json({ error: 'Tipo de plantilla inválido' });

    // Verificar existencia
    const exists = await query(`SELECT id FROM ${table} WHERE id = $1 AND specialty_id = $2`, [templateId, id]);
    if (exists.rows.length === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });

    const fields = [];
    const params = [];
    let idx = 1;
    if (value.name !== undefined) { fields.push(`name = $${idx++}`); params.push(value.name); }
    if (table === 'custom_forms_template') {
      if (value.fields !== undefined) { fields.push(`fields = $${idx++}`); params.push(JSON.stringify(value.fields)); }
    } else {
      if (value.content !== undefined) { fields.push(`content = $${idx++}`); params.push(value.content); }
    }
    if (value.isActive !== undefined) { fields.push(`is_active = $${idx++}`); params.push(value.isActive); }

    // isDefault: si se marca, desmarcar otras
    if (value.isDefault !== undefined) {
      if (value.isDefault) {
        await query(`UPDATE ${table} SET is_default = false WHERE specialty_id = $1`, [id]);
      }
      fields.push(`is_default = $${idx++}`);
      params.push(value.isDefault);
    }

    fields.push(`updated_at = NOW()`);
    params.push(templateId, id);

    const returning = table === 'custom_forms_template' ? 'id, name, fields as content, is_default, is_active, created_by, created_at, updated_at' : 'id, name, content, is_default, is_active, created_by, created_at, updated_at';
    const result = await query(
      `UPDATE ${table} SET ${fields.join(', ')} WHERE id = $${idx++} AND specialty_id = $${idx} RETURNING ${returning}`,
      params
    );

    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando plantilla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/specialties/:id/templates/:type/:templateId - Eliminar plantilla
router.delete('/:id/templates/:type/:templateId', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id, type, templateId } = req.params;
    const table = TEMPLATE_TABLES[type];
    if (!table) return res.status(400).json({ error: 'Tipo de plantilla inválido' });

    const del = await query(`DELETE FROM ${table} WHERE id = $1 AND specialty_id = $2`, [templateId, id]);
    if (del.rowCount === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json({ message: 'Plantilla eliminada' });
  } catch (error) {
    console.error('Error eliminando plantilla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/specialties - Crear nueva especialidad
router.post('/', authenticateToken, requirePermission('USERS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = specialtySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const specialtyData = value;

    // Verificar si ya existe una especialidad con el mismo nombre
    const existingSpecialty = await query(
      'SELECT id FROM specialties WHERE LOWER(name) = LOWER($1)',
      [specialtyData.name]
    );

    if (existingSpecialty.rows.length > 0) {
      return res.status(409).json({
        error: 'Especialidad ya existe',
        message: 'Ya existe una especialidad con este nombre'
      });
    }

    // Insertar nueva especialidad
    const newSpecialtyResult = await query(
      `INSERT INTO specialties (name, description, code, is_active, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [
        specialtyData.name,
        specialtyData.description || null,
        specialtyData.code || null,
        specialtyData.isActive
      ]
    );

    const newSpecialty = newSpecialtyResult.rows[0];

    res.status(201).json({
      message: 'Especialidad creada exitosamente',
      specialty: newSpecialty
    });

  } catch (error) {
    console.error('Error creando especialidad:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la especialidad'
    });
  }
});

// PUT /api/specialties/:id - Actualizar especialidad
router.put('/:id', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = specialtySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const specialtyData = value;

    // Verificar si la especialidad existe
    const existingSpecialty = await query(
      'SELECT id FROM specialties WHERE id = $1',
      [id]
    );

    if (existingSpecialty.rows.length === 0) {
      return res.status(404).json({
        error: 'Especialidad no encontrada',
        message: 'La especialidad con el ID especificado no existe'
      });
    }

    // Verificar si ya existe otra especialidad con el mismo nombre
    const duplicateSpecialty = await query(
      'SELECT id FROM specialties WHERE LOWER(name) = LOWER($1) AND id != $2',
      [specialtyData.name, id]
    );

    if (duplicateSpecialty.rows.length > 0) {
      return res.status(409).json({
        error: 'Nombre duplicado',
        message: 'Ya existe otra especialidad con este nombre'
      });
    }

    // Actualizar especialidad
    const updatedSpecialtyResult = await query(
      `UPDATE specialties SET
        name = $1, description = $2, code = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *`,
      [
        specialtyData.name,
        specialtyData.description || null,
        specialtyData.code || null,
        specialtyData.isActive,
        id
      ]
    );

    const updatedSpecialty = updatedSpecialtyResult.rows[0];

    res.json({
      message: 'Especialidad actualizada exitosamente',
      specialty: updatedSpecialty
    });

  } catch (error) {
    console.error('Error actualizando especialidad:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar la especialidad'
    });
  }
});

// DELETE /api/specialties/:id - Eliminar especialidad
router.delete('/:id', authenticateToken, requirePermission('USERS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la especialidad existe
    const existingSpecialty = await query(
      'SELECT id FROM specialties WHERE id = $1',
      [id]
    );

    if (existingSpecialty.rows.length === 0) {
      return res.status(404).json({
        error: 'Especialidad no encontrada',
        message: 'La especialidad con el ID especificado no existe'
      });
    }

    // Verificar si hay doctores asignados a esta especialidad
    const doctorsResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE specialty_id = $1 AND role = $2',
      [id, 'medical_user']
    );

    if (parseInt(doctorsResult.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar la especialidad',
        message: 'Hay doctores asignados a esta especialidad. Reasigne los doctores antes de eliminar.'
      });
    }

    // Eliminar especialidad
    await query('DELETE FROM specialties WHERE id = $1', [id]);

    res.json({
      message: 'Especialidad eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando especialidad:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la especialidad'
    });
  }
});

// GET /api/specialties/:id/doctors - Obtener doctores de una especialidad
router.get('/:id/doctors', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive = '' } = req.query;

    // Verificar si la especialidad existe
    const specialtyResult = await query(
      'SELECT id, name FROM specialties WHERE id = $1',
      [id]
    );

    if (specialtyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Especialidad no encontrada',
        message: 'La especialidad con el ID especificado no existe'
      });
    }

    let whereClause = 'WHERE u.specialty_id = $1 AND u.role = $2';
    let queryParams = [id, 'medical_user'];
    let paramIndex = 3;

    if (isActive !== '') {
      whereClause += ` AND u.is_active = $${paramIndex}`;
      queryParams.push(isActive === 'true');
    }

    const doctorsResult = await query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.is_active,
        u.last_login,
        u.created_at
      FROM users u
      ${whereClause}
      ORDER BY u.first_name, u.last_name`,
      queryParams
    );

    const doctors = doctorsResult.rows.map(doctor => ({
      ...doctor,
      fullName: `${doctor.first_name} ${doctor.last_name}`
    }));

    res.json({
      specialty: specialtyResult.rows[0],
      doctors
    });

  } catch (error) {
    console.error('Error obteniendo doctores de especialidad:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los doctores de la especialidad'
    });
  }
});

module.exports = router; 