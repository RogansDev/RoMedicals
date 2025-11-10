#!/bin/bash

# Script de restauración para ROMEDICALS+
# Restaura backups de la base de datos principal y empresas cliente

BACKUP_DIR="./backups"
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}

echo "🔄 Iniciando restauración de ROMEDICALS+"
echo "Fecha: $(date)"
echo "======================================"

# Verificar que se proporcionó el archivo de backup
if [ -z "$1" ]; then
    echo "❌ Error: Debes especificar el archivo de backup"
    echo "Uso: $0 <archivo_backup.tar.gz>"
    echo ""
    echo "Archivos disponibles:"
    ls -la $BACKUP_DIR/romedicals_backup_*.tar.gz 2>/dev/null || echo "No hay backups disponibles"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: El archivo $BACKUP_FILE no existe"
    exit 1
fi

echo "📦 Archivo de backup: $BACKUP_FILE"

# Función para ejecutar comandos MySQL
mysql_cmd() {
    if [ -n "$DB_PASSWORD" ]; then
        mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD "$@"
    else
        mysql -h$DB_HOST -u$DB_USER "$@"
    fi
}

# Extraer archivo de backup
echo "📂 Extrayendo archivo de backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

if [ $? -eq 0 ]; then
    echo "✅ Archivo extraído en: $TEMP_DIR"
else
    echo "❌ Error extrayendo archivo de backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restaurar base de datos principal
echo "🔄 Restaurando base de datos principal..."
MAIN_SQL=$(find "$TEMP_DIR" -name "romedicals_main_*.sql" | head -1)

if [ -f "$MAIN_SQL" ]; then
    mysql_cmd romedicals_main < "$MAIN_SQL"
    
    if [ $? -eq 0 ]; then
        echo "✅ Base de datos principal restaurada"
    else
        echo "❌ Error restaurando base de datos principal"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
else
    echo "⚠️ No se encontró archivo SQL de base de datos principal"
fi

# Restaurar bases de datos de empresas
echo "🔄 Restaurando bases de datos de empresas..."
COMPANY_SQLS=$(find "$TEMP_DIR" -name "romedicals_company_*.sql")

if [ -n "$COMPANY_SQLS" ]; then
    echo "$COMPANY_SQLS" | while read sql_file; do
        if [ -f "$sql_file" ]; then
            # Extraer ID de empresa del nombre del archivo
            company_id=$(basename "$sql_file" | sed 's/romedicals_company_\(.*\)_.*\.sql/\1/')
            
            if [ -n "$company_id" ]; then
                echo "🔄 Restaurando empresa: $company_id"
                
                # Crear base de datos si no existe
                mysql_cmd -e "CREATE DATABASE IF NOT EXISTS romedicals_company_$company_id CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                
                # Restaurar datos
                mysql_cmd "romedicals_company_$company_id" < "$sql_file"
                
                if [ $? -eq 0 ]; then
                    echo "✅ Empresa $company_id restaurada"
                else
                    echo "⚠️ Error restaurando empresa $company_id"
                fi
            fi
        fi
    done
else
    echo "⚠️ No se encontraron archivos SQL de empresas"
fi

# Limpiar archivos temporales
rm -rf "$TEMP_DIR"
echo "🧹 Archivos temporales eliminados"

echo ""
echo "🎉 Restauración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Verificar que el servidor backend esté funcionando"
echo "2. Probar login con credenciales conocidas"
echo "3. Verificar que todas las empresas estén operativas"
echo ""

# Mostrar información de empresas restauradas
echo "📊 Empresas restauradas:"
mysql_cmd -e "SELECT companyName, companyType, COUNT(*) as userCount FROM romedicals_main.companies c LEFT JOIN romedicals_main.users u ON c.adminId = u.id WHERE u.role = 'super_user' GROUP BY c.id;" 2>/dev/null || echo "No se pudo obtener información de empresas"
