# Ejemplos de Uso - API de Importación

Esta guía contiene ejemplos prácticos para usar los endpoints de importación de ROMEDICALS.

## Autenticación

Los endpoints de importación aceptan dos métodos de autenticación:

### Método 1: JWT Token (para usuarios)
Todos los endpoints requieren autenticación mediante JWT token. Primero debes iniciar sesión:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "tu_password"
  }'
```

La respuesta incluirá un token que debes usar en el header `Authorization`:

```
Authorization: Bearer <tu_token_jwt>
```

### Método 2: API Key (para integraciones)
Para integraciones automatizadas, puedes usar API Keys únicas por empresa. Estas se gestionan desde el panel de administración en `/integrations`.

**Headers requeridos:**
```
X-API-Key: tu_api_key_aqui
X-API-Secret: tu_api_secret_aqui
```

**Ventajas de usar API Keys:**
- No expiran (a menos que configures una fecha de expiración)
- Puedes activar/desactivar sin afectar usuarios
- Ideal para sistemas automatizados
- Puedes regenerar el secret sin afectar la key

**Nota:** Los ejemplos a continuación muestran ambos métodos. Reemplaza los headers según el método que uses.

---

## 1. Importación de Pacientes

### Endpoint
```
POST /api/patients/import
```

### Ejemplo con cURL

```bash
# Con JWT Token
curl -X POST http://localhost:3001/api/patients/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \

# O con API Key
curl -X POST http://localhost:3001/api/patients/import \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rm_abc123..." \
  -H "X-API-Secret: tu_secret_aqui" \
  -d '{
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
  }'
```

### Ejemplo con JavaScript (fetch)

```javascript
const importPatients = async (token) => {
  const patients = [
    {
      firstName: "Juan",
      lastName: "Pérez",
      identificationType: "CC",
      identificationNumber: "1234567890",
      gender: "Masculino",
      birthYear: "1990",
      birthMonth: "Enero",
      birthDay: "15",
      email: "juan.perez@example.com",
      mobilePhone: "3001234567",
      mobilePhoneCountry: "+57",
      address: "Calle 123 #45-67",
      city: "Bogotá",
      department: "Cundinamarca",
      bloodType: "O+",
      eps: "Sura",
      maritalStatus: "Soltero",
      occupation: "Ingeniero"
    },
    {
      firstName: "María",
      lastName: "García",
      identificationType: "CC",
      identificationNumber: "9876543210",
      gender: "Femenino",
      birthYear: "1985",
      birthMonth: "Marzo",
      birthDay: "22",
      email: "maria.garcia@example.com",
      mobilePhone: "3009876543",
      mobilePhoneCountry: "+57",
      address: "Avenida 456 #78-90",
      city: "Medellín",
      department: "Antioquia",
      bloodType: "A+",
      eps: "Coomeva",
      maritalStatus: "Casada",
      occupation: "Médico"
    }
  ];

  try {
    const response = await fetch('http://localhost:3001/api/patients/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        patients,
        options: {
          skipDuplicates: true,
          updateExisting: false
        }
      })
    });

    const result = await response.json();
    console.log('Resultado de importación:', result);
    return result;
  } catch (error) {
    console.error('Error en importación:', error);
    throw error;
  }
};
```

### Respuesta de ejemplo

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

---

## 2. Importación de Citas Médicas

### Endpoint
```
POST /api/appointments/import
```

### Ejemplo con cURL

```bash
curl -X POST http://localhost:3001/api/appointments/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
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
  }'
