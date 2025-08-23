const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const prescriptionSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del paciente debe ser un número',
    'number.integer': 'El ID del paciente debe ser un número entero',
    'number.positive': 'El ID del paciente debe ser positivo',
    'any.required': 'El ID del paciente es requerido'
  }),
  appointmentId: Joi.number().integer().positive().optional().messages({
    'number.base': 'El ID de la cita debe ser un número',
    'number.integer': 'El ID de la cita debe ser un número entero',
    'number.positive': 'El ID de la cita debe ser positivo'
  }),
  clinicalNoteId: Joi.number().integer().positive().optional().messages({
    'number.base': 'El ID de la nota clínica debe ser un número',
    'number.integer': 'El ID de la nota clínica debe ser un número entero',
    'number.positive': 'El ID de la nota clínica debe ser positivo'
  }),
  type: Joi.string().valid('MEDICAMENTO', 'PROCEDIMIENTO', 'EXAMEN', 'CONSULTA_ESPECIALISTA', 'OTRO').required().messages({
    'any.only': 'El tipo debe ser MEDICAMENTO, PROCEDIMIENTO, EXAMEN, CONSULTA_ESPECIALISTA u OTRO',
    'any.required': 'El tipo de prescripción es requerido'
  }),
  status: Joi.string().valid('ACTIVA', 'COMPLETADA', 'CANCELADA', 'VENCIDA').default('ACTIVA').messages({
    'any.only': 'El estado debe ser ACTIVA, COMPLETADA, CANCELADA o VENCIDA'
  }),
  priority: Joi.string().valid('BAJA', 'MEDIA', 'ALTA', 'URGENTE').default('MEDIA').messages({
    'any.only': 'La prioridad debe ser BAJA, MEDIA, ALTA o URGENTE'
  }),
  items: Joi.array().items(Joi.object({
    name: Joi.string().max(200).required().messages({
      'string.max': 'El nombre del medicamento/procedimiento no puede exceder 200 caracteres',
      'any.required': 'El nombre es requerido'
    }),
    dosage: Joi.string().max(100).optional().allow(''),
    frequency: Joi.string().max(100).optional().allow(''),
    duration: Joi.string().max(100).optional().allow(''),
    instructions: Joi.string().max(500).optional().allow(''),
    quantity: Joi.number().integer().min(1).optional().allow(null),
    unit: Joi.string().max(20).optional().allow(''),
    cost: Joi.number().min(0).optional().allow(null)
  })).min(1).required().messages({
    'array.min': 'Debe incluir al menos un medicamento o procedimiento',
    'any.required': 'Los medicamentos/procedimientos son requeridos'
  }),
  diagnosis: Joi.string().max(500).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  isConfidential: Joi.boolean().default(false),
  validUntil: Joi.date().min('now').optional().messages({
    'date.min': 'La fecha de vencimiento debe ser futura'
  })
});

