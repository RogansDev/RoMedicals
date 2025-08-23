const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para almacenamiento
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipos de archivo permitidos
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif) y documentos (pdf, doc, docx)'));
    }
  }
});

// Función para crear directorio si no existe
const ensureUploadDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

// Función para procesar y guardar imagen
const processAndSaveImage = async (buffer, filename, width = 800, quality = 80) => {
  const uploadDir = path.join(__dirname, '../uploads/images');
  await ensureUploadDir(uploadDir);

  const processedImage = await sharp(buffer)
    .resize(width, null, { withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, processedImage);

  return `/uploads/images/${filename}`;
};

// Función para guardar documento
const saveDocument = async (buffer, filename) => {
  const uploadDir = path.join(__dirname, '../uploads/documents');
  await ensureUploadDir(uploadDir);

  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);

  return `/uploads/documents/${filename}`;
};

// POST /api/uploads/image - Subir imagen
router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Archivo requerido',
        message: 'Debe seleccionar una imagen para subir'
      });
    }

    const { patientId, type = 'general' } = req.body;
    
    // Generar nombre único para el archivo
    const fileExtension = path.extname(req.file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    
    // Procesar y guardar imagen
    const imagePath = await processAndSaveImage(req.file.buffer, filename);
    
    // Guardar registro en base de datos
    const uploadResult = await query(
      `INSERT INTO uploads (
        filename, original_name, file_path, file_type, file_size,
        patient_id, uploaded_by, upload_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        filename,
        req.file.originalname,
        imagePath,
        req.file.mimetype,
        req.file.size,
        patientId || null,
        req.user.id,
        type
      ]
    );

    const uploadRecord = uploadResult.rows[0];

    res.status(201).json({
      message: 'Imagen subida exitosamente',
      upload: {
        id: uploadRecord.id,
        filename: uploadRecord.filename,
        originalName: uploadRecord.original_name,
        filePath: uploadRecord.file_path,
        fileType: uploadRecord.file_type,
        fileSize: uploadRecord.file_size,
        uploadType: uploadRecord.upload_type,
        createdAt: uploadRecord.created_at
      }
    });

  } catch (error) {
    console.error('Error subiendo imagen:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al subir la imagen'
    });
  }
});

// POST /api/uploads/document - Subir documento
router.post('/document', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Archivo requerido',
        message: 'Debe seleccionar un documento para subir'
      });
    }

    const { patientId, type = 'general' } = req.body;
    
    // Generar nombre único para el archivo
    const fileExtension = path.extname(req.file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    
    // Guardar documento
    const documentPath = await saveDocument(req.file.buffer, filename);
    
    // Guardar registro en base de datos
    const uploadResult = await query(
      `INSERT INTO uploads (
        filename, original_name, file_path, file_type, file_size,
        patient_id, uploaded_by, upload_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        filename,
        req.file.originalname,
        documentPath,
        req.file.mimetype,
        req.file.size,
        patientId || null,
        req.user.id,
        type
      ]
    );

    const uploadRecord = uploadResult.rows[0];

    res.status(201).json({
      message: 'Documento subido exitosamente',
      upload: {
        id: uploadRecord.id,
        filename: uploadRecord.filename,
        originalName: uploadRecord.original_name,
        filePath: uploadRecord.file_path,
        fileType: uploadRecord.file_type,
        fileSize: uploadRecord.file_size,
        uploadType: uploadRecord.upload_type,
        createdAt: uploadRecord.created_at
      }
    });

  } catch (error) {
    console.error('Error subiendo documento:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al subir el documento'
    });
  }
});

// POST /api/uploads/multiple - Subir múltiples archivos
router.post('/multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Archivos requeridos',
        message: 'Debe seleccionar al menos un archivo para subir'
      });
    }

    const { patientId, type = 'general' } = req.body;
    const uploads = [];

    for (const file of req.files) {
      try {
        const fileExtension = path.extname(file.originalname);
        const filename = `${uuidv4()}${fileExtension}`;
        
        let filePath;
        
        // Determinar si es imagen o documento
        if (file.mimetype.startsWith('image/')) {
          filePath = await processAndSaveImage(file.buffer, filename);
        } else {
          filePath = await saveDocument(file.buffer, filename);
        }
        
        // Guardar registro en base de datos
        const uploadResult = await query(
          `INSERT INTO uploads (
            filename, original_name, file_path, file_type, file_size,
            patient_id, uploaded_by, upload_type, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *`,
          [
            filename,
            file.originalname,
            filePath,
            file.mimetype,
            file.size,
            patientId || null,
            req.user.id,
            type
          ]
        );

        uploads.push({
          id: uploadResult.rows[0].id,
          filename: uploadResult.rows[0].filename,
          originalName: uploadResult.rows[0].original_name,
          filePath: uploadResult.rows[0].file_path,
          fileType: uploadResult.rows[0].file_type,
          fileSize: uploadResult.rows[0].file_size,
          uploadType: uploadResult.rows[0].upload_type,
          createdAt: uploadResult.rows[0].created_at
        });
      } catch (error) {
        console.error(`Error procesando archivo ${file.originalname}:`, error);
      }
    }

    res.status(201).json({
      message: `${uploads.length} archivos subidos exitosamente`,
      uploads
    });

  } catch (error) {
    console.error('Error subiendo archivos múltiples:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al subir los archivos'
    });
  }
});

