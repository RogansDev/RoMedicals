const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// VideoSDK API Key y Secret Key - Deben configurarse en variables de entorno
const VIDEO_SDK_API_KEY = process.env.VIDEOSDK_API_KEY || '24a5dade-4724-43d5-bd4a-e0abc65ba9e7';
const VIDEO_SDK_SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY || '803dff6a297c86f03e713bca009dc05ce9e26468ae18201cb1532c1d939cf404';

/**
 * POST /api/videosdk/token
 * Genera un token de autenticación para VideoSDK
 * Requiere autenticación
 */
router.post('/token', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Petición recibida en /api/videosdk/token');
    console.log('👤 Usuario autenticado:', req.user?.email || 'No disponible');
    
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      console.error('❌ Usuario no autenticado en /api/videosdk/token');
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Debes estar autenticado para generar tokens de VideoSDK'
      });
    }

    // Permisos para el token del doctor - según el ejemplo funcional usa ['allow_join', 'allow_mod']
    const permissions = ['allow_join', 'allow_mod'];

    // Generar token JWT directamente (VideoSDK usa JWT tokens firmados con el SECRET_KEY, no el API_KEY)
    console.log('🔑 Generando token JWT de VideoSDK con API Key:', VIDEO_SDK_API_KEY.substring(0, 10) + '...');
    console.log('🔐 Usando SECRET_KEY para firmar el token');
    
    try {
      // Crear el payload del JWT exactamente como VideoSDK lo espera
      // Basado en el ejemplo funcional: { apikey, permissions: ['allow_join', 'allow_mod'] }
      const payload = {
        apikey: VIDEO_SDK_API_KEY,
        permissions: permissions
      };

      // Generar el token JWT firmado con el SECRET_KEY (no el API_KEY)
      // El token expira en 24 horas (86400 segundos)
      // VideoSDK usa HS256 como algoritmo
      const token = jwt.sign(payload, VIDEO_SDK_SECRET_KEY, {
        algorithm: 'HS256',
        expiresIn: '24h'
      });
      
      console.log('🔍 Token generado (primeros 50 chars):', token.substring(0, 50) + '...');

      console.log('✅ Token JWT de VideoSDK generado para usuario:', req.user.email);

      res.json({
        token: token,
        expiresIn: 86400, // 24 horas
        permissions: permissions
      });
    } catch (jwtError) {
      console.error('❌ Error generando token JWT:', jwtError);
      return res.status(500).json({
        error: 'Error al generar token',
        message: 'No se pudo generar el token de VideoSDK',
        details: jwtError.message
      });
    }

  } catch (error) {
    console.error('Error en generación de token VideoSDK:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al generar el token de VideoSDK'
    });
  }
});

/**
 * GET /api/videosdk/rooms/active
 * Obtiene las salas de videollamada activas basándose en sesiones activas
 * Requiere autenticación
 */
