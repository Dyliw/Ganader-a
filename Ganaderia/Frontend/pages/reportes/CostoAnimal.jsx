import React, { useState } from 'react';
import { reportesApi } from '../../api/reportesApi';

export default function CostoAnimal() {
  const [arete, setArete] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const buscarCosto = async (e) => {
    e.preventDefault();
    if (!arete.trim()) return;
    
    setCargando(true);
    setError(null);
    setDatos(null);
    
    try {
      const res = await reportesApi.getCostoAnimal(arete.trim().toUpperCase());
      setDatos(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Animal no encontrado');
      } else {
        setError('Error al consultar');
      }
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarPDF = async () => {
    if (!arete.trim()) return;
    try {
      const res = await reportesApi.generarPDF('costo-animal', { arete: arete.trim().toUpperCase() });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `costo-${arete}.pdf`;
      link.click();
    } catch (err) {
      alert('Error al generar PDF');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">💲 Costo Acumulado por Animal</h2>
        <button
          onClick={handleDescargarPDF}
          disabled={!datos}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          📄 Descargar PDF
        </button>
      </div>

      <form onSubmit={buscarCosto} className="flex gap-4 mb-6">
        <input
          type="text"
          value={arete}
          onChange={e => setArete(e.target.value.toUpperCase())}
          placeholder="Ingrese el arete del animal..."
          className="flex-1 border rounded p-2 uppercase"
          required
        />
        <button
          type="submit"
          disabled={cargando}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {cargando ? '⏳...' : '🔍 Buscar'}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      {datos && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-lg">{datos.arete}</h3>
            <p className="text-sm text-gray-500">
              Proveedor: {datos.proveedor || 'N/A'} | 
              {datos.meses_en_granja} meses en granja
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded text-center">
              <p className="text-sm text-gray-500">Costo Compra</p>
              <p className="text-2xl font-bold">${datos.costo_compra}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded text-center">
              <p className="text-sm text-gray-500">Costo Alimentación</p>
              <p className="text-2xl font-bold">${datos.costo_alimentacion}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded text-center">
              <p className="text-sm text-gray-500">Costo Tratamientos</p>
              <p className="text-2xl font-bold">${datos.costo_tratamientos}</p>
            </div>
            <div className="bg-green-50 p-4 rounded text-center border-2 border-green-300">
              <p className="text-sm text-gray-500">COSTO TOTAL</p>
              <p className="text-2xl font-bold text-green-700">${datos.costo_total}</p>
            </div>
          </div>

          {/* Gráfica visual */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">📊 Distribución de Costos</h3>
            <div className="flex h-8 rounded-full overflow-hidden">
              {datos.costo_total > 0 && (
                <>
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs"
                    style={{ width: `${(datos.costo_compra / datos.costo_total) * 100}%` }}
                  >
                    {((datos.costo_compra / datos.costo_total) * 100).toFixed(0)}%
                  </div>
                  <div
                    className="bg-orange-500 flex items-center justify-center text-white text-xs"
                    style={{ width: `${(datos.costo_alimentacion / datos.costo_total) * 100}%` }}
                  >
                    {((datos.costo_alimentacion / datos.costo_total) * 100).toFixed(0)}%
                  </div>
                  <div
                    className="bg-purple-500 flex items-center justify-center text-white text-xs"
                    style={{ width: `${(datos.costo_tratamientos / datos.costo_total) * 100}%` }}
                  >
                    {((datos.costo_tratamientos / datos.costo_total) * 100).toFixed(0)}%
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-6 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>Compra</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span>Alimentación</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span>Tratamientos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!datos && !error && (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-400">Busque un animal por su arete</p>
        </div>
      )}
    </div>
  );
}