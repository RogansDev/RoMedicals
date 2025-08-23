-- Script de migración para actualizar la tabla patients existente
-- Ejecutar este script para actualizar la estructura de la tabla

-- 1. Crear tabla temporal con la nueva estructura
CREATE TABLE IF NOT EXISTS patients_new (
    id SERIAL PRIMARY KEY,
    
    -- Datos personales
    guardian_id VARCHAR(20),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    identification_type VARCHAR(10) NOT NULL CHECK (identification_type IN ('CC', 'CE', 'TI', 'PP', 'RC')),
    identification_number VARCHAR(20) NOT NULL UNIQUE,
    residence_country VARCHAR(50),
    origin_country VARCHAR(50),
    is_foreigner BOOLEAN DEFAULT FALSE,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Masculino', 'Femenino', 'Otro')),
    birth_date DATE,
    blood_type VARCHAR(5) CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    disability VARCHAR(50),
    occupation VARCHAR(50),
    marital_status VARCHAR(50),
    
    -- Datos adicionales
    education_level VARCHAR(50),
    activity_profession VARCHAR(100),
    patient_type VARCHAR(50),
    eps VARCHAR(100),
    email VARCHAR(100),
    address VARCHAR(200),
    city VARCHAR(50),
    department VARCHAR(50),
    residential_zone VARCHAR(50),
    landline_phone VARCHAR(15),
    mobile_phone_country VARCHAR(10),
    mobile_phone VARCHAR(15),
    companion_name VARCHAR(100),
    companion_phone VARCHAR(15),
    responsible_name VARCHAR(100),
    responsible_phone VARCHAR(15),
    responsible_relationship VARCHAR(50),
    agreement VARCHAR(50),
    observations TEXT,
    reference VARCHAR(100),
    
    -- Campos de auditoría
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Migrar datos existentes (si los hay)
INSERT INTO patients_new (
    id, first_name, last_name, identification_type, identification_number,
    birth_date, gender, email, address, city, department, blood_type,
    created_by, created_at, updated_at
)
SELECT 
    id, first_name, last_name, document_type, document_number,
    birth_date, 
    CASE 
        WHEN gender = 'M' THEN 'Masculino'
        WHEN gender = 'F' THEN 'Femenino'
        ELSE 'Otro'
    END,
    email, address, city, department, blood_type,
    created_by, created_at, updated_at
FROM patients;

-- 3. Crear índices en la nueva tabla
CREATE INDEX IF NOT EXISTS idx_patients_identification ON patients_new(identification_type, identification_number);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients_new(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients_new(created_at);

-- 4. Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients_new 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Renombrar tablas
ALTER TABLE patients RENAME TO patients_old;
ALTER TABLE patients_new RENAME TO patients;

-- 6. Actualizar secuencia de ID
SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));

-- 7. Verificar que la migración fue exitosa
SELECT COUNT(*) as total_patients FROM patients;

-- 8. Comentarios de la tabla
COMMENT ON TABLE patients IS 'Tabla para almacenar información de pacientes';
COMMENT ON COLUMN patients.guardian_id IS 'Cédula del acudiente o tutor';
COMMENT ON COLUMN patients.identification_type IS 'Tipo de identificación (CC, CE, TI, PP, RC)';
COMMENT ON COLUMN patients.identification_number IS 'Número de identificación único';
COMMENT ON COLUMN patients.is_foreigner IS 'Indica si el paciente es extranjero';
COMMENT ON COLUMN patients.birth_date IS 'Fecha de nacimiento completa';
COMMENT ON COLUMN patients.patient_type IS 'Tipo de paciente (particular, eps, prepagada, otro)';
COMMENT ON COLUMN patients.eps IS 'Entidad Promotora de Salud';
COMMENT ON COLUMN patients.agreement IS 'Tipo de convenio o acuerdo';
COMMENT ON COLUMN patients.observations IS 'Observaciones adicionales del paciente';
COMMENT ON COLUMN patients.reference IS 'Referencia o recomendación del paciente';

-- NOTA: La tabla patients_old se mantiene como respaldo
-- Puedes eliminarla después de verificar que todo funciona correctamente:
-- DROP TABLE patients_old;
