# Endpoints GET - Consulta de Datos

Todos estos endpoints aceptan autenticación con **JWT Token** o **API Key + Secret**.

---

## 1. Listar Especialidades

**GET** `http://148.230.90.103:3001/api/specialties`

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
```

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
```

**Query Parameters (opcionales):**
- `isActive`: `true` o `false` para filtrar por estado

**Ejemplo:**
```
GET http://148.230.90.103:3001/api/specialties?isActive=true
```

**Respuesta:**
```json
{
  "specialties": [
    {
      "id": "uuid-de-especialidad",
      "name": "Cardiología",
      "description": "Especialidad del corazón",
      "code": "CARD",
      "isActive": true,
      "createdAt": "2024-12-01T10:00:00.000Z",
      "doctors_count": 5
    }
  ]
}
```

---

## 2. Listar Especialistas/Doctores

**GET** `http://148.230.90.103:3001/api/specialists`

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
```

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
```

**Respuesta:**
```json
[
  {
    "id": "uuid-del-doctor",
    "title": "Dr",
    "firstName": "Carlos",
    "lastName": "Rodríguez",
    "email": "carlos.rodriguez@example.com",
    "phone": "+57 300 123 4567",
    "isActive": true,
    "specialtyId": "uuid-de-especialidad",
    "specialtyName": "Cardiología",
    "specialties": [
      {
        "id": "uuid-de-especialidad",
        "name": "Cardiología"
      }
    ],
    "schedule": {
      "monday": {
        "isWorking": true,
        "startTime": "08:00",
        "endTime": "17:00"
      }
    }
  }
]
```

---

## 3. Listar Pacientes

**GET** `http://148.230.90.103:3001/api/patients`

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
```

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
```

**Query Parameters (opcionales):**
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 20)
- `search`: Búsqueda por nombre o documento
- `documentType`: Filtrar por tipo de documento (CC, CE, TI, etc.)
- `gender`: Filtrar por género (Masculino, Femenino, Otro)
- `sortBy`: Campo para ordenar (first_name, last_name, created_at, etc.)
- `sortOrder`: Orden (ASC, DESC)

**Ejemplo:**
```
GET http://148.230.90.103:3001/api/patients?page=1&limit=20&search=Juan&sortBy=created_at&sortOrder=DESC
```

**Respuesta:**
```json
{
  "patients": [
    {
      "id": "uuid-del-paciente",
      "first_name": "Juan",
      "last_name": "Pérez",
      "fullName": "Juan Pérez",
      "identification_type": "CC",
      "identification_number": "1234567890",
      "gender": "Masculino",
      "birth_date": "1990-01-15",
      "age": 34,
      "email": "juan.perez@example.com",
      "mobile_phone": "3001234567",
      "address": "Calle 123 #45-67",
      "city": "Bogotá",
      "department": "Cundinamarca",
      "blood_type": "O+",
      "eps": "Sura",
      "created_at": "2024-12-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 4. Obtener Paciente por ID

**GET** `http://148.230.90.103:3001/api/patients/:id`

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
```

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
```

**Ejemplo:**
```
GET http://148.230.90.103:3001/api/patients/uuid-del-paciente
```

**Respuesta:**
```json
{
  "patient": {
    "id": "uuid-del-paciente",
    "first_name": "Juan",
    "last_name": "Pérez",
    "fullName": "Juan Pérez",
    "identification_type": "CC",
    "identification_number": "1234567890",
    "gender": "Masculino",
    "birth_date": "1990-01-15",
    "age": 34,
    "email": "juan.perez@example.com",
    "mobile_phone": "3001234567",
    "address": "Calle 123 #45-67",
    "city": "Bogotá",
    "department": "Cundinamarca",
    "blood_type": "O+",
    "eps": "Sura",
    "appointments_count": 5,
    "clinical_notes_count": 3,
    "evolutions_count": 2,
    "created_at": "2024-12-01T10:00:00.000Z"
  }
}
```

---

## 5. Listar Citas Médicas

**GET** `http://148.230.90.103:3001/api/appointments`

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
```

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
```

