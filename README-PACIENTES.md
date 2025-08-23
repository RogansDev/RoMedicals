# Sistema de Gestión de Pacientes - Romedicals

Este documento describe cómo configurar y usar el sistema de gestión de pacientes que incluye un frontend en React y un backend en Node.js con PostgreSQL.

## 🏗️ Arquitectura del Sistema

- **Frontend**: React.js con formulario completo de pacientes
- **Backend**: Node.js + Express + PostgreSQL
- **Base de Datos**: PostgreSQL con tabla `patients` optimizada

## 📋 Requisitos Previos

- Node.js (versión 16 o superior)
- PostgreSQL (versión 12 o superior)
- npm o yarn

## 🚀 Configuración del Backend

### 1. Instalar dependencias
```bash
cd romedicals.com/backend
npm install
```

### 2. Configurar variables de entorno
```bash
cp env.example .env
```

Editar el archivo `.env` con tus credenciales de PostgreSQL:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=romedicals_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password
JWT_SECRET=tu_jwt_secret_super_seguro
```

### 3. Crear la base de datos
```sql
CREATE DATABASE romedicals_db;
CREATE USER romedicals_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE romedicals_db TO romedicals_user;
```

### 4. Ejecutar el script de creación de tabla
```bash
psql -U tu_usuario -d romedicals_db -f scripts/create_patients_table.sql
```

### 5. Iniciar el servidor
```bash
npm run dev
```

El backend estará disponible en `http://localhost:3001`

## 🎨 Configuración del Frontend

### 1. Instalar dependencias
```bash
cd romedicals.com/frontend
npm install
```

### 2. Configurar variables de entorno
```bash
cp env.example .env
```

Editar el archivo `.env`:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 3. Iniciar la aplicación
```bash
npm start
```

El frontend estará disponible en `http://localhost:3000`

## 📊 Estructura de la Base de Datos

### Tabla `patients`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único del paciente |
| `guardian_id` | VARCHAR(20) | Cédula del acudiente |
| `first_name` | VARCHAR(50) | Nombre del paciente |
| `last_name` | VARCHAR(50) | Apellidos del paciente |
| `identification_type` | VARCHAR(10) | Tipo de identificación |
| `identification_number` | VARCHAR(20) | Número de identificación |
| `residence_country` | VARCHAR(50) | País de residencia |
| `origin_country` | VARCHAR(50) | País de origen |
| `is_foreigner` | BOOLEAN | Si es extranjero |
| `gender` | VARCHAR(20) | Género |
| `birth_date` | DATE | Fecha de nacimiento |
| `blood_type` | VARCHAR(5) | Grupo sanguíneo |
| `disability` | VARCHAR(50) | Discapacidad |
| `occupation` | VARCHAR(50) | Ocupación |
| `marital_status` | VARCHAR(50) | Estado civil |
| `education_level` | VARCHAR(50) | Nivel educativo |
| `activity_profession` | VARCHAR(100) | Actividad/profesión |
| `patient_type` | VARCHAR(50) | Tipo de paciente |
| `eps` | VARCHAR(100) | EPS |
| `email` | VARCHAR(100) | Correo electrónico |
| `address` | VARCHAR(200) | Dirección |
| `city` | VARCHAR(50) | Ciudad |
| `department` | VARCHAR(50) | Departamento |
| `residential_zone` | VARCHAR(50) | Zona residencial |
| `landline_phone` | VARCHAR(15) | Teléfono fijo |
| `mobile_phone_country` | VARCHAR(10) | Código país móvil |
| `mobile_phone` | VARCHAR(15) | Teléfono móvil |
| `companion_name` | VARCHAR(100) | Nombre del acompañante |
| `companion_phone` | VARCHAR(15) | Teléfono del acompañante |
| `responsible_name` | VARCHAR(100) | Nombre del responsable |
| `responsible_phone` | VARCHAR(15) | Teléfono del responsable |
| `responsible_relationship` | VARCHAR(50) | Parentesco del responsable |
| `agreement` | VARCHAR(50) | Tipo de convenio |
| `observations` | TEXT | Observaciones |
| `reference` | VARCHAR(100) | Referencia |
| `created_by` | INTEGER | ID del usuario creador |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

## 🔌 API Endpoints

### Pacientes

- `GET /api/patients` - Listar pacientes
- `GET /api/patients/:id` - Obtener paciente específico
- `POST /api/patients` - Crear nuevo paciente
- `PUT /api/patients/:id` - Actualizar paciente
- `DELETE /api/patients/:id` - Eliminar paciente

### Parámetros de consulta para listar pacientes

- `page`: Número de página (default: 1)
- `limit`: Límite de resultados por página (default: 20)
- `search`: Búsqueda por nombre, apellido o documento
- `documentType`: Filtro por tipo de documento
- `gender`: Filtro por género
- `sortBy`: Campo para ordenar (default: created_at)
- `sortOrder`: Orden ASC o DESC (default: DESC)

## 🧪 Pruebas de la API

Puedes usar el archivo `test-api.sh` para probar los endpoints:

```bash
cd romedicals.com/backend
chmod +x test-api.sh
./test-api.sh
```

## 🔐 Autenticación

El sistema requiere autenticación JWT. Para usar la API:

1. Obtener token de autenticación
2. Incluir en el header: `Authorization: Bearer <token>`

## 🚨 Solución de Problemas

### Error de conexión a la base de datos
- Verificar que PostgreSQL esté ejecutándose
- Verificar credenciales en el archivo `.env`
- Verificar que la base de datos exista

### Error de CORS
- Verificar que `FRONTEND_URL` esté configurado correctamente en el backend
- Verificar que el frontend esté en la URL correcta

### Error de validación
- Verificar que todos los campos requeridos estén completos
- Verificar el formato de los datos según el esquema de validación

## 📝 Notas de Desarrollo

- El sistema valida automáticamente los datos de entrada
- Se calcula automáticamente la edad del paciente
- Se detecta automáticamente si el paciente es menor de edad
- Los campos opcionales pueden estar vacíos
- Se valida la unicidad del número de identificación

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear una rama para tu feature
3. Hacer commit de tus cambios
4. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
