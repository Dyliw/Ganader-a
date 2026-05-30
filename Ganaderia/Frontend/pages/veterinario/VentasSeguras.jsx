import React, { useState, useEffect } from 'react';
import { medicamentosApi } from '../../api/medicamentosApi';

export default function VentasSeguras() {
  const [disponibles, setDisponibles] = useState([]);
  const [enRetiro, setEnRetiro] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [dispRes, retiroRes] = await Promise.all([
        medicamentosApi.getAnimalesDisponiblesVenta(),
        medicamentosApi.getAnimalesEnRetiro()
      ]);
      setDisponibles(dispRes.data);
      setEnRetiro(retiroRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">🛒 Animales Listos para Venta</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disponibles para venta */}
        <div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
            <h3 className="font-bold text-green-800 text-lg">
              ✅ Disponibles ({disponibles.length})
            </h3>
            <p className="text-sm text-green-600">Sin periodo de retiro activo</p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {disponibles.map(a => (
              <div key={a.arete} className="bg-white border rounded-lg p-3 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-semibold">{a.arete}</p>
                  <p className="text-sm text-gray-500">
                    {a.clasificacion} | {a.peso_actual || a.peso_entrada} kg
                  </p>
                </div>
                <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                  💰 Vender
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* En retiro (no vender) */}
        <div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 mb-4">
            <h3 className="font-bold text-orange-800 text-lg">
              🚫 En Retiro ({enRetiro.length})
            </h3>
            <p className="text-sm text-orange-600">No se pueden vender hasta cumplir el periodo</p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {enRetiro.map(a => (
              <div key={a.arete} className="bg-white border border-orange-200 rounded-lg p-3">
                <div className="flex justify-between">
                  <p className="font-semibold">{a.arete}</p>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    {a.dias_restantes} días restantes
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {a.clasificacion} | {a.peso_actual || a.peso_entrada} kg
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Disponible desde: {new Date(a.fecha_disponible).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400">
                  Último tratamiento: {a.medicamento_nombre}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}