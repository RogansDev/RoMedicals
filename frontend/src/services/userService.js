import { API_CONFIG, AUTH_CONFIG } from '../config/constants';

// Usar configuración global si está disponible, sino usar valores por defecto
const API_BASE_URL = (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.API.BASE_URL) || '/api';
const AUTH_TOKEN_KEY = (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.AUTH.TOKEN_KEY) || 'authToken';

class UserService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/users`;
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

  // Obtener lista de usuarios por rol
  async getUsersByRole(role) {
    try {
      const response = await fetch(`${this.baseURL}?role=${role}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener los usuarios');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getUsersByRole:', error);
      throw error;
    }
  }

  // Obtener doctores (usuarios médicos)
  async getDoctors() {
    return this.getUsersByRole('medical_user');
  }

  // Obtener usuario por ID
  async getUserById(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener el usuario');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getUserById:', error);
      throw error;
    }
  }
}

export default new UserService();