// GET /api/uploads - Listar uploads
router.get('/', authenticateToken, requirePermission('PATIENTS', 'READ'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      patientId = '', 
      type = '',
      uploadType = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (patientId) {
      whereConditions.push(`u.patient_id = $${paramIndex}`);
      queryParams.push(parseInt(patientId));
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`u.file_type LIKE $${paramIndex}`);
      queryParams.push(`%${type}%`);
      paramIndex++;
    }

    if (uploadType) {
      whereConditions.push(`u.upload_type = $${paramIndex}`);
      queryParams.push(uploadType);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenamiento
    const allowedSortFields = ['created_at', 'file_size', 'original_name'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM uploads u 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        u.id,
        u.filename,
        u.original_name,
        u.file_path,
        u.file_type,
        u.file_size,
        u.patient_id,
        u.upload_type,
        u.created_at,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        usr.first_name as user_first_name,
        usr.last_name as user_last_name
      FROM uploads u
      LEFT JOIN patients p ON u.patient_id = p.id
      JOIN users usr ON u.uploaded_by = usr.id
      ${whereClause}
      ORDER BY u.${finalSortBy} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const uploadsResult = await query(mainQuery, queryParams);

    const uploads = uploadsResult.rows.map(upload => ({
      ...upload,
      patientFullName: upload.patient_first_name ? `${upload.patient_first_name} ${upload.patient_last_name}` : null,
      userFullName: `${upload.user_first_name} ${upload.user_last_name}`
    }));

    res.json({
      uploads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo uploads:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los uploads'
    });
  }
});

// GET /api/uploads/:id - Obtener upload específico
router.get('/:id', authenticateToken, requirePermission('PATIENTS', 'READ'), async (req, res) => {
  try {
    const { id } = req.params;

    const uploadResult = await query(
      `SELECT 
        u.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        usr.first_name as user_first_name,
        usr.last_name as user_last_name
      FROM uploads u
      LEFT JOIN patients p ON u.patient_id = p.id
      JOIN users usr ON u.uploaded_by = usr.id
      WHERE u.id = $1`,
      [id]
    );

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Upload no encontrado',
        message: 'El upload con el ID especificado no existe'
      });
    }

    const upload = uploadResult.rows[0];
    upload.patientFullName = upload.patient_first_name ? `${upload.patient_first_name} ${upload.patient_last_name}` : null;
    upload.userFullName = `${upload.user_first_name} ${upload.user_last_name}`;

    res.json({ upload });

  } catch (error) {
    console.error('Error obteniendo upload:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener el upload'
    });
  }
});

// DELETE /api/uploads/:id - Eliminar upload
router.delete('/:id', authenticateToken, requirePermission('PATIENTS', 'DELETE'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el upload existe
    const existingUpload = await query(
      'SELECT id, file_path, uploaded_by FROM uploads WHERE id = $1',
      [id]
    );

    if (existingUpload.rows.length === 0) {
      return res.status(404).json({
        error: 'Upload no encontrado',
        message: 'El upload con el ID especificado no existe'
      });
    }

    const upload = existingUpload.rows[0];

    // Solo el usuario que subió el archivo o super usuarios pueden eliminarlo
    if (upload.uploaded_by !== req.user.id && req.user.role !== 'super_user') {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'Solo puede eliminar archivos que usted subió'
      });
    }

    // Eliminar archivo físico
    try {
      const filePath = path.join(__dirname, '..', upload.file_path);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error eliminando archivo físico:', error);
      // Continuar aunque no se pueda eliminar el archivo físico
    }

    // Eliminar registro de la base de datos
    await query('DELETE FROM uploads WHERE id = $1', [id]);

    res.json({
      message: 'Upload eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando upload:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al eliminar el upload'
    });
  }
});

// GET /api/uploads/patient/:patientId - Obtener uploads de un paciente
router.get('/patient/:patientId', authenticateToken, requirePermission('PATIENTS', 'READ'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20, type = '' } = req.query;

    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    let whereConditions = [`u.patient_id = $1`];
    let queryParams = [parseInt(patientId)];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`u.file_type LIKE $${paramIndex}`);
      queryParams.push(`%${type}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta para obtener total de registros
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM uploads u 
      WHERE ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Consulta principal
    const mainQuery = `
      SELECT 
        u.id,
        u.filename,
        u.original_name,
        u.file_path,
        u.file_type,
        u.file_size,
        u.upload_type,
        u.created_at,
        usr.first_name as user_first_name,
        usr.last_name as user_last_name
      FROM uploads u
      JOIN users usr ON u.uploaded_by = usr.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), offset);
    const uploadsResult = await query(mainQuery, queryParams);

    const uploads = uploadsResult.rows.map(upload => ({
      ...upload,
      userFullName: `${upload.user_first_name} ${upload.user_last_name}`
    }));

    res.json({
      uploads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo uploads del paciente:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener los uploads del paciente'
    });
  }
});

module.exports = router; 