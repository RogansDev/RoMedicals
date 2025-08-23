import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import patientService from '../services/patientService';

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [formData, setFormData] = useState({
    // Datos personales
    guardianId: '',
    firstName: '',
    lastName: '',
    identificationType: '',
    residenceCountry: '',
    originCountry: '',
    identificationNumber: '',
    isForeigner: false,
    gender: 'Masculino',
    birthDay: '1',
    birthMonth: 'Enero',
    birthYear: '',
    bloodType: '',
    disability: '',
    occupation: '',
    maritalStatus: '',
    
    // Datos adicionales
    educationLevel: '',
    activityProfession: '',
    patientType: '',
    eps: 'Ninguna',
    email: '',
    address: '',
    city: '',
    department: '',
    residentialZone: '',
    landlinePhone: '',
    mobilePhoneCountry: '+57',
    mobilePhone: '',
    companionName: '',
    companionPhone: '',
    responsibleName: '',
    responsiblePhone: '',
    responsibleRelationship: '',
    agreement: 'Sin Convenio',
    observations: '',
    reference: ''
  });

  // Cargar pacientes al montar el componente
  useEffect(() => {
    loadPatients();
  }, []);

  // Función para cargar pacientes desde el backend
  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await patientService.getPatients();
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error cargando pacientes:', error);
      toast.error('Error al cargar los pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = (patient) => {
    // Convertir los datos del paciente del backend al formato del formulario
    const patientFormData = {
      guardianId: patient.guardian_id || '',
      firstName: patient.first_name || '',
      lastName: patient.last_name || '',
      identificationType: patient.identification_type || '',
      residenceCountry: patient.residence_country || '',
      originCountry: patient.origin_country || '',
      identificationNumber: patient.identification_number || '',
      isForeigner: patient.is_foreigner || false,
      gender: patient.gender || 'Masculino',
      birthDay: patient.birth_date ? new Date(patient.birth_date).getDate().toString() : '1',
      birthMonth: patient.birth_date ? months[new Date(patient.birth_date).getMonth()] : 'Enero',
      birthYear: patient.birth_date ? new Date(patient.birth_date).getFullYear().toString() : '',
      bloodType: patient.blood_type || '',
      disability: patient.disability || '',
      occupation: patient.occupation || '',
      maritalStatus: patient.marital_status || '',
      educationLevel: patient.education_level || '',
      activityProfession: patient.activity_profession || '',
      patientType: patient.patient_type || '',
      eps: patient.eps || 'Ninguna',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      department: patient.department || '',
      residentialZone: patient.residential_zone || '',
      landlinePhone: patient.landline_phone || '',
      mobilePhoneCountry: patient.mobile_phone_country || '+57',
      mobilePhone: patient.mobile_phone || '',
      companionName: patient.companion_name || '',
      companionPhone: patient.companion_phone || '',
      responsibleName: patient.responsible_name || '',
      responsiblePhone: patient.responsible_phone || '',
      responsibleRelationship: patient.responsible_relationship || '',
      agreement: patient.agreement || 'Sin Convenio',
      observations: patient.observations || '',
      reference: patient.reference || ''
    };

    setFormData(patientFormData);
    setEditingPatient(patient);
    setShowForm(true);
  };

  const handleOpenPatientFicha = (patient) => {
    // Navegar a la ficha del paciente con la pestaña de datos administrativos activa
    navigate(`/patients/${patient.id}/ficha?tab=administrative`);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPatient(null);
    
    // Limpiar formulario
    setFormData({
      guardianId: '',
      firstName: '',
      lastName: '',
      identificationType: '',
      residenceCountry: '',
      originCountry: '',
      identificationNumber: '',
      isForeigner: false,
      gender: 'Masculino',
      birthDay: '1',
      birthMonth: 'Enero',
      birthYear: '',
      bloodType: '',
      disability: '',
      occupation: '',
      maritalStatus: '',
      educationLevel: '',
      activityProfession: '',
      patientType: '',
      eps: 'Ninguna',
      email: '',
      address: '',
      city: '',
      department: '',
      residentialZone: '',
      landlinePhone: '',
      mobilePhoneCountry: '+57',
      mobilePhone: '',
      companionName: '',
      companionPhone: '',
      responsibleName: '',
      responsiblePhone: '',
      responsibleRelationship: '',
      agreement: 'Sin Convenio',
      observations: '',
      reference: ''
    });
  };

  const handleDelete = async (patient) => {
    // Abrir modal de confirmación
    setPatientToDelete(patient);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!patientToDelete) return;

    try {
      setLoading(true);
      
      // Llamar al servicio para eliminar el paciente
      await patientService.deletePatient(patientToDelete.id);
      
      // Remover el paciente de la lista local
      setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      
      toast.success('Paciente eliminado exitosamente');
      
      // Cerrar modal
      setShowDeleteConfirm(false);
      setPatientToDelete(null);
    } catch (error) {
      console.error('Error eliminando paciente:', error);
      toast.error(error.message || 'Error al eliminar el paciente');
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setPatientToDelete(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.firstName || !formData.lastName || !formData.identificationNumber) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      
      if (editingPatient) {
        // Actualizar paciente existente
        const response = await patientService.updatePatient(editingPatient.id, formData);
        
        // Actualizar el paciente en la lista local
        const updatedPatient = {
          ...response.patient,
          age: calculateAge(response.patient.birth_date),
          isMinor: calculateAge(response.patient.birth_date) < 18
        };

        setPatients(prev => prev.map(p => 
          p.id === editingPatient.id ? updatedPatient : p
        ));
        
        toast.success('Paciente actualizado exitosamente');
      } else {
        // Crear nuevo paciente
        const response = await patientService.createPatient(formData);
        
        // Agregar el nuevo paciente a la lista local
        const newPatient = {
          ...response.patient,
          age: calculateAge(response.patient.birth_date),
          isMinor: calculateAge(response.patient.birth_date) < 18
        };

        setPatients(prev => [...prev, newPatient]);
        toast.success('Paciente creado exitosamente');
      }

      setShowForm(false);
      setEditingPatient(null);
      
      // Limpiar formulario
      setFormData({
        guardianId: '',
        firstName: '',
        lastName: '',
        identificationType: '',
        residenceCountry: '',
        originCountry: '',
        identificationNumber: '',
        isForeigner: false,
        gender: 'Masculino',
        birthDay: '1',
        birthMonth: 'Enero',
        birthYear: '',
        bloodType: '',
        disability: '',
        occupation: '',
        maritalStatus: '',
        educationLevel: '',
        activityProfession: '',
        patientType: '',
        eps: 'Ninguna',
        email: '',
        address: '',
        city: '',
        department: '',
        residentialZone: '',
        landlinePhone: '',
        mobilePhoneCountry: '+57',
        mobilePhone: '',
        companionName: '',
        companionPhone: '',
        responsibleName: '',
        responsiblePhone: '',
        responsibleRelationship: '',
        agreement: 'Sin Convenio',
        observations: '',
        reference: ''
      });
      
    } catch (error) {
      console.error('Error creando/actualizando paciente:', error);
      toast.error(error.message || 'Error al procesar el paciente');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    
    // Si es un string de año, calcular edad basada en el año
    if (typeof birthDate === 'string' && birthDate.length === 4) {
      const currentYear = new Date().getFullYear();
      return currentYear - parseInt(birthDate);
    }
    
    // Si es una fecha completa, calcular edad basada en la fecha
    if (birthDate instanceof Date || typeof birthDate === 'string') {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    }
    
    return 0;
  };

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const days = Array.from({length: 31}, (_, i) => i + 1);
  const years = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Pacientes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          <span style={{ fontSize: '14px', marginRight: '8px' }}>➕</span>
          Nuevo Paciente
        </button>
      </div>

      {/* Lista de Pacientes */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pacientes Registrados</h2>
          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
            💡 <strong>Tip:</strong> Haz clic en el nombre del paciente para ver su ficha completa
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando pacientes...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3 className="empty-state-title">No hay pacientes registrados</h3>
            <p className="empty-state-description">
              Comience agregando el primer paciente.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              <span style={{ fontSize: '14px', marginRight: '8px' }}>➕</span>
              Agregar Paciente
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre del Paciente</th>
                  <th>Teléfono</th>
                  <th>Identificación</th>
                  <th>Edad</th>
                  <th>Tipo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <span style={{ fontSize: '16px' }}>👤</span>
                        </div>
                        <div>
                          <button
                            onClick={() => handleOpenPatientFicha(patient)}
                            className="font-semibold text-blue-600 hover:text-blue-800 text-base text-left hover:underline cursor-pointer transition-colors duration-200 flex items-center group"
                            title="Hacer clic para ver la ficha del paciente"
                          >
                            <span>{patient.first_name || patient.firstName} {patient.last_name || patient.lastName}</span>
                            <span className="ml-2 text-blue-400 group-hover:text-blue-600 transition-colors duration-200" style={{ fontSize: '12px' }}>🔗</span>
                          </button>
                          <div className="text-sm text-gray-500">
                            {patient.gender === 'Masculino' ? 'Masculino' : patient.gender === 'Femenino' ? 'Femenino' : 'No especificado'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900 font-medium">
                        📱 {patient.mobile_phone || patient.mobilePhone || 'No registrado'}
                      </div>
                      {patient.landline_phone || patient.landlinePhone ? (
                        <div className="text-sm text-gray-500">
                          ☎️ {patient.landline_phone || patient.landlinePhone}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{patient.identification_type || patient.identificationType}</div>
                      <div className="text-sm text-gray-500">{patient.identification_number || patient.identificationNumber}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{patient.age} años</div>
                      {patient.isMinor && (
                        <div className="text-xs text-orange-600">Menor de edad</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {patient.patient_type === 'particular' ? 'Particular' :
                         patient.patient_type === 'eps' ? 'EPS' : 
                         patient.patient_type === 'prepagada' ? 'Prepagada' : 'Otro'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon btn-icon-edit"
                          onClick={() => handleEdit(patient)}
                        >
                          Editar
                        </button>
                        <button 
                          className="btn-icon btn-icon-delete"
                          onClick={() => handleDelete(patient)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulario de Nuevo Paciente */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingPatient ? 'Editar Paciente' : 'Datos nuevo paciente'}
              </h2>
              <button
                onClick={handleCancel}
                className="modal-close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Primera sección - Datos personales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Cédula Acudiente</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.guardianId}
                      onChange={(e) => handleInputChange('guardianId', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Nombre
                      <span className="text-blue-500 ml-1">ℹ</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Apellidos</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de identificación</label>
                    <select
                      className="form-select"
                      value={formData.identificationType}
                      onChange={(e) => handleInputChange('identificationType', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="CC">Cédula de Ciudadanía</option>
                      <option value="CE">Cédula de Extranjería</option>
                      <option value="TI">Tarjeta de Identidad</option>
                      <option value="PP">Pasaporte</option>
                      <option value="RC">Registro Civil</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">País de residencia</label>
                    <select
                      className="form-select"
                      value={formData.residenceCountry}
                      onChange={(e) => handleInputChange('residenceCountry', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Venezuela">Venezuela</option>
                      <option value="Ecuador">Ecuador</option>
                      <option value="Peru">Perú</option>
                      <option value="Brasil">Brasil</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">País de origen</label>
                    <select
                      className="form-select"
                      value={formData.originCountry}
                      onChange={(e) => handleInputChange('originCountry', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Venezuela">Venezuela</option>
                      <option value="Ecuador">Ecuador</option>
                      <option value="Peru">Perú</option>
                      <option value="Brasil">Brasil</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">#Número de identificación</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        className="form-input flex-1"
                        value={formData.identificationNumber}
                        onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                        required
                      />
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={formData.isForeigner}
                          onChange={(e) => handleInputChange('isForeigner', e.target.checked)}
                        />
                        <span className="ml-2 text-sm">Extranjero</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Sexo
                      <span className="text-blue-500 ml-1">ℹ</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fecha de nacimiento</label>
                    <div className="flex space-x-2">
                      <select
                        className="form-select"
                        value={formData.birthDay}
                        onChange={(e) => handleInputChange('birthDay', e.target.value)}
                      >
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={formData.birthMonth}
                        onChange={(e) => handleInputChange('birthMonth', e.target.value)}
                      >
                        {months.map(month => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={formData.birthYear}
                        onChange={(e) => handleInputChange('birthYear', e.target.value)}
                      >
                        <option value="">Selecciona</option>
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Grupo Sanguíneo</label>
                    <select
                      className="form-select"
                      value={formData.bloodType}
                      onChange={(e) => handleInputChange('bloodType', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Incapacidad</label>
                    <select
                      className="form-select"
                      value={formData.disability}
                      onChange={(e) => handleInputChange('disability', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Ninguna">Ninguna</option>
                      <option value="Física">Física</option>
                      <option value="Visual">Visual</option>
                      <option value="Auditiva">Auditiva</option>
                      <option value="Intelectual">Intelectual</option>
                      <option value="Múltiple">Múltiple</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ocupación</label>
                    <select
                      className="form-select"
                      value={formData.occupation}
                      onChange={(e) => handleInputChange('occupation', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Estudiante">Estudiante</option>
                      <option value="Empleado">Empleado</option>
                      <option value="Independiente">Independiente</option>
                      <option value="Desempleado">Desempleado</option>
                      <option value="Jubilado">Jubilado</option>
                      <option value="Ama de casa">Ama de casa</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estado Civil</label>
                    <select
                      className="form-select"
                      value={formData.maritalStatus}
                      onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Soltero">Soltero</option>
                      <option value="Casado">Casado</option>
                      <option value="Divorciado">Divorciado</option>
                      <option value="Viudo">Viudo</option>
                      <option value="Unión libre">Unión libre</option>
                    </select>
                  </div>
                </div>

                {/* Segunda sección - Datos adicionales */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Información Adicional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Nivel educativo</label>
                      <select
                        className="form-select"
                        value={formData.educationLevel}
                        onChange={(e) => handleInputChange('educationLevel', e.target.value)}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="Primaria">Primaria</option>
                        <option value="Secundaria">Secundaria</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Universitario">Universitario</option>
                        <option value="Posgrado">Posgrado</option>
                        <option value="Ninguno">Ninguno</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Actividad / Profesión</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.activityProfession}
                        onChange={(e) => handleInputChange('activityProfession', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tipo de paciente</label>
                      <select
                        className="form-select"
                        value={formData.patientType}
                        onChange={(e) => handleInputChange('patientType', e.target.value)}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="particular">Particular</option>
                        <option value="eps">EPS</option>
                        <option value="prepagada">Prepagada</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">EPS</label>
                      <select
                        className="form-select"
                        value={formData.eps}
                        onChange={(e) => handleInputChange('eps', e.target.value)}
                      >
                        <option value="Ninguna">Ninguna</option>
                        <option value="Sura">Sura</option>
                        <option value="Nueva EPS">Nueva EPS</option>
                        <option value="Famisanar">Famisanar</option>
                        <option value="Compensar">Compensar</option>
                        <option value="Salud Total">Salud Total</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-input"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dirección</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ciudad, municipio o localidad</label>
                      <select
                        className="form-select"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="Bogotá">Bogotá</option>
                        <option value="Medellín">Medellín</option>
                        <option value="Cali">Cali</option>
                        <option value="Barranquilla">Barranquilla</option>
                        <option value="Cartagena">Cartagena</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Departamento</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Zona de residencia</label>
                      <select
                        className="form-select"
                        value={formData.residentialZone}
                        onChange={(e) => handleInputChange('residentialZone', e.target.value)}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="Norte">Norte</option>
                        <option value="Sur">Sur</option>
                        <option value="Este">Este</option>
                        <option value="Oeste">Oeste</option>
                        <option value="Centro">Centro</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teléfono fijo</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={formData.landlinePhone}
                        onChange={(e) => handleInputChange('landlinePhone', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teléfono móvil</label>
                      <div className="flex space-x-2">
                        <select
                          className="form-select w-24"
                          value={formData.mobilePhoneCountry}
                          onChange={(e) => handleInputChange('mobilePhoneCountry', e.target.value)}
                        >
                          <option value="+57">🇨🇴 +57</option>
                          <option value="+58">🇻🇪 +58</option>
                          <option value="+593">🇪🇨 +593</option>
                          <option value="+51">🇵🇪 +51</option>
                          <option value="+55">🇧🇷 +55</option>
                        </select>
                        <input
                          type="tel"
                          className="form-input flex-1"
                          placeholder="Ej: 3211234567"
                          value={formData.mobilePhone}
                          onChange={(e) => handleInputChange('mobilePhone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nombre acompañante</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.companionName}
                        onChange={(e) => handleInputChange('companionName', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teléfono acompañante</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={formData.companionPhone}
                        onChange={(e) => handleInputChange('companionPhone', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nombre responsable</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.responsibleName}
                        onChange={(e) => handleInputChange('responsibleName', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teléfono responsable</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={formData.responsiblePhone}
                        onChange={(e) => handleInputChange('responsiblePhone', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Parentesco responsable</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.responsibleRelationship}
                        onChange={(e) => handleInputChange('responsibleRelationship', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Convenio</label>
                      <select
                        className="form-select"
                        value={formData.agreement}
                        onChange={(e) => handleInputChange('agreement', e.target.value)}
                      >
                        <option value="Sin Convenio">Sin Convenio</option>
                        <option value="Con Convenio">Con Convenio</option>
                        <option value="Particular">Particular</option>
                      </select>
                    </div>

                    <div className="form-group md:col-span-2">
                      <label className="form-label">Observaciones</label>
                      <textarea
                        className="form-textarea"
                        rows="4"
                        value={formData.observations}
                        onChange={(e) => handleInputChange('observations', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Referencia</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.reference}
                        onChange={(e) => handleInputChange('reference', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleCancel}
                className="modal-close"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '14px', marginRight: '8px' }}>💾</span>
                    {editingPatient ? 'Actualizar' : 'Guardar'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirm && patientToDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title text-red-600">
                <span style={{ fontSize: '16px', marginRight: '8px' }}>⚠️</span>
                Confirmar Eliminación
              </h2>
              <button
                onClick={cancelDelete}
                className="modal-close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <span style={{ fontSize: '24px' }}>🗑️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¿Está seguro de que desea eliminar este paciente?
                </h3>
                <p className="text-gray-600 mb-4">
                  <strong>{patientToDelete.first_name} {patientToDelete.last_name}</strong>
                </p>
                <p className="text-sm text-red-600">
                  Esta acción no se puede deshacer y se eliminarán todos los datos asociados.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={cancelDelete}
                className="btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={loading}
                className="btn-danger flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '14px', marginRight: '8px' }}>🗑️</span>
                    Eliminar Paciente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients; 