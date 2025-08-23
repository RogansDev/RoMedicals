const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación para RIPS
const ripsSchema = Joi.object({
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
  type: Joi.string().valid('AC', 'AP', 'US', 'AU', 'AT', 'AM', 'AH').required().messages({
    'any.only': 'El tipo debe ser AC, AP, US, AU, AT, AM o AH',
    'any.required': 'El tipo de RIPS es requerido'
  }),
  date: Joi.date().max('now').required().messages({
    'date.max': 'La fecha no puede ser futura',
    'any.required': 'La fecha es requerida'
  }),
  providerCode: Joi.string().max(20).required().messages({
    'string.max': 'El código del prestador no puede exceder 20 caracteres',
    'any.required': 'El código del prestador es requerido'
  }),
  providerName: Joi.string().max(200).required().messages({
    'string.max': 'El nombre del prestador no puede exceder 200 caracteres',
    'any.required': 'El nombre del prestador es requerido'
  }),
  serviceCode: Joi.string().max(20).required().messages({
    'string.max': 'El código del servicio no puede exceder 20 caracteres',
    'any.required': 'El código del servicio es requerido'
  }),
  serviceName: Joi.string().max(200).required().messages({
    'string.max': 'El nombre del servicio no puede exceder 200 caracteres',
    'any.required': 'El nombre del servicio es requerido'
  }),
  diagnosis: Joi.string().max(500).optional().allow(''),
  cost: Joi.number().min(0).required().messages({
    'number.base': 'El costo debe ser un número',
    'number.min': 'El costo no puede ser negativo',
    'any.required': 'El costo es requerido'
  }),
  copayment: Joi.number().min(0).default(0).messages({
    'number.base': 'El copago debe ser un número',
    'number.min': 'El copago no puede ser negativo'
  }),
  insurance: Joi.object({
    company: Joi.string().max(100).optional().allow(''),
    policyNumber: Joi.string().max(50).optional().allow(''),
    type: Joi.string().max(50).optional().allow('')
  }).optional(),
  status: Joi.string().valid('PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO').default('PENDIENTE').messages({
    'any.only': 'El estado debe ser PENDIENTE, APROBADO, RECHAZADO o PAGADO'
  }),
  notes: Joi.string().max(1000).optional().allow('')
});

// GET /api/rips - Listar RIPS con filtros
router.get('/', authenticateToken, requirePermission('RIPS', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      patientId = '', 
      type = '',
      status = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (patientId) {
      whereConditions.push(`r.patient_id = $${paramIndex}`);
      queryParams.push(parseInt(patientId));
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`r.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`r.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`r.date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`r.date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['date', 'type', 'status', 'cost', 'created_at'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM rips r 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        r.id,
        r.patient_id,
        r.appointment_id,
        r.clinical_note_id,
        r.type,
        r.date,
        r.provider_code,
        r.provider_name,
        r.service_code,
        r.service_name,
        r.diagnosis,
        r.cost,
        r.copayment,
        r.insurance,
        r.status,
        r.notes,
        r.created_at,
        r.updated_at,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.document_number as patient_document,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name
      FROM rips r
      JOIN patients p ON r.patient_id = p.id
      LEFT JOIN users d ON r.doctor_id = d.id
      ${whereClause}
      ORDER BY r.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const ripsResult = await query(mainQuery, queryParams);

    const rips = ripsResult.rows.map(rip => ({
      ...rip,
      patientFullName: `${rip.patient_first_name} ${rip.patient_last_name}`,
      doctorFullName: rip.doctor_first_name ? `${rip.doctor_first_name} ${rip.doctor_last_name}` : null,
      insurance: rip.insurance ? JSON.parse(rip.insurance) : null
    }));

    res.json({
      rips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los RIPS'
    });
  }
});

// GET /api/rips/:id - Obtener RIPS específico
router.get('/:id', authenticateToken, requirePermission('RIPS', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const ripsResult = await query(
      `SELECT 
        r.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.document_number as patient_document,
        p.birth_date as patient_birth_date,
        p.gender as patient_gender,
        d.first_name as doctor_first_name,
        d.last_name as doctor_last_name
      FROM rips r
      JOIN patients p ON r.patient_id = p.id
      LEFT JOIN users d ON r.doctor_id = d.id
      WHERE r.id = $1`,
      [id]
    );

    if (ripsResult.rows.length === 0) {
      return res.status(404).json({
        error: 'RIPS no encontrado',
        message: 'El RIPS con el ID especificado no existe'
      });
    }

    const rips = ripsResult.rows[0];
    rips.patientFullName = `${rips.patient_first_name} ${rips.patient_last_name}`;
    rips.doctorFullName = rips.doctor_first_name ? `${rips.doctor_first_name} ${rips.doctor_last_name}` : null;
    rips.insurance = rips.insurance ? JSON.parse(rips.insurance) : null;

    res.json({ rips });

  } catch (error) {
    console.error('Error obteniendo RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener el RIPS'
    });
  }
});

