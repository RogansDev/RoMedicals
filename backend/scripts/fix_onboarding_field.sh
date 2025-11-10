#!/bin/bash

echo "🔧 Agregando campo onboardingCompleted a tabla users en bases de datos de empresas..."

# Configuración de base de datos
DB_HOST="localhost"
DB_USER="romedicals_user"
DB_PASSWORD="romedicals_password"

# Obtener lista de bases de datos de empresas
COMPANIES=$(mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST -e "SHOW DATABASES LIKE 'romedicals_company_%';" | grep -v "Database" | grep "romedicals_company_")

echo "📋 Bases de datos encontradas:"
echo "$COMPANIES"

# Procesar cada base de datos
for DB in $COMPANIES; do
    echo ""
    echo "🔨 Procesando: $DB"
    
    # Verificar si la columna ya existe
    COLUMN_EXISTS=$(mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST -e "USE $DB; SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$DB' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'onboardingCompleted';" 2>/dev/null | tail -n 1)
    
    if [ "$COLUMN_EXISTS" = "0" ]; then
        echo "  ➕ Agregando campo onboardingCompleted a tabla users..."
        mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST -e "USE $DB; ALTER TABLE users ADD COLUMN onboardingCompleted BOOLEAN DEFAULT FALSE;" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Campo agregado a tabla users"
            
            # Actualizar usuarios existentes para que necesiten onboarding
            echo "  🔄 Actualizando usuarios existentes..."
            mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST -e "USE $DB; UPDATE users SET onboardingCompleted = FALSE WHERE onboardingCompleted IS NULL;" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo "  ✅ Usuarios actualizados"
            else
                echo "  ❌ Error actualizando usuarios"
            fi
        else
            echo "  ❌ Error agregando campo a tabla users"
        fi
    else
        echo "  ℹ️  Campo onboardingCompleted ya existe en tabla users"
    fi
done

echo ""
echo "✅ Proceso completado"
echo "🔄 Reiniciando backend para aplicar cambios..."
pm2 restart romedicals-backend
