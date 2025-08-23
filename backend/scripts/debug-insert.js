#!/usr/bin/env node

/**
 * Script de debug para probar la inserción de pacientes
 * Ejecutar: node scripts/debug-insert.js
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

// Datos de prueba simplificados
const testPatientData = {
  firstName: 'Test',
  lastName: 'Paciente',
  identificationType: 'CC',
  identificationNumber: '9999999999',
  gender: 'Masculino',
  birthDay: '1',
  birthMonth: 'Enero',
  birthYear: '1990'
};

async function debugPatientInsert() {
  console.log('🔍 Iniciando debug de inserción de pacientes...\n');

  try {
    // 1. Obtener token
    console.log('1️⃣ Obteniendo token...');
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
    console.log('✅ Token obtenido');

    // 2. Probar inserción con datos mínimos
    console.log('\n2️⃣ Probando inserción con datos mínimos...');
    console.log('📝 Datos a enviar:', JSON.stringify(testPatientData, null, 2));
    
    const createResponse = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPatientData)
    });

    console.log('📊 Status de respuesta:', createResponse.status);
    console.log('📋 Headers de respuesta:', Object.fromEntries(createResponse.headers.entries()));

    if (createResponse.ok) {
      const responseData = await createResponse.json();
      console.log('✅ Paciente creado exitosamente');
      console.log('📝 Respuesta:', JSON.stringify(responseData, null, 2));
    } else {
      const errorData = await createResponse.json();
      console.log('❌ Error creando paciente');
      console.log('📝 Detalles del error:', JSON.stringify(errorData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error durante el debug:', error.message);
    console.error('📚 Stack trace:', error.stack);
  }
}

// Ejecutar el debug
if (require.main === module) {
  debugPatientInsert();
}

module.exports = { debugPatientInsert };