// POST /api/rips - Crear nuevo RIPS
router.post('/', authenticateToken, requirePermission('RIPS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = ripsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const ripsData = value;

    // Verificar si el paciente existe
    const patientResult = await query(
      'SELECT id FROM patients WHERE id = $1',
      [ripsData.patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente especificado no existe'
      });
    }

    // Verificar si la cita existe (si se proporciona)
    if (ripsData.appointmentId) {
      const appointmentResult = await query(
        'SELECT id FROM appointments WHERE id = $1',
        [ripsData.appointmentId]
      );

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Cita no encontrada',
          message: 'La cita especificada no existe'
        });
      }
    }

    // Verificar si la nota clínica existe (si se proporciona)
    if (ripsData.clinicalNoteId) {
      const clinicalNoteResult = await query(
        'SELECT id FROM clinical_notes WHERE id = $1',
        [ripsData.clinicalNoteId]
      );

      if (clinicalNoteResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Nota clínica no encontrada',
          message: 'La nota clínica especificada no existe'
        });
      }
    }

    // Insertar nuevo RIPS
    const newRipsResult = await query(
      `INSERT INTO rips (
        patient_id, doctor_id, appointment_id, clinical_note_id, type, date,
        provider_code, provider_name, service_code, service_name, diagnosis,
        cost, copayment, insurance, status, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      RETURNING *`,
      [
        ripsData.patientId,
        req.user.id,
        ripsData.appointmentId || null,
        ripsData.clinicalNoteId || null,
        ripsData.type,
        ripsData.date,
        ripsData.providerCode,
        ripsData.providerName,
        ripsData.serviceCode,
        ripsData.serviceName,
        ripsData.diagnosis || null,
        ripsData.cost,
        ripsData.copayment,
        ripsData.insurance ? JSON.stringify(ripsData.insurance) : null,
        ripsData.status,
        ripsData.notes || null
      ]
    );

    const newRips = newRipsResult.rows[0];

    res.status(201).json({
      message: 'RIPS creado exitosamente',
      rips: newRips
    });

  } catch (error) {
    console.error('Error creando RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear el RIPS'
    });
  }
});

