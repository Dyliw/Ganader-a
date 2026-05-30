import React, { useState } from 'react';
import { reportesApi } from '../../api/reportesApi';

export default function AnimalesCausa() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [totalMuertes, setTotalMuertes] = useState(0);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await reportesApi.getAnimalesPorCausa({ desde, hasta });
      setDatos(res.data);
      setTotalMuertes(res.data.reduce((sum, d) => sum + d.cantidad, 0));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await reportesApi.generarPDF('animales-causa', { desde, hasta });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'animales-causa-muerte.pdf';
      link.click();
    } catch (err) {
      alert('Error al generar PDF');
    }
  };

  const colores = [
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
    'bg-green-500', 'bg-indigo-500'
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">🏥 Animales por Causa de Muerte</h2>
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
          onClick={cargarDatos}
          disabled={cargando}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {cargando ? '⏳...' : '🔍 Consultar'}
        </button>
        <button
          onClick={() => { setDesde(''); setHasta(''); setDatos(null); }}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
        >
          🔄 Limpiar
        </button>
      </div>

      {datos && datos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tabla */}
          <div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Causa</th>
                  <th className="text-right p-3">Cantidad</th>
                  <th className="text-right p-3">%</th>
                  <th className="text-right p-3">Edad prom.</th>
                  <th className="text-right p-3">Peso prom.</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((d, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{d.causa_muerte || 'No especificada'}</td>
                    <td className="p-3 text-right font-bold">{d.cantidad}</td>
                    <td className="p-3 text-right">
                      {totalMuertes > 0 ? ((d.cantidad / totalMuertes) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="p-3 text-right">{d.edad_promedio}</td>
                    <td className="p-3 text-right">{d.peso_promedio} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-semibold mb-4">📊 Distribución de Causas</h3>
            <div className="space-y-3">
              {datos.map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{d.causa_muerte || 'No especificada'}</span>
                    <span className="font-semibold">{d.cantidad}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className={`h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${colores[i % colores.length]}`}
                      style={{ width: `${Math.max(5, (d.cantidad / totalMuertes) * 100)}%` }}
                    >
                      {((d.cantidad / totalMuertes) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Total de muertes registradas:</strong> {totalMuertes}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {desde && hasta ? `Período: ${desde} al ${hasta}` : 'Todos los registros'}
              </p>
            </div>
          </div>
        </div>
      ) : datos && datos.length === 0 ? (
        <div className="text-center py-10 bg-green-50 rounded-lg">
          <p className="text-green-600">✅ No se encontraron muertes en el período seleccionado</p>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-400">Seleccione un período y presione Consultar</p>
        </div>
      )}
    </div>
  );
}