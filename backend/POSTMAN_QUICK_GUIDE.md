# Guía Rápida Postman - ROMEDICALS API

## Paso 1: Login (Obtener JWT Token)

**POST** `http://148.230.90.103:3001/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "tu_email@example.com",
  "password": "tu_password"
}
```

**Respuesta:** Guarda el `token` de la respuesta en una variable `{{jwt_token}}`

---

## Paso 2: Crear API Key

**POST** `http://148.230.90.103:3001/api/api-keys`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Sistema de Gestión Externa",
  "description": "API key para integración",
  "expiresAt": null
}
```

**Respuesta:** Guarda `api_key` y `api_secret` en variables `{{api_key}}` y `{{api_secret}}`

---

## Paso 3: Importar Especialidades

**POST** `http://148.230.90.103:3001/api/specialties/import`

**Headers:**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body:**
```json
{
  "specialties": [
    {
      "name": "Cardiología",
      "description": "Especialidad del corazón",
      "code": "CARD",
      "isActive": true
    },
    {
      "name": "Neurología",
      "description": "Especialidad del sistema nervioso",
      "code": "NEURO",
      "isActive": true
    }
  ],
  "options": {
    "skipDuplicates": true,
    "updateExisting": false
  }
}
```

---

## Paso 4: Importar Especialistas/Doctores

**POST** `http://148.230.90.103:3001/api/specialists/import`

**Headers:**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body:**
```json
{
  "specialists": [
    {
      "firstName": "Carlos",
      "lastName": "Rodríguez",
      "email": "carlos.rodriguez@example.com",
      "phone": "+57 300 123 4567",
      "idType": "CC",
      "idNumber": "1234567890",
      "title": "Dr",
      "specialtyId": "uuid-de-especialidad"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "updateExisting": false,
    "generatePasswords": true
  }
}
```

**Respuesta:** Guarda los `userId` de los especialistas creados y las `password` generadas.

---

## Paso 5: Importar Pacientes

**POST** `http://148.230.90.103:3001/api/patients/import`

**Headers:**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body:**
```json
{
  "patients": [
    {
      "firstName": "Juan",
      "lastName": "Pérez",
      "identificationType": "CC",
      "identificationNumber": "1234567890",
      "gender": "Masculino",
      "birthYear": "1990",
      "birthMonth": "Enero",
      "birthDay": "15",
      "email": "juan.perez@example.com",
      "mobilePhone": "3001234567",
      "mobilePhoneCountry": "+57",
      "address": "Calle 123 #45-67",
      "city": "Bogotá",
      "department": "Cundinamarca",
      "bloodType": "O+",
      "eps": "Sura",
      "maritalStatus": "Soltero",
      "occupation": "Ingeniero"
    },
    {
      "firstName": "María",
      "lastName": "García",
      "identificationType": "CC",
      "identificationNumber": "9876543210",
      "gender": "Femenino",
      "birthYear": "1985",
      "birthMonth": "Marzo",
      "birthDay": "22",
      "email": "maria.garcia@example.com",
      "mobilePhone": "3009876543",
      "mobilePhoneCountry": "+57",
      "address": "Avenida 456 #78-90",
      "city": "Medellín",
      "department": "Antioquia",
      "bloodType": "A+",
      "eps": "Coomeva"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "updateExisting": false
  }
}
```

**Respuesta:** Guarda los `id` de los pacientes creados.

---

## Paso 6: Importar Citas Médicas

**POST** `http://148.230.90.103:3001/api/appointments/import`

**Headers:**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body:**
```json
{
  "appointments": [
    {
      "patientId": "uuid-del-paciente-1",
      "doctorId": "uuid-del-doctor-1",
      "appointmentDate": "2024-12-25",
      "appointmentTime": "10:00",
      "duration": 30,
      "type": "CONSULTA",
      "modality": "PRESENCIAL",
      "status": "PROGRAMADA",
      "reason": "Control de rutina",
      "notes": "Paciente requiere control post-operatorio",
      "specialtyId": "uuid-de-especialidad",
      "insurance": {
        "company": "Sura",
        "policyNumber": "POL123456",
        "coverage": "Plan básico"
      }
    },
    {
      "patientId": "uuid-del-paciente-2",
      "doctorId": "uuid-del-doctor-1",
      "appointmentDate": "2024-12-25",
      "appointmentTime": "11:00",
      "duration": 45,
      "type": "CONTROL",
      "modality": "TELEMEDICINA",
      "status": "CONFIRMADA",
      "reason": "Seguimiento de tratamiento"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "skipConflicts": true,
    "allowPastDates": false
  }
}
```

---

## Resumen de Pasos

1. **Login** → Obtener `jwt_token` (solo para crear API keys desde el panel)
2. **Crear API Key** → Obtener `api_key` y `api_secret`
3. **Consultar Especialidades** → `GET /api/specialties` (obtener IDs)
4. **Consultar Especialistas** → `GET /api/specialists` (obtener IDs)
5. **Consultar Pacientes** → `GET /api/patients` (obtener IDs)
6. **Consultar Citas** → `GET /api/appointments` (ver citas existentes)
7. **Importar Especialidades** → `POST /api/specialties/import`
8. **Importar Especialistas** → `POST /api/specialists/import`
9. **Importar Pacientes** → `POST /api/patients/import`
10. **Importar Citas** → `POST /api/appointments/import` (usar IDs obtenidos)

---

## Endpoints GET para Consultar Datos

### Consultar Especialidades
```json
GET http://148.230.90.103:3001/api/specialties
Headers: X-API-Key: {{api_key}}, X-API-Secret: {{api_secret}}
```

### Consultar Especialistas/Doctores
```json
GET http://148.230.90.103:3001/api/specialists
Headers: X-API-Key: {{api_key}}, X-API-Secret: {{api_secret}}
```

### Consultar Pacientes
```json
GET http://148.230.90.103:3001/api/patients?page=1&limit=20
Headers: X-API-Key: {{api_key}}, X-API-Secret: {{api_secret}}
```

### Consultar Citas
```json
GET http://148.230.90.103:3001/api/appointments?page=1&limit=20&status=PROGRAMADA
Headers: X-API-Key: {{api_key}}, X-API-Secret: {{api_secret}}
```

**Ver archivo `GET_ENDPOINTS_EXAMPLES.md` para ejemplos completos con todos los filtros disponibles.**

---

## Notas Importantes

- Reemplaza `uuid-de-especialidad`, `uuid-del-paciente-1`, `uuid-del-doctor-1` con los IDs reales obtenidos usando los endpoints GET
- Los campos opcionales pueden omitirse o enviarse como `null`
- `skipDuplicates: true` evita errores por registros duplicados
- Las contraseñas de especialistas solo se muestran una vez al crear
- **No necesitas login con usuario/contraseña para usar la API**, solo necesitas la API Key y Secret

