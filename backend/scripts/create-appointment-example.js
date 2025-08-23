const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function createAppointmentExample() {
  try {
    console.log('📅 Creando una cita de ejemplo...\n');

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

    // 2. Crear una cita
    console.log('2️⃣ Creando cita...');
    
    // Calcular fecha futura (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointmentDate = tomorrow.toISOString().split('T')[0];
    
    const newAppointment = {
      patientId: 1, // ID del paciente Juan Pérez
      doctorId: 2,  // ID del doctor Ana María López
      appointmentDate: appointmentDate,
      appointmentTime: '14:00',
      duration: 45,
      type: 'CONSULTA',
      status: 'PROGRAMADA',
      reason: 'Consulta de medicina general',
      notes: 'Paciente solicita revisión completa y exámenes de rutina'
    };

    const createResponse = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newAppointment)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Error creando cita: ${createResponse.status} - ${errorData.message}`);
    }

    const createdAppointment = await createResponse.json();
    console.log('✅ Cita creada exitosamente!');
    console.log('\n📋 Detalles de la cita:');
    console.log(`   ID: ${createdAppointment.appointment.id}`);
    console.log(`   Paciente: Juan Pérez`);
    console.log(`   Doctor: Ana María López`);
    console.log(`   Fecha: ${createdAppointment.appointment.appointment_date}`);
    console.log(`   Hora: ${createdAppointment.appointment.appointment_time}`);
    console.log(`   Duración: ${createdAppointment.appointment.duration} minutos`);
    console.log(`   Tipo: ${createdAppointment.appointment.type}`);
    console.log(`   Estado: ${createdAppointment.appointment.status}`);
    console.log(`   Motivo: ${createdAppointment.appointment.reason}`);
    console.log(`   Notas: ${createdAppointment.appointment.notes}`);

    // 3. Verificar que la cita aparece en la lista
    console.log('\n3️⃣ Verificando lista de citas...');
    const listResponse = await fetch(`${API_BASE_URL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!listResponse.ok) {
      throw new Error(`Error obteniendo citas: ${listResponse.status}`);
    }

    const appointmentsData = await listResponse.json();
    console.log(`✅ Total de citas en el sistema: ${appointmentsData.appointments.length}`);
    
    if (appointmentsData.appointments.length > 0) {
      console.log('\n📅 Citas disponibles:');
      appointmentsData.appointments.forEach((appointment, index) => {
        console.log(`   ${index + 1}. ${appointment.patientFullName} - ${appointment.doctorFullName} - ${appointment.appointment_date} ${appointment.appointment_time}`);
      });
    }

    console.log('\n🎉 ¡Cita creada y verificada exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar el ejemplo
createAppointmentExample();
