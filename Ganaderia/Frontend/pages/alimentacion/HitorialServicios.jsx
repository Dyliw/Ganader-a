import React, { useState, useEffect } from 'react';
import { alimentacionApi } from '../../api/alimentacionApi';
import { corralesApi } from '../../api/corralesApi';

export default function HistorialServicios() {
  const [servicios, setServicios] = useState([]);
  const [corrales, setCorrales] = useState([]);
  const [filtros, setFiltros] = useState({
    corral: '',
    fecha_desde: '',
    fecha_hasta: '',
    pagina: 1
  });
  const [cargando, setCargando] = useState(false);
  const [totalPaginas, setTotalPaginas] = useState(1);

  useEffect(() => {
    corralesApi.getAll().then(res => setCorrales(res.data));
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [filtros]);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const res = await alimentacionApi.getHistorial(filtros);
      setServicios(res.data.servicios);
      setTotalPaginas(res.data.total_paginas);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const cambiarFiltro = (key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value, pagina: 1 }));
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">📋 Historial de Servicios</h2>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filtros.corral}
            onChange={e => cambiarFiltro('corral', e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Todos los corrales</option>
            {corrales.map(c => (
              <option key={c.id_corral} value={c.id_corral}>{c.nombre}</option>
            ))}
          </select>

          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={e => cambiarFiltro('fecha_desde', e.target.value)}
            className="border rounded p-2"
            placeholder="Desde"
          />

          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={e => cambiarFiltro('fecha_hasta', e.target.value)}
            className="border rounded p-2"
            placeholder="Hasta"
          />

          <button
            onClick={() => setFiltros({ corral: '', fecha_desde: '', fecha_hasta: '', pagina: 1 })}
            className="bg-gray-200 hover:bg-gray-300 rounded p-2 text-sm"
          >
            🔄 Limpiar filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Corral</th>
              <th className="text-left p-3">Dieta</th>
              <th className="text-right p-3">Cantidad (kg)</th>
              <th className="text-left p-3">Servido por</th>
              <th className="text-left p-3">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map(s => (
              <tr key={s.id_servicios} className="border-t hover:bg-gray-50">
                <td className="p-3">{formatearFecha(s.fecha_servicio)}</td>
                <td className="p-3 font-medium">{s.corral_nombre}</td>
                <td className="p-3">{s.dieta_nombre}</td>
                <td className="p-3 text-right font-bold">{s.cantidad_kg} kg</td>
                <td className="p-3">{s.empleado_nombre}</td>
                <td className="p-3 text-sm text-gray-500">
                  {s.observaciones || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {servicios.length === 0 && !cargando && (
        <div className="text-center py-10 text-gray-400">
          No hay servicios registrados
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              onClick={() => cambiarFiltro('pagina', i + 1)}
              className={`px-3 py-1 rounded ${
                filtros.pagina === i + 1 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}