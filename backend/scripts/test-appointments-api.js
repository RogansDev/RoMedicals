const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testAppointmentsAPI() {
  try {
    console.log('🧪 Probando funcionalidad de appointments...\n');

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
    console.log('✅ Login exitoso, token obtenido\n');

    // 2. Obtener lista de usuarios médicos
    console.log('2️⃣ Obteniendo usuarios médicos...');
    const usersResponse = await fetch(`${API_BASE_URL}/users?role=medical_user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!usersResponse.ok) {
      throw new Error(`Error obteniendo usuarios: ${usersResponse.status} ${usersResponse.statusText}`);
    }

    const usersData = await usersResponse.json();
    console.log(`✅ Se encontraron ${usersData.users.length} usuarios médicos`);
    
    if (usersData.users.length === 0) {
      console.log('⚠️ No hay usuarios médicos disponibles');
      return;
    }

    const doctor = usersData.users[0];
    console.log(`Doctor seleccionado: ${doctor.first_name} ${doctor.last_name} (ID: ${doctor.id})\n`);

    // 3. Obtener lista de pacientes
    console.log('3️⃣ Obteniendo pacientes...');
    const patientsResponse = await fetch(`${API_BASE_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!patientsResponse.ok) {
      throw new Error(`Error obteniendo pacientes: ${patientsResponse.status} ${patientsResponse.statusText}`);
    }

    const patientsData = await patientsResponse.json();
    console.log(`✅ Se encontraron ${patientsData.patients.length} pacientes`);
    
    if (patientsData.patients.length === 0) {
      console.log('⚠️ No hay pacientes disponibles');
      return;
    }

    const patient = patientsData.patients[0];
    console.log(`Paciente seleccionado: ${patient.first_name} ${patient.last_name} (ID: ${patient.id})\n`);

    // 4. Obtener lista de appointments existentes
    console.log('4️⃣ Obteniendo appointments existentes...');
    const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!appointmentsResponse.ok) {
      throw new Error(`Error obteniendo appointments: ${appointmentsResponse.status} ${appointmentsResponse.statusText}`);
    }

    const appointmentsData = await appointmentsResponse.json();
    console.log(`✅ Se encontraron ${appointmentsData.appointments.length} appointments\n`);

    // 5. Crear un nuevo appointment
    console.log('5️⃣ Creando nuevo appointment...');
    const newAppointment = {
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentDate: '2025-08-25',
      appointmentTime: '10:00',
      duration: 30,
      type: 'CONSULTA',
      status: 'PROGRAMADA',
      reason: 'Consulta de control',
      notes: 'Paciente solicita revisión general'
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
      throw new Error(`Error creando appointment: ${createResponse.status} - ${errorData.message}`);
    }

    const createdAppointment = await createResponse.json();
    console.log('✅ Appointment creado exitosamente');
    console.log('ID del appointment:', createdAppointment.appointment.id);
    console.log('Fecha:', createdAppointment.appointment.appointment_date);
    console.log('Hora:', createdAppointment.appointment.appointment_time);

    // 6. Obtener el appointment creado
    console.log('\n6️⃣ Obteniendo appointment creado...');
    const getAppointmentResponse = await fetch(`${API_BASE_URL}/appointments/${createdAppointment.appointment.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!getAppointmentResponse.ok) {
      throw new Error(`Error obteniendo appointment: ${getAppointmentResponse.status} ${getAppointmentResponse.statusText}`);
    }

    const retrievedAppointment = await getAppointmentResponse.json();
    console.log('✅ Appointment obtenido exitosamente');
    console.log('Estado:', retrievedAppointment.appointment.status);
    console.log('Tipo:', retrievedAppointment.appointment.type);

    // 7. Actualizar el appointment
    console.log('\n7️⃣ Actualizando appointment...');
    const updateData = {
      ...newAppointment,
      status: 'CONFIRMADA',
      notes: 'Paciente confirmó asistencia'
    };

    const updateResponse = await fetch(`${API_BASE_URL}/appointments/${createdAppointment.appointment.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Error actualizando appointment: ${updateResponse.status} - ${errorData.message}`);
    }

    const updatedAppointment = await updateResponse.json();
    console.log('✅ Appointment actualizado exitosamente');
    console.log('Nuevo estado:', updatedAppointment.appointment.status);

    // 8. Eliminar el appointment
    console.log('\n8️⃣ Eliminando appointment...');
    const deleteResponse = await fetch(`${API_BASE_URL}/appointments/${createdAppointment.appointment.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(`Error eliminando appointment: ${deleteResponse.status} - ${errorData.message}`);
    }

    console.log('✅ Appointment eliminado exitosamente');

    console.log('\n🎉 ¡Prueba de appointments completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    if (error.response) {
      console.error('Respuesta del servidor:', error.response);
    }
  }
}

// Ejecutar la prueba
testAppointmentsAPI();
