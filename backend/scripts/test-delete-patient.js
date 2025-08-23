const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testDeletePatient() {
  try {
    console.log('🧪 Probando funcionalidad de eliminación de pacientes...\n');

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
    const token = loginData.token;
    console.log('✅ Login exitoso, token obtenido\n');

    // 2. Obtener lista de pacientes
    console.log('2️⃣ Obteniendo lista de pacientes...');
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
      console.log('⚠️ No hay pacientes para eliminar. Creando uno de prueba...');
      
      // Crear un paciente de prueba
      const createResponse = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: 'Paciente',
          lastName: 'De Prueba',
          identificationType: 'CC',
          identificationNumber: '123456789',
          gender: 'Masculino',
          birthYear: '1990',
          birthMonth: 'Enero',
          birthDay: '1'
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Error creando paciente de prueba: ${createResponse.status} ${createResponse.statusText}`);
      }

      const createdPatient = await createResponse.json();
      console.log('✅ Paciente de prueba creado con ID:', createdPatient.patient.id);
      
      // Obtener la lista actualizada
      const updatedPatientsResponse = await fetch(`${API_BASE_URL}/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const updatedPatientsData = await updatedPatientsResponse.json();
      patientsData.patients = updatedPatientsData.patients;
    }

    // 3. Seleccionar el primer paciente para eliminar
    const patientToDelete = patientsData.patients[0];
    console.log(`3️⃣ Paciente seleccionado para eliminar: ${patientToDelete.first_name} ${patientToDelete.last_name} (ID: ${patientToDelete.id})\n`);

    // 4. Eliminar el paciente
    console.log('4️⃣ Eliminando paciente...');
    const deleteResponse = await fetch(`${API_BASE_URL}/patients/${patientToDelete.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!deleteResponse.ok) {
      throw new Error(`Error eliminando paciente: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }

    const deleteData = await deleteResponse.json();
    console.log('✅ Paciente eliminado exitosamente');
    console.log('Respuesta del servidor:', deleteData);

    // 5. Verificar que el paciente ya no existe
    console.log('\n5️⃣ Verificando que el paciente fue eliminado...');
    const verifyResponse = await fetch(`${API_BASE_URL}/patients/${patientToDelete.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (verifyResponse.status === 404) {
      console.log('✅ Verificación exitosa: El paciente ya no existe en la base de datos');
    } else {
      console.log('⚠️ El paciente aún existe en la base de datos');
    }

    // 6. Obtener lista actualizada
    console.log('\n6️⃣ Obteniendo lista actualizada de pacientes...');
    const finalPatientsResponse = await fetch(`${API_BASE_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const finalPatientsData = await finalPatientsResponse.json();
    console.log(`✅ Lista final: ${finalPatientsData.patients.length} pacientes`);

    console.log('\n🎉 ¡Prueba de eliminación completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    if (error.response) {
      console.error('Respuesta del servidor:', error.response);
    }
  }
}

// Ejecutar la prueba
testDeletePatient();
