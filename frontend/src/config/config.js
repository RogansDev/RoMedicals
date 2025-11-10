// Configuración centralizada de la aplicación
const config = {
  // URL base de la API
  API_BASE_URL: 'http://localhost:3001/api',
  
  // Configuración del entorno
  ENV: 'development',
  
  // Timeout para peticiones HTTP
  HTTP_TIMEOUT: 10000,
  
  // Configuración de paginación por defecto
  DEFAULT_PAGE_SIZE: 10,
  
  // Configuración de autenticación
  AUTH_TOKEN_KEY: 'authToken',
  USER_DATA_KEY: 'user',
  
  // URLs de la aplicación
  ROUTES: {
    LOGIN: '/login',
    AGENDA: '/agenda',
    PATIENTS: '/patients',
    DASHBOARD: '/dashboard'
  }
};

export default config;
