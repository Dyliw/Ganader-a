import React, { useState, useEffect } from 'react';
import { medicamentosApi } from '../../api/medicamentosApi';

export default function AlertasCaducidad() {
  const [caducados, setCaducados] = useState([]);
  const [proximosCaducar, setProximosCaducar] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [diasAlerta, setDiasAlerta] = useState(30);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarAlertas();
  }, [diasAlerta]);

  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const [cadRes, proxRes, stockRes] = await Promise.all([
        medicamentosApi.getCaducados(),
        medicamentosApi.getProximosCaducar(diasAlerta),
        medicamentosApi.getStockBajo()
      ]);
      setCaducados(cadRes.data);
      setProximosCaducar(proxRes.data);
      setStockBajo(stockRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">⚠️ Alertas de Medicamentos</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Caducados */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 className="font-bold text-red-800 text-lg mb-3">
            🚫 Caducados ({caducados.length})
          </h3>
          {caducados.length === 0 ? (
            <p className="text-green-600">✅ No hay medicamentos caducados</p>
          ) : (
            <div className="space-y-2">
              {caducados.map(m => (
                <div key={m.id_medicamento} className="bg-white rounded p-3">
                  <p className="font-semibold">{m.nombre}</p>
                  <p className="text-sm text-red-600">
                    Caducó: {new Date(m.fecha_caducidad).toLocaleDateString()}
                  </p>
                  <p className="text-sm">Stock restante: {m.stock_actual}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos a caducar */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 className="font-bold text-orange-800 text-lg mb-3">
            ⏳ Próximos a caducar ({proximosCaducar.length})
          </h3>
          <div className="mb-3">
            <label className="text-sm">Alertar a:</label>
            <select
              value={diasAlerta}
              onChange={e => setDiasAlerta(parseInt(e.target.value))}
              className="ml-2 border rounded p-1 text-sm"
            >
              <option value={7}>7 días</option>
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
          {proximosCaducar.map(m => (
            <div key={m.id_medicamento} className="bg-white rounded p-3 mb-2">
              <p className="font-semibold">{m.nombre}</p>
              <p className="text-sm text-orange-600">
                Caduca: {new Date(m.fecha_caducidad).toLocaleDateString()}
              </p>
              <p className="text-xs">
                Quedan {m.dias_restantes} días — Stock: {m.stock_actual}
              </p>
            </div>
          ))}
        </div>

        {/* Stock bajo */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h3 className="font-bold text-yellow-800 text-lg mb-3">
            📉 Stock Bajo ({stockBajo.length})
          </h3>
          {stockBajo.map(m => (
            <div key={m.id_medicamento} className="bg-white rounded p-3 mb-2">
              <p className="font-semibold">{m.nombre}</p>
              <p className="text-sm text-yellow-700">
                Stock: {m.stock_actual} / Mínimo: {m.stock_minimo} {m.unidad_medida}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${Math.min((m.stock_actual / m.stock_minimo) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}