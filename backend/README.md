# ROMEDICALS+ Backend

Sistema backend para ROMEDICALS+, una plataforma médica multi-tenant que permite a clínicas y hospitales gestionar sus operaciones médicas de forma independiente.

## 🏗️ Arquitectura del Sistema

### Sistema Multi-Tenant
- **Base de datos principal**: Almacena usuarios ROMEDICALS y empresas cliente
- **Bases de datos por empresa**: Cada empresa cliente tiene su propia base de datos aislada
- **Roles jerárquicos**: `romedicals_admin` → `super_user` → `medical_user` → `administrative` → `nursing`

### Flujo de Trabajo
1. **ROMEDICALS** crea superadmin para nueva empresa
2. **Empresa cliente** hace login y completa onboarding
3. **Sistema crea** base de datos única para la empresa
4. **Superadmin** gestiona usuarios de su empresa
5. **Usuarios** acceden a módulos según su rol

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 16+
- MySQL 8.0+
- npm o yarn

### Instalación Rápida
```bash
# Clonar el repositorio
git clone <repository-url>
cd romedicals.com/backend

# Ejecutar script de configuración
chmod +x setup.sh
./setup.sh

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus datos de base de datos

# Iniciar servidor
npm run dev
```

### Configuración Manual

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar base de datos**:
```sql
CREATE DATABASE romedicals_main CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'romedicals_user'@'localhost' IDENTIFIED BY 'romedicals_password';
GRANT ALL PRIVILEGES ON romedicals_main.* TO 'romedicals_user'@'localhost';
GRANT ALL PRIVILEGES ON romedicals_company_*.* TO 'romedicals_user'@'localhost';
FLUSH PRIVILEGES;
```

3. **Configurar variables de entorno**:
```bash
cp env.example .env
# Editar .env con tus datos
```

4. **Iniciar servidor**:
```bash
npm run dev
```

## 📋 Variables de Entorno

