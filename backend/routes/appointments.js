const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
// Crear: exige fecha futura
const appointmentCreateSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del paciente debe ser un número',
    'number.integer': 'El ID del paciente debe ser un número entero',
    'number.positive': 'El ID del paciente debe ser positivo',
    'any.required': 'El ID del paciente es requerido'
  }),
  doctorId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del doctor debe ser un número',
    'number.integer': 'El ID del doctor debe ser un número entero',
    'number.positive': 'El ID del doctor debe ser positivo',
    'any.required': 'El ID del doctor es requerido'
  }),
  appointmentDate: Joi.date().min('now').required().messages({
    'date.min': 'La fecha de la cita debe ser futura',
    'any.required': 'La fecha de la cita es requerida'
  }),
  appointmentTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'El formato de hora debe ser HH:MM',
    'any.required': 'La hora de la cita es requerida'
  }),
  duration: Joi.number().integer().min(15).max(480).default(30).messages({
    'number.base': 'La duración debe ser un número',
    'number.integer': 'La duración debe ser un número entero',
    'number.min': 'La duración mínima es 15 minutos',
    'number.max': 'La duración máxima es 480 minutos (8 horas)'
  }),
  type: Joi.string().valid('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO').required().messages({
    'any.only': 'El tipo debe ser CONSULTA, CONTROL, URGENCIA, PROCEDIMIENTO u OTRO',
    'any.required': 'El tipo de cita es requerido'
  }),
  status: Joi.string().valid('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO').default('PROGRAMADA').messages({
    'any.only': 'El estado debe ser PROGRAMADA, CONFIRMADA, EN_PROGRESO, COMPLETADA, CANCELADA o NO_ASISTIO'
  }),
  reason: Joi.string().max(500).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  insurance: Joi.object({
    company: Joi.string().max(100).optional().allow(''),
    policyNumber: Joi.string().max(50).optional().allow(''),
    coverage: Joi.string().max(200).optional().allow('')
  }).optional()
});

// Update: permite actualizar citas pasadas (sin min('now'))
const appointmentUpdateSchema = Joi.object({
  patientId: Joi.number().integer().positive().required(),
  doctorId: Joi.number().integer().positive().required(),
  appointmentDate: Joi.date().required(),
  appointmentTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration: Joi.number().integer().min(15).max(480).default(30),
  type: Joi.string().valid('CONSULTA', 'CONTROL', 'URGENCIA', 'PROCEDIMIENTO', 'OTRO').required(),
  status: Joi.string().valid('PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO').required(),
  reason: Joi.string().max(500).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  insurance: Joi.object({
    company: Joi.string().max(100).optional().allow(''),
    policyNumber: Joi.string().max(50).optional().allow(''),
    coverage: Joi.string().max(200).optional().allow('')
  }).optional()
});

// Update solo doctor
const appointmentDoctorSchema = Joi.object({
  doctorId: Joi.number().integer().positive().required().messages({
    'number.base': 'El ID del doctor debe ser un número',
    'number.integer': 'El ID del doctor debe ser un número entero',
    'number.positive': 'El ID del doctor debe ser positivo',
    'any.required': 'El ID del doctor es requerido'
  })
});

