import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import patientService from '../services/patientService';
import toast from 'react-hot-toast';

const NewConsultation = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isDoctor = user?.role === 'medical_user';
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Cargar pacientes
  useEffect(() => {
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

    loadPatients();
  }, []);

  // Filtrar pacientes por término de búsqueda
  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           patient.identification_number?.includes(searchTerm);
  });

  const handleStartConsultation = (patient) => {
    navigate(`/consultation/${patient.id}`);
  };

  const handleBack = () => {
    navigate('/doctor/dashboard');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Consulta</h1>
          <p className="text-gray-600">Selecciona un paciente para iniciar la consulta médica</p>
        </div>
        <button
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
        >
          Volver
        </button>
      </div>

      {/* Búsqueda */}
      <div className="bg-white border rounded-xl p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar paciente
          </label>
          <input
            type="text"
            placeholder="Nombre, apellido o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Lista de pacientes */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No se encontraron pacientes' : 'No hay pacientes disponibles'}
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {patient.first_name?.[0]}{patient.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {patient.identification_number} • {patient.age || 'N/A'} años
                    </p>
                    {patient.email && (
                      <p className="text-xs text-gray-400">{patient.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleStartConsultation(patient)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                >
                  Iniciar Consulta
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Botón para crear nuevo paciente */}
      {!isDoctor && (
        <div className="bg-white border rounded-xl p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¿No encuentras al paciente?
            </h3>
            <p className="text-gray-600 mb-4">
              Puedes crear un nuevo paciente o buscar en otra sección
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/patients')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Ver todos los pacientes
              </button>
              <button
                onClick={() => navigate('/patients?new=true')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
              >
                Crear nuevo paciente
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mensaje para médicos */}
      {isDoctor && (
        <div className="bg-white border rounded-xl p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¿No encuentras al paciente?
            </h3>
            <p className="text-gray-600 mb-4">
              Contacta al administrador para agregar nuevos pacientes al sistema
            </p>
            <button
              onClick={() => navigate('/patients')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Ver todos los pacientes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewConsultation;
