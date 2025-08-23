# Romedicals - Plataforma de Historias Médicas

Plataforma completa para el manejo de historias médicas adaptada a la normativa colombiana, con arquitectura moderna y funcionalidades avanzadas.

## 🏥 Características Principales

### Módulos por Rol

#### **Médico**
- ✅ Primera vez / evolución de notas clínicas
- ✅ Aplicación de procedimientos o servicios
- ✅ Fotos clínicas
- ✅ Fórmulas / prescripciones
- ✅ Cotizaciones (inicia flujo administrativo)

#### **Administrativo/Enfermería**
- ✅ Historia / notas de enfermería
- ✅ Manejo de sesiones y consentimiento
- ✅ Registro de residuos

### Catálogos y Legales
- ✅ Especialidades y especialistas (con horarios y modalidades)
- ✅ Diagnósticos CIE-10
- ✅ RIPS y generación de RIPS
- ✅ Encuestas
- ✅ Seguridad (SSL, cifrado en SQL)
- ✅ Roles: superusuario, médico, administrativo, enfermería

## 🏗️ Arquitectura Técnica

### Backend
- **Framework**: Node.js con Express.js
- **Base de Datos**: PostgreSQL con cifrado
- **Autenticación**: JWT con roles y permisos
- **Validación**: Joi para validación de datos
- **Logging**: Winston para trazabilidad
- **Seguridad**: Helmet, rate limiting, CORS

### Frontend (Próximamente)
- **Framework**: React.js
- **UI**: Tailwind CSS
- **Formularios**: Formik/React Hook Form
- **Editor**: Quill/Draft.js para notas clínicas

### Infraestructura
- **Servidor**: VPS con Linux
- **SSL**: Certbot para certificados automáticos
- **Procesos**: PM2 para gestión de procesos
- **Dominio**: Configurado y listo

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 12+
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/romedicals.git
cd romedicals
```

### 2. Configurar variables de entorno
```bash
cd backend
cp env.example .env
```

Editar `.env` con tus configuraciones:
```env
# Configuración del servidor
NODE_ENV=development
PORT=3001

# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=romedicals_db
DB_USER=romedicals_user
DB_PASSWORD=tu_password_seguro

# JWT
JWT_SECRET=tu-super-secret-jwt-key-cambiar-en-produccion

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Configurar base de datos
```bash
# Crear base de datos PostgreSQL
sudo -u postgres psql
CREATE DATABASE romedicals_db;
CREATE USER romedicals_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE romedicals_db TO romedicals_user;
\q
```

### 5. Ejecutar migración
```bash
npm run migrate
```

### 6. Iniciar servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📊 Estructura de Base de Datos

### Tablas Principales
- `users` - Usuarios del sistema con roles
- `patients` - Pacientes con información completa
- `appointments` - Citas médicas
- `clinical_notes` - Notas clínicas (primera vez/evolución)
- `evolutions` - Evoluciones médicas
- `prescriptions` - Prescripciones médicas
- `specialties` - Especialidades médicas
- `diagnoses` - Diagnósticos CIE-10
- `rips` - Registro Individual de Prestación de Servicios
- `uploads` - Archivos e imágenes

### Índices Optimizados
- Búsqueda por documento de paciente
- Filtros por fecha de cita
- Búsqueda por especialidad
- Optimización de consultas RIPS

## 🔐 Seguridad

### Autenticación y Autorización
- **JWT**: Tokens seguros con expiración
- **Roles**: super_user, medical_user, administrative, nursing
- **Permisos**: Granulares por módulo (PATIENTS, APPOINTMENTS, etc.)
- **Contraseñas**: Hash con bcrypt

### Protección de Datos
- **Cifrado**: Base de datos PostgreSQL con cifrado
- **SSL**: Certificados automáticos con Certbot
- **Rate Limiting**: Protección contra ataques
- **Headers**: Helmet para seguridad HTTP
- **CORS**: Configuración segura

## 📡 API REST

### Endpoints Principales

#### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registro (solo super usuarios)
- `GET /api/auth/me` - Obtener perfil
- `POST /api/auth/logout` - Cerrar sesión

#### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Crear paciente
- `GET /api/patients/:id` - Obtener paciente
- `PUT /api/patients/:id` - Actualizar paciente
- `DELETE /api/patients/:id` - Eliminar paciente

#### Citas
- `GET /api/appointments` - Listar citas
- `POST /api/appointments` - Crear cita
- `PATCH /api/appointments/:id/status` - Cambiar estado

#### Notas Clínicas
- `GET /api/clinical-notes` - Listar notas
- `POST /api/clinical-notes` - Crear nota
- `GET /api/clinical-notes/patient/:patientId` - Notas por paciente

#### Evoluciones
- `GET /api/evolutions` - Listar evoluciones
- `POST /api/evolutions` - Crear evolución
- `GET /api/evolutions/patient/:patientId` - Evoluciones por paciente

#### Prescripciones
- `GET /api/prescriptions` - Listar prescripciones
- `POST /api/prescriptions` - Crear prescripción
- `PATCH /api/prescriptions/:id/status` - Cambiar estado

#### RIPS
- `GET /api/rips` - Listar RIPS
- `POST /api/rips` - Crear RIPS
- `GET /api/rips/export` - Exportar RIPS
- `GET /api/rips/statistics/summary` - Estadísticas

#### Archivos
- `POST /api/uploads/image` - Subir imagen
- `POST /api/uploads/document` - Subir documento
- `POST /api/uploads/multiple` - Subir múltiples archivos
- `GET /api/uploads/patient/:patientId` - Archivos por paciente

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage
```

## 📦 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
# Instalar PM2
npm install -g pm2

# Iniciar con PM2
pm2 start server.js --name "romedicals-api"

# Configurar para iniciar automáticamente
pm2 startup
pm2 save
```

### SSL con Certbot
```bash
# Instalar Certbot
sudo apt install certbot

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Configurar renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Configuración Avanzada

### Variables de Entorno Adicionales
```env
# Logging
LOG_LEVEL=info

# Archivos
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Scripts Útiles
```bash
# Migración de base de datos
npm run migrate

# Backup de base de datos
pg_dump romedicals_db > backup.sql

# Restaurar backup
psql romedicals_db < backup.sql
```

## 📈 Monitoreo

### Logs
- **Winston**: Logging estructurado
- **Niveles**: error, warn, info, debug
- **Rotación**: Logs diarios con compresión

### Métricas
- **Health Check**: `/api/health`
- **Performance**: Logs de consultas lentas
- **Errores**: Tracking automático

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

- **Email**: soporte@romedicals.com
- **Documentación**: [docs.romedicals.com](https://docs.romedicals.com)
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/romedicals/issues)

## 🎯 Roadmap

### Próximas Funcionalidades
- [ ] Frontend React completo
- [ ] App móvil (React Native)
- [ ] Integración con laboratorios
- [ ] Telemedicina
- [ ] IA para diagnósticos
- [ ] Dashboard analítico
- [ ] Integración con EPS/IPS

### Mejoras Técnicas
- [ ] Microservicios
- [ ] Cache con Redis
- [ ] Queue con Bull
- [ ] WebSockets para tiempo real
- [ ] Docker containers
- [ ] CI/CD pipeline

---

**Romedicals** - Transformando la atención médica en Colombia 🇨🇴 