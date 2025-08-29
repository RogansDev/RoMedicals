// Constantes de configuración de la API
export const API_CONFIG = {
  BASE_URL: '/api',
  TIMEOUT: 10000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      PROFILE: '/auth/me'
    },
    PATIENTS: '/patients',
    APPOINTMENTS: '/appointments',
    USERS: '/users',
    SPECIALTIES: '/specialties'
  }
};

// Constantes de autenticación
export const AUTH_CONFIG = {
  TOKEN_KEY: 'authToken',
  USER_KEY: 'user',
  LOGIN_ROUTE: '/login'
};

// Constantes de la aplicación
export const APP_CONFIG = {
  NAME: 'RoMedicals',
  VERSION: '1.0.0',
  ENVIRONMENT: 'development'
};
