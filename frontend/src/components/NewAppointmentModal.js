import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import patientService from '../services/patientService';
import userService from '../services/userService';

const NewAppointmentModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientDocument: '',
    patientPhone: '',
    doctorId: '',
    doctorName: '',
    specialty: '',
    specialtyId: '',
    date: '',
    time: '',
    type: '',
    notes: '',
    status: ''
  });

  const [loading, setLoading] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  // Cargar doctores y especialidades al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadDoctors();
      // Establecer fecha por defecto como hoy
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
  }, [isOpen]);

  const loadDoctors = async () => {
    try {
      const response = await userService.getDoctors();
      const doctorsList = response.users || response.doctors || [];
      setDoctors(doctorsList);
      
      // Extraer especialidades únicas (id, name)
      const specialtyMap = new Map();
      doctorsList.forEach(d => {
        const id = d.specialty_id || d.specialtyId;
        const name = d.specialty_name || d.specialty || '';
        if (id && name && !specialtyMap.has(id)) specialtyMap.set(id, name);
      });
      setSpecialties(Array.from(specialtyMap.entries()).map(([id, name]) => ({ id, name })));
    } catch (error) {
      console.error('Error cargando doctores:', error);
      // Usar datos mock como fallback
      setDoctors([
        { id: 1, name: 'Dr. Ana María López', specialty: 'Medicina General' },
        { id: 2, name: 'Dr. Carlos Rodríguez', specialty: 'Cardiología' },
        { id: 3, name: 'Dr. Laura Martínez', specialty: 'Dermatología' },
        { id: 4, name: 'Dr. Pedro Silva', specialty: 'Pediatría' }
      ]);
      setSpecialties([
        { id: 1, name: 'Medicina General' },
        { id: 2, name: 'Cardiología' },
        { id: 3, name: 'Dermatología' },
        { id: 4, name: 'Pediatría' }
      ]);
    }
  }

  const appointmentTypes = [
    { value: 'primera vez', label: 'Primera vez' },
    { value: 'control', label: 'Control' },
    { value: 'consulta', label: 'Consulta' },
    { value: 'emergencia', label: 'Emergencia' }
  ];

  const statusOptions = [
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'en espera', label: 'En espera' },
    { value: 'pendiente', label: 'Pendiente' }
  ];

  // Horarios disponibles
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  useEffect(() => {
    if (isOpen) {
      // Establecer fecha por defecto como hoy
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePatientSearch = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setPatientSearchResults([]);
      return;
    }

    setSearchingPatient(true);
    
    try {
      // Buscar pacientes reales en el backend
      const response = await patientService.getPatients({ search: searchTerm });
      const patients = response.patients || [];
      
      // Convertir al formato esperado por el modal
      const formattedPatients = patients.map(patient => ({
        id: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        document: `${patient.identification_type || 'CC'} ${patient.identification_number || ''}`,
        phone: patient.mobile_phone || patient.landline_phone || 'Sin teléfono'
      }));
      
      setPatientSearchResults(formattedPatients);
    } catch (error) {
      console.error('Error buscando pacientes:', error);
      // En caso de error, usar datos mock como fallback
      const mockPatients = [
        { id: 1, name: 'Juan Carlos Pérez', document: 'CC 12345678', phone: '+57 300 123 4567' },
        { id: 2, name: 'María González', document: 'CC 87654321', phone: '+57 301 987 6543' },
        { id: 3, name: 'Pedro Silva', document: 'CC 11223344', phone: '+57 302 555 1234' },
        { id: 4, name: 'Ana Rodríguez', document: 'CC 55667788', phone: '+57 303 444 5555' }
      ].filter(patient => 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.document.includes(searchTerm)
      );
      
      setPatientSearchResults(mockPatients);
    } finally {
      setSearchingPatient(false);
    }
  };

  const selectPatient = (patient) => {
    setFormData(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
      patientDocument: patient.document,
      patientPhone: patient.phone
    }));
    setPatientSearchResults([]);
  };

  const handleDoctorChange = (e) => {
    const doctorId = parseInt(e.target.value);
    const selectedDoctor = doctors.find(d => d.id === doctorId);
    
    setFormData(prev => ({
      ...prev,
      doctorId: doctorId,
      doctorName: selectedDoctor ? (selectedDoctor.name || `${selectedDoctor.first_name} ${selectedDoctor.last_name}`) : '',
      specialty: selectedDoctor ? (selectedDoctor.specialty || selectedDoctor.specialty_name || '') : '',
      specialtyId: selectedDoctor ? (selectedDoctor.specialty_id || selectedDoctor.specialtyId || '') : ''
    }));
  };

  const validateForm = () => {
    const required = ['patientName', 'doctorName', 'date', 'time', 'patientPhone', 'type', 'status', 'specialtyId'];
    const missing = required.filter(field => !formData[field]);
    
    if (missing.length > 0) {
      toast.error('Por favor completa todos los campos obligatorios');
      return false;
    }
    
    // Validar que documento esté completo
    if (!formData.patientDocument) {
      toast.error('Por favor completa el documento del paciente');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Preparar datos para el backend
      const appointmentData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        duration: 30, // Duración por defecto en minutos
        type: formData.type.toUpperCase(),
        status: formData.status.toUpperCase(),
        specialtyId: formData.specialtyId ? parseInt(formData.specialtyId) : null,
        reason: formData.notes || '',
        notes: formData.notes || ''
      };
      
      // Llamar a la función onSave del componente padre
      onSave(appointmentData);
      
      toast.success('Cita creada exitosamente');
      handleClose();
    } catch (error) {
      console.error('Error al crear la cita:', error);
      toast.error('Error al crear la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      patientId: '',
      patientName: '',
      patientDocument: '',
      patientPhone: '',
      doctorId: '',
      doctorName: '',
      specialty: '',
      date: '',
      time: '',
      type: '',
      notes: '',
      status: ''
    });
    setPatientSearchResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed !m-0 inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            <span style={{ fontSize: '18px', marginRight: '8px' }}>📅</span>
            Nueva Cita
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span style={{ fontSize: '20px' }}>✕</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del Paciente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <span style={{ fontSize: '16px', marginRight: '6px' }}>👤</span>
                Información del Paciente
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Buscar Paciente *</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nombre o documento del paciente"
                      value={formData.patientName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, patientName: e.target.value }));
                        handlePatientSearch(e.target.value);
                      }}
                    />
                    {searchingPatient && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Puedes buscar un paciente existente o crear uno nuevo completando los campos manualmente
                  </p>
                  
                  {/* Resultados de búsqueda */}
                  {patientSearchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                      {patientSearchResults.map(patient => (
                        <div
                          key={patient.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => selectPatient(patient)}
                        >
                          <div className="font-medium text-gray-900">{patient.name}</div>
                          <div className="text-sm text-gray-600">
                            {patient.document} • {patient.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Documento *</label>
                    <input
                      type="text"
                      name="patientDocument"
                      className="input-field"
                      value={formData.patientDocument}
                      onChange={handleInputChange}
                      placeholder="CC 12345678"
                    />
                  </div>
                  <div>
                    <label className="form-label">Teléfono *</label>
                    <input
                      type="text"
                      name="patientPhone"
                      className="input-field"
                      value={formData.patientPhone}
                      onChange={handleInputChange}
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Información de la Cita */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <span style={{ fontSize: '16px', marginRight: '6px' }}>🏥</span>
                Información de la Cita
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Doctor *</label>
                  <select
                    name="doctorId"
                    className="input-field"
                    value={formData.doctorId}
                    onChange={handleDoctorChange}
                  >
                    <option value="">Seleccionar doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Fecha *</label>
                    <input
                      type="date"
                      name="date"
                      className="input-field"
                      value={formData.date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="form-label">Hora *</label>
                    <select
                      name="time"
                      className="input-field"
                      value={formData.time}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar hora</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Tipo de Atención *</label>
                    <select
                      name="type"
                      className="input-field"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar tipo</option>
                      {appointmentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Estado *</label>
                    <select
                      name="status"
                      className="input-field"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar estado</option>
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="form-label">Notas Adicionales</label>
            <textarea
              name="notes"
              className="input-field"
              rows="3"
              placeholder="Observaciones o notas especiales..."
              value={formData.notes}
              onChange={handleInputChange}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <span style={{ fontSize: '14px', marginRight: '8px' }}>💾</span>
                  Crear Cita
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAppointmentModal; 