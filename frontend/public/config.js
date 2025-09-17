// Configuración global de la aplicación
// Este archivo se carga antes que la aplicación React

const isLocalHost = (function() {
  try {
    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  } catch (_) {
    return false;
  }
})();

window.ROMEDICALS_CONFIG = {
  API: {
    BASE_URL: isLocalHost ? 'http://148.230.90.103:3001/api' : '/api',
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
  },
  AUTH: {
    TOKEN_KEY: 'authToken',
    USER_KEY: 'user',
    LOGIN_ROUTE: '/login'
  },
  APP: {
    NAME: 'RoMedicals',
    VERSION: '1.0.0',
    ENVIRONMENT: 'development'
  }
};

// Función para obtener la configuración
window.getConfig = function() {
  return window.ROMEDICALS_CONFIG;
};

// Función para obtener la URL base de la API
window.getApiBaseUrl = function() {
  return window.ROMEDICALS_CONFIG.API.BASE_URL;
};

console.log('🔧 Configuración global cargada:', window.ROMEDICALS_CONFIG);
