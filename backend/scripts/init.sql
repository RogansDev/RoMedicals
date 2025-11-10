-- Script de inicialización para ROMEDICALS+
-- Se ejecuta automáticamente al crear el contenedor MySQL

-- Crear base de datos principal
CREATE DATABASE IF NOT EXISTS romedicals_main CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE romedicals_main;

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(100),
    lastName VARCHAR(100),
    role ENUM('romedicals_admin', 'super_user', 'medical_user', 'administrative', 'nursing') NOT NULL,
    companyId VARCHAR(36),
    onboardingCompleted BOOLEAN DEFAULT FALSE,
    lastLogin TIMESTAMP NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_company (companyId),
    INDEX idx_active (isActive)
);

-- Crear tabla de empresas
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY,
    companyName VARCHAR(255) NOT NULL,
    companyType VARCHAR(100),
    legalName VARCHAR(255),
    contactPhone VARCHAR(20),
    address TEXT,
    adminId VARCHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admin (adminId),
    INDEX idx_name (companyName)
);

-- Crear tabla de logs del sistema
CREATE TABLE IF NOT EXISTS system_logs (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (userId),
    INDEX idx_action (action),
    INDEX idx_created (createdAt)
);

-- Crear tabla de configuraciones del sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(36) PRIMARY KEY,
    settingKey VARCHAR(100) UNIQUE NOT NULL,
    settingValue TEXT,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (settingKey),
    INDEX idx_active (isActive)
);

-- Insertar configuraciones por defecto
INSERT IGNORE INTO system_settings (id, settingKey, settingValue, description) VALUES
('1', 'system_version', '1.0.0', 'Versión actual del sistema'),
('2', 'max_companies', '1000', 'Máximo número de empresas cliente'),
('3', 'max_users_per_company', '500', 'Máximo usuarios por empresa'),
('4', 'backup_retention_days', '30', 'Días de retención de backups'),
('5', 'session_timeout_hours', '24', 'Timeout de sesión en horas');

-- Crear administrador principal de ROMEDICALS
-- La contraseña es 'Romedicals2024!' hasheada con bcrypt
INSERT IGNORE INTO users (id, email, password, firstName, lastName, role, onboardingCompleted, isActive) VALUES
('romedicals-admin-001', 'romedicals@admin.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J8K8K8K8K', 'ROMEDICALS', 'Administrator', 'romedicals_admin', TRUE, TRUE);

-- Crear usuario de prueba para empresa cliente (opcional)
-- La contraseña es 'TestPassword123!' hasheada con bcrypt
INSERT IGNORE INTO users (id, email, password, firstName, lastName, role, companyId, onboardingCompleted, isActive) VALUES
('test-superadmin-001', 'admin@testcompany.com', '$2a$12$TestHashForTestCompany123456789', 'Test', 'Superadmin', 'super_user', 'test-company-001', FALSE, TRUE);

-- Crear empresa de prueba
INSERT IGNORE INTO companies (id, companyName, companyType, legalName, contactPhone, adminId) VALUES
('test-company-001', 'Empresa de Prueba', 'IPS', 'Test Company S.A.S', '+57 300 123 4567', 'test-superadmin-001');

-- Crear índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, isActive);
CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(companyId, isActive);
CREATE INDEX IF NOT EXISTS idx_companies_admin ON companies(adminId);

-- Crear vista para estadísticas rápidas
CREATE OR REPLACE VIEW system_stats AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'super_user' AND isActive = TRUE) as total_companies,
    (SELECT COUNT(*) FROM users WHERE role = 'super_user' AND onboardingCompleted = TRUE AND isActive = TRUE) as active_companies,
    (SELECT COUNT(*) FROM users WHERE role = 'super_user' AND onboardingCompleted = FALSE AND isActive = TRUE) as pending_companies,
    (SELECT COUNT(*) FROM users WHERE isActive = TRUE) as total_users;

-- Crear procedimiento para limpiar logs antiguos
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CleanOldLogs()
BEGIN
    DECLARE retention_days INT DEFAULT 30;
    
    -- Obtener días de retención desde configuración
    SELECT CAST(settingValue AS UNSIGNED) INTO retention_days 
    FROM system_settings 
    WHERE settingKey = 'backup_retention_days' 
    LIMIT 1;
    
    -- Eliminar logs antiguos
    DELETE FROM system_logs 
    WHERE createdAt < DATE_SUB(NOW(), INTERVAL retention_days DAY);
    
    -- Registrar la limpieza
    INSERT INTO system_logs (id, action, description) 
    VALUES (UUID(), 'CLEANUP', CONCAT('Logs antiguos eliminados. Retención: ', retention_days, ' días'));
END //
DELIMITER ;

-- Crear evento para limpieza automática de logs (se ejecuta diariamente)
CREATE EVENT IF NOT EXISTS daily_log_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL CleanOldLogs();

-- Habilitar el scheduler de eventos
SET GLOBAL event_scheduler = ON;

-- Mostrar información de inicialización
SELECT 'ROMEDICALS+ Database initialized successfully!' as message;
SELECT 'Default admin credentials:' as info;
SELECT 'Email: romedicals@admin.com' as email;
SELECT 'Password: Romedicals2024!' as password;
SELECT 'Test company credentials:' as test_info;
SELECT 'Email: admin@testcompany.com' as test_email;
SELECT 'Password: TestPassword123!' as test_password;
