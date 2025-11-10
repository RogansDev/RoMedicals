#!/bin/bash

# Script de backup para ROMEDICALS+
# Crea backups de la base de datos principal y todas las empresas cliente

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}

echo "🗄️ Iniciando backup de ROMEDICALS+"
echo "Fecha: $(date)"
echo "=================================="

# Crear directorio de backup si no existe
mkdir -p $BACKUP_DIR

# Función para ejecutar comandos MySQL
mysql_cmd() {
    if [ -n "$DB_PASSWORD" ]; then
        mysql -h$DB_HOST -u$DB_USER -p$DB_PASSWORD "$@"
    else
        mysql -h$DB_HOST -u$DB_USER "$@"
    fi
}

mysqldump_cmd() {
    if [ -n "$DB_PASSWORD" ]; then
        mysqldump -h$DB_HOST -u$DB_USER -p$DB_PASSWORD "$@"
    else
        mysqldump -h$DB_HOST -u$DB_USER "$@"
    fi
}

# Backup de base de datos principal
echo "📦 Creando backup de base de datos principal..."
mysqldump_cmd --single-transaction --routines --triggers romedicals_main > "$BACKUP_DIR/romedicals_main_$DATE.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup principal completado: romedicals_main_$DATE.sql"
else
    echo "❌ Error en backup principal"
    exit 1
fi

# Obtener lista de empresas cliente
echo "🔍 Obteniendo lista de empresas cliente..."
COMPANIES=$(mysql_cmd -e "SELECT DISTINCT companyId FROM romedicals_main.users WHERE role = 'super_user' AND isActive = TRUE;" -s -N)

if [ $? -eq 0 ] && [ -n "$COMPANIES" ]; then
    echo "📋 Empresas encontradas:"
    echo "$COMPANIES" | while read company_id; do
        echo "  - romedicals_company_$company_id"
    done
    
    # Backup de cada empresa
    echo "$COMPANIES" | while read company_id; do
        if [ -n "$company_id" ]; then
            echo "📦 Creando backup de empresa: $company_id"
            mysqldump_cmd --single-transaction --routines --triggers "romedicals_company_$company_id" > "$BACKUP_DIR/romedicals_company_$company_id_$DATE.sql"
            
            if [ $? -eq 0 ]; then
                echo "✅ Backup empresa $company_id completado"
            else
                echo "⚠️ Error en backup empresa $company_id"
            fi
        fi
    done
else
    echo "⚠️ No se encontraron empresas cliente o error obteniendo lista"
fi

# Comprimir backups
echo "🗜️ Comprimiendo backups..."
cd $BACKUP_DIR
tar -czf "romedicals_backup_$DATE.tar.gz" *.sql
cd ..

if [ $? -eq 0 ]; then
    echo "✅ Backup comprimido: $BACKUP_DIR/romedicals_backup_$DATE.tar.gz"
    
    # Limpiar archivos SQL individuales
    rm $BACKUP_DIR/*.sql
    echo "🧹 Archivos SQL individuales eliminados"
else
    echo "❌ Error comprimiendo backup"
fi

# Mostrar información del backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/romedicals_backup_$DATE.tar.gz" | cut -f1)
echo ""
echo "📊 Resumen del backup:"
echo "  Archivo: romedicals_backup_$DATE.tar.gz"
echo "  Tamaño: $BACKUP_SIZE"
echo "  Ubicación: $BACKUP_DIR/"
echo ""
echo "🎉 Backup completado exitosamente!"

# Limpiar backups antiguos (mantener últimos 7 días)
echo "🧹 Limpiando backups antiguos..."
find $BACKUP_DIR -name "romedicals_backup_*.tar.gz" -mtime +7 -delete
echo "✅ Backups antiguos eliminados"
