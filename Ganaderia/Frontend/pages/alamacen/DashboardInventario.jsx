import React, { useState, useEffect } from 'react';
import { almacenApi } from '../../api/almacenApi';

export default function DashboardAlmacen() {
  const [dashboard, setDashboard] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [dashRes, estRes] = await Promise.all([
        almacenApi.getDashboard(),
        almacenApi.getEstadisticas(periodo)
      ]);
      setDashboard(dashRes.data);
      setEstadisticas(estRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div className="p-6 text-center">Cargando dashboard...</div>;
  if (!dashboard) return null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">📊 Dashboard de Almacén</h2>
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className="border rounded p-2"
        >
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="trimestre">Este trimestre</option>
          <option value="año">Este año</option>
        </select>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">📥 Entradas del periodo</p>
          <p className="text-3xl font-bold mt-2">{dashboard.entradas_periodo || 0}</p>
          <p className="text-sm mt-1 opacity-80">{dashboard.valor_entradas || '$0'}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">📤 Salidas del periodo</p>
          <p className="text-3xl font-bold mt-2">{dashboard.salidas_periodo || 0}</p>
          <p className="text-sm mt-1 opacity-80">{dashboard.valor_salidas || '$0'}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">⚠️ Productos stock bajo</p>
          <p className="text-3xl font-bold mt-2">{dashboard.productos_stock_bajo || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">🚫 Productos caducados</p>
          <p className="text-3xl font-bold mt-2">{dashboard.productos_caducados || 0}</p>
        </div>
      </div>

      {/* Productos con stock bajo */}
      {dashboard.stock_bajo?.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-3">⚠️ Productos con Stock Bajo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboard.stock_bajo.map(p => (
              <div key={p.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{p.tipo}</p>
                  </div>
                  <span className="text-orange-700 font-bold">
                    {p.stock_actual} / {p.stock_minimo}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${Math.min((p.stock_actual / p.stock_minimo) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumo reciente */}
      <div>
        <h3 className="font-semibold text-lg mb-3">📈 Consumo Reciente</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Producto</th>
                <th className="text-right p-3">Consumo total</th>
                <th className="text-right p-3">Promedio diario</th>
                <th className="text-right p-3">Días restantes</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.consumo_reciente?.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3 font-medium">{c.nombre}</td>
                  <td className="p-3 text-right">{c.consumo_total} {c.unidad}</td>
                  <td className="p-3 text-right">{c.promedio_diario} {c.unidad}</td>
                  <td className="p-3 text-right font-bold">
                    <span className={c.dias_restantes <= 7 ? 'text-red-600' : 'text-green-600'}>
                      {c.dias_restantes}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      c.dias_restantes <= 3 ? 'bg-red-100 text-red-800' :
                      c.dias_restantes <= 7 ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {c.dias_restantes <= 3 ? 'Crítico' : 
                       c.dias_restantes <= 7 ? 'Bajo' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}