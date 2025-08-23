const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const clinicalNoteSchema = Joi.object({
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
  type: Joi.string().valid('PRIMERA_VEZ', 'EVOLUCION', 'CONTROL', 'URGENCIA').required().messages({
    'any.only': 'El tipo debe ser PRIMERA_VEZ, EVOLUCION, CONTROL o URGENCIA',
    'any.required': 'El tipo de nota es requerido'
  }),
  chiefComplaint: Joi.string().max(500).required().messages({
    'string.max': 'La consulta principal no puede exceder 500 caracteres',
    'any.required': 'La consulta principal es requerida'
  }),
  presentIllness: Joi.string().max(2000).required().messages({
    'string.max': 'La enfermedad actual no puede exceder 2000 caracteres',
    'any.required': 'La enfermedad actual es requerida'
  }),
  physicalExamination: Joi.string().max(2000).required().messages({
    'string.max': 'El examen físico no puede exceder 2000 caracteres',
    'any.required': 'El examen físico es requerido'
  }),
  diagnosis: Joi.string().max(1000).optional().allow(''),
  treatment: Joi.string().max(2000).optional().allow(''),
  recommendations: Joi.string().max(1000).optional().allow(''),
  vitalSigns: Joi.object({
    bloodPressure: Joi.string().max(20).optional().allow(''),
    heartRate: Joi.number().min(30).max(300).optional().allow(null),
    temperature: Joi.number().min(30).max(45).optional().allow(null),
    respiratoryRate: Joi.number().min(8).max(60).optional().allow(null),
    oxygenSaturation: Joi.number().min(0).max(100).optional().allow(null),
    weight: Joi.number().min(0).max(500).optional().allow(null),
    height: Joi.number().min(0).max(300).optional().allow(null)
  }).optional(),
  images: Joi.array().items(Joi.string()).max(10).optional().messages({
    'array.max': 'No se pueden subir más de 10 imágenes'
  }),
  isConfidential: Joi.boolean().default(false)
});

// GET /api/clinical-notes - Listar notas clínicas con filtros
router.get('/', authenticateToken, requirePermission('CLINICAL_NOTES', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      patientId = '', 
      doctorId = '', 
      type = '',
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
      whereConditions.push(`cn.patient_id = $${paramIndex}`);
      queryParams.push(parseInt(patientId));
      paramIndex++;
    }

    if (doctorId) {
      whereConditions.push(`cn.doctor_id = $${paramIndex}`);
      queryParams.push(parseInt(doctorId));
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`cn.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`cn.created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`cn.created_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['created_at', 'type', 'patient_id'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM clinical_notes cn 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        cn.id,
        cn.patient_id,
        cn.doctor_id,
        cn.appointment_id,
        cn.type,
        cn.chief_complaint,
        cn.present_illness,
        cn.physical_examination,
        cn.diagnosis,
        cn.treatment,
        cn.recommendations,
        cn.vital_signs,
        cn.images,
        cn.is_confidential,
        cn.created_at,
        cn.updated_at,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.document_number as patient_document,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM clinical_notes cn
      JOIN patients p ON cn.patient_id = p.id
      JOIN users d ON cn.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ${whereClause}
      ORDER BY cn.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const notesResult = await query(mainQuery, queryParams);

    const notes = notesResult.rows.map(note => ({
      ...note,
      patientFullName: `${note.patient_first_name} ${note.patient_last_name}`,
      doctorFullName: `${note.doctor_first_name} ${note.doctor_last_name}`,
      vitalSigns: note.vital_signs ? JSON.parse(note.vital_signs) : null,
      images: note.images ? JSON.parse(note.images) : []
    }));

    res.json({
      notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo notas clínicas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las notas clínicas'
    });
  }
});

// GET /api/clinical-notes/:id - Obtener nota clínica específica
router.get('/:id', authenticateToken, requirePermission('CLINICAL_NOTES', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const noteResult = await query(
      `SELECT 
        cn.*,
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
      FROM clinical_notes cn
      JOIN patients p ON cn.patient_id = p.id
      JOIN users d ON cn.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      LEFT JOIN appointments a ON cn.appointment_id = a.id
      WHERE cn.id = $1`,
      [id]
    );

    if (noteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Nota clínica no encontrada',
        message: 'La nota clínica con el ID especificado no existe'
      });
    }

    const note = noteResult.rows[0];
    note.patientFullName = `${note.patient_first_name} ${note.patient_last_name}`;
    note.doctorFullName = `${note.doctor_first_name} ${note.doctor_last_name}`;
    note.vitalSigns = note.vital_signs ? JSON.parse(note.vital_signs) : null;
    note.images = note.images ? JSON.parse(note.images) : [];

    res.json({ note });

  } catch (error) {
    console.error('Error obteniendo nota clínica:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la nota clínica'
    });
  }
});

// POST /api/clinical-notes - Crear nueva nota clínica
router.post('/', authenticateToken, requirePermission('CLINICAL_NOTES', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = clinicalNoteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const noteData = value;

    // Verificar si el paciente existe
    const patientResult = await query(
      'SELECT id FROM patients WHERE id = $1',
      [noteData.patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente especificado no existe'
      });
    }

    // Verificar si la cita existe (si se proporciona)
    if (noteData.appointmentId) {
      const appointmentResult = await query(
        'SELECT id FROM appointments WHERE id = $1',
        [noteData.appointmentId]
      );

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Cita no encontrada',
          message: 'La cita especificada no existe'
        });
      }
    }

    // Insertar nueva nota clínica
    const newNoteResult = await query(
      `INSERT INTO clinical_notes (
        patient_id, doctor_id, appointment_id, type, chief_complaint,
        present_illness, physical_examination, diagnosis, treatment,
        recommendations, vital_signs, images, is_confidential, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        noteData.patientId,
        req.user.id,
        noteData.appointmentId || null,
        noteData.type,
        noteData.chiefComplaint,
        noteData.presentIllness,
        noteData.physicalExamination,
        noteData.diagnosis || null,
        noteData.treatment || null,
        noteData.recommendations || null,
        noteData.vitalSigns ? JSON.stringify(noteData.vitalSigns) : null,
        noteData.images ? JSON.stringify(noteData.images) : null,
        noteData.isConfidential || false
      ]
    );

    const newNote = newNoteResult.rows[0];

    res.status(201).json({
      message: 'Nota clínica creada exitosamente',
      note: newNote
    });

  } catch (error) {
    console.error('Error creando nota clínica:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la nota clínica'
    });
  }
});