router.get('/rooms/active', authenticateToken, async (req, res) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Debes estar autenticado para ver las salas activas'
      });
    }

    // Generar token JWT para autenticación con VideoSDK
    let videoToken;
    try {
      const permissions = ['allow_join', 'allow_mod'];
      const payload = {
        apikey: VIDEO_SDK_API_KEY,
        permissions: permissions
      };
      
      videoToken = jwt.sign(payload, VIDEO_SDK_SECRET_KEY, {
        algorithm: 'HS256',
        expiresIn: '24h'
      });
    } catch (tokenError) {
      console.error('❌ Error generando token para obtener salas:', tokenError);
      return res.status(500).json({
        error: 'Error al generar token',
        message: 'No se pudo generar el token de autenticación'
      });
    }

    // 1. Obtener todas las sesiones activas (status === "ongoing")
    let activeSessions = [];
    try {
      const sessionsResponse = await fetch('https://api.videosdk.live/v2/sessions', {
        method: 'GET',
        headers: {
          'authorization': videoToken,
          'Content-Type': 'application/json',
        },
      });

      if (!sessionsResponse.ok) {
        const errorData = await sessionsResponse.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('❌ Error obteniendo sesiones de VideoSDK:', errorData);
      } else {
        const sessionsData = await sessionsResponse.json();
        const allSessions = sessionsData.data || sessionsData || [];
        
        // Filtrar sesiones activas con status "ongoing" y el apiKey específico
        activeSessions = allSessions.filter(
          session => session.status === 'ongoing' && session.apiKey === VIDEO_SDK_API_KEY
        );
        
        console.log('📹 Sesiones activas encontradas:', activeSessions.length);
        if (activeSessions.length > 0) {
          console.log('📋 Detalles de sesiones activas:', JSON.stringify(activeSessions, null, 2));
        }
      }
    } catch (sessionsError) {
      console.error('❌ Error al obtener sesiones:', sessionsError.message);
    }

    // 2. Obtener todas las salas (rooms) y filtrar las que no están deshabilitadas
    let allRooms = [];
    try {
      const roomsResponse = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'GET',
        headers: {
          'authorization': videoToken,
          'Content-Type': 'application/json',
        },
      });

      if (!roomsResponse.ok) {
        const errorData = await roomsResponse.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('❌ Error obteniendo salas de VideoSDK:', errorData);
      } else {
        const roomsData = await roomsResponse.json();
        const rooms = roomsData.data || roomsData || [];
        
        // Filtrar salas que no están deshabilitadas
        allRooms = rooms.filter(room => !room.disabled);
        
        console.log('🏠 Salas encontradas (no deshabilitadas):', allRooms.length);
      }
    } catch (roomsError) {
      console.error('❌ Error al obtener salas:', roomsError.message);
    }

    // Función para parsear el nombre del participante (formato: "Nombre_Telefono")
    const parseParticipantName = (nameString) => {
      if (!nameString || typeof nameString !== 'string') {
        return { name: nameString || 'Desconocido', phone: null };
      }
      
      const parts = nameString.split('_');
      if (parts.length >= 2) {
        const name = parts[0];
        const phone = parts.slice(1).join('_'); // Por si hay múltiples guiones bajos
        return { name, phone };
      }
      
      // Si no tiene el formato esperado, devolver el nombre completo
      return { name: nameString, phone: null };
    };

    // 3. Combinar información: salas que tienen sesiones activas
    const activeRoomsMap = new Map();
    
    // Agregar salas que tienen sesiones activas
    activeSessions.forEach(session => {
      const roomId = session.roomId || session.room_id;
      if (roomId) {
        if (!activeRoomsMap.has(roomId)) {
          activeRoomsMap.set(roomId, {
            roomId: roomId,
            status: 'active',
            activeSessions: [],
            participants: [],
            participantCount: 0,
            createdAt: session.createdAt || session.created_at,
            customMeetingId: session.customMeetingId || session.customRoomId,
            sessionDetails: []
          });
        }
        
        const room = activeRoomsMap.get(roomId);
        room.activeSessions.push(session);
        room.sessionDetails.push(session);
        
        // Extraer participantes de la sesión
        const sessionParticipants = session.participants || [];
        if (Array.isArray(sessionParticipants)) {
          sessionParticipants.forEach(participant => {
            const participantName = participant.name || participant.displayName || participant.id || 'Desconocido';
            const { name, phone } = parseParticipantName(participantName);
            
            // Agregar participante si no existe ya (evitar duplicados)
            const existingParticipant = room.participants.find(p => p.name === name && p.phone === phone);
            if (!existingParticipant) {
              room.participants.push({
                name: name,
                phone: phone,
                originalName: participantName,
                participantId: participant.id || participant.participantId,
                joinedAt: participant.joinedAt || participant.createdAt
              });
              room.participantCount++;
            }
          });
        } else if (typeof sessionParticipants === 'number') {
          // Si solo es un número, incrementar el contador
          room.participantCount += sessionParticipants;
        }
      }
    });
    
    // Enriquecer con información de las salas
    allRooms.forEach(room => {
      const roomId = room.roomId || room.room_id || room.id;
      if (activeRoomsMap.has(roomId)) {
        const activeRoom = activeRoomsMap.get(roomId);
        activeRoom.createdAt = activeRoom.createdAt || room.createdAt || room.created_at;
        activeRoom.customMeetingId = activeRoom.customMeetingId || room.customMeetingId || room.customRoomId;
        activeRoom.roomDetails = room;
      }
    });
    
    const activeRooms = Array.from(activeRoomsMap.values()).map(room => ({
      roomId: room.roomId,
      status: room.status,
      createdAt: room.createdAt,
      participants: room.participants, // Lista completa de participantes con nombre y teléfono
      participantCount: room.participantCount,
      activeSessions: room.activeSessions.length,
      customMeetingId: room.customMeetingId,
      sessions: room.sessionDetails
    }));
    
    console.log('📊 Total de salas activas (con sesiones ongoing):', activeRooms.length);

    res.json({
      success: true,
      total: activeRooms.length,
      rooms: activeRooms,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo salas activas de VideoSDK:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener las salas activas',
      details: error.message
    });
  }
});

/**
 * POST /api/videosdk/rooms
 * Crea una nueva sala de videollamada
 * Requiere autenticación y token de VideoSDK
 */
router.post('/rooms', authenticateToken, async (req, res) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Debes estar autenticado para crear salas de videollamada'
      });
    }

    // Obtener el token de VideoSDK del body o generar uno nuevo
    let videoToken = req.body.token;
    
    if (!videoToken) {
      // Si no se proporciona token, generar uno nuevo usando JWT
      try {
        // Permisos para el doctor según el ejemplo funcional
        const permissions = ['allow_join', 'allow_mod'];
        const payload = {
          apikey: VIDEO_SDK_API_KEY,
          permissions: permissions
        };
        
        // Firmar con SECRET_KEY, no con API_KEY
        videoToken = jwt.sign(payload, VIDEO_SDK_SECRET_KEY, {
          algorithm: 'HS256',
          expiresIn: '24h'
        });
        
        console.log('🔑 Token JWT generado para crear sala');
      } catch (tokenError) {
        console.error('❌ Error generando token para sala:', tokenError);
        return res.status(500).json({
          error: 'Error al generar token',
          message: 'No se pudo generar el token de autenticación'
        });
      }
    }

    // Crear la sala
    // Según el ejemplo funcional, el header debe ser 'authorization' (minúscula) y el token sin 'Bearer'
    const response = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'POST',
      headers: {
        'authorization': videoToken, // VideoSDK espera 'authorization' en minúscula, sin 'Bearer'
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Body vacío según el ejemplo
    });
    
    console.log('📡 Respuesta de VideoSDK API al crear sala:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      console.error('Error creando sala de VideoSDK:', errorData);
      return res.status(response.status).json({
        error: 'Error al crear sala',
        message: errorData.message || 'No se pudo crear la sala de videollamada',
        details: errorData
      });
    }

    const data = await response.json();
    
    if (!data.roomId) {
      return res.status(500).json({
        error: 'Error al crear sala',
        message: 'La API de VideoSDK no devolvió un roomId válido'
      });
    }

    console.log('✅ Sala de VideoSDK creada:', data.roomId, 'para usuario:', req.user.email);

    res.json({
      roomId: data.roomId,
      token: videoToken,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en creación de sala VideoSDK:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear la sala de videollamada'
    });
  }
});
module.exports = router;

