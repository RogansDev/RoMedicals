# Ejemplos para Postman - API de Importación ROMEDICALS

Esta guía contiene ejemplos completos para probar los endpoints de importación usando Postman.

## Configuración Base

**URL Base:** `http://148.230.90.103:3001` o `http://localhost:3001`

---

## 1. Autenticación con JWT Token

### Paso 1: Login para obtener JWT Token

**Método:** `POST`  
**URL:** `{{base_url}}/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "tu_email@example.com",
  "password": "tu_password"
}
```

**Respuesta esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-del-usuario",
    "email": "tu_email@example.com",
    "role": "super_user",
    "companyId": "uuid-de-la-empresa"
  }
}
```

**En Postman:**
1. Crea una variable de entorno `{{base_url}}` = `http://148.230.90.103:3001`
2. Crea una variable `{{jwt_token}}` y guarda el token de la respuesta
3. Usa `{{jwt_token}}` en los headers de las siguientes solicitudes

---

## 2. Gestión de API Keys

### 2.1 Crear API Key

**Método:** `POST`  
**URL:** `{{base_url}}/api/api-keys`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Sistema de Gestión Externa",
  "description": "API key para integración con sistema externo de gestión",
  "expiresAt": null
}
```

**Body alternativo (sin campos opcionales):**
```json
{}
```

**Respuesta esperada:**
```json
{
  "message": "API key creada exitosamente",
  "apiKey": {
    "id": "uuid-de-la-api-key",
    "api_key": "rm_abc123def456...",
    "api_secret": "a1b2c3d4e5f6...",
    "name": "Sistema de Gestión Externa",
    "description": "API key para integración con sistema externo",
    "expires_at": null,
    "created_at": "2024-12-02T20:00:00.000Z"
  },
  "warning": "Guarda estas credenciales de forma segura. El secret no se mostrará nuevamente."
}
```

**⚠️ IMPORTANTE:** Guarda el `api_key` y `api_secret` en variables de Postman:
- `{{api_key}}` = `rm_abc123def456...`
- `{{api_secret}}` = `a1b2c3d4e5f6...`

### 2.2 Listar API Keys

**Método:** `GET`  
**URL:** `{{base_url}}/api/api-keys`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
```

**Respuesta esperada:**
```json
{
  "apiKeys": [
    {
      "id": "uuid-de-la-api-key",
      "company_id": "uuid-de-la-empresa",
      "api_key": "rm_abc12...xyz9",
      "name": "Sistema de Gestión Externa",
      "description": "API key para integración",
      "is_active": true,
      "last_used_at": "2024-12-02T20:30:00.000Z",
      "expires_at": null,
      "created_at": "2024-12-02T20:00:00.000Z",
      "updated_at": "2024-12-02T20:00:00.000Z"
    }
  ]
}
```

### 2.3 Regenerar API Secret

**Método:** `POST`  
**URL:** `{{base_url}}/api/api-keys/{{api_key_id}}/regenerate`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
```

**Respuesta esperada:**
```json
{
  "message": "API secret regenerado exitosamente",
  "api_secret": "nuevo_secret_aqui",
  "warning": "Guarda este secret de forma segura. No se mostrará nuevamente."
}
```

---

## 3. Importación de Datos

### 3.1 Importar Pacientes (con JWT Token)

**Método:** `POST`  
**URL:** `{{base_url}}/api/patients/import`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body (raw JSON):**
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
      "eps": "Coomeva",
      "maritalStatus": "Casada",
      "occupation": "Médico"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "updateExisting": false
  }
}
```

**Respuesta esperada:**
```json
{
  "message": "Importación completada",
  "results": {
    "total": 2,
    "created": 2,
    "updated": 0,
    "skipped": 0,
    "errors": []
  }
}
```

### 3.2 Importar Pacientes (con API Key)

**Método:** `POST`  
**URL:** `{{base_url}}/api/patients/import`

**Headers:**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body:** (igual que el ejemplo anterior)

---

### 3.3 Importar Especialidades

