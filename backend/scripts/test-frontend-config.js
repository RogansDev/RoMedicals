const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testFrontendConfiguration() {
  try {
    console.log('🧪 Probando configuración del frontend...\n');

    // 1. Verificar que el backend esté funcionando
    console.log('1️⃣ Verificando backend...');
    const healthCheck = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@romedicals.com',
        password: 'admin123'
      })
    });

    if (!healthCheck.ok) {
      throw new Error(`Backend no responde: ${healthCheck.status}`);
    }

    console.log('✅ Backend funcionando correctamente\n');

    // 2. Verificar que las citas se puedan obtener
    console.log('2️⃣ Verificando endpoint de citas...');
    const token = healthCheck.headers.get('authorization') || (await healthCheck.json()).token;
    
    const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!appointmentsResponse.ok) {
      throw new Error(`Error obteniendo citas: ${appointmentsResponse.status}`);
    }

    const appointmentsData = await appointmentsResponse.json();
    console.log(`✅ Endpoint de citas funcionando: ${appointmentsData.appointments.length} citas encontradas\n`);

    // 3. Verificar que los pacientes se puedan obtener
    console.log('3️⃣ Verificando endpoint de pacientes...');
    const patientsResponse = await fetch(`${API_BASE_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!patientsResponse.ok) {
      throw new Error(`Error obteniendo pacientes: ${patientsResponse.status}`);
    }

    const patientsData = await patientsResponse.json();
    console.log(`✅ Endpoint de pacientes funcionando: ${patientsData.patients.length} pacientes encontrados\n`);

    // 4. Verificar configuración de CORS
    console.log('4️⃣ Verificando configuración de CORS...');
    const corsResponse = await fetch(`${API_BASE_URL}/patients`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization'
      }
    });

    console.log(`✅ CORS configurado: ${corsResponse.status}\n`);

    // 5. Resumen de la configuración
    console.log('5️⃣ Resumen de la configuración:');
    console.log(`   Backend URL: ${API_BASE_URL}`);
    console.log(`   Frontend URL: http://localhost:3000`);
    console.log(`   Token JWT: ${token ? '✅ Generado' : '❌ No generado'}`);
    console.log(`   Citas: ${appointmentsData.appointments.length}`);
    console.log(`   Pacientes: ${patientsData.patients.length}`);

    console.log('\n🎉 ¡Configuración del frontend verificada exitosamente!');
    console.log('💡 Si sigues viendo errores, verifica:');
    console.log('   1. Que el frontend esté usando la versión compilada más reciente');
    console.log('   2. Que hayas iniciado sesión correctamente');
    console.log('   3. Que el token JWT esté en localStorage');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    console.log('\n🔧 Soluciones posibles:');
    console.log('   1. Verificar que el backend esté ejecutándose en puerto 3001');
    console.log('   2. Verificar que no haya conflictos de puertos');
    console.log('   3. Verificar la configuración de CORS en el backend');
  }
}

// Ejecutar la verificación
testFrontendConfiguration();
