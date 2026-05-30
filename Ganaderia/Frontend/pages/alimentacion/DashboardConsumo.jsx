import React, { useState, useEffect } from 'react';
import { alimentacionApi } from '../../api/alimentacionApi';
import { corralesApi } from '../../api/corralesApi';

export default function DashboardConsumo() {
  const [resumen, setResumen] = useState([]);
  const [corrales, setCorrales] = useState([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [corralSeleccionado, setCorralSeleccionado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [consumoSemanal, setConsumoSemanal] = useState([]);

  useEffect(() => {
    corralesApi.getAll().then(res => setCorrales(res.data || []));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [fecha, corralSeleccionado]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar resumen del día
      const resResumen = await alimentacionApi.getResumenConsumo(fecha);
      setResumen(resResumen.data || []);

      // Cargar consumo semanal
      const resSemanal = await alimentacionApi.getResumenConsumo(); // últimos 7 días
      setConsumoSemanal(resSemanal.data || []);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      setResumen([]);
      setConsumoSemanal([]);
    } finally {
      setCargando(false);
    }
  };

  // Calcular totales
  const totalKg = resumen.reduce((sum, r) => sum + (r.total_kg || 0), 0);
  const totalServicios = resumen.reduce((sum, r) => sum + (r.servicios || 0), 0);
  const corralesServidos = resumen.length;

  // Filtrar por corral seleccionado
  const datosFiltrados = corralSeleccionado
    ? resumen.filter(r => r.corral === corralSeleccionado)
    : resumen;

  if (cargando) return <div className="p-6 text-center">Cargando dashboard...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">📊 Dashboard de Consumo</h2>
        <div className="flex gap-3">
          <select
            value={corralSeleccionado}
            onChange={e => setCorralSeleccionado(e.target.value)}
            className="border rounded p-2 text-sm"
          >
            <option value="">Todos los corrales</option>
            {corrales.map(c => (
              <option key={c.id_corral} value={c.nombre}>{c.nombre}</option>
            ))}
          </select>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border rounded p-2 text-sm"
          />
        </div>
      </div>

      {/* KPIs del día */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">🍽️ Total Servido Hoy</p>
          <p className="text-3xl font-bold mt-2">{totalKg.toFixed(1)} kg</p>
          <p className="text-xs mt-1 opacity-80">
            {new Date(fecha).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">📋 Servicios Realizados</p>
          <p className="text-3xl font-bold mt-2">{totalServicios}</p>
          <p className="text-xs mt-1 opacity-80">Corrales servidos: {corralesServidos}</p>
        </div>

        <div className="bg-gradient-to-br from-green-400 to-green-500 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">🏠 Corrales con Servicio</p>
          <p className="text-3xl font-bold mt-2">{corralesServidos}</p>
          <p className="text-xs mt-1 opacity-80">
            De {corrales.length} corrales totales
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-lg p-5">
          <p className="text-sm opacity-90">⚖️ Promedio por Corral</p>
          <p className="text-3xl font-bold mt-2">
            {corralesServidos > 0 ? (totalKg / corralesServidos).toFixed(1) : '0'} kg
          </p>
          <p className="text-xs mt-1 opacity-80">Por corral servido</p>
        </div>
      </div>

      {/* Tabla de consumo por corral */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg mb-3">📋 Consumo por Corral - {fecha}</h3>
        
        {datosFiltrados.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              {corralSeleccionado 
                ? `No hay servicios registrados para ${corralSeleccionado} en esta fecha` 
                : 'No hay servicios registrados en esta fecha'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Corral</th>
                  <th className="text-left p-3">Dieta</th>
                  <th className="text-center p-3">Servicios</th>
                  <th className="text-right p-3">Total (kg)</th>
                  <th className="text-right p-3">% del Total</th>
                  <th className="p-3">Barra</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((r, i) => {
                  const porcentaje = totalKg > 0 ? ((r.total_kg / totalKg) * 100) : 0;
                  return (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{r.corral}</td>
                      <td className="p-3 text-sm">{r.dieta || '-'}</td>
                      <td className="p-3 text-center">{r.servicios}</td>
                      <td className="p-3 text-right font-bold">{r.total_kg} kg</td>
                      <td className="p-3 text-right">{porcentaje.toFixed(1)}%</td>
                      <td className="p-3 w-48">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-orange-500 h-3 rounded-full"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td className="p-3">TOTAL</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-center">{totalServicios}</td>
                  <td className="p-3 text-right">{totalKg.toFixed(1)} kg</td>
                  <td className="p-3 text-right">100%</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Gráfica de consumo semanal (barras simple con CSS) */}
      <div>
        <h3 className="font-semibold text-lg mb-3">📈 Tendencia de Consumo - Últimos 7 Días</h3>
        
        <div className="bg-white border rounded-lg p-6">
          {consumoSemanal.length === 0 ? (
            <p className="text-gray-400 text-center">Sin datos disponibles</p>
          ) : (
            <div className="flex items-end justify-around h-48 gap-2">
              {consumoSemanal.map((d, i) => {
                const maxKg = Math.max(...consumoSemanal.map(d => d.total_kg || 0), 1);
                const altura = ((d.total_kg || 0) / maxKg) * 100;
                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <span className="text-xs font-bold mb-1">
                      {d.total_kg?.toFixed(0) || '0'} kg
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t"
                      style={{ height: `${altura}%`, minHeight: '4px' }}
                    />
                    <span className="text-xs text-gray-500 mt-2 text-center">
                      {d.corral || 'Día ' + (i + 1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Corrales sin servicio hoy */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-3">⚠️ Corrales Sin Servicio Hoy</h3>
          {corrales.filter(c => !resumen.find(r => r.corral === c.nombre)).length === 0 ? (
            <p className="text-green-600">✅ Todos los corrales fueron servidos</p>
          ) : (
            <ul className="space-y-1">
              {corrales
                .filter(c => !resumen.find(r => r.corral === c.nombre))
                .map(c => (
                  <li key={c.id_corral} className="flex items-center gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <span>{c.nombre}</span>
                    <span className="text-sm text-gray-400">
                      ({c.ocupacion || 0} animales)
                    </span>
                  </li>
                ))
              }
            </ul>
          )}
        </div>

        {/* Dietas más usadas */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3">🥗 Dietas Utilizadas Hoy</h3>
          {resumen.length === 0 ? (
            <p className="text-gray-400">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {[...new Set(resumen.map(r => r.dieta).filter(Boolean))].map(dieta => {
                const kgDieta = resumen
                  .filter(r => r.dieta === dieta)
                  .reduce((sum, r) => sum + (r.total_kg || 0), 0);
                return (
                  <div key={dieta} className="flex justify-between items-center">
                    <span className="text-sm">{dieta}</span>
                    <span className="font-semibold text-blue-700">{kgDieta.toFixed(1)} kg</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}