const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

const createSchema = Joi.object({
  patientId: Joi.number().integer().positive().required(),
  appointmentId: Joi.number().integer().positive().optional().allow(null),
  items: Joi.array().items(Joi.object({
    version: Joi.string().max(20).default('CIE-10'),
    code: Joi.string().max(20).required(),
    name: Joi.string().max(600).required()
  })).min(1).required()
});

// POST /api/cie-docs - crear múltiples documentos CIE
router.post('/', authenticateToken, requirePermission('RIPS', 'CREATE'), async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.details.map(d=>d.message) });
    }
    const { patientId, appointmentId, items } = value;

    const inserted = [];
    for (const it of items) {
      const result = await query(
        `INSERT INTO cie_documents (patient_id, appointment_id, version, code, name, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [patientId, appointmentId || null, it.version || 'CIE-10', it.code, it.name, req.user.id]
      );
      inserted.push(result.rows[0]);
    }

    res.status(201).json({ message: 'Documentos CIE creados', items: inserted });
  } catch (e) {
    console.error('Error creando CIE docs:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/cie-docs/by-appointment/:appointmentId - listar por atención
router.get('/by-appointment/:appointmentId', authenticateToken, requirePermission('PATIENTS', 'READ'), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const result = await query(
      `SELECT cd.*, u.first_name, u.last_name
       FROM cie_documents cd
       LEFT JOIN users u ON cd.created_by = u.id
       WHERE cd.appointment_id = $1
       ORDER BY cd.created_at DESC`,
      [appointmentId]
    );
    const items = result.rows.map(r => ({
      id: r.id,
      version: r.version || 'CIE-10',
      code: r.code,
      name: r.name,
      createdBy: r.first_name ? `${r.first_name} ${r.last_name}` : 'Usuario',
      createdAt: r.created_at
    }));
    res.json({ items });
  } catch (e) {
    console.error('Error listando CIE docs:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;


