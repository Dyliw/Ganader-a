import React, { useState, useEffect } from 'react';
import { reportesApi } from '../../api/reportesApi';

export default function ConsumoAlimento() {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  
  const [desde, setDesde] = useState(inicioMes.toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(hoy.toISOString().split('T')[0]);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargarConsumo = async () => {
    if (!desde || !hasta) return;
    setCargando(true);
    try {
      const res = await reportesApi.getConsumoAlimento(desde, hasta);
      setDatos(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarConsumo();
  }, []);

  const handleDescargarPDF = async () => {
    try {
      const res = await reportesApi.generarPDF('consumo-alimento', { desde, hasta });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `consumo-${desde}-${hasta}.pdf`;
      link.click();
    } catch (err) {
      alert('Error al generar PDF');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">🍽️ Consumo de Alimento</h2>
        <button onClick={handleDescargarPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          📄 Descargar PDF
        </button>
      </div>

      <div className="flex gap-4 items-end mb-6">
        <div>
          <label className="block text-sm font-semibold mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={e => setDesde(e.target.value)}
            className="border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={e => setHasta(e.target.value)}
            className="border rounded p-2"
          />
        </div>
        <button
          onClick={cargarConsumo}
          disabled={cargando}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {cargando ? '⏳...' : '🔍 Consultar'}
        </button>
      </div>

      {datos ? (
        <div>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-orange-50 p-4 rounded border border-orange-200">
              <p className="text-sm text-gray-500">Total Servido</p>
              <p className="text-3xl font-bold text-orange-700">{datos.total_kg || 0} kg</p>
            </div>
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <p className="text-sm text-gray-500">Servicios Realizados</p>
              <p className="text-3xl font-bold text-blue-700">{datos.total_servicios || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p className="text-sm text-gray-500">Costo Total</p>
              <p className="text-3xl font-bold text-green-700">${datos.costo_total?.toFixed(2) || '0'}</p>
            </div>
          </div>

          {/* Consumo por corral */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Corral</th>
                  <th className="text-right p-3">Total kg</th>
                  <th className="text-right p-3">Servicios</th>
                  <th className="text-right p-3">Promedio diario</th>
                  <th className="text-right p-3">Costo</th>
                </tr>
              </thead>
              <tbody>
                {datos.por_corral?.map((c, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.corral}</td>
                    <td className="p-3 text-right">{c.total_kg} kg</td>
                    <td className="p-3 text-right">{c.servicios}</td>
                    <td className="p-3 text-right">{c.promedio_diario} kg</td>
                    <td className="p-3 text-right">${c.costo?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          {cargando ? 'Cargando...' : 'Seleccione un período y presione Consultar'}
        </div>
      )}
    </div>
  );
}