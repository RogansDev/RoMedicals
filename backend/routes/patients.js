const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const patientSchema = Joi.object({
  // Datos personales
  guardianId: Joi.string().max(20).optional().allow(''),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 50 caracteres',
    'any.required': 'El nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede exceder 50 caracteres',
    'any.required': 'El apellido es requerido'
  }),
  identificationType: Joi.string().valid('CC', 'CE', 'TI', 'PP', 'RC').required().messages({
    'any.only': 'El tipo de documento debe ser CC, CE, TI, PP o RC',
    'any.required': 'El tipo de documento es requerido'
  }),
  identificationNumber: Joi.string().min(5).max(20).required().messages({
    'string.min': 'El número de documento debe tener al menos 5 caracteres',
    'string.max': 'El número de documento no puede exceder 20 caracteres',
    'any.required': 'El número de documento es requerido'
  }),
  residenceCountry: Joi.string().max(50).optional().allow(''),
  originCountry: Joi.string().max(50).optional().allow(''),
  isForeigner: Joi.boolean().default(false),
  gender: Joi.string().valid('Masculino', 'Femenino', 'Otro').required().messages({
    'any.only': 'El género debe ser Masculino, Femenino u Otro',
    'any.required': 'El género es requerido'
  }),
  birthDay: Joi.string().max(2).optional().allow(''),
  birthMonth: Joi.string().max(20).optional().allow(''),
  birthYear: Joi.string().max(4).optional().allow(''),
  bloodType: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional().allow(''),
  disability: Joi.string().max(50).optional().allow(''),
  occupation: Joi.string().max(50).optional().allow(''),
  maritalStatus: Joi.string().max(50).optional().allow(''),
  
  // Datos adicionales
  educationLevel: Joi.string().max(50).optional().allow(''),
  activityProfession: Joi.string().max(100).optional().allow(''),
  patientType: Joi.string().max(50).optional().allow(''),
  eps: Joi.string().max(100).optional().allow(''),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'El formato del email no es válido'
  }),
  address: Joi.string().max(200).optional().allow(''),
  city: Joi.string().max(50).optional().allow(''),
  department: Joi.string().max(50).optional().allow(''),
  residentialZone: Joi.string().max(50).optional().allow(''),
  landlinePhone: Joi.string().max(15).optional().allow(''),
  mobilePhoneCountry: Joi.string().max(10).optional().allow(''),
  mobilePhone: Joi.string().max(15).optional().allow(''),
  companionName: Joi.string().max(100).optional().allow(''),
  companionPhone: Joi.string().max(15).optional().allow(''),
  responsibleName: Joi.string().max(100).optional().allow(''),
  responsiblePhone: Joi.string().max(15).optional().allow(''),
  responsibleRelationship: Joi.string().max(50).optional().allow(''),
  agreement: Joi.string().max(50).optional().allow(''),
  observations: Joi.string().max(1000).optional().allow(''),
  reference: Joi.string().max(100).optional().allow('')
});

// Esquema para actualizar solo antecedentes clínicos
const medicalHistorySchema = Joi.object({
  medicalHistory: Joi.string().allow('').required()
});

