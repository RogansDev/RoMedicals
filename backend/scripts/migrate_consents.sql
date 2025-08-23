-- Crear tabla global de plantillas de consentimientos
CREATE TABLE IF NOT EXISTS consents_template (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  content TEXT DEFAULT '' NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
);

-- Asegurar solo una por defecto (opcional, válido si tu motor soporta restricciones complejas)
-- No se implementa aquí; se maneja en aplicación.


