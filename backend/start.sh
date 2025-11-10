#!/bin/bash

echo "🚀 ROMEDICALS+ Backend - Inicio Rápido"
echo "======================================"
echo ""

# Verificar si Docker está instalado
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Docker detectado - Iniciando con Docker Compose"
    echo ""
    
    # Verificar si el archivo docker-compose.yml existe
    if [ -f "docker-compose.yml" ]; then
        echo "📦 Iniciando servicios..."
        docker-compose up -d
        
        echo ""
        echo "⏳ Esperando que los servicios estén listos..."
        sleep 10
        
        echo ""
        echo "✅ Servicios iniciados:"
        echo "  - MySQL: localhost:3306"
        echo "  - Backend API: localhost:3001"
        echo "  - Redis: localhost:6379"
        echo ""
        echo "🔐 Credenciales por defecto:"
        echo "  Email: romedicals@admin.com"
        echo "  Password: Romedicals2024!"
        echo ""
        echo "📋 Próximos pasos:"
        echo "1. Abre http://localhost:3001 en tu navegador"
        echo "2. Configura el frontend para apuntar a esta API"
        echo "3. Haz login con las credenciales mostradas"
        echo ""
        echo "🛠️ Comandos útiles:"
        echo "  docker-compose logs backend    # Ver logs del backend"
        echo "  docker-compose logs mysql      # Ver logs de MySQL"
        echo "  docker-compose down            # Detener servicios"
        echo "  docker-compose restart         # Reiniciar servicios"
        
    else
        echo "❌ Archivo docker-compose.yml no encontrado"
        echo "Por favor ejecuta este script desde el directorio del backend"
        exit 1
    fi
    
else
    echo "📦 Docker no detectado - Iniciando modo tradicional"
    echo ""
    
    # Verificar si Node.js está instalado
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js no está instalado. Por favor instala Node.js 16+ primero."
        exit 1
    fi
    
    echo "✅ Node.js $(node -v) detectado"
    
    # Verificar si las dependencias están instaladas
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependencias..."
        npm install
    fi
    
    # Verificar archivo .env
    if [ ! -f ".env" ]; then
        echo "📝 Creando archivo de configuración..."
        cp env.example .env
        echo "⚠️  Por favor configura el archivo .env con tus datos de base de datos"
    fi
    
    echo ""
    echo "🚀 Iniciando servidor backend..."
    echo "   Puerto: 3001"
    echo "   Modo: desarrollo"
    echo ""
    echo "🔐 Credenciales por defecto:"
    echo "   Email: romedicals@admin.com"
    echo "   Password: Romedicals2024!"
    echo ""
    echo "📋 Asegúrate de que MySQL esté ejecutándose y configurado correctamente"
    echo ""
    
    # Iniciar servidor
    npm run dev
fi