// PUT /api/rips/:id - Actualizar RIPS
router.put('/:id', authenticateToken, requirePermission('RIPS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = ripsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const ripsData = value;

    // Verificar si el RIPS existe
    const existingRips = await query(
      'SELECT id, status FROM rips WHERE id = $1',
      [id]
    );

    if (existingRips.rows.length === 0) {
      return res.status(404).json({
        error: 'RIPS no encontrado',
        message: 'El RIPS con el ID especificado no existe'
      });
    }

    // No permitir modificar RIPS pagados
    if (existingRips.rows[0].status === 'PAGADO') {
      return res.status(400).json({
        error: 'RIPS no modificable',
        message: 'No se puede modificar un RIPS que ya ha sido pagado'
      });
    }

    // Actualizar RIPS
    const updatedRipsResult = await query(
      `UPDATE rips SET
        appointment_id = $1, clinical_note_id = $2, type = $3, date = $4,
        provider_code = $5, provider_name = $6, service_code = $7, service_name = $8,
        diagnosis = $9, cost = $10, copayment = $11, insurance = $12, 
        status = $13, notes = $14, updated_at = NOW()
      WHERE id = $15
      RETURNING *`,
      [
        ripsData.appointmentId || null,
        ripsData.clinicalNoteId || null,
        ripsData.type,
        ripsData.date,
        ripsData.providerCode,
        ripsData.providerName,
        ripsData.serviceCode,
        ripsData.serviceName,
        ripsData.diagnosis || null,
        ripsData.cost,
        ripsData.copayment,
        ripsData.insurance ? JSON.stringify(ripsData.insurance) : null,
        ripsData.status,
        ripsData.notes || null,
        id
      ]
    );

    const updatedRips = updatedRipsResult.rows[0];

    res.json({
      message: 'RIPS actualizado exitosamente',
      rips: updatedRips
    });

  } catch (error) {
    console.error('Error actualizando RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el RIPS'
    });
  }
});

// PATCH /api/rips/:id/status - Cambiar estado del RIPS
router.patch('/:id/status', authenticateToken, requirePermission('RIPS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validar estado
    const validStatuses = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: 'El estado debe ser PENDIENTE, APROBADO, RECHAZADO o PAGADO'
      });
    }

    // Verificar si el RIPS existe
    const existingRips = await query(
      'SELECT id, status FROM rips WHERE id = $1',
      [id]
    );

    if (existingRips.rows.length === 0) {
      return res.status(404).json({
        error: 'RIPS no encontrado',
        message: 'El RIPS con el ID especificado no existe'
      });
    }

    // Actualizar estado
    const updatedRipsResult = await query(
      'UPDATE rips SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    const updatedRips = updatedRipsResult.rows[0];

    res.json({
      message: 'Estado de RIPS actualizado exitosamente',
      rips: updatedRips
    });

  } catch (error) {
    console.error('Error actualizando estado de RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el estado del RIPS'
    });
  }
});

// DELETE /api/rips/:id - Eliminar RIPS
router.delete('/:id', authenticateToken, requirePermission('RIPS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el RIPS existe
    const existingRips = await query(
      'SELECT id, status FROM rips WHERE id = $1',
      [id]
    );

    if (existingRips.rows.length === 0) {
      return res.status(404).json({
        error: 'RIPS no encontrado',
        message: 'El RIPS con el ID especificado no existe'
      });
    }

    // No permitir eliminar RIPS pagados
    if (existingRips.rows[0].status === 'PAGADO') {
      return res.status(400).json({
        error: 'No se puede eliminar el RIPS',
        message: 'No se puede eliminar un RIPS que ya ha sido pagado'
      });
    }

    // Eliminar RIPS
    await query('DELETE FROM rips WHERE id = $1', [id]);

    res.json({
      message: 'RIPS eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar el RIPS'
    });
  }
});

