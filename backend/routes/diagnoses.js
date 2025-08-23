const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const diagnosisSchema = Joi.object({
  code: Joi.string().max(10).required().messages({
    'string.max': 'El código no puede exceder 10 caracteres',
    'any.required': 'El código es requerido'
  }),
  description: Joi.string().max(500).required().messages({
    'string.max': 'La descripción no puede exceder 500 caracteres',
    'any.required': 'La descripción es requerida'
  }),
  category: Joi.string().max(100).optional().allow(''),
  isActive: Joi.boolean().default(true)
});

// GET /api/diagnoses - Listar diagnósticos con filtros
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      category = '',
      isActive = '',
      sortBy = 'code',
      sortOrder = 'ASC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(
        d.code ILIKE $${paramIndex} OR 
        d.description ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`d.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (isActive !== '') {
      whereConditions.push(`d.is_active = $${paramIndex}`);
      queryParams.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['code', 'description', 'category', 'created_at'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'code';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM diagnoses d 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        d.id,
        d.code,
        d.description,
        d.category,
        d.is_active,
        d.created_at,
        d.updated_at
      FROM diagnoses d
      ${whereClause}
      ORDER BY d.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const diagnosesResult = await query(mainQuery, queryParams);

    res.json({
      diagnoses: diagnosesResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo diagnósticos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los diagnósticos'
    });
  }
});

// GET /api/diagnoses/:id - Obtener diagnóstico específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const diagnosisResult = await query(
      'SELECT * FROM diagnoses WHERE id = $1',
      [id]
    );

    if (diagnosisResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Diagnóstico no encontrado',
        message: 'El diagnóstico con el ID especificado no existe'
      });
    }

    res.json({ diagnosis: diagnosisResult.rows[0] });

  } catch (error) {
    console.error('Error obteniendo diagnóstico:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener el diagnóstico'
    });
  }
});

// POST /api/diagnoses - Crear nuevo diagnóstico
router.post('/', authenticateToken, requirePermission('USERS', 'CREATE'), async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = diagnosisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const diagnosisData = value;

    // Verificar si ya existe un diagnóstico con el mismo código
    const existingDiagnosis = await query(
      'SELECT id FROM diagnoses WHERE code = $1',
      [diagnosisData.code]
    );

    if (existingDiagnosis.rows.length > 0) {
      return res.status(409).json({
        error: 'Código duplicado',
        message: 'Ya existe un diagnóstico con este código'
      });
    }

    // Insertar nuevo diagnóstico
    const newDiagnosisResult = await query(
      `INSERT INTO diagnoses (code, description, category, is_active, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [
        diagnosisData.code,
        diagnosisData.description,
        diagnosisData.category || null,
        diagnosisData.isActive
      ]
    );

    const newDiagnosis = newDiagnosisResult.rows[0];

    res.status(201).json({
      message: 'Diagnóstico creado exitosamente',
      diagnosis: newDiagnosis
    });

  } catch (error) {
    console.error('Error creando diagnóstico:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear el diagnóstico'
    });
  }
});

// PUT /api/diagnoses/:id - Actualizar diagnóstico
router.put('/:id', authenticateToken, requirePermission('USERS', 'UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar datos de entrada
    const { error, value } = diagnosisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: error.details.map(detail => detail.message)
      });
    }

    const diagnosisData = value;

    // Verificar si el diagnóstico existe
    const existingDiagnosis = await query(
      'SELECT id FROM diagnoses WHERE id = $1',
      [id]
    );

    if (existingDiagnosis.rows.length === 0) {
      return res.status(404).json({
        error: 'Diagnóstico no encontrado',
        message: 'El diagnóstico con el ID especificado no existe'
      });
    }

    // Verificar si ya existe otro diagnóstico con el mismo código
    const duplicateDiagnosis = await query(
      'SELECT id FROM diagnoses WHERE code = $1 AND id != $2',
      [diagnosisData.code, id]
    );

    if (duplicateDiagnosis.rows.length > 0) {
      return res.status(409).json({
        error: 'Código duplicado',
        message: 'Ya existe otro diagnóstico con este código'
      });
    }

    // Actualizar diagnóstico
    const updatedDiagnosisResult = await query(
      `UPDATE diagnoses SET
        code = $1, description = $2, category = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *`,
      [
        diagnosisData.code,
        diagnosisData.description,
        diagnosisData.category || null,
        diagnosisData.isActive,
        id
      ]
    );

    const updatedDiagnosis = updatedDiagnosisResult.rows[0];

    res.json({
      message: 'Diagnóstico actualizado exitosamente',
      diagnosis: updatedDiagnosis
    });

  } catch (error) {
    console.error('Error actualizando diagnóstico:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al actualizar el diagnóstico'
    });
  }
});

