import React, { useState, useEffect } from 'react';
import { medicamentosApi } from '../../api/medicamentosApi';

export default function HistorialClinico() {
  const [tratamientos, setTratamientos] = useState([]);
  const [filtros, setFiltros] = useState({
    arete: '',
    desde: '',
    hasta: '',
    medicamento: '',
    pagina: 1
  });
  const [medicamentos, setMedicamentos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [totalPaginas, setTotalPaginas] = useState(1);

  useEffect(() => {
    medicamentosApi.getAll().then(res => setMedicamentos(res.data));
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [filtros]);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      let res;
      if (filtros.arete.trim()) {
        // Historial de un animal específico
        res = await medicamentosApi.getHistorialAnimal(filtros.arete.trim().toUpperCase());
        setTratamientos(Array.isArray(res.data) ? res.data : []);
        setTotalPaginas(1);
      } else {
        // Historial general
        res = await medicamentosApi.getHistorialGeneral(filtros);
        setTratamientos(res.data.tratamientos || []);
        setTotalPaginas(res.data.total_paginas || 1);
      }
    } catch (error) {
      console.error('Error:', error);
      setTratamientos([]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">📋 Historial Clínico</h2>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Arete (opcional)"
            value={filtros.arete}
            onChange={e => setFiltros({...filtros, arete: e.target.value, pagina: 1})}
            className="border rounded p-2 uppercase"
          />

          <input
            type="date"
            value={filtros.desde}
            onChange={e => setFiltros({...filtros, desde: e.target.value, pagina: 1})}
            className="border rounded p-2"
          />

          <input
            type="date"
            value={filtros.hasta}
            onChange={e => setFiltros({...filtros, hasta: e.target.value, pagina: 1})}
            className="border rounded p-2"
          />

          <select
            value={filtros.medicamento}
            onChange={e => setFiltros({...filtros, medicamento: e.target.value, pagina: 1})}
            className="border rounded p-2"
          >
            <option value="">Todos los medicamentos</option>
            {medicamentos.map(m => (
              <option key={m.id_medicamento} value={m.id_medicamento}>{m.nombre}</option>
            ))}
          </select>

          <button
            onClick={() => setFiltros({ arete: '', desde: '', hasta: '', medicamento: '', pagina: 1 })}
            className="bg-gray-200 hover:bg-gray-300 rounded p-2"
          >
            🔄 Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Arete</th>
              <th className="text-left p-3">Medicamento</th>
              <th className="text-right p-3">Dosis</th>
              <th className="text-left p-3">Aplicado por</th>
              <th className="text-center p-3">Retiro</th>
              <th className="text-left p-3">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {tratamientos.map(t => (
              <tr key={t.id_tratamiento} className="border-t hover:bg-gray-50">
                <td className="p-3 text-sm">
                  {new Date(t.fecha_aplicacion).toLocaleDateString()}
                </td>
                <td className="p-3 font-medium">{t.arete}</td>
                <td className="p-3">{t.medicamento_nombre}</td>
                <td className="p-3 text-right">{t.dosis_aplicada}</td>
                <td className="p-3 text-sm">{t.empleado_nombre}</td>
                <td className="p-3 text-center">
                  {t.fecha_disponible && new Date(t.fecha_disponible) > new Date() ? (
                    <span className="text-orange-600 text-xs">
                      Hasta {new Date(t.fecha_disponible).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-green-600 text-xs">✓</span>
                  )}
                </td>
                <td className="p-3 text-sm text-gray-500 max-w-xs truncate">
                  {t.observaciones || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tratamientos.length === 0 && !cargando && (
        <div className="text-center py-10 text-gray-400">
          No se encontraron tratamientos
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              onClick={() => setFiltros({...filtros, pagina: i + 1})}
              className={`px-3 py-1 rounded ${
                filtros.pagina === i + 1 ? 'bg-teal-600 text-white' : 'bg-gray-200'
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