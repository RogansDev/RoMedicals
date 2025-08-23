#!/usr/bin/env node

/**
 * Script para probar la construcción de la fecha de nacimiento
 */

// Función auxiliar para convertir mes a número (copiada del código)
function getMonthNumber(monthName) {
  const months = {
    'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
    'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
    'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
  };
  return months[monthName] || '01';
}

// Datos de prueba
const testData = {
  birthDay: '15',
  birthMonth: 'Marzo',
  birthYear: '1990'
};

console.log('🔍 Probando construcción de fecha de nacimiento\n');

console.log('📝 Datos de entrada:');
console.log(`   - Día: ${testData.birthDay}`);
console.log(`   - Mes: ${testData.birthMonth}`);
console.log(`   - Año: ${testData.birthYear}`);

// Construir fecha de nacimiento (como en el código)
const birthDate = testData.birthYear && testData.birthMonth && testData.birthDay 
  ? `${testData.birthYear}-${getMonthNumber(testData.birthMonth)}-${testData.birthDay.padStart(2, '0')}`
  : null;

console.log('\n🔧 Proceso de construcción:');
console.log(`   1. getMonthNumber('${testData.birthMonth}') = ${getMonthNumber(testData.birthMonth)}`);
console.log(`   2. ${testData.birthDay}.padStart(2, '0') = ${testData.birthDay.padStart(2, '0')}`);
console.log(`   3. Fecha construida: ${testData.birthYear}-${getMonthNumber(testData.birthMonth)}-${testData.birthDay.padStart(2, '0')}`);

console.log('\n📅 Resultado final:');
console.log(`   birthDate = ${birthDate}`);

// Verificar si es una fecha válida
if (birthDate) {
  const dateObj = new Date(birthDate);
  console.log(`   Fecha válida: ${!isNaN(dateObj.getTime())}`);
  console.log(`   Objeto Date: ${dateObj.toISOString()}`);
} else {
  console.log('   ❌ No se pudo construir la fecha');
}

// Probar con diferentes meses
console.log('\n🧪 Pruebas con diferentes meses:');
const testMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

testMonths.forEach(month => {
  const monthNum = getMonthNumber(month);
  console.log(`   ${month.padEnd(12)} -> ${monthNum}`);
});

console.log('\n✅ Pruebas completadas');