**Método:** `POST`  
**URL:** `{{base_url}}/api/specialties/import`

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "specialties": [
    {
      "name": "Cardiología",
      "description": "Especialidad médica que se encarga del corazón y el sistema circulatorio",
      "code": "CARD",
      "isActive": true
    },
    {
      "name": "Neurología",
      "description": "Especialidad médica que trata los trastornos del sistema nervioso",
      "code": "NEURO",
      "isActive": true
    },
    {
      "name": "Dermatología",
      "description": "Especialidad médica que se ocupa de la piel y sus enfermedades",
      "code": "DERMA",
      "isActive": true
    }
  ],
  "options": {
    "skipDuplicates": true,
    "updateExisting": false
  }
}
```

**Respuesta esperada:**
```json
{
  "message": "Importación completada",
  "results": {
    "total": 3,
    "created": 3,
    "updated": 0,
    "skipped": 0,
    "errors": []
  }
}
```

---

### 3.4 Importar Especialistas/Doctores

**Método:** `POST`  
**URL:** `{{base_url}}/api/specialists/import`

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body (raw JSON):**
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
      "specialtyId": "uuid-de-especialidad-cardiologia"
    },
    {
      "firstName": "Ana",
      "lastName": "Martínez",
      "email": "ana.martinez@example.com",
      "phone": "+57 300 987 6543",
      "idType": "CC",
      "idNumber": "9876543210",
      "title": "Dra",
      "specialtyId": "uuid-de-especialidad-pediatria"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "updateExisting": false,
    "generatePasswords": true
  }
}
```

**Respuesta esperada:**
```json
{
  "message": "Importación completada",
  "results": {
    "total": 2,
    "created": 2,
    "updated": 0,
    "skipped": 0,
    "errors": [],
    "credentials": [
      {
        "email": "carlos.rodriguez@example.com",
        "firstName": "Carlos",
        "lastName": "Rodríguez",
        "password": "aB3xK9mP",
        "passwordGenerated": true,
        "userId": "uuid-del-usuario-1"
      },
      {
        "email": "ana.martinez@example.com",
        "firstName": "Ana",
        "lastName": "Martínez",
        "password": "MiPassword123",
        "passwordGenerated": false,
        "userId": "uuid-del-usuario-2"
      }
    ]
  }
}
```

---

### 3.5 Importar Citas Médicas

**Método:** `POST`  
**URL:** `{{base_url}}/api/appointments/import`

**Headers (con JWT):**
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Headers (con API Key):**
```
X-API-Key: {{api_key}}
X-API-Secret: {{api_secret}}
Content-Type: application/json
```

**Body (raw JSON):**
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
      "reason": "Seguimiento de tratamiento",
      "notes": "Primera consulta virtual"
    }
  ],
  "options": {
    "skipDuplicates": true,
    "skipConflicts": true,
    "allowPastDates": false
  }
}
```

**Respuesta esperada:**
```json
{
  "message": "Importación completada",
  "results": {
    "total": 2,
    "created": 2,
    "skipped": 0,
    "errors": []
  }
}
```

---

## 4. Configuración de Variables en Postman

### Variables de Entorno Recomendadas

Crea un entorno en Postman con estas variables:

```
base_url = http://148.230.90.103:3001
jwt_token = (se llena después del login)
api_key = (se llena después de crear API key)
api_secret = (se llena después de crear API key)
```

### Cómo configurar:

1. **Crear Entorno:**
   - Click en "Environments" (lateral izquierdo)
   - Click en "+" para crear nuevo entorno
   - Nombre: "ROMEDICALS Production"

2. **Agregar Variables:**
   - `base_url` = `http://148.230.90.103:3001`
   - `jwt_token` = (vacío inicialmente)
   - `api_key` = (vacío inicialmente)
   - `api_secret` = (vacío inicialmente)

3. **Seleccionar Entorno:**
   - En el dropdown superior derecho, selecciona "ROMEDICALS Production"

4. **Automatizar con Tests (opcional):**
   
   Para el endpoint de Login, agrega esto en la pestaña "Tests":
   ```javascript
   if (pm.response.code === 200) {
       var jsonData = pm.response.json();
       pm.environment.set("jwt_token", jsonData.token);
   }
   ```
   
   Para el endpoint de Crear API Key, agrega esto en "Tests":
   ```javascript
   if (pm.response.code === 201) {
       var jsonData = pm.response.json();
       pm.environment.set("api_key", jsonData.apiKey.api_key);
       pm.environment.set("api_secret", jsonData.apiKey.api_secret);
   }
   ```

---

## 5. Colección de Postman Completa

### Estructura Recomendada:

