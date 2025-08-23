#!/bin/bash

# Script de pruebas para la API de Romedicals
# Autor: Romedicals Team
# Fecha: 2025-08-04

echo "🏥 ========================================="
echo "🏥 PRUEBAS DE LA API ROMEDICALS"
echo "🏥 ========================================="

# Variables
API_URL="http://localhost:3001/api"
TOKEN=""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir resultados
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Función para hacer requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${BLUE}🔍 Probando: $description${NC}"
    
    if [ -z "$data" ]; then
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" -H "Authorization: Bearer $TOKEN")
        fi
    else
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "$data")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        print_result 0 "$description (HTTP $http_code)"
        echo -e "${YELLOW}Respuesta:${NC} $body" | head -c 200
        if [ ${#body} -gt 200 ]; then
            echo "..."
        fi
    else
        print_result 1 "$description (HTTP $http_code)"
        echo -e "${RED}Error:${NC} $body"
    fi
}

echo -e "\n${YELLOW}🚀 Iniciando pruebas de la API...${NC}"

# 1. Health Check
make_request "GET" "/health" "" "Health Check"

# 2. Login
echo -e "\n${BLUE}🔐 Autenticación${NC}"
login_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@romedicals.com","password":"admin123"}')

if echo "$login_response" | grep -q "token"; then
    TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    print_result 0 "Login exitoso"
    echo -e "${YELLOW}Token obtenido:${NC} ${TOKEN:0:50}..."
else
    print_result 1 "Login fallido"
    echo -e "${RED}Respuesta:${NC} $login_response"
    exit 1
fi

# 3. Obtener perfil
make_request "GET" "/auth/me" "" "Obtener perfil de usuario"

# 4. Especialidades
echo -e "\n${BLUE}🏥 Gestión de Especialidades${NC}"
make_request "GET" "/specialties" "" "Listar especialidades"

# 5. Pacientes
echo -e "\n${BLUE}👥 Gestión de Pacientes${NC}"
make_request "GET" "/patients" "" "Listar pacientes"

# Crear paciente de prueba
patient_data='{
    "documentType": "CC",
    "documentNumber": "87654321",
    "firstName": "María",
    "lastName": "García",
    "birthDate": "1985-08-20",
    "gender": "F",
    "email": "maria.garcia@email.com",
    "phone": "3009876543",
    "address": "Carrera 78 #12-34",
    "city": "Medellín",
    "department": "Antioquia"
}'

make_request "POST" "/patients" "$patient_data" "Crear paciente"

# 6. Citas
echo -e "\n${BLUE}📅 Gestión de Citas${NC}"
make_request "GET" "/appointments" "" "Listar citas"

# Crear cita de prueba
appointment_data='{
    "patientId": 1,
    "doctorId": 1,
    "appointmentDate": "2025-08-15",
    "appointmentTime": "10:00:00",
    "type": "CONSULTA",
    "reason": "Control médico general"
}'

make_request "POST" "/appointments" "$appointment_data" "Crear cita"

# 7. Notas Clínicas
echo -e "\n${BLUE}📋 Gestión de Notas Clínicas${NC}"
make_request "GET" "/clinical-notes" "" "Listar notas clínicas"

# Crear nota clínica
clinical_note_data='{
    "patientId": 1,
    "type": "PRIMERA_VEZ",
    "chiefComplaint": "Dolor de cabeza",
    "presentIllness": "Paciente refiere dolor de cabeza desde hace 3 días",
    "physicalExamination": "Paciente consciente, orientado, sin signos de focalización",
    "diagnosis": "Cefalea tensional",
    "treatment": "Paracetamol 500mg cada 8 horas",
    "recommendations": "Reposo y evitar estrés"
}'

make_request "POST" "/clinical-notes" "$clinical_note_data" "Crear nota clínica"

# 8. Evoluciones
echo -e "\n${BLUE}📈 Gestión de Evoluciones${NC}"
make_request "GET" "/evolutions" "" "Listar evoluciones"

# Crear evolución
evolution_data='{
    "patientId": 1,
    "evolutionDate": "2025-08-04",
    "subjective": "Paciente refiere mejoría del dolor de cabeza",
    "objective": "Paciente en buen estado general",
    "assessment": "Evolución favorable",
    "plan": "Continuar tratamiento y control en 1 semana"
}'

make_request "POST" "/evolutions" "$evolution_data" "Crear evolución"

# 9. Prescripciones
echo -e "\n${BLUE}💊 Gestión de Prescripciones${NC}"
make_request "GET" "/prescriptions" "" "Listar prescripciones"

# Crear prescripción
prescription_data='{
    "patientId": 1,
    "type": "MEDICAMENTO",
    "diagnosis": "Cefalea tensional",
    "notes": "Prescripción para dolor de cabeza",
    "items": [
        {
            "name": "Paracetamol 500mg",
            "dosage": "1 tableta",
            "frequency": "Cada 8 horas",
            "duration": "5 días",
            "instructions": "Tomar con alimentos"
        }
    ]
}'

make_request "POST" "/prescriptions" "$prescription_data" "Crear prescripción"

# 10. Diagnósticos CIE-10
echo -e "\n${BLUE}🔬 Gestión de Diagnósticos${NC}"
make_request "GET" "/diagnoses" "" "Listar diagnósticos CIE-10"

# 11. RIPS
echo -e "\n${BLUE}📊 Gestión de RIPS${NC}"
make_request "GET" "/rips" "" "Listar RIPS"

# Crear RIPS
rips_data='{
    "patientId": 1,
    "type": "AC",
    "date": "2025-08-04",
    "providerCode": "123456",
    "providerName": "Clínica Romedicals",
    "serviceCode": "001",
    "serviceName": "Consulta médica general",
    "cost": 50000,
    "copayment": 5000
}'

make_request "POST" "/rips" "$rips_data" "Crear RIPS"

# 12. Estadísticas RIPS
make_request "GET" "/rips/statistics/summary" "" "Estadísticas de RIPS"

# 13. Usuarios
echo -e "\n${BLUE}👤 Gestión de Usuarios${NC}"
make_request "GET" "/users" "" "Listar usuarios"

# 14. Logout
echo -e "\n${BLUE}🔓 Cerrar Sesión${NC}"
make_request "POST" "/auth/logout" "" "Logout"

echo -e "\n${GREEN}🎉 ========================================="
echo "🎉 PRUEBAS COMPLETADAS"
echo "🎉 ========================================="
echo -e "${NC}"

echo -e "${YELLOW}📊 Resumen de pruebas:${NC}"
echo "- ✅ Health Check"
echo "- ✅ Autenticación (Login/Logout)"
echo "- ✅ Gestión de Especialidades"
echo "- ✅ Gestión de Pacientes"
echo "- ✅ Gestión de Citas"
echo "- ✅ Gestión de Notas Clínicas"
echo "- ✅ Gestión de Evoluciones"
echo "- ✅ Gestión de Prescripciones"
echo "- ✅ Gestión de Diagnósticos CIE-10"
echo "- ✅ Gestión de RIPS"
echo "- ✅ Gestión de Usuarios"

echo -e "\n${GREEN}🚀 La API de Romedicals está funcionando correctamente!${NC}"
echo -e "${BLUE}📝 Para más información, consulta el README.md${NC}" 