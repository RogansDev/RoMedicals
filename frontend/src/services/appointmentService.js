import toast from "react-hot-toast";

// Usar configuración global si está disponible, sino usar valores por defecto
const API_BASE_URL =
  (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.API.BASE_URL) || "/api";
const AUTH_TOKEN_KEY =
  (window.ROMEDICALS_CONFIG && window.ROMEDICALS_CONFIG.AUTH.TOKEN_KEY) ||
  "authToken";

class AppointmentService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/appointments`;
  }

  // ===== Manejo de sesión y headers =====
  getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  saveAuthToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  logout(showToast = true) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.clear();
    if (showToast) {
      toast("Sesión expirada, por favor inicia de nuevo", { icon: "⚠️" });
    }
    window.location.href = "/login";
  }

  getHeaders() {
    const token = this.getAuthToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  async handleResponse(response) {
    if (response.status === 401) {
      this.logout();
      throw new Error("Sesión expirada. Inicie sesión nuevamente.");
    }

    if (!response.ok) {
      let errorMessage = "Error en la solicitud";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.details = errorData.details;
        throw error;
      } catch (e) {
        throw new Error(errorMessage);
      }
    }

    return response.json();
  }

  // ===== Crear nueva cita =====
  async createAppointment(appointmentData) {
    try {
      const coerceId = (value) => {
        if (value === null || value === undefined) return undefined;
        if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
        const str = String(value).trim();
        if (str === "") return undefined;
        if (/^\d+$/.test(str)) return parseInt(str, 10);
        return str;
      };

      const normalizeStatus = (s) => {
        const v = String(s || "").toUpperCase().trim();
        if (v.includes("PEND") || v.includes("ESPER")) return "PROGRAMADA";
        if (v.includes("CONFIR")) return "CONFIRMADA";
        if (v.includes("PROGRE")) return "EN_PROGRESO";
        if (v.includes("ATEND") || v.includes("COMPLE")) return "COMPLETADA";
        if (v.includes("CANCEL")) return "CANCELADA";
        if (v.includes("NO") && v.includes("ASIS")) return "NO_ASISTIO";
        return "PROGRAMADA";
      };

      const normalizeType = (t) => {
        const v = String(t || "").toUpperCase().trim();
        // No normalizar telemedicina/presencial, esos son valores de modality, no type
        if (v.includes("CONSULT")) return "CONSULTA";
        if (v.includes("CONTROL")) return "CONTROL";
        if (v.includes("EMER") || v.includes("URGEN")) return "URGENCIA";
        if (v.includes("PROCED")) return "PROCEDIMIENTO";
        if (v.includes("PRIMERA")) return "CONSULTA";
        return "OTRO";
      };

      const normalizeTime = (time) => {
        const v = String(time || "").trim();
        const m = v.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
        if (!m) return v;
        return `${m[1].padStart(2, "0")}:${m[2]}`;
      };

      const apptDate = appointmentData.appointmentDate || appointmentData.date;
      const apptTime = appointmentData.appointmentTime || appointmentData.time;

      // Normalizar modality: aceptar 'telemedicina'/'TELEMEDICINA' o 'presencial'/'PRESENCIAL'
      const normalizeModality = (m) => {
        if (!m) return 'PRESENCIAL';
        const v = String(m).toLowerCase().trim();
        if (v === 'telemedicina') return 'TELEMEDICINA';
        return 'PRESENCIAL';
      };

      const payload = {
        patientId: coerceId(appointmentData.patientId),
        doctorId: coerceId(appointmentData.doctorId),
        appointmentDate: apptDate,
        appointmentTime: normalizeTime(apptTime),
        duration: Number.isFinite(appointmentData.duration) ? appointmentData.duration : 30,
        type: normalizeType(appointmentData.type),
        modality: normalizeModality(appointmentData.modality),
        status: normalizeStatus(appointmentData.status),
        reason: appointmentData.reason ?? "",
        notes: appointmentData.notes ?? "",
      };
      
      console.log('📦 Payload final para crear cita:', payload);

      if (appointmentData.specialtyId != null && String(appointmentData.specialtyId).trim() !== "") {
        payload.specialtyId = coerceId(appointmentData.specialtyId);
      }

      if (!payload.patientId) throw new Error("El ID del paciente es requerido");
      if (!payload.appointmentDate) throw new Error("La fecha de la cita es requerida");
      if (!payload.appointmentTime) throw new Error("La hora de la cita es requerida");

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en createAppointment:", error);
      throw error;
    }
  }

  // ===== Obtener lista de citas =====
  async getAppointments(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) queryParams.append(key, value);
      });

      const url = `${this.baseURL}?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en getAppointments:", error);
      throw error;
    }
  }

  // ===== Obtener cita por ID =====
  async getAppointmentById(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en getAppointmentById:", error);
      throw error;
    }
  }

  // ===== Actualizar cita =====
  async updateAppointment(id, appointmentData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(appointmentData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en updateAppointment:", error);
      throw error;
    }
  }

  // ===== Actualizar solo el doctor asignado =====
  async updateAppointmentDoctor(id, doctorId) {
    try {
      const response = await fetch(`${this.baseURL}/${id}/doctor`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify({ doctorId }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en updateAppointmentDoctor:", error);
      throw error;
    }
  }

  // ===== Eliminar cita =====
  async deleteAppointment(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error en deleteAppointment:", error);
      throw error;
    }
  }

  // ===== Helpers de búsqueda =====
  async getAppointmentsByDate(date) {
    return this.getAppointments({ date });
  }

  async getAppointmentsByDoctor(doctorId) {
    return this.getAppointments({ doctorId });
  }

  async getAppointmentsByPatient(patientId) {
    return this.getAppointments({ patientId });
  }
}

// ✅ Exportación limpia
const appointmentService = new AppointmentService();
export default appointmentService;
