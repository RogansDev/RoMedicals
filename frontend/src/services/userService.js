import toast from "react-hot-toast";

// Usar configuración global si está disponible, sino usar valores por defecto
const API_BASE_URL =
  (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.API.BASE_URL) || "/api";
const AUTH_TOKEN_KEY =
  (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.AUTH.TOKEN_KEY) ||
  "authToken";

class UserService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/users`;
  }

  // Obtener token del localStorage
  getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  // Guardar token
  saveAuthToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  // Limpiar token y cerrar sesión
  logout(showToast = true) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.clear();
    if (showToast) {
      toast("Sesión expirada, por favor inicia de nuevo", { icon: "⚠️" });
    }
    window.location.href = "/login";
  }

  // Headers de autorización
  getHeaders() {
    const token = this.getAuthToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  // Manejo centralizado de la respuesta del backend
  async handleResponse(response) {
    if (response.status === 401) {
      this.logout();
      throw new Error("Sesión expirada. Inicie sesión nuevamente.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Error en la solicitud");
    }

    return response.json();
  }

  // Obtener lista de usuarios por rol
  async getUsersByRole(role) {
    try {
      const response = await fetch(`${this.baseURL}?role=${role}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en getUsersByRole:", error);
      throw error;
    }
  }

  // Obtener doctores (usuarios médicos)
  async getDoctors() {
    return this.getUsersByRole("medical_user");
  }

  // Obtener usuario por ID
  async getUserById(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en getUserById:", error);
      throw error;
    }
  }
}

// ✅ Instancia exportada correctamente (evita warning ESLint)
const userService = new UserService();
export default userService;