**Query Parameters (opcionales):**
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 20)
- `patientId`: Filtrar por ID de paciente
- `doctorId`: Filtrar por ID de doctor
- `status`: Filtrar por estado (PROGRAMADA, CONFIRMADA, COMPLETADA, etc.)
- `type`: Filtrar por tipo (CONSULTA, CONTROL, URGENCIA, etc.)
- `dateFrom`: Fecha desde (YYYY-MM-DD)
- `dateTo`: Fecha hasta (YYYY-MM-DD)
- `patientDocument`: Búsqueda por documento del paciente
- `sortBy`: Campo para ordenar (appointment_date, created_at, etc.)
- `sortOrder`: Orden (ASC, DESC)

**Ejemplo:**
```
GET http://148.230.90.103:3001/api/appointments?page=1&limit=20&status=PROGRAMADA&dateFrom=2024-12-01&sortBy=appointment_date&sortOrder=ASC
```

**Respuesta:**
```json
{
  "appointments": [
    {
      "id": "uuid-de-la-cita",
      "patient_id": "uuid-del-paciente",
      "patient_full_name": "Juan Pérez",
      "patient_document": "1234567890",
      "doctor_id": "uuid-del-doctor",
      "doctor_full_name": "Dr. Carlos Rodríguez",
      "appointment_date": "2024-12-25",
      "appointment_time": "10:00",
      "appointmentDateTime": "2024-12-25T10:00:00",
      "duration": 30,
      "type": "CONSULTA",
      "modality": "PRESENCIAL",
      "status": "PROGRAMADA",
      "reason": "Control de rutina",
      "notes": "Paciente requiere control post-operatorio",
      "specialty_id": "uuid-de-especialidad",
      "specialty_name": "Cardiología",
      "insurance": {
        "company": "Sura",
        "policyNumber": "POL123456",
        "coverage": "Plan básico"
      },
      "created_at": "2024-12-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## 6. Obtener Cita por ID

**GET** `http://148.230.90.103:3001/api/appointments/:id`

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
```

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
```

**Ejemplo:**
```
GET http://148.230.90.103:3001/api/appointments/uuid-de-la-cita
```

**Respuesta:**
```json
{
  "appointment": {
    "id": "uuid-de-la-cita",
    "patient_id": "uuid-del-paciente",
    "patient_full_name": "Juan Pérez",
    "doctor_id": "uuid-del-doctor",
    "doctor_full_name": "Dr. Carlos Rodríguez",
    "appointment_date": "2024-12-25",
    "appointment_time": "10:00",
    "duration": 30,
    "type": "CONSULTA",
    "modality": "PRESENCIAL",
    "status": "PROGRAMADA",
    "reason": "Control de rutina",
    "notes": "Paciente requiere control post-operatorio",
    "specialty_id": "uuid-de-especialidad",
    "insurance": {
      "company": "Sura",
      "policyNumber": "POL123456"
    },
    "created_at": "2024-12-01T10:00:00.000Z"
  }
}
```

---

## Resumen de Endpoints GET

| Endpoint | Descripción | Filtros Disponibles |
|----------|-------------|---------------------|
| `GET /api/specialties` | Listar especialidades | `isActive` |
| `GET /api/specialists` | Listar doctores | Ninguno |
| `GET /api/patients` | Listar pacientes | `page`, `limit`, `search`, `documentType`, `gender`, `sortBy`, `sortOrder` |
| `GET /api/patients/:id` | Obtener paciente | Ninguno |
| `GET /api/appointments` | Listar citas | `page`, `limit`, `patientId`, `doctorId`, `status`, `type`, `dateFrom`, `dateTo`, `patientDocument`, `sortBy`, `sortOrder` |
| `GET /api/appointments/:id` | Obtener cita | Ninguno |

---

## Notas Importantes

1. **Autenticación:** Todos los endpoints aceptan:
   - **JWT Token:** `Authorization: Bearer {{jwt_token}}`
   - **API Key:** `X-API-Key: {{api_key}}` + `X-API-Secret: {{api_secret}}`

2. **Paginación:** Los endpoints de listado (`/patients` y `/appointments`) incluyen paginación por defecto.

3. **Filtros:** Los query parameters son opcionales. Puedes combinarlos según necesites.

4. **Ordenamiento:** Usa `sortBy` y `sortOrder` para controlar cómo se ordenan los resultados.

5. **Búsqueda:** El parámetro `search` en pacientes busca en nombre, apellido y número de documento.

