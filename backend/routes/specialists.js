const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

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

// GET /api/specialists - Lista de especialistas (usuarios médicos)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.specialty_id,
        u.is_active,
        s.name as specialty_name,
        ss.schedule
      FROM users u
      LEFT JOIN specialties s ON u.specialty_id = s.id
      LEFT JOIN specialist_schedules ss ON ss.user_id = u.id
      WHERE u.role = 'medical_user'
      ORDER BY u.first_name, u.last_name`
    );

    const specialists = result.rows.map(r => ({
      id: r.id,
      title: 'Dr',
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      isActive: r.is_active,
      specialties: r.specialty_id ? [{ id: r.specialty_id, name: r.specialty_name || '' }] : [],
      schedule: r.schedule || null
    }));

    res.json(specialists);
  } catch (err) {
    console.error('Error listando especialistas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/specialists/:id/schedule - Obtener horario de un especialista
router.get('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT schedule FROM specialist_schedules WHERE user_id = $1', [id]);
    if (existing.rows.length === 0) return res.json({ schedule: null });
    return res.json({ schedule: existing.rows[0].schedule });
  } catch (err) {
    console.error('Error obteniendo horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/specialists/:id/schedule - Guardar/actualizar horario
router.put('/:id/schedule', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule } = req.body || {};

    const { error, value } = scheduleSchema.validate(schedule || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Datos de horario inválidos',
        details: error.details.map(d => d.message)
      });
    }

    // Verificar que el usuario existe y es médico
    const userResult = await query('SELECT id FROM users WHERE id = $1 AND role = $2', [id, 'medical_user']);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Especialista no encontrado' });
    }

    // Upsert por user_id
    const sel = await query('SELECT id FROM specialist_schedules WHERE user_id = $1', [id]);
    if (sel.rows.length > 0) {
      const updated = await query(
        'UPDATE specialist_schedules SET schedule = $1, updated_at = NOW() WHERE user_id = $2 RETURNING user_id, schedule',
        [JSON.stringify(value || {}), id]
      );
      return res.json({ message: 'Horario actualizado', schedule: updated.rows[0].schedule });
    } else {
      const inserted = await query(
        'INSERT INTO specialist_schedules (user_id, schedule) VALUES ($1, $2) RETURNING user_id, schedule',
        [id, JSON.stringify(value || {})]
      );
      return res.status(201).json({ message: 'Horario guardado', schedule: inserted.rows[0].schedule });
    }
  } catch (err) {
    console.error('Error guardando horario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;