// PUT /api/clinical-notes/:id - Actualizar nota clínica
router.put('/:id', authenticateToken, requirePermission('CLINICAL_NOTES', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = clinicalNoteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const noteData = value;

    // Verificar si la nota existe y pertenece al doctor
    const existingNote = await query(
      'SELECT id, doctor_id FROM clinical_notes WHERE id = $1',
      [id]
    );

    if (existingNote.rows.length === 0) {
      return res.status(404).json({
        error: 'Nota clínica no encontrada',
        message: 'La nota clínica con el ID especificado no existe'
      });
    }

    // Solo el doctor que creó la nota puede editarla
    if (existingNote.rows[0].doctor_id !== req.user.id) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo puede editar las notas clínicas que usted creó'
      });
    }

    // Actualizar nota clínica
    const updatedNoteResult = await query(
      `UPDATE clinical_notes SET
        appointment_id = $1, type = $2, chief_complaint = $3, present_illness = $4,
        physical_examination = $5, diagnosis = $6, treatment = $7, recommendations = $8,
        vital_signs = $9, images = $10, is_confidential = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *`,
      [
        noteData.appointmentId || null,
        noteData.type,
        noteData.chiefComplaint,
        noteData.presentIllness,
        noteData.physicalExamination,
        noteData.diagnosis || null,
        noteData.treatment || null,
        noteData.recommendations || null,
        noteData.vitalSigns ? JSON.stringify(noteData.vitalSigns) : null,
        noteData.images ? JSON.stringify(noteData.images) : null,
        noteData.isConfidential || false,
        id
      ]
    );

    const updatedNote = updatedNoteResult.rows[0];

    res.json({
      message: 'Nota clínica actualizada exitosamente',
      note: updatedNote
    });

  } catch (error) {
    console.error('Error actualizando nota clínica:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar la nota clínica'
    });
  }
});

// DELETE /api/clinical-notes/:id - Eliminar nota clínica
router.delete('/:id', authenticateToken, requirePermission('CLINICAL_NOTES', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la nota existe
    const existingNote = await query(
      'SELECT id, doctor_id FROM clinical_notes WHERE id = $1',
      [id]
    );

    if (existingNote.rows.length === 0) {
      return res.status(404).json({
        error: 'Nota clínica no encontrada',
        message: 'La nota clínica con el ID especificado no existe'
      });
    }

    // Solo super usuarios pueden eliminar notas clínicas
    if (req.user.role !== 'super_user') {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo los super usuarios pueden eliminar notas clínicas'
      });
    }

    // Eliminar nota clínica
    await query('DELETE FROM clinical_notes WHERE id = $1', [id]);

    res.json({
      message: 'Nota clínica eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando nota clínica:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la nota clínica'
    });
  }
});

// GET /api/clinical-notes/patient/:patientId - Obtener notas clínicas de un paciente
router.get('/patient/:patientId', authenticateToken, requirePermission('CLINICAL_NOTES', 'READ'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20, type = '' } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [`cn.patient_id = $1`];
    let queryParams = [parseInt(patientId)];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`cn.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM clinical_notes cn 
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        cn.id,
        cn.type,
        cn.chief_complaint,
        cn.diagnosis,
        cn.created_at,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM clinical_notes cn
      JOIN users d ON cn.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE ${whereClause}
      ORDER BY cn.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const notesResult = await query(mainQuery, queryParams);

    const notes = notesResult.rows.map(note => ({
      ...note,
      doctorFullName: `${note.doctor_first_name} ${note.doctor_last_name}`
    }));

    res.json({
      notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo notas clínicas del paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las notas clínicas del paciente'
    });
  }
});

module.exports = router; 