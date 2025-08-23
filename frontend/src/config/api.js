import axios from 'axios';
import config from './config';

// Configuración base de la API
const resolveBaseUrl = () => {
  try {
    if (typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function') {
      const url = window.getApiBaseUrl();
      if (url) return url;
    }
  } catch (_) {}
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  // Fallback seguro en producción: relative path
  if (typeof window !== 'undefined' && window.location) {
    return '/api';
  }
  return config.API_BASE_URL;
};

const API_BASE_URL = resolveBaseUrl();

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: config.HTTP_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    let tokenKey = config.AUTH_TOKEN_KEY;
    try {
      if (typeof window !== 'undefined' && window.ROMEDICALS_CONFIG?.AUTH?.TOKEN_KEY) {
        tokenKey = window.ROMEDICALS_CONFIG.AUTH.TOKEN_KEY || tokenKey;
      }
    } catch (_) {}
    const token = typeof window !== 'undefined' ? localStorage.getItem(tokenKey) : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem(config.AUTH_TOKEN_KEY);
      localStorage.removeItem(config.USER_DATA_KEY);
      window.location.href = config.ROUTES.LOGIN;
    }
    return Promise.reject(error);
  }
);

// Funciones de autenticación
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
};

// Funciones de pacientes
export const patientsAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
};

// Funciones de citas
export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  delete: (id) => api.delete(`/appointments/${id}`),
};

// Funciones de notas clínicas
export const clinicalNotesAPI = {
  getAll: (params) => api.get('/clinical-notes', { params }),
  getById: (id) => api.get(`/clinical-notes/${id}`),
  create: (data) => api.post('/clinical-notes', data),
  update: (id, data) => api.put(`/clinical-notes/${id}`, data),
  delete: (id) => api.delete(`/clinical-notes/${id}`),
  getByPatient: (patientId) => api.get(`/clinical-notes/patient/${patientId}`),
};

// Funciones de evoluciones
export const evolutionsAPI = {
  getAll: (params) => api.get('/evolutions', { params }),
  getById: (id) => api.get(`/evolutions/${id}`),
  create: (data) => api.post('/evolutions', data),
  update: (id, data) => api.put(`/evolutions/${id}`, data),
  delete: (id) => api.delete(`/evolutions/${id}`),
  getByPatient: (patientId) => api.get(`/evolutions/patient/${patientId}`),
};

// Funciones de prescripciones
export const prescriptionsAPI = {
  getAll: (params) => api.get('/prescriptions', { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  create: (data) => api.post('/prescriptions', data),
  update: (id, data) => api.put(`/prescriptions/${id}`, data),
  updateStatus: (id, status) => api.patch(`/prescriptions/${id}/status`, { status }),
  delete: (id) => api.delete(`/prescriptions/${id}`),
  getByPatient: (patientId) => api.get(`/prescriptions/patient/${patientId}`),
};

// Funciones de consentimientos (globales)
export const consentsAPI = {
  getAll: () => api.get('/consents'),
  getById: (id) => api.get(`/consents/${id}`),
  create: (data) => api.post('/consents', data),
  update: (id, data) => api.put(`/consents/${id}`, data),
  delete: (id) => api.delete(`/consents/${id}`),
};

// Funciones de especialidades
export const specialtiesAPI = {
  getAll: () => api.get('/specialties'),
  getById: (id) => api.get(`/specialties/${id}`),
  create: (data) => api.post('/specialties', data),
  update: (id, data) => api.put(`/specialties/${id}`, data),
  delete: (id) => api.delete(`/specialties/${id}`),
  getTemplates: (id, type) => api.get(`/specialties/${id}/templates/${type}`),
  createTemplate: (id, payload) => api.post(`/specialties/${id}/templates`, payload),
  updateTemplate: (id, type, templateId, payload) => api.put(`/specialties/${id}/templates/${type}/${templateId}`, payload),
  deleteTemplate: (id, type, templateId) => api.delete(`/specialties/${id}/templates/${type}/${templateId}`),
};

// Funciones de especialistas
export const specialistsAPI = {
  getAll: () => api.get('/specialists'),
  getById: (id) => api.get(`/specialists/${id}`),
  create: (specialistData) => api.post('/specialists', specialistData),
  update: (id, specialistData) => api.put(`/specialists/${id}`, specialistData),
  delete: (id) => api.delete(`/specialists/${id}`),
  updateStatus: (id, status) => api.patch(`/specialists/${id}/status`, { status }),
  resetPassword: (id) => api.post(`/specialists/${id}/reset-password`),
  updateSchedule: (id, schedule) => api.put(`/specialists/${id}/schedule`, { schedule }),
  getSchedule: (id) => api.get(`/specialists/${id}/schedule`)
};

// Funciones de diagnósticos
export const diagnosesAPI = {
  getAll: (params) => api.get('/diagnoses', { params }),
  getById: (id) => api.get(`/diagnoses/${id}`),
  search: (query) => api.get('/diagnoses/search/autocomplete', { params: { q: query } }),
  getCategories: () => api.get('/diagnoses/categories/list'),
};

// Funciones de RIPS
export const ripsAPI = {
  getAll: (params) => api.get('/rips', { params }),
  getById: (id) => api.get(`/rips/${id}`),
  create: (data) => api.post('/rips', data),
  update: (id, data) => api.put(`/rips/${id}`, data),
  updateStatus: (id, status) => api.patch(`/rips/${id}/status`, { status }),
  delete: (id) => api.delete(`/rips/${id}`),
  export: (params) => api.get('/rips/export', { params }),
  getStatistics: (params) => api.get('/rips/statistics/summary', { params }),
};

// Funciones de usuarios
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`),
  getDoctors: () => api.get('/users/doctors/list'),
};

// Funciones de archivos
export const uploadsAPI = {
  uploadImage: (formData) => api.post('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadDocument: (formData) => api.post('/uploads/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadMultiple: (formData) => api.post('/uploads/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/uploads', { params }),
  getById: (id) => api.get(`/uploads/${id}`),
  delete: (id) => api.delete(`/uploads/${id}`),
  getByPatient: (patientId, params) => api.get(`/uploads/patient/${patientId}`, { params }),
};

export default api; 