```env
# Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=romedicals_main

# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=tu_secret_key_muy_seguro

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 🔐 Sistema de Autenticación

### Roles del Sistema

#### `romedicals_admin`
- **Acceso**: Panel principal de ROMEDICALS
- **Permisos**: Crear, gestionar y eliminar empresas cliente
- **Endpoints**: `/api/admin/*`

#### `super_user`
- **Acceso**: Dashboard de empresa específica
- **Permisos**: Gestionar usuarios de su empresa
- **Endpoints**: `/api/company/*`

#### `medical_user`
- **Acceso**: Dashboard médico
- **Permisos**: Gestionar pacientes y consultas
- **Endpoints**: `/api/doctor/*`

#### `administrative`
- **Acceso**: Módulos administrativos
- **Permisos**: Gestión de citas y pacientes
- **Endpoints**: `/api/admin/*`

#### `nursing`
- **Acceso**: Módulos de enfermería
- **Permisos**: Apoyo en consultas
- **Endpoints**: `/api/nursing/*`

### Flujo de Autenticación

1. **Login**: `POST /api/auth/login`
2. **Token JWT**: Válido por 24 horas
3. **Middleware**: Verifica token en cada request
4. **Autorización**: Verifica rol según endpoint

## 📡 API Endpoints

### Autenticación
```
POST /api/auth/login
```

### Administración ROMEDICALS
```
GET    /api/admin/superadmins          # Listar superadmins
POST   /api/admin/superadmins          # Crear superadmin
PUT    /api/admin/superadmins/:id     # Editar superadmin
DELETE /api/admin/superadmins/:id     # Eliminar superadmin
POST   /api/admin/superadmins/:id/reset-password # Resetear contraseña
GET    /api/admin/stats               # Estadísticas generales
GET    /api/admin/companies           # Lista de empresas
POST   /api/admin/setup-romedicals-admin # Crear admin ROMEDICALS
```

### Onboarding
```
POST /api/onboarding/finalize
```

### Empresa Cliente (por implementar)
```
GET    /api/company/users
POST   /api/company/users
PUT    /api/company/users/:id
DELETE /api/company/users/:id
GET    /api/company/settings
PUT    /api/company/settings
```

### Médicos (por implementar)
```
GET    /api/doctor/patients
POST   /api/doctor/consultations
GET    /api/doctor/schedule
PUT    /api/doctor/profile
```

## 🗄️ Estructura de Base de Datos

### Base de Datos Principal (`romedicals_main`)

#### Tabla `users`
```sql
- id (VARCHAR(36), PK)
- email (VARCHAR(255), UNIQUE)
- password (VARCHAR(255))
- firstName (VARCHAR(100))
- lastName (VARCHAR(100))
- role (ENUM)
- companyId (VARCHAR(36))
- onboardingCompleted (BOOLEAN)
- lastLogin (TIMESTAMP)
- isActive (BOOLEAN)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

#### Tabla `companies`
```sql
- id (VARCHAR(36), PK)
- companyName (VARCHAR(255))
- companyType (VARCHAR(100))
- legalName (VARCHAR(255))
- contactPhone (VARCHAR(20))
- adminId (VARCHAR(36), FK)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

### Base de Datos por Empresa (`romedicals_company_[ID]`)

#### Tabla `users`
```sql
- id (VARCHAR(36), PK)
- email (VARCHAR(255), UNIQUE)
- password (VARCHAR(255))
- firstName (VARCHAR(100))
- lastName (VARCHAR(100))
- role (ENUM)
- isActive (BOOLEAN)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

#### Tabla `patients`
```sql
- id (VARCHAR(36), PK)
- firstName (VARCHAR(100))
- lastName (VARCHAR(100))
- email (VARCHAR(255))
- phone (VARCHAR(20))
- documentType (VARCHAR(20))
- documentNumber (VARCHAR(50))
- birthDate (DATE)
- address (TEXT)
- emergencyContact (VARCHAR(255))
- emergencyPhone (VARCHAR(20))
- medicalHistory (TEXT)
- allergies (TEXT)
- isActive (BOOLEAN)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

#### Tabla `appointments`
```sql
- id (VARCHAR(36), PK)
- patientId (VARCHAR(36), FK)
- doctorId (VARCHAR(36), FK)
- appointmentDate (DATETIME)
- status (ENUM)
- notes (TEXT)
- diagnosis (TEXT)
- treatment (TEXT)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

#### Tabla `company_settings`
```sql
- id (VARCHAR(36), PK)
- companyName (VARCHAR(255))
- companyType (VARCHAR(100))
- legalName (VARCHAR(255))
- contactPhone (VARCHAR(20))
- address (TEXT)
- logoUrl (VARCHAR(500))
- settings (JSON)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

## 🔒 Seguridad

### Medidas Implementadas
- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configuración de origen cruzado
- **Rate Limiting**: Límite de requests por IP
- **JWT**: Tokens seguros con expiración
- **bcrypt**: Encriptación de contraseñas
- **Validación**: Validación de entrada en todos los endpoints
- **Aislamiento**: Bases de datos separadas por empresa

### Configuración de Producción
```env
NODE_ENV=production
JWT_SECRET=clave_muy_segura_y_larga_para_produccion
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=50
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage
```

## 📦 Scripts Disponibles

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Iniciar servidor en desarrollo
npm test           # Ejecutar tests
npm run setup      # Configuración inicial
```

## 🚀 Despliegue

### Docker (Recomendado)
```bash
# Crear Dockerfile
docker build -t romedicals-backend .

# Ejecutar contenedor
docker run -p 3001:3001 --env-file .env romedicals-backend
```

### PM2 (Producción)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicación
pm2 start server.js --name "romedicals-backend"

# Configurar para reinicio automático
pm2 startup
pm2 save
```

## 🔧 Mantenimiento

### Backup de Bases de Datos
```bash
# Backup base principal
mysqldump -u root -p romedicals_main > backup_main.sql

# Backup empresas (script personalizado)
./scripts/backup_companies.sh
```

### Logs
```bash
# Ver logs en desarrollo
npm run dev

# Ver logs en producción (PM2)
pm2 logs romedicals-backend
```

## 📞 Soporte

Para soporte técnico o reportar bugs:
- **Email**: soporte@romedicals.com
- **Documentación**: [docs.romedicals.com](https://docs.romedicals.com)
- **Issues**: [GitHub Issues](https://github.com/romedicals/backend/issues)

## 📄 Licencia

MIT License - Ver archivo [LICENSE](LICENSE) para más detalles.
