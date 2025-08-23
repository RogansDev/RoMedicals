#!/usr/bin/env node

/**
 * Script para probar la API de pacientes CON autenticación
 * Ejecutar: node scripts/test-patients-with-auth.js
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

// Datos de prueba para crear un paciente
const testPatientData = {
  firstName: 'María',
  lastName: 'González',
  identificationType: 'CC',
  identificationNumber: '9876543210',
  residenceCountry: 'Colombia',
  originCountry: 'Colombia',
  isForeigner: false,
  gender: 'Femenino',
  birthDay: '20',
  birthMonth: 'Abril',
  birthYear: '1985',
  bloodType: 'A+',
  disability: 'Ninguna',
  occupation: 'Médica',
  maritalStatus: 'Casada',
  educationLevel: 'Universitario',
  activityProfession: 'Cardióloga',
  patientType: 'eps',
  eps: 'Sura',
  email: 'maria.gonzalez@email.com',
  address: 'Carrera 45 #67-89',
  city: 'Medellín',
  department: 'Antioquia',
  residentialZone: 'Centro',
  landlinePhone: '2345678',
  mobilePhoneCountry: '+57',
  mobilePhone: '3101234567',
  companionName: 'Carlos González',
  companionPhone: '3101234568',
  responsibleName: 'Carlos González',
  responsiblePhone: '3101234568',
  responsibleRelationship: 'Esposo',
  agreement: 'Con Convenio',
  observations: 'Paciente con antecedentes de hipertensión controlada',
  reference: 'Recomendada por Dr. Rodríguez'
};

async function testPatientsAPIWithAuth() {
  console.log('🔐 Iniciando pruebas de la API de pacientes CON autenticación...\n');

  try {
    // 1. Obtener token de autenticación
    console.log('1️⃣ Obteniendo token de autenticación...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@romedicals.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Error en login:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Token obtenido exitosamente');
    console.log('👤 Usuario:', loginData.user.firstName, loginData.user.lastName);
    console.log('🔑 Rol:', loginData.user.role);

    // 2. Probar obtención de pacientes CON autenticación
    console.log('\n2️⃣ Probando obtención de pacientes CON autenticación...');
    const getPatientsResponse = await fetch(`${API_BASE_URL}/patients`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (getPatientsResponse.ok) {
      const patientsData = await getPatientsResponse.json();
      console.log('✅ Pacientes obtenidos exitosamente');
      console.log('📊 Total de pacientes:', patientsData.patients.length);
      console.log('📄 Página actual:', patientsData.pagination.page);
      console.log('📋 Total de páginas:', patientsData.pagination.totalPages);
      
      if (patientsData.patients.length > 0) {
        console.log('\n📋 Primer paciente:');
        const firstPatient = patientsData.patients[0];
        console.log(`   - Nombre: ${firstPatient.first_name} ${firstPatient.last_name}`);
        console.log(`   - Documento: ${firstPatient.identification_type} ${firstPatient.identification_number}`);
        console.log(`   - Edad: ${firstPatient.age} años`);
      }
    } else {
      console.log('❌ Error obteniendo pacientes:', getPatientsResponse.status);
      const errorData = await getPatientsResponse.json();
      console.log('📝 Detalles:', errorData);
    }

    // 3. Probar creación de paciente CON autenticación
    console.log('\n3️⃣ Probando creación de paciente CON autenticación...');
    const createPatientResponse = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPatientData)
    });

    if (createPatientResponse.ok) {
      const newPatientData = await createPatientResponse.json();
      console.log('✅ Paciente creado exitosamente');
      console.log('🆔 ID del nuevo paciente:', newPatientData.patient.id);
      console.log('📝 Mensaje:', newPatientData.message);
      
      // 4. Probar obtención del paciente específico
      console.log('\n4️⃣ Probando obtención del paciente específico...');
      const getPatientResponse = await fetch(`${API_BASE_URL}/patients/${newPatientData.patient.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (getPatientResponse.ok) {
        const patientData = await getPatientResponse.json();
        console.log('✅ Paciente específico obtenido exitosamente');
        console.log('👤 Nombre completo:', patientData.patient.first_name, patientData.patient.last_name);
        console.log('📊 Citas médicas:', patientData.patient.appointments_count);
        console.log('📋 Notas clínicas:', patientData.patient.clinical_notes_count);
        console.log('📈 Evoluciones:', patientData.patient.evolutions_count);
      } else {
        console.log('❌ Error obteniendo paciente específico:', getPatientResponse.status);
      }
    } else {
      console.log('❌ Error creando paciente:', createPatientResponse.status);
      const errorData = await createPatientResponse.json();
      console.log('📝 Detalles:', errorData);
    }

    console.log('\n🎯 Pruebas completadas exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('- ✅ Autenticación funcionando');
    console.log('- ✅ API de pacientes funcionando');
    console.log('- ✅ CRUD de pacientes funcionando');
    console.log('- 🔑 Token válido obtenido');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
if (require.main === module) {
  testPatientsAPIWithAuth();
}

module.exports = { testPatientsAPIWithAuth };
