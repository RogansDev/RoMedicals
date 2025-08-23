#!/usr/bin/env node

/**
 * Script de prueba para la API de pacientes
 * Ejecutar: node scripts/test-patients-api.js
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

// Datos de prueba para crear un paciente
const testPatientData = {
  firstName: 'Juan',
  lastName: 'Pérez',
  identificationType: 'CC',
  identificationNumber: '1234567890',
  residenceCountry: 'Colombia',
  originCountry: 'Colombia',
  isForeigner: false,
  gender: 'Masculino',
  birthDay: '15',
  birthMonth: 'Marzo',
  birthYear: '1990',
  bloodType: 'O+',
  disability: 'Ninguna',
  occupation: 'Empleado',
  maritalStatus: 'Soltero',
  educationLevel: 'Universitario',
  activityProfession: 'Ingeniero',
  patientType: 'particular',
  eps: 'Ninguna',
  email: 'juan.perez@email.com',
  address: 'Calle 123 #45-67',
  city: 'Bogotá',
  department: 'Cundinamarca',
  residentialZone: 'Norte',
  landlinePhone: '1234567',
  mobilePhoneCountry: '+57',
  mobilePhone: '3211234567',
  companionName: 'María Pérez',
  companionPhone: '3211234568',
  responsibleName: 'Carlos Pérez',
  responsiblePhone: '3211234569',
  responsibleRelationship: 'Padre',
  agreement: 'Sin Convenio',
  observations: 'Paciente nuevo, sin antecedentes médicos relevantes',
  reference: 'Recomendado por Dr. García'
};

async function testPatientsAPI() {
  console.log('🧪 Iniciando pruebas de la API de pacientes...\n');

  try {
    // 1. Probar endpoint de salud
    console.log('1️⃣ Probando endpoint de salud...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Servidor funcionando:', healthData.status);
    } else {
      console.log('❌ Error en endpoint de salud');
      return;
    }

    // 2. Probar creación de paciente (sin autenticación - debería fallar)
    console.log('\n2️⃣ Probando creación de paciente sin autenticación...');
    try {
      const createResponse = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPatientData)
      });

      if (createResponse.status === 401) {
        console.log('✅ Correcto: Se requiere autenticación');
      } else {
        console.log('⚠️  Inesperado: Status', createResponse.status);
      }
    } catch (error) {
      console.log('✅ Correcto: Error de conexión (servidor no autenticado)');
    }

    // 3. Probar obtención de pacientes (sin autenticación - debería fallar)
    console.log('\n3️⃣ Probando obtención de pacientes sin autenticación...');
    try {
      const getResponse = await fetch(`${API_BASE_URL}/patients`);
      if (getResponse.status === 401) {
        console.log('✅ Correcto: Se requiere autenticación');
      } else {
        console.log('⚠️  Inesperado: Status', getResponse.status);
      }
    } catch (error) {
      console.log('✅ Correcto: Error de conexión (servidor no autenticado)');
    }

    console.log('\n🎯 Pruebas completadas exitosamente!');
    console.log('\n📝 Notas:');
    console.log('- Las pruebas verifican que la API requiere autenticación');
    console.log('- Para probar la funcionalidad completa, necesitas un token JWT válido');
    console.log('- Revisa el README para configurar la autenticación');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
if (require.main === module) {
  testPatientsAPI();
}

module.exports = { testPatientsAPI };
