import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersAPI, specialistsAPI } from '../config/api';
import Layout from './Layout';

const DoctorScheduleConfig = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || '');
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes', short: 'Lun' },
    { key: 'tuesday', label: 'Martes', short: 'Mar' },
    { key: 'wednesday', label: 'Miércoles', short: 'Mié' },
    { key: 'thursday', label: 'Jueves', short: 'Jue' },
    { key: 'friday', label: 'Viernes', short: 'Vie' },
    { key: 'saturday', label: 'Sábado', short: 'Sáb' },
    { key: 'sunday', label: 'Domingo', short: 'Dom' }
  ];

  // Generar slots de tiempo cada 15 minutos desde las 6 AM hasta las 10 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      // Asegurar que el ID sea numérico para la API
      const numericId = Number(selectedDoctorId) || selectedDoctorId;
      loadDoctorSchedule(numericId);
    } else {
      setSchedule({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getDoctors();
      // Manejar diferentes formatos de respuesta
      let doctorsList = [];
      if (response?.data?.doctors) {
        doctorsList = response.data.doctors;
      } else if (Array.isArray(response?.data)) {
        doctorsList = response.data;
      } else if (Array.isArray(response)) {
        doctorsList = response;
      }
      
      // Formatear nombres de doctores
      const formattedDoctors = doctorsList.map(doctor => {
        const getDoctorName = (doc) => {
          if (doc.name) return doc.name;
          if (doc.fullName) return doc.fullName;
          const firstName = doc.first_name || doc.firstName || '';
          const lastName = doc.last_name || doc.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          return fullName || 'Sin nombre';
        };
        
        return {
          id: Number(doctor.id) || doctor.id,
          name: getDoctorName(doctor),
          specialty: doctor.specialty_name || doctor.specialty || 'Sin especialidad'
        };
      });
      
      setDoctors(formattedDoctors);
      
      // Si hay un doctorId en la URL, seleccionarlo automáticamente
      if (doctorId && formattedDoctors.find(d => String(d.id) === String(doctorId))) {
        setSelectedDoctorId(String(doctorId));
      }
    } catch (error) {
      console.error('Error cargando doctores:', error);
      toast.error('Error al cargar la lista de médicos: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorSchedule = async (id) => {
    try {
      setLoadingSchedule(true);
      // Convertir ID a número si es necesario
      const doctorId = Number(id) || id;
      
      // Crear horario por defecto primero
      const defaultSchedule = {};
      daysOfWeek.forEach(day => {
        defaultSchedule[day.key] = {
          isWorking: false,
          startTime: '08:00',
          endTime: '18:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          hasBreak: false,
          simultaneousPatients: 1,
          interval: 15
        };
      });
      
      // Intentar cargar el horario con timeout aumentado
      try {
        const response = await specialistsAPI.getSchedule(doctorId, { timeout: 30000 }); // 30 segundos
        
        // El backend devuelve { schedule: ... } directamente, no dentro de data
        const existingSchedule = response?.data?.schedule || response?.schedule || null;
        
        if (existingSchedule && typeof existingSchedule === 'object' && Object.keys(existingSchedule).length > 0) {
          // Asegurar que todos los días estén presentes
          const mergedSchedule = { ...defaultSchedule };
          daysOfWeek.forEach(day => {
            if (existingSchedule[day.key]) {
              mergedSchedule[day.key] = {
                ...defaultSchedule[day.key],
                ...existingSchedule[day.key]
              };
            }
          });
          setSchedule(mergedSchedule);
        } else {
          // No hay horario guardado, usar el por defecto
          setSchedule(defaultSchedule);
        }
      } catch (apiError) {
        // 404 significa que no hay horario guardado, es normal
        if (apiError.response?.status === 404) {
          console.log('No hay horario guardado para este médico, usando horario por defecto');
          setSchedule(defaultSchedule);
        } 
        // Si es un timeout o error de conexión, usar horario por defecto silenciosamente
        else if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
          console.warn('Timeout al cargar horario, usando horario por defecto');
          setSchedule(defaultSchedule);
        } else {
          throw apiError; // Re-lanzar otros errores
        }
      }
    } catch (error) {
      console.error('Error cargando horario:', error);
      
      // Solo mostrar error si no es un timeout ni un 404 (404 es normal, significa que no hay horario)
      if (error.code !== 'ECONNABORTED' && 
          !error.message?.includes('timeout') && 
          error.response?.status !== 404) {
        toast.error('Error al cargar el horario del médico: ' + (error.response?.data?.message || error.message || 'Error desconocido'));
      }
      
      // Crear horario por defecto en caso de error
      const defaultSchedule = {};
      daysOfWeek.forEach(day => {
        defaultSchedule[day.key] = {
          isWorking: false,
          startTime: '08:00',
          endTime: '18:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          hasBreak: false,
          simultaneousPatients: 1,
          interval: 15
        };
      });
      setSchedule(defaultSchedule);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleDoctorChange = (e) => {
    const doctorId = e.target.value;
    setSelectedDoctorId(doctorId);
    if (doctorId) {
      // Convertir a número para la URL si es necesario
      const numericId = Number(doctorId) || doctorId;
      navigate(`/user-management/doctor-schedule/${numericId}`, { replace: true });
    } else {
      navigate('/user-management/doctor-schedule', { replace: true });
    }
  };

  const handleScheduleChange = (dayKey, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey] || {
          isWorking: false,
          startTime: '08:00',
          endTime: '18:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          hasBreak: false,
          simultaneousPatients: 1,
          interval: 15
        },
        [field]: value
      }
    }));
  };

  const handleSaveSchedule = async () => {
    if (!selectedDoctorId) {
      toast.error('Debe seleccionar un médico');
      return;
    }

    // Validar que el schedule tenga al menos un día configurado
    const hasWorkingDay = Object.values(schedule).some(day => day?.isWorking === true);
    if (!hasWorkingDay) {
      toast.error('Debe configurar al menos un día de trabajo');
      return;
    }

    setSaving(true);
    try {
      // Convertir ID a número si es necesario (pero mantener string si es UUID)
      const doctorId = selectedDoctorId;
      
      // Validar que todos los días tengan la estructura correcta
      const validatedSchedule = {};
      daysOfWeek.forEach(day => {
        const daySchedule = schedule[day.key] || {};
        validatedSchedule[day.key] = {
          isWorking: Boolean(daySchedule.isWorking),
          startTime: daySchedule.startTime || '08:00',
          endTime: daySchedule.endTime || '18:00',
          breakStart: daySchedule.breakStart || '12:00',
          breakEnd: daySchedule.breakEnd || '13:00',
          hasBreak: Boolean(daySchedule.hasBreak),
          simultaneousPatients: Number(daySchedule.simultaneousPatients) || 1,
          interval: Number(daySchedule.interval) || 15
        };
      });

      const response = await specialistsAPI.updateSchedule(doctorId, validatedSchedule, { timeout: 30000 });
      
      // Si el guardado fue exitoso, recargar el horario
      if (response?.data?.schedule) {
        setSchedule(response.data.schedule);
      }
      
      toast.success('Horario guardado exitosamente');
    } catch (error) {
      console.error('Error guardando horario:', error);
      
      // Si es timeout, puede ser que PostgreSQL no esté disponible
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('El servidor tardó demasiado en responder. La base de datos de horarios puede no estar disponible. Por favor, contacte al administrador del sistema.');
      }
      // Si es 404, puede ser que el endpoint no esté disponible
      else if (error.response?.status === 404) {
        toast.error('El endpoint de horarios no está disponible. Por favor, contacte al administrador del sistema.');
      }
      // Si es 503, es un error de servicio no disponible (PostgreSQL no disponible)
      else if (error.response?.status === 503) {
        const errorMessage = error.response?.data?.message || 'La base de datos de horarios no está disponible';
        toast.error(errorMessage + '. Por favor, contacte al administrador del sistema.');
      }
      else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Error al guardar el horario';
        const errorDetails = error.response?.data?.details;
        if (errorDetails && Array.isArray(errorDetails)) {
          toast.error(`${errorMessage}: ${errorDetails.join(', ')}`);
        } else {
          toast.error(errorMessage);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedDoctor = doctors.find(d => String(d.id) === String(selectedDoctorId));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración de Disponibilidad de Médicos</h1>
            <p className="text-sm text-gray-600 mt-1">Configura los horarios de atención de los médicos</p>
          </div>
          <button
            onClick={() => navigate('/user-management?tab=medicos')}
            className="inline-flex items-center gap-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2"
          >
            ← Volver a Gestión de Usuarios
          </button>
        </div>

        {/* Selector de Médico */}
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Médico</h2>
          <select
            value={selectedDoctorId}
            onChange={handleDoctorChange}
            className="input-field w-full max-w-md"
          >
            <option value="">Seleccione un médico</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} - {doctor.specialty}
              </option>
            ))}
          </select>
        </div>

        {selectedDoctor && (
          <>
            {/* Información del Médico */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-blue-900">
                Configurando horario para: {selectedDoctor.name}
              </h3>
              <p className="text-sm text-blue-700 mt-1">Especialidad: {selectedDoctor.specialty}</p>
            </div>

            {loadingSchedule ? (
              <div className="flex items-center justify-center py-12 bg-white border rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">Cargando horario...</p>
              </div>
            ) : (
              <>
                {/* Tabla de Horarios */}
                <div className="bg-white border rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Horario Semanal</h2>
                    <button
                      onClick={handleSaveSchedule}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          Guardar Horario
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Día
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Atiende
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hora Inicio
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hora Fin
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tiene Descanso
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Inicio Descanso
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fin Descanso
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {daysOfWeek.map((day) => {
                          const daySchedule = schedule[day.key] || {
                            isWorking: false,
                            startTime: '08:00',
                            endTime: '18:00',
                            breakStart: '12:00',
                            breakEnd: '13:00',
                            hasBreak: false,
                            simultaneousPatients: 1,
                            interval: 15
                          };

                          return (
                            <tr key={day.key} className={!daySchedule.isWorking ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {day.label}
                              </td>
                              
                              {/* Checkbox Atiende */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={daySchedule.isWorking}
                                  onChange={(e) => handleScheduleChange(day.key, 'isWorking', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>

                              {/* Hora Inicio */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <select
                                  value={daySchedule.startTime}
                                  onChange={(e) => handleScheduleChange(day.key, 'startTime', e.target.value)}
                                  disabled={!daySchedule.isWorking}
                                  className="input-field text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Hora Fin */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <select
                                  value={daySchedule.endTime}
                                  onChange={(e) => handleScheduleChange(day.key, 'endTime', e.target.value)}
                                  disabled={!daySchedule.isWorking}
                                  className="input-field text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Tiene Descanso */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={daySchedule.hasBreak}
                                  onChange={(e) => handleScheduleChange(day.key, 'hasBreak', e.target.checked)}
                                  disabled={!daySchedule.isWorking}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </td>

                              {/* Inicio Descanso */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <select
                                  value={daySchedule.breakStart}
                                  onChange={(e) => handleScheduleChange(day.key, 'breakStart', e.target.value)}
                                  disabled={!daySchedule.isWorking || !daySchedule.hasBreak}
                                  className="input-field text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Fin Descanso */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <select
                                  value={daySchedule.breakEnd}
                                  onChange={(e) => handleScheduleChange(day.key, 'breakEnd', e.target.value)}
                                  disabled={!daySchedule.isWorking || !daySchedule.hasBreak}
                                  className="input-field text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  {timeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Información de ayuda */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Instrucciones</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Marca "Atiende" para los días en que el médico trabaja</li>
                      <li>• Configura las horas de inicio y fin de atención</li>
                      <li>• Si el médico tiene descanso, marca "Tiene Descanso" y configura las horas</li>
                      <li>• Ejemplo: Lunes de 8:00 AM a 6:00 PM con descanso de 12:00 PM a 1:00 PM</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {!selectedDoctor && doctors.length > 0 && (
          <div className="bg-white border rounded-xl p-12 text-center">
            <span style={{ fontSize: '64px' }}>📅</span>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Seleccione un Médico</h3>
            <p className="mt-2 text-sm text-gray-500">
              Elija un médico de la lista para configurar su horario de disponibilidad.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DoctorScheduleConfig;

