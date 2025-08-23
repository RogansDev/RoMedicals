const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const baseTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  content: Joi.string().allow('').default(''),
  isDefault: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(150).optional(),
  content: Joi.string().allow('').optional(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

// GET /api/consents - Listar plantillas globales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, content, is_default, is_active, created_at, updated_at FROM consents_template ORDER BY is_default DESC, name ASC'
    );
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Error listando consentimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/consents/:id - Obtener una plantilla
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT id, name, content, is_default, is_active, created_at, updated_at FROM consents_template WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo consentimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/consents - Crear plantilla
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { value, error } = baseTemplateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const { name, content, isDefault, isActive } = value;

    // Si se marca como default, desmarcar las demás
    if (isDefault) {
      await query('UPDATE consents_template SET is_default = FALSE WHERE is_default = TRUE');
    }

    const insert = await query(
      `INSERT INTO consents_template (name, content, is_default, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, name, content, is_default, is_active, created_at, updated_at`,
      [name, content, !!isDefault, !!isActive]
    );

    res.status(201).json(insert.rows[0]);
  } catch (error) {
    console.error('Error creando consentimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/consents/:id - Actualizar plantilla
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, error } = updateTemplateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const existing = await query('SELECT id FROM consents_template WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Plantilla no encontrada' });

    // Si se marca como default, desmarcar otras
    if (value.isDefault === true) {
      await query('UPDATE consents_template SET is_default = FALSE WHERE id <> $1 AND is_default = TRUE', [id]);
    }

    const fields = [];
    const params = [];
    let idx = 1;
    ['name', 'content', 'isDefault', 'isActive'].forEach((key) => {
      if (value[key] !== undefined) {
        const col = key === 'isDefault' ? 'is_default' : key === 'isActive' ? 'is_active' : key;
        fields.push(`${col} = $${idx++}`);
        params.push(value[key]);
      }
    });
    params.push(id);

    const update = await query(
      `UPDATE consents_template SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, name, content, is_default, is_active, created_at, updated_at`,
      params
    );

    res.json(update.rows[0]);
  } catch (error) {
    console.error('Error actualizando consentimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/consents/:id - Eliminar plantilla
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await query('DELETE FROM consents_template WHERE id = $1', [id]);
    if (del.rowCount === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando consentimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;