// GET /api/prescriptions - Listar prescripciones con filtros
router.get('/', authenticateToken, requirePermission('PRESCRIPTIONS', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      patientId = '', 
      doctorId = '', 
      type = '',
      status = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (patientId) {
      whereConditions.push(`p.patient_id = $${paramIndex}`);
      queryParams.push(parseInt(patientId));
      paramIndex++;
    }

    if (doctorId) {
      whereConditions.push(`p.doctor_id = $${paramIndex}`);
      queryParams.push(parseInt(doctorId));
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`p.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`p.created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`p.created_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['created_at', 'type', 'status', 'priority'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM prescriptions p 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        p.id,
        p.patient_id,
        p.doctor_id,
        p.appointment_id,
        p.clinical_note_id,
        p.type,
        p.status,
        p.priority,
        p.diagnosis,
        p.notes,
        p.is_confidential,
        p.valid_until,
        p.created_at,
        p.updated_at,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        pt.document_number as patient_document,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users d ON p.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ${whereClause}
      ORDER BY p.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const prescriptionsResult = await query(mainQuery, queryParams);

    // Obtener items de cada prescripción
    const prescriptions = await Promise.all(prescriptionsResult.rows.map(async (prescription) => {
      const itemsResult = await query(
        'SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id',
        [prescription.id]
      );

      return {
        ...prescription,
        patientFullName: `${prescription.patient_first_name} ${prescription.patient_last_name}`,
        doctorFullName: `${prescription.doctor_first_name} ${prescription.doctor_last_name}`,
        items: itemsResult.rows
      };
    }));

    res.json({
      prescriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo prescripciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las prescripciones'
    });
  }
});

// GET /api/prescriptions/:id - Obtener prescripción específica
router.get('/:id', authenticateToken, requirePermission('PRESCRIPTIONS', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const prescriptionResult = await query(
      `SELECT 
        p.*,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        pt.document_number as patient_document,
        pt.birth_date as patient_birth_date,
        pt.gender as patient_gender,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users d ON p.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE p.id = $1`,
      [id]
    );

    if (prescriptionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Prescripción no encontrada',
        message: 'La prescripción con el ID especificado no existe'
      });
    }

    const prescription = prescriptionResult.rows[0];

    // Obtener items de la prescripción
    const itemsResult = await query(
      'SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id',
      [id]
    );

    prescription.patientFullName = `${prescription.patient_first_name} ${prescription.patient_last_name}`;
    prescription.doctorFullName = `${prescription.doctor_first_name} ${prescription.doctor_last_name}`;
    prescription.items = itemsResult.rows;

    res.json({ prescription });

  } catch (error) {
    console.error('Error obteniendo prescripción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la prescripción'
    });
  }
});

// POST /api/prescriptions - Crear nueva prescripción
router.post('/', authenticateToken, requirePermission('PRESCRIPTIONS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = prescriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const prescriptionData = value;

    // Verificar si el paciente existe
    const patientResult = await query(
      'SELECT id FROM patients WHERE id = $1',
      [prescriptionData.patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente especificado no existe'
      });
    }

    // Verificar si la cita existe (si se proporciona)
    if (prescriptionData.appointmentId) {
      const appointmentResult = await query(
        'SELECT id FROM appointments WHERE id = $1',
        [prescriptionData.appointmentId]
      );

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Cita no encontrada',
          message: 'La cita especificada no existe'
        });
      }
    }

    // Verificar si la nota clínica existe (si se proporciona)
    if (prescriptionData.clinicalNoteId) {
      const clinicalNoteResult = await query(
        'SELECT id FROM clinical_notes WHERE id = $1',
        [prescriptionData.clinicalNoteId]
      );

      if (clinicalNoteResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Nota clínica no encontrada',
          message: 'La nota clínica especificada no existe'
        });
      }
    }

    // Insertar nueva prescripción
    const newPrescriptionResult = await query(
      `INSERT INTO prescriptions (
        patient_id, doctor_id, appointment_id, clinical_note_id, type, status,
        priority, diagnosis, notes, is_confidential, valid_until, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        prescriptionData.patientId,
        req.user.id,
        prescriptionData.appointmentId || null,
        prescriptionData.clinicalNoteId || null,
        prescriptionData.type,
        prescriptionData.status,
        prescriptionData.priority,
        prescriptionData.diagnosis || null,
        prescriptionData.notes || null,
        prescriptionData.isConfidential || false,
        prescriptionData.validUntil || null
      ]
    );

    const newPrescription = newPrescriptionResult.rows[0];

    // Insertar items de la prescripción
    const itemsToInsert = prescriptionData.items.map(item => ({
      prescription_id: newPrescription.id,
      name: item.name,
      dosage: item.dosage || null,
      frequency: item.frequency || null,
      duration: item.duration || null,
      instructions: item.instructions || null,
      quantity: item.quantity || null,
      unit: item.unit || null,
      cost: item.cost || null
    }));

    for (const item of itemsToInsert) {
      await query(
        `INSERT INTO prescription_items (
          prescription_id, name, dosage, frequency, duration, instructions,
          quantity, unit, cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          item.prescription_id,
          item.name,
          item.dosage,
          item.frequency,
          item.duration,
          item.instructions,
          item.quantity,
          item.unit,
          item.cost
        ]
      );
    }

    // Obtener la prescripción completa con items
    const completePrescriptionResult = await query(
      `SELECT 
        p.*,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users d ON p.doctor_id = d.id
      WHERE p.id = $1`,
      [newPrescription.id]
    );

    const completePrescription = completePrescriptionResult.rows[0];
    completePrescription.patientFullName = `${completePrescription.patient_first_name} ${completePrescription.patient_last_name}`;
    completePrescription.doctorFullName = `${completePrescription.doctor_first_name} ${completePrescription.doctor_last_name}`;
    completePrescription.items = itemsToInsert;

    res.status(201).json({
      message: 'Prescripción creada exitosamente',
      prescription: completePrescription
    });

  } catch (error) {
    console.error('Error creando prescripción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la prescripción'
    });
  }
});

// PUT /api/prescriptions/:id - Actualizar prescripción
router.put('/:id', authenticateToken, requirePermission('PRESCRIPTIONS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = prescriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const prescriptionData = value;

    // Verificar si la prescripción existe y pertenece al doctor
    const existingPrescription = await query(
      'SELECT id, doctor_id, status FROM prescriptions WHERE id = $1',
      [id]
    );

    if (existingPrescription.rows.length === 0) {
      return res.status(404).json({
        error: 'Prescripción no encontrada',
        message: 'La prescripción con el ID especificado no existe'
      });
    }

    // Solo el doctor que creó la prescripción puede editarla
    if (existingPrescription.rows[0].doctor_id !== req.user.id) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo puede editar las prescripciones que usted creó'
      });
    }

    // No permitir editar prescripciones completadas o canceladas
    if (existingPrescription.rows[0].status === 'COMPLETADA' || existingPrescription.rows[0].status === 'CANCELADA') {
      return res.status(400).json({
        error: 'Prescripción no modificable',
        message: 'No se puede modificar una prescripción completada o cancelada'
      });
    }

    // Actualizar prescripción
    const updatedPrescriptionResult = await query(
      `UPDATE prescriptions SET
        appointment_id = $1, clinical_note_id = $2, type = $3, status = $4,
        priority = $5, diagnosis = $6, notes = $7, is_confidential = $8,
        valid_until = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *`,
      [
        prescriptionData.appointmentId || null,
        prescriptionData.clinicalNoteId || null,
        prescriptionData.type,
        prescriptionData.status,
        prescriptionData.priority,
        prescriptionData.diagnosis || null,
        prescriptionData.notes || null,
        prescriptionData.isConfidential || false,
        prescriptionData.validUntil || null,
        id
      ]
    );

    const updatedPrescription = updatedPrescriptionResult.rows[0];

    // Eliminar items existentes y crear nuevos
    await query('DELETE FROM prescription_items WHERE prescription_id = $1', [id]);

    // Insertar nuevos items
    for (const item of prescriptionData.items) {
      await query(
        `INSERT INTO prescription_items (
          prescription_id, name, dosage, frequency, duration, instructions,
          quantity, unit, cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          item.name,
          item.dosage || null,
          item.frequency || null,
          item.duration || null,
          item.instructions || null,
          item.quantity || null,
          item.unit || null,
          item.cost || null
        ]
      );
    }

    // Obtener la prescripción actualizada con items
    const completePrescriptionResult = await query(
      `SELECT 
        p.*,
        pt.first_name as patient_first_name,
        pt.last_name as patient_last_name,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      JOIN users d ON p.doctor_id = d.id
      WHERE p.id = $1`,
      [id]
    );

    const itemsResult = await query(
      'SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id',
      [id]
    );

    const completePrescription = completePrescriptionResult.rows[0];
    completePrescription.patientFullName = `${completePrescription.patient_first_name} ${completePrescription.patient_last_name}`;
    completePrescription.doctorFullName = `${completePrescription.doctor_first_name} ${completePrescription.doctor_last_name}`;
    completePrescription.items = itemsResult.rows;

    res.json({
      message: 'Prescripción actualizada exitosamente',
      prescription: completePrescription
    });

  } catch (error) {
    console.error('Error actualizando prescripción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar la prescripción'
    });
  }
});