// GET /api/rips/export - Exportar RIPS para entidades de salud
router.get('/export', authenticateToken, requirePermission('RIPS', 'READ'), async (req, res) => {
  try {
    const { dateFrom, dateTo, type = '', status = '' } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Fechas requeridas',
        message: 'Debe especificar fecha de inicio y fin para la exportación'
      });
    }

    // Construir condiciones de búsqueda
    let whereConditions = [`r.date >= $1`, `r.date <= $2`];
    let queryParams = [dateFrom, dateTo];
    let paramIndex = 3;

    if (type) {
      whereConditions.push(`r.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`r.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Obtener RIPS para exportación
    const ripsResult = await query(
      `SELECT 
        r.type,
        r.date,
        r.provider_code,
        r.provider_name,
        r.service_code,
        r.service_name,
        r.diagnosis,
        r.cost,
        r.copayment,
        r.status,
        p.document_type,
        p.document_number,
        p.first_name,
        p.last_name,
        p.birth_date,
        p.gender
      FROM rips r
      JOIN patients p ON r.patient_id = p.id
      WHERE ${whereClause}
      ORDER BY r.date ASC, r.type ASC`,
      queryParams
    );

    // Formatear datos para exportación según normativa RIPS
    const exportData = ripsResult.rows.map(rip => ({
      tipo: rip.type,
      fecha: rip.date,
      codigo_prestador: rip.provider_code,
      nombre_prestador: rip.provider_name,
      codigo_servicio: rip.service_code,
      nombre_servicio: rip.service_name,
      diagnostico: rip.diagnosis || '',
      valor: rip.cost,
      copago: rip.copayment,
      estado: rip.status,
      tipo_documento: rip.document_type,
      numero_documento: rip.document_number,
      primer_nombre: rip.first_name,
      primer_apellido: rip.last_name,
      fecha_nacimiento: rip.birth_date,
      sexo: rip.gender
    }));

    res.json({
      message: 'Datos exportados exitosamente',
      total: exportData.length,
      fecha_inicio: dateFrom,
      fecha_fin: dateTo,
      datos: exportData
    });

  } catch (error) {
    console.error('Error exportando RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al exportar los RIPS'
    });
  }
});

// GET /api/rips/statistics - Estadísticas de RIPS
router.get('/statistics/summary', authenticateToken, requirePermission('RIPS', 'READ'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (dateFrom) {
      whereConditions.push(`r.date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`r.date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Estadísticas generales
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_rips,
        COUNT(CASE WHEN status = 'PENDIENTE' THEN 1 END) as pendientes,
        COUNT(CASE WHEN status = 'APROBADO' THEN 1 END) as aprobados,
        COUNT(CASE WHEN status = 'RECHAZADO' THEN 1 END) as rechazados,
        COUNT(CASE WHEN status = 'PAGADO' THEN 1 END) as pagados,
        SUM(cost) as total_costo,
        SUM(copayment) as total_copago,
        AVG(cost) as promedio_costo
      FROM rips r
      ${whereClause}`,
      queryParams
    );

    // Estadísticas por tipo
    const typeStatsResult = await query(
      `SELECT 
        type,
        COUNT(*) as cantidad,
        SUM(cost) as total_costo,
        AVG(cost) as promedio_costo
      FROM rips r
      ${whereClause}
      GROUP BY type
      ORDER BY cantidad DESC`,
      queryParams
    );

    // Estadísticas por estado
    const statusStatsResult = await query(
      `SELECT 
        status,
        COUNT(*) as cantidad,
        SUM(cost) as total_costo
      FROM rips r
      ${whereClause}
      GROUP BY status
      ORDER BY cantidad DESC`,
      queryParams
    );

    const stats = statsResult.rows[0];
    const typeStats = typeStatsResult.rows;
    const statusStats = statusStatsResult.rows;

    res.json({
      estadisticas_generales: {
        total_rips: parseInt(stats.total_rips),
        pendientes: parseInt(stats.pendientes),
        aprobados: parseInt(stats.aprobados),
        rechazados: parseInt(stats.rechazados),
        pagados: parseInt(stats.pagados),
        total_costo: parseFloat(stats.total_costo || 0),
        total_copago: parseFloat(stats.total_copago || 0),
        promedio_costo: parseFloat(stats.promedio_costo || 0)
      },
      estadisticas_por_tipo: typeStats.map(stat => ({
        tipo: stat.type,
        cantidad: parseInt(stat.cantidad),
        total_costo: parseFloat(stat.total_costo || 0),
        promedio_costo: parseFloat(stat.promedio_costo || 0)
      })),
      estadisticas_por_estado: statusStats.map(stat => ({
        estado: stat.status,
        cantidad: parseInt(stat.cantidad),
        total_costo: parseFloat(stat.total_costo || 0)
      }))
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de RIPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las estadísticas'
    });
  }
});

module.exports = router; 