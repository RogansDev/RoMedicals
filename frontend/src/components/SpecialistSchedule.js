import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { specialistsAPI, specialtiesAPI } from '../config/api';

const SpecialistSchedule = () => {
  const [specialists, setSpecialists] = useState([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes', short: 'Lun' },
    { key: 'tuesday', label: 'Martes', short: 'Mar' },
    { key: 'wednesday', label: 'Miércoles', short: 'Mié' },
    { key: 'thursday', label: 'Jueves', short: 'Jue' },
    { key: 'friday', label: 'Viernes', short: 'Vie' },
    { key: 'saturday', label: 'Sábado', short: 'Sáb' },
    { key: 'sunday', label: 'Domingo', short: 'Dom' }
  ];

  const timeSlots = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  useEffect(() => {
    fetchSpecialists();
  }, []);

  const fetchSpecialists = async () => {
    try {
      const response = await specialistsAPI.getAll();
      setSpecialists(response.data);
    } catch (error) {
      console.error('Error fetching specialists:', error);
      toast.error('Error al cargar especialistas');
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialistChange = (specialistId) => {
    const specialist = specialists.find(s => s.id === parseInt(specialistId));
    setSelectedSpecialist(specialist);
    
    if (specialist && specialist.schedule) {
      setSchedule(specialist.schedule);
    } else {
      // Crear horario por defecto
      const defaultSchedule = {};
      daysOfWeek.forEach(day => {
        defaultSchedule[day.key] = {
          isWorking: false,
          startTime: '08:00',
          endTime: '18:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          hasBreak: false,
          simultaneousPatients: 3,
          interval: 15,
          box: 'Box 1',
          modality: 'both' // both, in-person, virtual
        };
      });
      setSchedule(defaultSchedule);
    }
  };

  const handleScheduleChange = (dayKey, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value
      }
    }));
  };

  const handleSaveSchedule = async () => {
    if (!selectedSpecialist) {
      toast.error('Debe seleccionar un especialista');
      return;
    }

    setSaving(true);
    try {
      await specialistsAPI.updateSchedule(selectedSpecialist.id, schedule);
      toast.success('Horario guardado exitosamente');
      
      // Actualizar la lista de especialistas
      fetchSpecialists();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Error al guardar horario');
    } finally {
      setSaving(false);
    }
  };

  const getModalityLabel = (modality) => {
    switch (modality) {
      case 'both': return 'Presencial / Virtual';
      case 'in-person': return 'Solo Presencial';
      case 'virtual': return 'Solo Virtual';
      default: return 'Presencial / Virtual';
    }
  };

  const getWorkingHoursText = (daySchedule) => {
    if (!daySchedule.isWorking) return 'No atiende';
    return `${daySchedule.startTime} a ${daySchedule.endTime}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Cargando especialistas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Horarios de Especialistas</h1>
        {selectedSpecialist && (
          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <span style={{ fontSize: '14px', marginRight: '8px' }}>💾</span>
                Guardar Horario
              </>
            )}
          </button>
        )}
      </div>

      {/* Selector de Especialista */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Seleccionar Especialista</h2>
        <select
          value={selectedSpecialist?.id || ''}
          onChange={(e) => handleSpecialistChange(e.target.value)}
          className="input-field"
        >
          <option value="">Seleccione un especialista</option>
          {specialists.map(specialist => (
            <option key={specialist.id} value={specialist.id}>
              {specialist.title} {specialist.firstName} {specialist.lastName} - {specialist.specialties?.map(s => s.name).join(', ')}
            </option>
          ))}
        </select>
      </div>

      {selectedSpecialist && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            Horario de {selectedSpecialist.title} {selectedSpecialist.firstName} {selectedSpecialist.lastName}
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Día
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hora Inicio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hora Término
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pacientes Simultáneos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ¿Dar Descanso?
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inicio Descanso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Término Descanso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Box Atención
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No Atiende
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modalidad
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
                    simultaneousPatients: 3,
                    interval: 15,
                    box: 'Box 1',
                    modality: 'both'
                  };

                  return (
                    <tr key={day.key} className={!daySchedule.isWorking ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {day.label}
                      </td>
                      
                      {/* Hora Inicio */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={daySchedule.startTime}
                          onChange={(e) => handleScheduleChange(day.key, 'startTime', e.target.value)}
                          disabled={!daySchedule.isWorking}
                          className="input-field text-sm"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </td>

                      {/* Hora Término */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={daySchedule.endTime}
                          onChange={(e) => handleScheduleChange(day.key, 'endTime', e.target.value)}
                          disabled={!daySchedule.isWorking}
                          className="input-field text-sm"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </td>

                      {/* Pacientes Simultáneos */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={daySchedule.simultaneousPatients}
                          onChange={(e) => handleScheduleChange(day.key, 'simultaneousPatients', parseInt(e.target.value))}
                          disabled={!daySchedule.isWorking}
                          className="input-field text-sm"
                        >
                          {[1, 2, 3, 4, 5].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </td>

                      {/* ¿Dar Descanso? */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={daySchedule.hasBreak}
                          onChange={(e) => handleScheduleChange(day.key, 'hasBreak', e.target.checked)}
                          disabled={!daySchedule.isWorking}
                          className="rounded border-gray-300"
                        />
                      </td>

                      {/* Inicio Descanso */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={daySchedule.breakStart}
                          onChange={(e) => handleScheduleChange(day.key, 'breakStart', e.target.value)}
                          disabled={!daySchedule.isWorking || !daySchedule.hasBreak}
                          className="input-field text-sm"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </td>

                      {/* Término Descanso */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={daySchedule.breakEnd}
                          onChange={(e) => handleScheduleChange(day.key, 'breakEnd', e.target.value)}
                          disabled={!daySchedule.isWorking || !daySchedule.hasBreak}
                          className="input-field text-sm"
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </td>

                      {/* Box Atención */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={daySchedule.box}
                          onChange={(e) => handleScheduleChange(day.key, 'box', e.target.value)}
                          disabled={!daySchedule.isWorking}
                          className="input-field text-sm"
                        >
                          {['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'].map(box => (
                            <option key={box} value={box}>{box}</option>
                          ))}
                        </select>
                      </td>

                      {/* No Atiende */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={!daySchedule.isWorking}
                          onChange={(e) => handleScheduleChange(day.key, 'isWorking', !e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </td>

                      {/* Modalidad */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getWorkingHoursText(daySchedule)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getModalityLabel(daySchedule.modality)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Información Adicional */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Información del Horario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <strong>Intervalo de Citas:</strong> 15 minutos por defecto
              </div>
              <div>
                <strong>Capacidad Simultánea:</strong> 3 pacientes por intervalo
              </div>
              <div>
                <strong>Modalidad:</strong> Presencial y Virtual disponible
              </div>
              <div>
                <strong>Descansos:</strong> Configurables por día
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedSpecialist && specialists.length > 0 && (
        <div className="card">
          <div className="text-center py-8">
            <span style={{ fontSize: '48px' }}>📅</span>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Seleccione un Especialista</h3>
            <p className="mt-1 text-sm text-gray-500">
              Elija un especialista para configurar su horario de atención.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialistSchedule; 