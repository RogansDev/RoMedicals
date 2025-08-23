#!/usr/bin/env node

/**
 * Script para simular exactamente la lógica del INSERT de pacientes
 */

// Simular los datos que vienen del frontend
const patientData = {
  firstName: 'Test',
  lastName: 'Paciente',
  identificationType: 'CC',
  identificationNumber: '9999999999',
  gender: 'Masculino',
  birthDay: '1',
  birthMonth: 'Enero',
  birthYear: '1990'
};

// Función auxiliar para convertir mes a número (copiada del código)
function getMonthNumber(monthName) {
  const months = {
    'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
    'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
    'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
  };
  return months[monthName] || '01';
}

console.log('🔍 Simulando la lógica del INSERT de pacientes\n');

console.log('📝 Datos de entrada:');
console.log(JSON.stringify(patientData, null, 2));

// Construir fecha de nacimiento (exactamente como en el código)
const birthDate = patientData.birthYear && patientData.birthMonth && patientData.birthDay 
  ? `${patientData.birthYear}-${getMonthNumber(patientData.birthMonth)}-${patientData.birthDay.padStart(2, '0')}`
  : null;

console.log('\n📅 Fecha construida:');
console.log(`   birthDate = ${birthDate}`);

// Simular el array de valores que se pasa a la consulta
const values = [
  patientData.guardianId || null,
  patientData.firstName,
  patientData.lastName,
  patientData.identificationType,
  patientData.identificationNumber,
  patientData.residenceCountry || null,
  patientData.originCountry || null,
  patientData.isForeigner || false,
  patientData.gender,
  birthDate,
  patientData.bloodType || null,
  patientData.disability || null,
  patientData.occupation || null,
  patientData.maritalStatus || null,
  patientData.educationLevel || null,
  patientData.activityProfession || null,
  patientData.patientType || null,
  patientData.eps || null,
  patientData.email || null,
  patientData.address || null,
  patientData.city || null,
  patientData.department || null,
  patientData.residentialZone || null,
  patientData.landlinePhone || null,
  patientData.mobilePhoneCountry || null,
  patientData.mobilePhone || null,
  patientData.companionName || null,
  patientData.companionPhone || null,
  patientData.responsibleName || null,
  patientData.responsiblePhone || null,
  patientData.responsibleRelationship || null,
  patientData.agreement || null,
  patientData.observations || null,
  patientData.reference || null,
  1 // req.user.id simulado
];

console.log('\n📊 Array de valores:');
values.forEach((val, index) => {
  console.log(`${(index + 1).toString().padStart(2, '0')}. ${val} (${typeof val})`);
});

console.log(`\n📊 Total de valores: ${values.length}`);

// Simular la consulta SQL
const columns = [
  'guardian_id',
  'first_name', 
  'last_name',
  'identification_type',
  'identification_number',
  'residence_country',
  'origin_country',
  'is_foreigner',
  'gender',
  'birth_date',
  'blood_type',
  'disability',
  'occupation',
  'marital_status',
  'education_level',
  'activity_profession',
  'patient_type',
  'eps',
  'email',
  'address',
  'city',
  'department',
  'residential_zone',
  'landline_phone',
  'mobile_phone_country',
  'mobile_phone',
  'companion_name',
  'companion_phone',
  'responsible_name',
  'responsible_phone',
  'responsible_relationship',
  'agreement',
  'observations',
  'reference',
  'created_by'
];

console.log('\n📊 Columnas en el INSERT:');
columns.forEach((col, index) => {
  console.log(`${(index + 1).toString().padStart(2, '0')}. ${col}`);
});

console.log(`\n📊 Total de columnas: ${columns.length}`);

// Verificar coincidencia
if (columns.length === values.length) {
  console.log('\n✅ Columnas y valores coinciden');
} else {
  console.log('\n❌ DISCREPANCIA:');
  console.log(`   - Columnas: ${columns.length}`);
  console.log(`   - Valores: ${values.length}`);
  console.log(`   - Diferencia: ${Math.abs(columns.length - values.length)}`);
}

// Simular la consulta SQL completa
console.log('\n🔍 Consulta SQL simulada:');
const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
console.log(`INSERT INTO patients (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *;`);

console.log('\n✅ Simulación completada');
