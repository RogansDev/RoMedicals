#!/bin/bash

# Script para agregar tabla specialties a bases de datos existentes
echo "🔧 Agregando tabla specialties a bases de datos existentes..."

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
    
    # Verificar si la tabla specialties ya existe
    TABLE_EXISTS=$(mysql -u $DB_USER -p$DB_PASSWORD -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='specialties';" -s -N)
    
    if [ "$TABLE_EXISTS" -eq 0 ]; then
        echo "  ➕ Creando tabla specialties..."
        
        # Crear tabla specialties
        mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << EOF
CREATE TABLE IF NOT EXISTS specialties (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
EOF
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Tabla specialties creada"
            
            # Insertar especialidades por defecto
            echo "  ➕ Insertando especialidades por defecto..."
            
            mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << EOF
INSERT INTO specialties (id, name, description, isActive, createdAt) VALUES
(UUID(), 'Medicina General', 'Atención médica general', true, NOW()),
(UUID(), 'Pediatría', 'Especialidad en medicina infantil', true, NOW()),
(UUID(), 'Ginecología', 'Especialidad en salud femenina', true, NOW()),
(UUID(), 'Cardiología', 'Especialidad en enfermedades del corazón', true, NOW()),
(UUID(), 'Dermatología', 'Especialidad en enfermedades de la piel', true, NOW()),
(UUID(), 'Psiquiatría', 'Especialidad en salud mental', true, NOW()),
(UUID(), 'Endocrinología', 'Especialidad en sistema endocrino', true, NOW()),
(UUID(), 'Medicina Interna', 'Especialidad en medicina interna', true, NOW());
EOF
            
            if [ $? -eq 0 ]; then
                echo "  ✅ Especialidades insertadas"
            else
                echo "  ❌ Error insertando especialidades"
            fi
        else
            echo "  ❌ Error creando tabla specialties"
        fi
    else
        echo "  ℹ️  Tabla specialties ya existe"
    fi
    
    # Verificar si la tabla users tiene el campo specialtyId
    COLUMN_EXISTS=$(mysql -u $DB_USER -p$DB_PASSWORD -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$DB_NAME' AND table_name='users' AND column_name='specialtyId';" -s -N)
    
    if [ "$COLUMN_EXISTS" -eq 0 ]; then
        echo "  ➕ Agregando campo specialtyId a tabla users..."
        
        mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << EOF
ALTER TABLE users ADD COLUMN specialtyId VARCHAR(36);
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN lastLogin TIMESTAMP NULL;
EOF
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Campos agregados a tabla users"
        else
            echo "  ❌ Error agregando campos a tabla users"
        fi
    else
        echo "  ℹ️  Campos specialtyId y phone ya existen"
    fi
done

echo ""
echo "✅ Proceso completado"
echo "🔄 Reiniciando backend para aplicar cambios..."

# Reiniciar el backend
pm2 restart romedicals-backend

echo "✅ Backend reiniciado"