// GET /api/patients - Listar pacientes con filtros
router.get('/', authenticateToken, requirePermission('PATIENTS', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      documentType = '', 
      gender = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(
        p.first_name ILIKE $${paramIndex} OR 
        p.last_name ILIKE $${paramIndex} OR 
        p.identification_number ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (documentType) {
      whereConditions.push(`p.identification_type = $${paramIndex}`);
      queryParams.push(documentType);
      paramIndex++;
    }

    if (gender) {
      whereConditions.push(`p.gender = $${paramIndex}`);
      queryParams.push(gender);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['first_name', 'last_name', 'identification_number', 'birth_date', 'created_at'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM patients p 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        p.id,
        p.identification_type,
        p.identification_number,
        p.first_name,
        p.last_name,
        p.birth_date,
        p.gender,
        p.email,
        p.mobile_phone,
        p.address,
        p.city,
        p.department,
        p.blood_type,
        p.patient_type,
        p.created_at,
        p.updated_at,
        COUNT(a.id) as appointments_count
      FROM patients p
      LEFT JOIN appointments a ON p.id = a.patient_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const patientsResult = await query(mainQuery, queryParams);

    const patients = patientsResult.rows.map(patient => ({
      ...patient,
      age: calculateAge(patient.birth_date),
      fullName: `${patient.first_name} ${patient.last_name}`,
      // Mapear campos para compatibilidad con el frontend
      documentType: patient.identification_type,
      documentNumber: patient.identification_number,
      phone: patient.mobile_phone
    }));

    res.json({
      patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo pacientes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los pacientes'
    });
  }
});

// GET /api/patients/:id - Obtener paciente específico
router.get('/:id', authenticateToken, requirePermission('PATIENTS', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const patientResult = await query(
      `SELECT 
        p.*,
        COUNT(a.id) as appointments_count,
        COUNT(cn.id) as clinical_notes_count,
        COUNT(ev.id) as evolutions_count
      FROM patients p
      LEFT JOIN appointments a ON p.id = a.patient_id
      LEFT JOIN clinical_notes cn ON p.id = cn.patient_id
      LEFT JOIN evolutions ev ON p.id = ev.patient_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente con el ID especificado no existe'
      });
    }

    const patient = patientResult.rows[0];
    patient.age = calculateAge(patient.birth_date);
    patient.fullName = `${patient.first_name} ${patient.last_name}`;

    res.json({ patient });

  } catch (error) {
    console.error('Error obteniendo paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener el paciente'
    });
  }
});

// POST /api/patients - Crear nuevo paciente
router.post('/', authenticateToken, requirePermission('PATIENTS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = patientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const patientData = value;

    // Verificar si ya existe un paciente con el mismo documento
    const existingPatient = await query(
      'SELECT id FROM patients WHERE identification_type = $1 AND identification_number = $2',
      [patientData.identificationType, patientData.identificationNumber]
    );

    if (existingPatient.rows.length > 0) {
      return res.status(409).json({
        error: 'Paciente ya existe',
        message: 'Ya existe un paciente con este tipo y número de documento'
      });
    }

    // Construir fecha de nacimiento
    const birthDate = patientData.birthYear && patientData.birthMonth && patientData.birthDay 
      ? `${patientData.birthYear}-${getMonthNumber(patientData.birthMonth)}-${patientData.birthDay.padStart(2, '0')}`
      : null;

    // Insertar nuevo paciente
    const newPatientResult = await query(
      `INSERT INTO patients (
        guardian_id, first_name, last_name, identification_type, identification_number,
        residence_country, origin_country, is_foreigner, gender, birth_date,
        blood_type, disability, occupation, marital_status, education_level,
        activity_profession, patient_type, eps, email, address, city, department,
        residential_zone, landline_phone, mobile_phone_country, mobile_phone,
        companion_name, companion_phone, responsible_name, responsible_phone,
        responsible_relationship, agreement, observations, reference, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
      RETURNING *`,
      [
        patientData.guardianId || null,
        patientData.firstName,
        patientData.lastName,
        patientData.identificationType,
        patientData.identificationNumber,
        patientData.residenceCountry || null,
        patientData.originCountry || null,
        patientData.isForeigner || false,
        patientData.gender,
        birthDate,
        patientData.bloodType || null,
        patientData.disability || null,
        patientData.occupation || null,
        patientData.maritalStatus || null,
        patientData.educationLevel || null,
        patientData.activityProfession || null,
        patientData.patientType || null,
        patientData.eps || null,
        patientData.email || null,
        patientData.address || null,
        patientData.city || null,
        patientData.department || null,
        patientData.residentialZone || null,
        patientData.landlinePhone || null,
        patientData.mobilePhoneCountry || null,
        patientData.mobilePhone || null,
        patientData.companionName || null,
        patientData.companionPhone || null,
        patientData.responsibleName || null,
        patientData.responsiblePhone || null,
        patientData.responsibleRelationship || null,
        patientData.agreement || null,
        patientData.observations || null,
        patientData.reference || null,
        req.user.id
      ]
    );

    const newPatient = newPatientResult.rows[0];
    newPatient.age = calculateAge(newPatient.birth_date);
    newPatient.fullName = `${newPatient.first_name} ${newPatient.last_name}`;

    res.status(201).json({
      message: 'Paciente creado exitosamente',
      patient: newPatient
    });

  } catch (error) {
    console.error('Error creando paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear el paciente'
    });
  }
});

// PUT /api/patients/:id - Actualizar paciente
router.put('/:id', authenticateToken, requirePermission('PATIENTS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = patientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const patientData = value;

    // Verificar si el paciente existe
    const existingPatient = await query(
      'SELECT id FROM patients WHERE id = $1',
      [id]
    );

    if (existingPatient.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente con el ID especificado no existe'
      });
    }

    // Verificar si el documento ya existe en otro paciente
    const duplicateDocument = await query(
      'SELECT id FROM patients WHERE identification_type = $1 AND identification_number = $2 AND id != $3',
      [patientData.identificationType, patientData.identificationNumber, id]
    );

    if (duplicateDocument.rows.length > 0) {
      return res.status(409).json({
        error: 'Documento duplicado',
        message: 'Ya existe otro paciente con este tipo y número de documento'
      });
    }

    // Construir fecha de nacimiento
    const birthDate = patientData.birthYear && patientData.birthMonth && patientData.birthDay 
      ? `${patientData.birthYear}-${getMonthNumber(patientData.birthMonth)}-${patientData.birthDay.padStart(2, '0')}`
      : null;

    // Actualizar paciente
    const updatedPatientResult = await query(
      `UPDATE patients SET
        guardian_id = $1, first_name = $2, last_name = $3, identification_type = $4,
        identification_number = $5, residence_country = $6, origin_country = $7,
        is_foreigner = $8, gender = $9, birth_date = $10, blood_type = $11,
        disability = $12, occupation = $13, marital_status = $14, education_level = $15,
        activity_profession = $16, patient_type = $17, eps = $18, email = $19,
        address = $20, city = $21, department = $22, residential_zone = $23,
        landline_phone = $24, mobile_phone_country = $25, mobile_phone = $26,
        companion_name = $27, companion_phone = $28, responsible_name = $29,
        responsible_phone = $30, responsible_relationship = $31, agreement = $32,
        observations = $33, reference = $34, updated_at = NOW()
      WHERE id = $35
      RETURNING *`,
      [
        patientData.guardianId || null,
        patientData.firstName,
        patientData.lastName,
        patientData.identificationType,
        patientData.identificationNumber,
        patientData.residenceCountry || null,
        patientData.originCountry || null,
        patientData.isForeigner || false,
        patientData.gender,
        birthDate,
        patientData.bloodType || null,
        patientData.disability || null,
        patientData.occupation || null,
        patientData.maritalStatus || null,
        patientData.educationLevel || null,
        patientData.activityProfession || null,
        patientData.patientType || null,
        patientData.eps || null,
        patientData.email || null,
        patientData.address || null,
        patientData.city || null,
        patientData.department || null,
        patientData.residentialZone || null,
        patientData.landlinePhone || null,
        patientData.mobilePhoneCountry || null,
        patientData.mobilePhone || null,
        patientData.companionName || null,
        patientData.companionPhone || null,
        patientData.responsibleName || null,
        patientData.responsiblePhone || null,
        patientData.responsibleRelationship || null,
        patientData.agreement || null,
        patientData.observations || null,
        patientData.reference || null,
        id
      ]
    );

    const updatedPatient = updatedPatientResult.rows[0];
    updatedPatient.age = calculateAge(updatedPatient.birth_date);
    updatedPatient.fullName = `${updatedPatient.first_name} ${updatedPatient.last_name}`;

    res.json({
      message: 'Paciente actualizado exitosamente',
      patient: updatedPatient
    });

  } catch (error) {
    console.error('Error actualizando paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el paciente'
    });
  }
});

// PATCH /api/patients/:id/medical-history - Actualizar antecedentes clínicos
router.patch('/:id/medical-history', authenticateToken, requirePermission('PATIENTS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = medicalHistorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.details.map(d => d.message) });
    }

    const exists = await query('SELECT id FROM patients WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    const upd = await query(
      'UPDATE patients SET medical_history = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [value.medicalHistory, id]
    );
    const patient = upd.rows[0];
    patient.age = calculateAge(patient.birth_date);
    patient.fullName = `${patient.first_name} ${patient.last_name}`;
    res.json({ message: 'Antecedentes actualizados', patient });
  } catch (error) {
    console.error('Error actualizando antecedentes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/patients/:id - Eliminar paciente
router.delete('/:id', authenticateToken, requirePermission('PATIENTS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el paciente existe
    const existingPatient = await query(
      'SELECT id FROM patients WHERE id = $1',
      [id]
    );

    if (existingPatient.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente no encontrado',
        message: 'El paciente con el ID especificado no existe'
      });
    }

    // Verificar si tiene registros relacionados
    const relatedRecords = await query(
      `SELECT 
        (SELECT COUNT(*) FROM appointments WHERE patient_id = $1) as appointments_count,
        (SELECT COUNT(*) FROM clinical_notes WHERE patient_id = $1) as clinical_notes_count,
        (SELECT COUNT(*) FROM evolutions WHERE patient_id = $1) as evolutions_count`,
      [id]
    );

    const counts = relatedRecords.rows[0];
    if (counts.appointments_count > 0 || counts.clinical_notes_count > 0 || counts.evolutions_count > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el paciente',
        message: 'El paciente tiene registros médicos asociados y no puede ser eliminado'
      });
    }

    // Eliminar paciente
    await query('DELETE FROM patients WHERE id = $1', [id]);

    res.json({
      message: 'Paciente eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar el paciente'
    });
  }
});

// Función auxiliar para convertir mes a número
function getMonthNumber(monthName) {
  const months = {
    'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
    'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
    'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
  };
  return months[monthName] || '01';
}

// Función auxiliar para calcular edad
function calculateAge(birthDate) {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

module.exports = router; 