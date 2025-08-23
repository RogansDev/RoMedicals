const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testAgendaLoading() {
  try {
    console.log('🧪 Probando carga de citas para la agenda...\n');

    // 1. Login para obtener token
    console.log('1️⃣ Iniciando sesión...');
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
      throw new Error(`Error en login: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginResponse.headers.get('authorization') || loginData.token;
    console.log('✅ Login exitoso\n');

    // 2. Obtener todas las citas
    console.log('2️⃣ Obteniendo todas las citas...');
    const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!appointmentsResponse.ok) {
      throw new Error(`Error obteniendo citas: ${appointmentsResponse.status}`);
    }

    const appointmentsData = await appointmentsResponse.json();
    console.log(`✅ Se encontraron ${appointmentsData.appointments.length} citas\n`);

    if (appointmentsData.appointments.length === 0) {
      console.log('⚠️ No hay citas disponibles');
      return;
    }

    // 3. Mostrar detalles de cada cita
    console.log('3️⃣ Detalles de las citas:');
    appointmentsData.appointments.forEach((appointment, index) => {
      console.log(`\n📅 Cita #${index + 1} (ID: ${appointment.id}):`);
      console.log(`   Paciente: ${appointment.patientFullName || `${appointment.patient_first_name} ${appointment.patient_last_name}`}`);
      console.log(`   Doctor: ${appointment.doctorFullName || `${appointment.doctor_first_name} ${appointment.doctor_last_name}`}`);
      console.log(`   Fecha: ${appointment.appointment_date}`);
      console.log(`   Hora: ${appointment.appointment_time}`);
      console.log(`   Tipo: ${appointment.type}`);
      console.log(`   Estado: ${appointment.status}`);
      console.log(`   Especialidad: ${appointment.specialty_name || 'No especificada'}`);
      
      // Verificar campos críticos para el frontend
      console.log(`   ✅ patient_id: ${appointment.patient_id}`);
      console.log(`   ✅ doctor_id: ${appointment.doctor_id}`);
      console.log(`   ✅ appointment_date: ${appointment.appointment_date}`);
      console.log(`   ✅ appointment_time: ${appointment.appointment_time}`);
    });

    // 4. Probar filtro por fecha específica
    console.log('\n4️⃣ Probando filtro por fecha...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const testDate = tomorrow.toISOString().split('T')[0];
    
    console.log(`   Fecha de prueba: ${testDate}`);
    
    const filteredResponse = await fetch(`${API_BASE_URL}/appointments?dateFrom=${testDate}&dateTo=${testDate}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!filteredResponse.ok) {
      throw new Error(`Error obteniendo citas filtradas: ${filteredResponse.status}`);
    }

    const filteredData = await filteredResponse.json();
    console.log(`   Citas para ${testDate}: ${filteredData.appointments.length}`);

    // 5. Verificar que las citas tienen todos los campos necesarios
    console.log('\n5️⃣ Verificando campos necesarios para el frontend...');
    const requiredFields = ['id', 'patient_id', 'doctor_id', 'appointment_date', 'appointment_time', 'type', 'status'];
    const missingFields = [];
    
    appointmentsData.appointments.forEach((appointment, index) => {
      const missing = requiredFields.filter(field => !appointment.hasOwnProperty(field));
      if (missing.length > 0) {
        missingFields.push({ appointmentIndex: index, missingFields: missing });
      }
    });

    if (missingFields.length === 0) {
      console.log('   ✅ Todas las citas tienen todos los campos requeridos');
    } else {
      console.log('   ⚠️ Algunas citas tienen campos faltantes:');
      missingFields.forEach(item => {
        console.log(`      Cita #${item.appointmentIndex + 1}: faltan ${item.missingFields.join(', ')}`);
      });
    }

    console.log('\n🎉 ¡Prueba de carga de agenda completada!');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  }
}

// Ejecutar la prueba
testAgendaLoading();
