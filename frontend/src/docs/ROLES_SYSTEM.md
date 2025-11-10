# Sistema de Roles ROMEDICALS+

## 🔐 **Jerarquía de Roles**

### **1. `romedicals_admin` - Administradores de ROMEDICALS**
- **Acceso**: Panel de administración principal (`/admin-dashboard`)
- **Permisos**: 
  - Crear superadmins para empresas cliente
  - Gestionar todas las empresas del sistema
  - Resetear contraseñas de superadmins
  - Eliminar empresas cliente
  - Acceso completo al sistema ROMEDICALS
- **Uso**: Personal interno de ROMEDICALS

### **2. `super_user` - Superadmins de Empresas Cliente**
- **Acceso**: Dashboard de su empresa específica (`/dashboard`)
- **Permisos**:
  - Gestionar usuarios de su empresa (médicos, enfermeros, pacientes)
  - Configurar su plataforma empresarial
  - Acceso a módulos de su empresa únicamente
  - No puede crear otras empresas
- **Uso**: Administradores de clínicas/hospitales cliente

### **3. `medical_user` - Médicos**
- **Acceso**: Dashboard médico (`/doctor/dashboard`)
- **Permisos**:
  - Gestionar pacientes asignados
  - Crear consultas médicas
  - Acceso a agenda médica
- **Uso**: Doctores de las empresas cliente

### **4. `administrative` - Personal Administrativo**
- **Acceso**: Módulos administrativos
- **Permisos**:
  - Gestión de citas
  - Administración de pacientes
  - Reportes básicos
- **Uso**: Secretarias, recepcionistas

### **5. `nursing` - Enfermeros**
- **Acceso**: Módulos de enfermería
- **Permisos**:
  - Apoyo en consultas
  - Gestión básica de pacientes
- **Uso**: Personal de enfermería

## 🏢 **Flujo de Creación de Empresas**

```
ROMEDICALS Admin → Crea Superadmin → Empresa hace Onboarding → Plataforma Empresarial
```

1. **ROMEDICALS** crea superadmin para nueva empresa
2. **Superadmin** hace login por primera vez
3. **Onboarding** configura datos de la empresa
4. **Plataforma empresarial** se crea automáticamente
5. **Superadmin** gestiona usuarios de su empresa

## 🔒 **Seguridad por Roles**

- **Aislamiento de datos**: Cada empresa solo ve sus propios datos
- **Bases de datos separadas**: Cada empresa tiene su BD única
- **Permisos granulares**: Cada rol tiene acceso específico
- **Auditoría completa**: Todas las acciones se registran por empresa

## 📋 **Endpoints por Rol**

### `romedicals_admin`
```
GET    /api/admin/superadmins
POST   /api/admin/superadmins
PUT    /api/admin/superadmins/:id
DELETE /api/admin/superadmins/:id
POST   /api/admin/superadmins/:id/reset-password
```

### `super_user`
```
GET    /api/company/users
POST   /api/company/users
PUT    /api/company/users/:id
DELETE /api/company/users/:id
GET    /api/company/settings
PUT    /api/company/settings
```

### `medical_user`
```
GET    /api/doctor/patients
POST   /api/doctor/consultations
GET    /api/doctor/schedule
PUT    /api/doctor/profile
```

## 🎯 **Casos de Uso**

### **ROMEDICALS necesita agregar nueva empresa:**
1. Admin ROMEDICALS accede a `/admin-dashboard`
2. Crea superadmin con email y contraseña
3. Envía credenciales a la empresa
4. Empresa hace onboarding
5. Empresa gestiona sus usuarios

### **Empresa cliente necesita gestionar usuarios:**
1. Superadmin accede a `/dashboard`
2. Crea médicos, enfermeros, administrativos
3. Asigna permisos específicos
4. Gestiona configuración de su empresa

### **Médico necesita acceder al sistema:**
1. Médico accede a `/doctor`
2. Ve solo sus pacientes asignados
3. Puede crear consultas médicas
4. Accede a su agenda personal