```

### Ejemplo con JavaScript (fetch)

```javascript
const importAppointments = async (token) => {
  const appointments = [
    {
      patientId: "uuid-del-paciente-1",
      doctorId: "uuid-del-doctor-1",
      appointmentDate: "2024-12-25",
      appointmentTime: "10:00",
      duration: 30,
      type: "CONSULTA",
      modality: "PRESENCIAL",
      status: "PROGRAMADA",
      reason: "Control de rutina",
      notes: "Paciente requiere control post-operatorio",
      specialtyId: "uuid-de-especialidad",
      insurance: {
        company: "Sura",
        policyNumber: "POL123456",
        coverage: "Plan básico"
      }
    },
    {
      patientId: "uuid-del-paciente-2",
      doctorId: "uuid-del-doctor-1",
      appointmentDate: "2024-12-25",
      appointmentTime: "11:00",
      duration: 45,
      type: "CONTROL",
      modality: "TELEMEDICINA",
      status: "CONFIRMADA",
      reason: "Seguimiento de tratamiento"
    }
  ];

  try {
    const response = await fetch('http://localhost:3001/api/appointments/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        appointments,
        options: {
          skipDuplicates: true,
          skipConflicts: true,
          allowPastDates: false
        }
      })
    });

    const result = await response.json();
    console.log('Resultado de importación:', result);
    return result;
  } catch (error) {
    console.error('Error en importación:', error);
    throw error;
  }
};
```

### Respuesta de ejemplo

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

## 3. Importación de Especialidades

### Endpoint
```
POST /api/specialties/import
```

### Ejemplo con cURL

```bash
curl -X POST http://localhost:3001/api/specialties/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
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
      },
      {
        "name": "Pediatría",
        "description": "Especialidad médica que trata a niños y adolescentes",
        "code": "PEDIA",
        "isActive": true
      }
    ],
    "options": {
      "skipDuplicates": true,
      "updateExisting": false
    }
  }'
```

### Ejemplo con JavaScript (fetch)

```javascript
const importSpecialties = async (token) => {
  const specialties = [
    {
      name: "Cardiología",
      description: "Especialidad médica que se encarga del corazón y el sistema circulatorio",
      code: "CARD",
      isActive: true
    },
    {
      name: "Neurología",
      description: "Especialidad médica que trata los trastornos del sistema nervioso",
      code: "NEURO",
      isActive: true
    },
    {
      name: "Dermatología",
      description: "Especialidad médica que se ocupa de la piel y sus enfermedades",
      code: "DERMA",
      isActive: true
    }
  ];

  try {
    const response = await fetch('http://localhost:3001/api/specialties/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        specialties,
        options: {
          skipDuplicates: true,
          updateExisting: false
        }
      })
    });

    const result = await response.json();
    console.log('Resultado de importación:', result);
    return result;
  } catch (error) {
    console.error('Error en importación:', error);
    throw error;
  }
};
```

### Respuesta de ejemplo

```json
{
  "message": "Importación completada",
  "results": {
    "total": 4,
    "created": 4,
    "updated": 0,
    "skipped": 0,
    "errors": []
  }
}
```

---

## 4. Importación de Especialistas/Doctores

### Endpoint
```
POST /api/specialists/import
```

### Ejemplo con cURL

```bash
curl -X POST http://localhost:3001/api/specialists/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "specialists": [
      {
        "firstName": "Carlos",
        "lastName": "Rodríguez",
        "email": "carlos.rodriguez@example.com",
        "phone": "+57 300 123 4567",
        "idType": "CC",
        "idNumber": "1234567890",
        "title": "Dr",
        "specialtyId": "uuid-de-especialidad-cardiologia",
        "schedule": {
          "monday": {
            "isWorking": true,
            "startTime": "08:00",
            "endTime": "17:00",
            "breakStart": "12:00",
            "breakEnd": "13:00",
            "hasBreak": true,
            "simultaneousPatients": 3,
            "interval": 15,
            "box": "Box 1",
            "modality": "both"
          },
          "tuesday": {
            "isWorking": true,
            "startTime": "08:00",
            "endTime": "17:00",
            "breakStart": "12:00",
            "breakEnd": "13:00",
            "hasBreak": true,
            "simultaneousPatients": 3,
            "interval": 15,
            "modality": "both"
          },
          "wednesday": {
            "isWorking": false,
            "startTime": "08:00",
            "endTime": "17:00",
            "hasBreak": false,
            "simultaneousPatients": 3,
            "interval": 15,
            "modality": "both"
          }
        }
      },
      {
        "firstName": "Ana",
        "lastName": "Martínez",
        "email": "ana.martinez@example.com",
        "phone": "+57 300 987 6543",
        "idType": "CC",
        "idNumber": "9876543210",
        "title": "Dra",
        "specialtyId": "uuid-de-especialidad-pediatria",
        "password": "MiPassword123"
      }
    ],
    "options": {
      "skipDuplicates": true,
      "updateExisting": false,
      "generatePasswords": true
    }
  }'
