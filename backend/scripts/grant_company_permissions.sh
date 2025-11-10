#!/bin/bash

# Script para otorgar permisos a nuevas bases de datos de empresas
# Uso: ./grant_company_permissions.sh <company_database_name>

COMPANY_DB=$1

if [ -z "$COMPANY_DB" ]; then
    echo "Uso: $0 <nombre_base_datos_empresa>"
    echo "Ejemplo: $0 romedicals_company_c9d713ea_5655_4e92_b940_7907d881f02b"
    exit 1
fi

echo "Otorgando permisos para la base de datos: $COMPANY_DB"

mysql -u root -e "GRANT ALL PRIVILEGES ON \`$COMPANY_DB\`.* TO 'romedicals_user'@'localhost'; FLUSH PRIVILEGES;"

if [ $? -eq 0 ]; then
    echo "✅ Permisos otorgados exitosamente para $COMPANY_DB"
else
    echo "❌ Error otorgando permisos para $COMPANY_DB"
    exit 1
fi
