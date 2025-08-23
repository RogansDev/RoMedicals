#!/usr/bin/env node

/**
 * Script para contar las columnas en el INSERT de pacientes
 */

// Columnas especificadas en el INSERT
const insertColumns = [
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

// Valores en el array
const insertValues = [
  'patientData.guardianId || null',
  'patientData.firstName',
  'patientData.lastName',
  'patientData.identificationType',
  'patientData.identificationNumber',
  'patientData.residenceCountry || null',
  'patientData.originCountry || null',
  'patientData.isForeigner || false',
  'patientData.gender',
  'birthDate',
  'patientData.bloodType || null',
  'patientData.disability || null',
  'patientData.occupation || null',
  'patientData.maritalStatus || null',
  'patientData.educationLevel || null',
  'patientData.activityProfession || null',
  'patientData.patientType || null',
  'patientData.eps || null',
  'patientData.email || null',
  'patientData.address || null',
  'patientData.city || null',
  'patientData.department || null',
  'patientData.residentialZone || null',
  'patientData.landlinePhone || null',
  'patientData.mobilePhoneCountry || null',
  'patientData.mobilePhone || null',
  'patientData.companionName || null',
  'patientData.companionPhone || null',
  'patientData.responsibleName || null',
  'patientData.responsiblePhone || null',
  'patientData.responsibleRelationship || null',
  'patientData.agreement || null',
  'patientData.observations || null',
  'patientData.reference || null',
  'req.user.id'
];

console.log('🔍 Análisis del INSERT de pacientes\n');

console.log('📊 COLUMNAS en el INSERT:');
insertColumns.forEach((col, index) => {
  console.log(`${(index + 1).toString().padStart(2, '0')}. ${col}`);
});

console.log(`\n📊 Total de columnas: ${insertColumns.length}`);

console.log('\n📊 VALORES en el array:');
insertValues.forEach((val, index) => {
  console.log(`${(index + 1).toString().padStart(2, '0')}. ${val}`);
});

console.log(`\n📊 Total de valores: ${insertValues.length}`);

console.log('\n📊 PLACEHOLDERS en VALUES:');
const placeholders = [];
for (let i = 1; i <= insertColumns.length; i++) {
  placeholders.push(`$${i}`);
}
console.log(`VALUES (${placeholders.join(', ')})`);

console.log('\n🔍 VERIFICACIÓN:');
if (insertColumns.length === insertValues.length) {
  console.log('✅ Columnas y valores coinciden');
} else {
  console.log('❌ DISCREPANCIA:');
  console.log(`   - Columnas: ${insertColumns.length}`);
  console.log(`   - Valores: ${insertValues.length}`);
  console.log(`   - Diferencia: ${Math.abs(insertColumns.length - insertValues.length)}`);
}

console.log('\n📝 NOTA: La tabla tiene 38 columnas totales, pero solo 33 son manejadas por el INSERT.');
console.log('   Las columnas restantes (id, created_at, updated_at) se manejan automáticamente por PostgreSQL.');
