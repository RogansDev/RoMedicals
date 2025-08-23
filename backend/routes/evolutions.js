const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const evolutionSchema = Joi.object({
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
  evolutionDate: Joi.date().max('now').required().messages({
    'date.max': 'La fecha de evolución no puede ser futura',
    'any.required': 'La fecha de evolución es requerida'
  }),
  subjective: Joi.string().max(2000).required().messages({
    'string.max': 'La parte subjetiva no puede exceder 2000 caracteres',
    'any.required': 'La parte subjetiva es requerida'
  }),
  objective: Joi.string().max(2000).required().messages({
    'string.max': 'La parte objetiva no puede exceder 2000 caracteres',
    'any.required': 'La parte objetiva es requerida'
  }),
  assessment: Joi.string().max(1000).required().messages({
    'string.max': 'La evaluación no puede exceder 1000 caracteres',
    'any.required': 'La evaluación es requerida'
  }),
  plan: Joi.string().max(2000).required().messages({
    'string.max': 'El plan no puede exceder 2000 caracteres',
    'any.required': 'El plan es requerido'
  }),
  vitalSigns: Joi.object({
    bloodPressure: Joi.string().max(20).optional().allow(''),
    heartRate: Joi.number().min(30).max(300).optional().allow(null),
    temperature: Joi.number().min(30).max(45).optional().allow(null),
    respiratoryRate: Joi.number().min(8).max(60).optional().allow(null),
    oxygenSaturation: Joi.number().min(0).max(100).optional().allow(null),
    weight: Joi.number().min(0).max(500).optional().allow(null),
    height: Joi.number().min(0).max(300).optional().allow(null),
    bmi: Joi.number().min(0).max(100).optional().allow(null)
  }).optional(),
  images: Joi.array().items(Joi.string()).max(10).optional().messages({
    'array.max': 'No se pueden subir más de 10 imágenes'
  }),
  isConfidential: Joi.boolean().default(false)
});

// GET /api/evolutions - Listar evoluciones con filtros
router.get('/', authenticateToken, requirePermission('EVOLUTIONS', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      patientId = '', 
      doctorId = '', 
      dateFrom = '',
      dateTo = '',
      sortBy = 'evolution_date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (patientId) {
      whereConditions.push(`e.patient_id = $${paramIndex}`);
      queryParams.push(parseInt(patientId));
      paramIndex++;
    }

    if (doctorId) {
      whereConditions.push(`e.doctor_id = $${paramIndex}`);
      queryParams.push(parseInt(doctorId));
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`e.evolution_date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`e.evolution_date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['evolution_date', 'created_at', 'patient_id'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'evolution_date';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM evolutions e 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        e.id,
        e.patient_id,
        e.doctor_id,
        e.appointment_id,
        e.clinical_note_id,
        e.evolution_date,
        e.subjective,
        e.objective,
        e.assessment,
        e.plan,
        e.vital_signs,
        e.images,
        e.is_confidential,
        e.created_at,
        e.updated_at,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.document_number as patient_document,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM evolutions e
      JOIN patients p ON e.patient_id = p.id
      JOIN users d ON e.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ${whereClause}
      ORDER BY e.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const evolutionsResult = await query(mainQuery, queryParams);

    const evolutions = evolutionsResult.rows.map(evolution => ({
      ...evolution,
      patientFullName: `${evolution.patient_first_name} ${evolution.patient_last_name}`,
      doctorFullName: `${evolution.doctor_first_name} ${evolution.doctor_last_name}`,
      vitalSigns: evolution.vital_signs ? JSON.parse(evolution.vital_signs) : null,
      images: evolution.images ? JSON.parse(evolution.images) : []
    }));

    res.json({
      evolutions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo evoluciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las evoluciones'
    });
  }
});

// GET /api/evolutions/:id - Obtener evolución específica
router.get('/:id', authenticateToken, requirePermission('EVOLUTIONS', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const evolutionResult = await query(
      `SELECT 
        e.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.document_number as patient_document,
        p.birth_date as patient_birth_date,
        p.gender as patient_gender,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name,
        a.appointment_date,
        a.appointment_time,
        a.type as appointment_type
      FROM evolutions e
      JOIN patients p ON e.patient_id = p.id
      JOIN users d ON e.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      LEFT JOIN appointments a ON e.appointment_id = a.id
      WHERE e.id = $1`,
      [id]
    );

    if (evolutionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Evolución no encontrada',
        message: 'La evolución con el ID especificado no existe'
      });
    }

    const evolution = evolutionResult.rows[0];
    evolution.patientFullName = `${evolution.patient_first_name} ${evolution.patient_last_name}`;
    evolution.doctorFullName = `${evolution.doctor_first_name} ${evolution.doctor_last_name}`;
    evolution.vitalSigns = evolution.vital_signs ? JSON.parse(evolution.vital_signs) : null;
    evolution.images = evolution.images ? JSON.parse(evolution.images) : [];

    res.json({ evolution });

  } catch (error) {
    console.error('Error obteniendo evolución:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la evolución'
    });
  }
});

