#!/bin/bash

echo "🚀 Configurando ROMEDICALS+ Backend"
echo "=================================="

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 16+ primero."
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Se requiere Node.js 16 o superior. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo de configuración..."
    cp env.example .env
    echo "⚠️  Por favor configura el archivo .env con tus datos de base de datos"
fi

# Crear directorio de uploads
mkdir -p uploads

# Verificar conexión a MySQL
echo "🔍 Verificando conexión a MySQL..."
if command -v mysql &> /dev/null; then
    echo "✅ MySQL detectado"
    echo "📋 Por favor ejecuta los siguientes comandos SQL:"
    echo ""
    echo "CREATE DATABASE IF NOT EXISTS romedicals_main CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo "CREATE USER IF NOT EXISTS 'romedicals_user'@'localhost' IDENTIFIED BY 'romedicals_password';"
    echo "GRANT ALL PRIVILEGES ON romedicals_main.* TO 'romedicals_user'@'localhost';"
    echo "GRANT ALL PRIVILEGES ON romedicals_company_*.* TO 'romedicals_user'@'localhost';"
    echo "FLUSH PRIVILEGES;"
    echo ""
else
    echo "⚠️  MySQL no detectado. Por favor instala MySQL primero."
fi

echo ""
echo "🎉 Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configura el archivo .env con tus datos de base de datos"
echo "2. Ejecuta los comandos SQL mostrados arriba"
echo "3. Inicia el servidor con: npm run dev"
echo ""
echo "🔐 Credenciales por defecto:"
echo "   Email: romedicals@admin.com"
echo "   Password: Romedicals2024!"
echo ""
