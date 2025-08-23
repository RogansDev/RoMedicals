import { API_CONFIG, AUTH_CONFIG } from '../config/constants';

// Usar configuración global si está disponible, sino usar valores por defecto
const API_BASE_URL = (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.API.BASE_URL) || 'http://localhost:3001/api';
const AUTH_TOKEN_KEY = (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.AUTH.TOKEN_KEY) || 'authToken';

class PatientService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/patients`;
  }

  // Obtener token del localStorage
  getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  // Headers de autorización
  getHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Crear nuevo paciente
  async createPatient(patientData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(patientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el paciente');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en createPatient:', error);
      throw error;
    }
  }

  // Obtener lista de pacientes
  async getPatients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.documentType) queryParams.append('documentType', params.documentType);
      if (params.gender) queryParams.append('gender', params.gender);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `${this.baseURL}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener los pacientes');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getPatients:', error);
      throw error;
    }
  }

  // Obtener paciente por ID
  async getPatientById(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener el paciente');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getPatientById:', error);
      throw error;
    }
  }

  // Actualizar paciente
  async updatePatient(id, patientData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(patientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el paciente');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en updatePatient:', error);
      throw error;
    }
  }

  // Actualizar antecedentes clínicos
  async updateMedicalHistory(id, medicalHistory) {
    try {
      const response = await fetch(`${this.baseURL}/${id}/medical-history`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ medicalHistory })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar antecedentes');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en updateMedicalHistory:', error);
      throw error;
    }
  }

  // Eliminar paciente
  async deletePatient(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el paciente');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en deletePatient:', error);
      throw error;
    }
  }
}

export default new PatientService();
