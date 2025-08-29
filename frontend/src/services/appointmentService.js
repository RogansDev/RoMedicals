import { API_CONFIG, AUTH_CONFIG } from '../config/constants';

// Usar configuración global si está disponible, sino usar valores por defecto
const API_BASE_URL = (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.API.BASE_URL) || '/api';
const AUTH_TOKEN_KEY = (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.AUTH.TOKEN_KEY) || 'authToken';

class AppointmentService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/appointments`;
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

  // Crear nueva cita
  async createAppointment(appointmentData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(appointmentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la cita');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en createAppointment:', error);
      throw error;
    }
  }

  // Obtener lista de citas
  async getAppointments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.date) queryParams.append('date', params.date);
      if (params.doctorId) queryParams.append('doctorId', params.doctorId);
      if (params.patientId) queryParams.append('patientId', params.patientId);
      if (params.status) queryParams.append('status', params.status);
      if (params.type) queryParams.append('type', params.type);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `${this.baseURL}?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener las citas');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getAppointments:', error);
      throw error;
    }
  }

  // Obtener cita por ID
  async getAppointmentById(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener la cita');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getAppointmentById:', error);
      throw error;
    }
  }

  // Actualizar cita
  async updateAppointment(id, appointmentData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(appointmentData)
      });

      if (!response.ok) {
        let errorData = {};
        try { errorData = await response.json(); } catch {}
        const error = new Error(errorData.message || errorData.error || 'Error al actualizar la cita');
        error.status = response.status;
        error.details = errorData.details;
        error.payload = appointmentData;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Error en updateAppointment:', error);
      throw error;
    }
  }

  // Actualizar solo el doctor asignado
  async updateAppointmentDoctor(id, doctorId) {
    try {
      const response = await fetch(`${this.baseURL}/${id}/doctor`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ doctorId })
      });

      if (!response.ok) {
        let errorData = {};
        try { errorData = await response.json(); } catch {}
        const error = new Error(errorData.message || errorData.error || 'Error al actualizar el profesional');
        error.status = response.status;
        error.details = errorData.details;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Error en updateAppointmentDoctor:', error);
      throw error;
    }
  }

  // Eliminar cita
  async deleteAppointment(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la cita');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en deleteAppointment:', error);
      throw error;
    }
  }

  // Obtener citas por fecha específica
  async getAppointmentsByDate(date) {
    return this.getAppointments({ date });
  }

  // Obtener citas por doctor
  async getAppointmentsByDoctor(doctorId) {
    return this.getAppointments({ doctorId });
  }

  // Obtener citas por paciente
  async getAppointmentsByPatient(patientId) {
    return this.getAppointments({ patientId });
  }
}

export default new AppointmentService();