```
ROMEDICALS API
├── Autenticación
│   ├── Login
│   └── Logout
├── API Keys
│   ├── Crear API Key
│   ├── Listar API Keys
│   ├── Regenerar Secret
│   ├── Activar/Desactivar
│   └── Eliminar API Key
├── Importación - Pacientes
│   ├── Importar (JWT)
│   └── Importar (API Key)
├── Importación - Especialidades
│   ├── Importar (JWT)
│   └── Importar (API Key)
├── Importación - Especialistas
│   ├── Importar (JWT)
│   └── Importar (API Key)
└── Importación - Citas
    ├── Importar (JWT)
    └── Importar (API Key)
```

---

## 6. Ejemplos de Respuestas de Error

### Error 400 - Datos Inválidos
```json
{
  "error": "Datos de entrada inválidos",
  "details": [
    "El nombre debe tener al menos 2 caracteres",
    "El email es requerido"
  ]
}
```

### Error 401 - No Autenticado
```json
{
  "error": "Token de acceso requerido",
  "message": "Debe proporcionar un token de autenticación"
}
```

### Error 401 - API Key Inválida
```json
{
  "error": "API key inválida",
  "message": "La API key proporcionada no existe o está desactivada"
}
```

### Error 403 - Sin Permisos
```json
{
  "error": "Permisos insuficientes",
  "message": "No tiene permisos para CREATE en el módulo USERS"
}
```

### Error 409 - Duplicado
```json
{
  "error": "Paciente ya existe",
  "message": "Ya existe un paciente con este tipo y número de documento"
}
```

---

## 7. Flujo Completo de Prueba

### Paso a Paso:

1. **Login** → Obtener JWT token
2. **Crear API Key** → Obtener api_key y api_secret
3. **Listar Especialidades** → Obtener IDs de especialidades existentes
4. **Importar Especialidades** (si es necesario)
5. **Importar Especialistas** → Obtener IDs de doctores
6. **Importar Pacientes** → Obtener IDs de pacientes
7. **Importar Citas** → Usando los IDs obtenidos

### Ejemplo de Flujo Completo:

```bash
# 1. Login
POST /api/auth/login
→ Guardar token en {{jwt_token}}

# 2. Crear API Key
POST /api/api-keys
→ Guardar api_key y api_secret

# 3. Importar Especialidades (con API Key)
POST /api/specialties/import
Headers: X-API-Key, X-API-Secret
→ Guardar IDs de especialidades

# 4. Importar Especialistas (con API Key)
POST /api/specialists/import
Headers: X-API-Key, X-API-Secret
→ Guardar IDs de especialistas y contraseñas

# 5. Importar Pacientes (con API Key)
POST /api/patients/import
Headers: X-API-Key, X-API-Secret
→ Guardar IDs de pacientes

# 6. Importar Citas (con API Key)
POST /api/appointments/import
Headers: X-API-Key, X-API-Secret
→ Usar IDs de pacientes y doctores
```

---

## 8. Tips y Mejores Prácticas

1. **Usa Variables de Entorno:** Facilita cambiar entre desarrollo y producción
2. **Guarda las Credenciales:** Las API keys y secrets solo se muestran una vez
3. **Prueba con Datos Pequeños:** Empieza con 1-2 registros antes de importar grandes volúmenes
4. **Revisa los Errores:** El array `errors` en la respuesta te indica qué registros fallaron
5. **Usa skipDuplicates:** Evita errores por duplicados en pruebas
6. **Valida los IDs:** Asegúrate de que los UUIDs de pacientes, doctores y especialidades existan antes de importar citas

---

## 9. Ejemplo de Script Pre-request (Postman)

Para automatizar la obtención del token antes de cada request:

**Pre-request Script:**
```javascript
// Solo ejecutar si no hay token o está expirado
if (!pm.environment.get("jwt_token")) {
    pm.sendRequest({
        url: pm.environment.get("base_url") + "/api/auth/login",
        method: 'POST',
        header: {
            'Content-Type': 'application/json'
        },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                email: "tu_email@example.com",
                password: "tu_password"
            })
        }
    }, function (err, res) {
        if (res.code === 200) {
            var jsonData = res.json();
            pm.environment.set("jwt_token", jsonData.token);
        }
    });
}
```

---

## 10. Exportar Colección

Para compartir la colección:

1. Click en "..." (tres puntos) junto a la colección
2. Selecciona "Export"
3. Elige formato "Collection v2.1"
4. Guarda el archivo JSON
5. Comparte el archivo con tu equipo

---

¡Listo! Con estos ejemplos puedes probar todos los endpoints de importación en Postman.