// DELETE /api/diagnoses/:id - Eliminar diagnóstico
router.delete('/:id', authenticateToken, requirePermission('USERS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el diagnóstico existe
    const existingDiagnosis = await query(
      'SELECT id FROM diagnoses WHERE id = $1',
      [id]
    );

    if (existingDiagnosis.rows.length === 0) {
      return res.status(404).json({
        error: 'Diagnóstico no encontrado',
        message: 'El diagnóstico con el ID especificado no existe'
      });
    }

    // Verificar si el diagnóstico está siendo usado
    const usageResult = await query(
      `SELECT 
        (SELECT COUNT(*) FROM clinical_notes WHERE diagnosis LIKE '%' || d.code || '%') as clinical_notes_count,
        (SELECT COUNT(*) FROM prescriptions WHERE diagnosis LIKE '%' || d.code || '%') as prescriptions_count
      FROM diagnoses d WHERE d.id = $1`,
      [id]
    );

    const counts = usageResult.rows[0];
    if (counts.clinical_notes_count > 0 || counts.prescriptions_count > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el diagnóstico',
        message: 'El diagnóstico está siendo usado en notas clínicas o prescripciones'
      });
    }

    // Eliminar diagnóstico
    await query('DELETE FROM diagnoses WHERE id = $1', [id]);

    res.json({
      message: 'Diagnóstico eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando diagnóstico:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar el diagnóstico'
    });
  }
});

// GET /api/diagnoses/search/autocomplete - Búsqueda para autocompletado
router.get('/search/autocomplete', authenticateToken, async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ diagnoses: [] });
    }

    const diagnosesResult = await query(
      `SELECT id, code, description, category
       FROM diagnoses 
       WHERE is_active = true AND (
         code ILIKE $1 OR 
         description ILIKE $1 OR
         category ILIKE $1
       )
       ORDER BY 
         CASE 
           WHEN code ILIKE $1 THEN 1
           WHEN description ILIKE $1 THEN 2
           ELSE 3
         END,
         code ASC
       LIMIT $2`,
      [`%${q}%`, parseInt(limit)]
    );

    res.json({
      diagnoses: diagnosesResult.rows
    });

  } catch (error) {
    console.error('Error en búsqueda de diagnósticos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error en la búsqueda'
    });
  }
});

// GET /api/diagnoses/categories - Obtener categorías de diagnósticos
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const categoriesResult = await query(
      `SELECT DISTINCT category 
       FROM diagnoses 
       WHERE category IS NOT NULL AND category != ''
       ORDER BY category ASC`
    );

    const categories = categoriesResult.rows.map(row => row.category);

    res.json({ categories });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las categorías'
    });
  }
});

// POST /api/diagnoses/import - Importar diagnósticos desde archivo
router.post('/import', authenticateToken, requirePermission('USERS', 'CREATE'), async (req, res) => {
  try {
    const { diagnoses } = req.body;

    if (!Array.isArray(diagnoses) || diagnoses.length === 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'Debe proporcionar un array de diagnósticos'
      });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (const diagnosis of diagnoses) {
      try {
        // Validar datos del diagnóstico
        const { error, value } = diagnosisSchema.validate(diagnosis);
        if (error) {
          errors.push({
            code: diagnosis.code || 'N/A',
            error: error.details[0].message
          });
          continue;
        }

        // Verificar si ya existe
        const existingDiagnosis = await query(
          'SELECT id FROM diagnoses WHERE code = $1',
          [value.code]
        );

        if (existingDiagnosis.rows.length > 0) {
          skipped++;
          continue;
        }

        // Insertar diagnóstico
        await query(
          `INSERT INTO diagnoses (code, description, category, is_active, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            value.code,
            value.description,
            value.category || null,
            value.isActive
          ]
        );

        imported++;
      } catch (error) {
        errors.push({
          code: diagnosis.code || 'N/A',
          error: error.message
        });
      }
    }

    res.json({
      message: 'Importación completada',
      summary: {
        imported,
        skipped,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error importando diagnósticos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error durante la importación'
    });
  }
});

module.exports = router; 