```

### Ejemplo con JavaScript (fetch)

```javascript
const importSpecialists = async (token) => {
  const specialists = [
    {
      firstName: "Carlos",
      lastName: "Rodríguez",
      email: "carlos.rodriguez@example.com",
      phone: "+57 300 123 4567",
      idType: "CC",
      idNumber: "1234567890",
      title: "Dr",
      specialtyId: "uuid-de-especialidad-cardiologia",
      schedule: {
        monday: {
          isWorking: true,
          startTime: "08:00",
          endTime: "17:00",
          breakStart: "12:00",
          breakEnd: "13:00",
          hasBreak: true,
          simultaneousPatients: 3,
          interval: 15,
          box: "Box 1",
          modality: "both"
        },
        tuesday: {
          isWorking: true,
          startTime: "08:00",
          endTime: "17:00",
          breakStart: "12:00",
          breakEnd: "13:00",
          hasBreak: true,
          simultaneousPatients: 3,
          interval: 15,
          modality: "both"
        },
        wednesday: {
          isWorking: false,
          startTime: "08:00",
          endTime: "17:00",
          hasBreak: false,
          simultaneousPatients: 3,
          interval: 15,
          modality: "both"
        }
      }
    },
    {
      firstName: "Ana",
      lastName: "Martínez",
      email: "ana.martinez@example.com",
      phone: "+57 300 987 6543",
      idType: "CC",
      idNumber: "9876543210",
      title: "Dra",
      specialtyId: "uuid-de-especialidad-pediatria"
      // Si no se proporciona password y generatePasswords es true, se generará automáticamente
    }
  ];

  try {
    const response = await fetch('http://localhost:3001/api/specialists/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        specialists,
        options: {
          skipDuplicates: true,
          updateExisting: false,
          generatePasswords: true
        }
      })
    });

    const result = await response.json();
    console.log('Resultado de importación:', result);
    
    // Mostrar credenciales generadas
    if (result.results.credentials && result.results.credentials.length > 0) {
      console.log('\n📋 Credenciales generadas:');
      result.results.credentials.forEach(cred => {
        console.log(`\n${cred.firstName} ${cred.lastName} (${cred.email})`);
        console.log(`  Contraseña: ${cred.password}`);
        console.log(`  ${cred.passwordGenerated ? '⚠️ Generada automáticamente' : '✓ Proporcionada por el usuario'}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error en importación:', error);
    throw error;
  }
};
```

### Respuesta de ejemplo

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

## Ejemplo Completo: Flujo de Importación

### Script completo en Node.js

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// 1. Autenticación
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// 2. Importar especialidades primero
async function importSpecialties(token) {
  const specialties = [
    { name: "Cardiología", description: "Especialidad del corazón", code: "CARD" },
    { name: "Pediatría", description: "Especialidad infantil", code: "PEDIA" }
  ];

  const response = await axios.post(
    `${API_BASE_URL}/specialties/import`,
    {
      specialties,
      options: { skipDuplicates: true }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

// 3. Importar especialistas
async function importSpecialists(token, specialtyIds) {
  const specialists = [
    {
      firstName: "Dr. Juan",
      lastName: "Pérez",
      email: "juan.perez@example.com",
      phone: "+57 300 123 4567",
      specialtyId: specialtyIds[0], // Cardiología
      title: "Dr"
    }
  ];

  const response = await axios.post(
    `${API_BASE_URL}/specialists/import`,
    {
      specialists,
      options: {
        skipDuplicates: true,
        generatePasswords: true
      }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

// 4. Importar pacientes
async function importPatients(token) {
  const patients = [
    {
      firstName: "María",
      lastName: "García",
      identificationType: "CC",
      identificationNumber: "1234567890",
      gender: "Femenino",
      birthYear: "1990",
      birthMonth: "Enero",
      birthDay: "15",
      email: "maria@example.com",
      mobilePhone: "3009876543"
    }
  ];

  const response = await axios.post(
    `${API_BASE_URL}/patients/import`,
    {
      patients,
      options: { skipDuplicates: true }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

// 5. Importar citas
async function importAppointments(token, patientId, doctorId) {
  const appointments = [
    {
      patientId,
      doctorId,
      appointmentDate: "2024-12-25",
      appointmentTime: "10:00",
      duration: 30,
      type: "CONSULTA",
      modality: "PRESENCIAL",
      status: "PROGRAMADA",
      reason: "Control de rutina"
    }
  ];

  const response = await axios.post(
    `${API_BASE_URL}/appointments/import`,
    {
      appointments,
      options: {
        skipDuplicates: true,
        skipConflicts: true
      }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

// Ejecutar flujo completo
async function main() {
  try {
    // 1. Login
    console.log('🔐 Iniciando sesión...');
    const token = await login('admin@example.com', 'password123');
    console.log('✅ Login exitoso\n');

    // 2. Importar especialidades
    console.log('📚 Importando especialidades...');
    const specialtiesResult = await importSpecialties(token);
    console.log('✅ Especialidades importadas:', specialtiesResult.results);
    console.log('');

    // 3. Importar especialistas
    console.log('👨‍⚕️ Importando especialistas...');
    const specialistsResult = await importSpecialists(token, ['uuid-especialidad-1']);
    console.log('✅ Especialistas importados:', specialistsResult.results);
    
    // Mostrar credenciales
    if (specialistsResult.results.credentials) {
      console.log('\n📋 Credenciales:');
      specialistsResult.results.credentials.forEach(cred => {
        console.log(`  ${cred.email}: ${cred.password}`);
      });
    }
    console.log('');

    // 4. Importar pacientes
    console.log('👥 Importando pacientes...');
    const patientsResult = await importPatients(token);
    console.log('✅ Pacientes importados:', patientsResult.results);
    console.log('');

    // 5. Importar citas
    console.log('📅 Importando citas...');
    const appointmentsResult = await importAppointments(
      token,
      'uuid-paciente-1',
      'uuid-doctor-1'
    );
    console.log('✅ Citas importadas:', appointmentsResult.results);

  } catch (error) {
    console.error('❌ Error en el flujo:', error.response?.data || error.message);
  }
}

// Ejecutar
main();
```

---

## Notas Importantes

### Límites de importación:
- **Pacientes**: Máximo 1000 por solicitud
- **Citas**: Máximo 500 por solicitud
- **Especialidades**: Máximo 500 por solicitud
- **Especialistas**: Máximo 200 por solicitud

### Opciones comunes:

**skipDuplicates**: Si es `true`, omite registros duplicados sin error
**updateExisting**: Si es `true`, actualiza registros existentes en lugar de omitirlos
**generatePasswords**: Solo para especialistas. Si es `true`, genera contraseñas automáticamente
**skipConflicts**: Solo para citas. Si es `true`, omite citas con conflictos de horario
**allowPastDates**: Solo para citas. Si es `true`, permite crear citas con fechas pasadas

### Manejo de errores:

Cada respuesta incluye un array `errors` con los detalles de los registros que fallaron:

```json
{
  "errors": [
    {
      "index": 2,
      "data": { ... },
      "error": "Email ya existe",
      "message": "El correo electrónico ya está registrado"
    }
  ]
}
```

El campo `index` indica la posición del registro fallido en el array original.

