import React, { useState, useEffect } from 'react';
import { almacenApi } from '../../api/almacenApi';

export default function AlertasStock() {
  const [alertas, setAlertas] = useState([]);
  const [caducidades, setCaducidades] = useState([]);
  const [diasCaducidad, setDiasCaducidad] = useState(30);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarAlertas();
  }, [diasCaducidad]);

  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const [alertRes, cadRes] = await Promise.all([
        almacenApi.getAlertasStock(),
        almacenApi.getProductosCaducar(diasCaducidad)
      ]);
      setAlertas(alertRes.data);
      setCaducidades(cadRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div className="p-6 text-center">Cargando...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">⚠️ Alertas de Inventario</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock bajo */}
        <div>
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            📉 Stock Bajo
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {alertas.length}
            </span>
          </h3>
          {alertas.length === 0 ? (
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <p className="text-green-600">✅ No hay productos con stock bajo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.map(a => (
                <div key={`${a.tipo}-${a.id}`} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{a.nombre}</p>
                      <p className="text-xs text-gray-500">{a.tipo}</p>
                    </div>
                    <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-bold">
                      {a.stock_actual} / {a.stock_minimo}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        a.stock_actual === 0 ? 'bg-red-600' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.max(2, (a.stock_actual / a.stock_minimo) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Caducidades */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              ⏰ Caducidades Próximas
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                {caducidades.length}
              </span>
            </h3>
            <select
              value={diasCaducidad}
              onChange={e => setDiasCaducidad(parseInt(e.target.value))}
              className="border rounded p-1 text-sm"
            >
              <option value={7}>7 días</option>
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
          {caducidades.length === 0 ? (
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <p className="text-green-600">✅ Sin caducidades próximas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {caducidades.map(c => (
                <div key={c.id_entrada} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <p className="font-semibold">{c.producto_nombre}</p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-gray-500">Caduca:</span>
                      <p className="font-bold text-yellow-700">
                        {new Date(c.fecha_caducidad).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Días:</span>
                      <p className={`font-bold ${c.dias_restantes <= 7 ? 'text-red-600' : 'text-yellow-700'}`}>
                        {c.dias_restantes}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Stock:</span>
                      <p>{c.cantidad} {c.unidad}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}