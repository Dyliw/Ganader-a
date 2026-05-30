import React, { useState, useEffect } from 'react';
import { medicamentosApi } from '../../api/medicamentosApi';

export default function AnimalesEnRetiro() {
  const [animales, setAnimales] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    medicamentosApi.getAnimalesEnRetiro()
      .then(res => setAnimales(res.data))
      .finally(() => setCargando(false));
  }, []);

  const getColorDias = (dias) => {
    if (dias <= 3) return 'bg-red-100 text-red-800';
    if (dias <= 7) return 'bg-orange-100 text-orange-800';
    if (dias <= 14) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (cargando) return <div className="p-6 text-center">Cargando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">🚫 Animales en Periodo de Retiro</h2>
        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-bold">
          {animales.length} animales
        </span>
      </div>

      {animales.length === 0 ? (
        <div className="text-center py-10 text-green-600 bg-green-50 rounded-lg">
          <p className="text-2xl">✅</p>
          <p className="font-semibold">No hay animales en periodo de retiro</p>
          <p className="text-sm text-gray-500">Todos los animales están disponibles para venta</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {animales.map(a => (
            <div key={a.arete} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-lg">{a.arete}</p>
                  <p className="text-sm text-gray-500">
                    {a.clasificacion} | {a.sexo === 'macho' ? '♂️' : '♀️'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getColorDias(a.dias_restantes)}`}>
                  {a.dias_restantes} días
                </span>
              </div>

              <div className="text-sm space-y-1">
                <p>📦 Peso: <strong>{a.peso_actual} kg</strong></p>
                <p>🏠 Corral: {a.corral_nombre || 'Sin asignar'}</p>
                <p>💊 Tratamiento: <strong>{a.medicamento_nombre}</strong></p>
                <p className="text-orange-600 font-medium">
                  ⚠️ Disponible desde: {new Date(a.fecha_disponible).toLocaleDateString()}
                </p>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      a.dias_restantes <= 3 ? 'bg-red-500' : 
                      a.dias_restantes <= 7 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.max(5, (a.dias_restantes / 28) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {a.dias_restantes <= 1 
                    ? 'Disponible mañana' 
                    : `Faltan ${a.dias_restantes} días`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}