// POST /api/evolutions - Crear nueva evolución
router.post('/', authenticateToken, requirePermission('EVOLUTIONS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = evolutionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const evolutionData = value;

    // Verificar si el paciente existe
    const patientResult = await query(
      'SELECT id FROM patients WHERE id = $1',
      [evolutionData.patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente especificado no existe'
      });
    }

    // Verificar si la cita existe (si se proporciona)
    if (evolutionData.appointmentId) {
      const appointmentResult = await query(
        'SELECT id FROM appointments WHERE id = $1',
        [evolutionData.appointmentId]
      );

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Cita no encontrada',
          message: 'La cita especificada no existe'
        });
      }
    }

    // Verificar si la nota clínica existe (si se proporciona)
    if (evolutionData.clinicalNoteId) {
      const clinicalNoteResult = await query(
        'SELECT id FROM clinical_notes WHERE id = $1',
        [evolutionData.clinicalNoteId]
      );

      if (clinicalNoteResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Nota clínica no encontrada',
          message: 'La nota clínica especificada no existe'
        });
      }
    }

    // Insertar nueva evolución
    const newEvolutionResult = await query(
      `INSERT INTO evolutions (
        patient_id, doctor_id, appointment_id, clinical_note_id, evolution_date,
        subjective, objective, assessment, plan, vital_signs, images, is_confidential, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        evolutionData.patientId,
        req.user.id,
        evolutionData.appointmentId || null,
        evolutionData.clinicalNoteId || null,
        evolutionData.evolutionDate,
        evolutionData.subjective,
        evolutionData.objective,
        evolutionData.assessment,
        evolutionData.plan,
        evolutionData.vitalSigns ? JSON.stringify(evolutionData.vitalSigns) : null,
        evolutionData.images ? JSON.stringify(evolutionData.images) : null,
        evolutionData.isConfidential || false
      ]
    );

    const newEvolution = newEvolutionResult.rows[0];

    res.status(201).json({
      message: 'Evolución creada exitosamente',
      evolution: newEvolution
    });

  } catch (error) {
    console.error('Error creando evolución:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la evolución'
    });
  }
});

// PUT /api/evolutions/:id - Actualizar evolución
router.put('/:id', authenticateToken, requirePermission('EVOLUTIONS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = evolutionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const evolutionData = value;

    // Verificar si la evolución existe y pertenece al doctor
    const existingEvolution = await query(
      'SELECT id, doctor_id FROM evolutions WHERE id = $1',
      [id]
    );

    if (existingEvolution.rows.length === 0) {
      return res.status(404).json({
        error: 'Evolución no encontrada',
        message: 'La evolución con el ID especificado no existe'
      });
    }

    // Solo el doctor que creó la evolución puede editarla
    if (existingEvolution.rows[0].doctor_id !== req.user.id) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo puede editar las evoluciones que usted creó'
      });
    }

    // Actualizar evolución
    const updatedEvolutionResult = await query(
      `UPDATE evolutions SET
        appointment_id = $1, clinical_note_id = $2, evolution_date = $3,
        subjective = $4, objective = $5, assessment = $6, plan = $7,
        vital_signs = $8, images = $9, is_confidential = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *`,
      [
        evolutionData.appointmentId || null,
        evolutionData.clinicalNoteId || null,
        evolutionData.evolutionDate,
        evolutionData.subjective,
        evolutionData.objective,
        evolutionData.assessment,
        evolutionData.plan,
        evolutionData.vitalSigns ? JSON.stringify(evolutionData.vitalSigns) : null,
        evolutionData.images ? JSON.stringify(evolutionData.images) : null,
        evolutionData.isConfidential || false,
        id
      ]
    );

    const updatedEvolution = updatedEvolutionResult.rows[0];

    res.json({
      message: 'Evolución actualizada exitosamente',
      evolution: updatedEvolution
    });

  } catch (error) {
    console.error('Error actualizando evolución:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar la evolución'
    });
  }
});

// DELETE /api/evolutions/:id - Eliminar evolución
router.delete('/:id', authenticateToken, requirePermission('EVOLUTIONS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la evolución existe
    const existingEvolution = await query(
      'SELECT id, doctor_id FROM evolutions WHERE id = $1',
      [id]
    );

    if (existingEvolution.rows.length === 0) {
      return res.status(404).json({
        error: 'Evolución no encontrada',
        message: 'La evolución con el ID especificado no existe'
      });
    }

    // Solo super usuarios pueden eliminar evoluciones
    if (req.user.role !== 'super_user') {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo los super usuarios pueden eliminar evoluciones'
      });
    }

    // Eliminar evolución
    await query('DELETE FROM evolutions WHERE id = $1', [id]);

    res.json({
      message: 'Evolución eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando evolución:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la evolución'
    });
  }
});

// GET /api/evolutions/patient/:patientId - Obtener evoluciones de un paciente
router.get('/patient/:patientId', authenticateToken, requirePermission('EVOLUTIONS', 'READ'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20, dateFrom = '', dateTo = '' } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [`e.patient_id = $1`];
    let queryParams = [parseInt(patientId)];
    let paramIndex = 2;

    if (dateFrom) {
      whereConditions.push(`e.evolution_date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`e.evolution_date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM evolutions e 
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        e.id,
        e.evolution_date,
        e.subjective,
        e.objective,
        e.assessment,
        e.plan,
        e.created_at,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM evolutions e
      JOIN users d ON e.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE ${whereClause}
      ORDER BY e.evolution_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const evolutionsResult = await query(mainQuery, queryParams);

    const evolutions = evolutionsResult.rows.map(evolution => ({
      ...evolution,
      doctorFullName: `${evolution.doctor_first_name} ${evolution.doctor_last_name}`
    }));

    res.json({
      evolutions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo evoluciones del paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las evoluciones del paciente'
    });
  }
});

module.exports = router; 