// PATCH /api/prescriptions/:id/status - Cambiar estado de la prescripción
router.patch('/:id/status', authenticateToken, requirePermission('PRESCRIPTIONS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validar estado
    const validStatuses = ['ACTIVA', 'COMPLETADA', 'CANCELADA', 'VENCIDA'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: 'El estado debe ser ACTIVA, COMPLETADA, CANCELADA o VENCIDA'
      });
    }

    // Verificar si la prescripción existe
    const existingPrescription = await query(
      'SELECT id, status FROM prescriptions WHERE id = $1',
      [id]
    );

    if (existingPrescription.rows.length === 0) {
      return res.status(404).json({
        error: 'Prescripción no encontrada',
        message: 'La prescripción con el ID especificado no existe'
      });
    }

    // Actualizar estado
    const updatedPrescriptionResult = await query(
      'UPDATE prescriptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    const updatedPrescription = updatedPrescriptionResult.rows[0];

    res.json({
      message: 'Estado de prescripción actualizado exitosamente',
      prescription: updatedPrescription
    });

  } catch (error) {
    console.error('Error actualizando estado de prescripción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el estado de la prescripción'
    });
  }
});

// DELETE /api/prescriptions/:id - Eliminar prescripción
router.delete('/:id', authenticateToken, requirePermission('PRESCRIPTIONS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la prescripción existe
    const existingPrescription = await query(
      'SELECT id, status FROM prescriptions WHERE id = $1',
      [id]
    );

    if (existingPrescription.rows.length === 0) {
      return res.status(404).json({
        error: 'Prescripción no encontrada',
        message: 'La prescripción con el ID especificado no existe'
      });
    }

    // Solo super usuarios pueden eliminar prescripciones
    if (req.user.role !== 'super_user') {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo los super usuarios pueden eliminar prescripciones'
      });
    }

    // Eliminar items de la prescripción
    await query('DELETE FROM prescription_items WHERE prescription_id = $1', [id]);

    // Eliminar prescripción
    await query('DELETE FROM prescriptions WHERE id = $1', [id]);

    res.json({
      message: 'Prescripción eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando prescripción:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la prescripción'
    });
  }
});

// GET /api/prescriptions/patient/:patientId - Obtener prescripciones de un paciente
router.get('/patient/:patientId', authenticateToken, requirePermission('PRESCRIPTIONS', 'READ'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20, type = '', status = '' } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [`p.patient_id = $1`];
    let queryParams = [parseInt(patientId)];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`p.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM prescriptions p 
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        p.id,
        p.type,
        p.status,
        p.priority,
        p.diagnosis,
        p.created_at,
        p.valid_until,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM prescriptions p
      JOIN users d ON p.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const prescriptionsResult = await query(mainQuery, queryParams);

    const prescriptions = prescriptionsResult.rows.map(prescription => ({
      ...prescription,
      doctorFullName: `${prescription.doctor_first_name} ${prescription.doctor_last_name}`
    }));

    res.json({
      prescriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo prescripciones del paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las prescripciones del paciente'
    });
  }
});

module.exports = router; 