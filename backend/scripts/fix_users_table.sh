#!/bin/bash

# Script para agregar campos faltantes a tabla users
echo "🔧 Agregando campos faltantes a tabla users..."

# Credenciales de la base de datos
DB_USER="romedicals_user"
DB_PASSWORD="romedicals_password"

# Obtener lista de bases de datos de empresas
COMPANIES=$(mysql -u $DB_USER -p$DB_PASSWORD -e "SHOW DATABASES LIKE 'romedicals_company_%';" -s -N)

if [ -z "$COMPANIES" ]; then
    echo "❌ No se encontraron bases de datos de empresas"
    exit 1
fi

echo "📋 Bases de datos encontradas:"
echo "$COMPANIES"

# Procesar cada base de datos
for DB_NAME in $COMPANIES; do
    echo ""
    echo "🔨 Procesando: $DB_NAME"
    
    # Verificar si los campos ya existen
    COLUMN_EXISTS=$(mysql -u $DB_USER -p$DB_PASSWORD -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$DB_NAME' AND table_name='users' AND column_name='idType';" -s -N)
    
    if [ "$COLUMN_EXISTS" -eq 0 ]; then
        echo "  ➕ Agregando campos faltantes a tabla users..."
        
        mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << EOF
ALTER TABLE users ADD COLUMN idType VARCHAR(10);
ALTER TABLE users ADD COLUMN idNumber VARCHAR(50);
ALTER TABLE users ADD COLUMN providerCode VARCHAR(50);
ALTER TABLE users ADD COLUMN title VARCHAR(20);
EOF
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Campos agregados a tabla users"
        else
            echo "  ❌ Error agregando campos a tabla users"
        fi
    else
        echo "  ℹ️  Campos ya existen en tabla users"
    fi
done

echo ""
echo "✅ Proceso completado"
echo "🔄 Reiniciando backend para aplicar cambios..."

# Reiniciar el backend
pm2 restart romedicals-backend

echo "✅ Backend reiniciado"