// GET /api/appointments - Listar citas con filtros
router.get('/', authenticateToken, requirePermission('APPOINTMENTS', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      patientId = '', 
      doctorId = '', 
      status = '',
      type = '',
      dateFrom = '',
      dateTo = '',
      patientDocument = '',
      sortBy = 'appointment_date',
      sortOrder = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (patientId) {
      whereConditions.push(`a.patient_id = $${paramIndex}`);
      queryParams.push(parseInt(patientId));
      paramIndex++;
    }

    if (doctorId) {
      whereConditions.push(`a.doctor_id = $${paramIndex}`);
      queryParams.push(parseInt(doctorId));
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`a.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`a.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`a.appointment_date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`a.appointment_date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    // Filtro por documento del paciente (coincide con patients o patients_old)
    if (patientDocument) {
      whereConditions.push(`COALESCE(p.identification_number, po.document_number) = $${paramIndex}`);
      queryParams.push(patientDocument);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['appointment_date', 'appointment_time', 'created_at', 'status'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'appointment_date';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM appointments a 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        a.id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.duration,
        a.type,
        a.status,
        a.reason,
        a.notes,
        a.insurance,
        a.created_at,
        a.updated_at,
        COALESCE(p.first_name, po.first_name) as patient_first_name,
        COALESCE(p.last_name, po.last_name) as patient_last_name,
        COALESCE(p.identification_number, po.document_number) as patient_document,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN patients_old po ON a.patient_id = po.id
      JOIN users d ON a.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      ${whereClause}
      ORDER BY a.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const appointmentsResult = await query(mainQuery, queryParams);

    const appointments = appointmentsResult.rows.map(appointment => ({
      ...appointment,
      patientFullName: `${appointment.patient_first_name} ${appointment.patient_last_name}`,
      doctorFullName: `${appointment.doctor_first_name} ${appointment.doctor_last_name}`,
      appointmentDateTime: `${appointment.appointment_date}T${appointment.appointment_time}`
    }));

    res.json({
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo citas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las citas'
    });
  }
});

// GET /api/appointments/:id - Obtener cita específica
router.get('/:id', authenticateToken, requirePermission('APPOINTMENTS', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const appointmentResult = await query(
      `SELECT 
        a.*,
        COALESCE(p.first_name, po.first_name) as patient_first_name,
        COALESCE(p.last_name, po.last_name) as patient_last_name,
        COALESCE(p.identification_number, po.document_number) as patient_document,
        COALESCE(p.birth_date, po.birth_date) as patient_birth_date,
        COALESCE(p.gender, po.gender) as patient_gender,
        COALESCE(p.mobile_phone, po.phone) as patient_phone,
        COALESCE(p.email, po.email) as patient_email,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name,
        s.name as specialty_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN patients_old po ON a.patient_id = po.id
      JOIN users d ON a.doctor_id = d.id
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE a.id = $1`,
      [id]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    const appointment = appointmentResult.rows[0];
    appointment.patientFullName = `${appointment.patient_first_name} ${appointment.patient_last_name}`;
    appointment.doctorFullName = `${appointment.doctor_first_name} ${appointment.doctor_last_name}`;
    appointment.appointmentDateTime = `${appointment.appointment_date}T${appointment.appointment_time}`;

    res.json({ appointment });

  } catch (error) {
    console.error('Error obteniendo cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la cita'
    });
  }
});

// POST /api/appointments - Crear nueva cita
router.post('/', authenticateToken, requirePermission('APPOINTMENTS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = appointmentCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const appointmentData = value;

    // Verificar si el paciente existe
    const patientResult = await query(
      'SELECT id FROM patients WHERE id = $1',
      [appointmentData.patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente especificado no existe'
      });
    }

    // Verificar si el doctor existe y es médico
    const doctorResult = await query(
      'SELECT id, role FROM users WHERE id = $1 AND role = $2',
      [appointmentData.doctorId, 'medical_user']
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Doctor no encontrado',
        message: 'El doctor especificado no existe o no es un usuario médico'
      });
    }

    // Verificar conflictos de horario
    const conflictResult = await query(
      `SELECT id FROM appointments 
       WHERE doctor_id = $1 
       AND appointment_date = $2 
       AND status NOT IN ('CANCELADA', 'NO_ASISTIO')
       AND (
         (appointment_time <= $3 AND appointment_time + (duration || ' minutes')::interval > $3) OR
         ($3 < appointment_time + (duration || ' minutes')::interval AND $3 + ($4 || ' minutes')::interval > appointment_time)
       )`,
      [
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        appointmentData.appointmentTime,
        appointmentData.duration
      ]
    );

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflicto de horario',
        message: 'El doctor ya tiene una cita programada en ese horario'
      });
    }

    // Insertar nueva cita
    const newAppointmentResult = await query(
      `INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, appointment_time, duration,
        type, status, reason, notes, insurance, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        appointmentData.patientId,
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        appointmentData.appointmentTime,
        appointmentData.duration,
        appointmentData.type,
        appointmentData.status,
        appointmentData.reason || null,
        appointmentData.notes || null,
        appointmentData.insurance ? JSON.stringify(appointmentData.insurance) : null,
        req.user.id
      ]
    );

    const newAppointment = newAppointmentResult.rows[0];

    res.status(201).json({
      message: 'Cita creada exitosamente',
      appointment: newAppointment
    });

  } catch (error) {
    console.error('Error creando cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la cita'
    });
  }
});

// PUT /api/appointments/:id - Actualizar cita
router.put('/:id', authenticateToken, requirePermission('APPOINTMENTS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = appointmentUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const appointmentData = value;

    // Verificar si la cita existe
    const existingAppointment = await query(
      'SELECT id, status FROM appointments WHERE id = $1',
      [id]
    );

    if (existingAppointment.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    // No permitir modificar citas completadas o canceladas
    if (existingAppointment.rows[0].status === 'COMPLETADA' || existingAppointment.rows[0].status === 'CANCELADA') {
      return res.status(400).json({
        error: 'Cita no modificable',
        message: 'No se puede modificar una cita completada o cancelada'
      });
    }

    // Verificar conflictos de horario (excluyendo la cita actual)
    const conflictResult = await query(
      `SELECT id FROM appointments 
       WHERE doctor_id = $1 
       AND appointment_date = $2 
       AND id != $3
       AND status NOT IN ('CANCELADA', 'NO_ASISTIO')
       AND (
         (appointment_time <= $4 AND appointment_time + (duration || ' minutes')::interval > $4) OR
         ($4 < appointment_time + (duration || ' minutes')::interval AND $4 + ($5 || ' minutes')::interval > appointment_time)
       )`,
      [
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        id,
        appointmentData.appointmentTime,
        appointmentData.duration
      ]
    );

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflicto de horario',
        message: 'El doctor ya tiene una cita programada en ese horario'
      });
    }

    // Actualizar cita
    const updatedAppointmentResult = await query(
      `UPDATE appointments SET
        patient_id = $1, doctor_id = $2, appointment_date = $3, appointment_time = $4,
        duration = $5, type = $6, status = $7, reason = $8, notes = $9, 
        insurance = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *`,
      [
        appointmentData.patientId,
        appointmentData.doctorId,
        appointmentData.appointmentDate,
        appointmentData.appointmentTime,
        appointmentData.duration,
        appointmentData.type,
        appointmentData.status,
        appointmentData.reason || null,
        appointmentData.notes || null,
        appointmentData.insurance ? JSON.stringify(appointmentData.insurance) : null,
        id
      ]
    );

    const updatedAppointment = updatedAppointmentResult.rows[0];

    res.json({
      message: 'Cita actualizada exitosamente',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Error actualizando cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar la cita'
    });
  }
});

// PATCH /api/appointments/:id/doctor - Actualizar solo el profesional asignado
router.patch('/:id/doctor', authenticateToken, requirePermission('APPOINTMENTS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = appointmentDoctorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(d => d.message)
      });
    }

    const doctorId = value.doctorId;

    // Verificar existencia de la cita
    const apptResult = await query('SELECT id, status FROM appointments WHERE id = $1', [id]);
    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada', message: 'La cita no existe' });
    }

    // Verificar doctor válido y rol médico
    const doctorResult = await query('SELECT id FROM users WHERE id = $1 AND role = $2', [doctorId, 'medical_user']);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor no encontrado', message: 'El profesional no existe o no es médico' });
    }

    // Actualizar doctor
    const updated = await query('UPDATE appointments SET doctor_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [doctorId, id]);
    const appointment = updated.rows[0];
    return res.json({ message: 'Profesional actualizado', appointment });
  } catch (err) {
    console.error('Error actualizando doctor de cita:', err);
    return res.status(500).json({ error: 'Error interno del servidor', message: 'No se pudo actualizar el profesional' });
  }
});

// PATCH /api/appointments/:id/status - Cambiar estado de la cita
router.patch('/:id/status', authenticateToken, requirePermission('APPOINTMENTS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validar estado
    const validStatuses = ['PROGRAMADA', 'CONFIRMADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: 'El estado debe ser uno de: PROGRAMADA, CONFIRMADA, EN_PROGRESO, COMPLETADA, CANCELADA, NO_ASISTIO'
      });
    }

    // Verificar si la cita existe
    const existingAppointment = await query(
      'SELECT id, status FROM appointments WHERE id = $1',
      [id]
    );

    if (existingAppointment.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    // Actualizar estado
    const updatedAppointmentResult = await query(
      'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    const updatedAppointment = updatedAppointmentResult.rows[0];

    res.json({
      message: 'Estado de cita actualizado exitosamente',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Error actualizando estado de cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el estado de la cita'
    });
  }
});

// DELETE /api/appointments/:id - Eliminar cita
router.delete('/:id', authenticateToken, requirePermission('APPOINTMENTS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si la cita existe
    const existingAppointment = await query(
      'SELECT id, status FROM appointments WHERE id = $1',
      [id]
    );

    if (existingAppointment.rows.length === 0) {
      return res.status(404).json({
        error: 'Cita no encontrada',
        message: 'La cita con el ID especificado no existe'
      });
    }

    // No permitir eliminar citas en progreso o completadas
    if (existingAppointment.rows[0].status === 'EN_PROGRESO' || existingAppointment.rows[0].status === 'COMPLETADA') {
      return res.status(400).json({
        error: 'Cita no eliminable',
        message: 'No se puede eliminar una cita en progreso o completada'
      });
    }

    // Eliminar cita
    await query('DELETE FROM appointments WHERE id = $1', [id]);

    res.json({
      message: 'Cita eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando cita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar la cita'
    });
  }
});

module.exports = router; 