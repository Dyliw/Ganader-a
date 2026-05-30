import React, { useState, useEffect } from 'react';
import { reportesApi } from '../../api/reportesApi';

export default function RentabilidadLote() {
  const [lotes, setLotes] = useState([]);
  const [loteSeleccionado, setLoteSeleccionado] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportesApi.getLotes()
      .then(res => setLotes(res.data))
      .catch(() => setLotes([]));
  }, []);

  const cargarRentabilidad = async () => {
    if (!loteSeleccionado) return;
    setCargando(true);
    setError(null);
    try {
      const res = await reportesApi.getRentabilidadLote(loteSeleccionado);
      setDatos(res.data);
    } catch (err) {
      setError('Error al cargar datos del lote');
      setDatos(null);
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarPDF = async () => {
    if (!loteSeleccionado) return;
    try {
      const res = await reportesApi.generarPDF('rentabilidad-lote', { id_lote: loteSeleccionado });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `rentabilidad-lote-${loteSeleccionado}.pdf`;
      link.click();
    } catch (err) {
      alert('Error al generar PDF');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">💰 Rentabilidad por Lote</h2>
        <button
          onClick={handleDescargarPDF}
          disabled={!loteSeleccionado}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          📄 Descargar PDF
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <select
          value={loteSeleccionado}
          onChange={e => setLoteSeleccionado(e.target.value)}
          className="border rounded p-2 flex-1"
        >
          <option value="">Seleccione un lote...</option>
          {lotes.map(l => (
            <option key={l.id_lote} value={l.id_lote}>
              {l.nombre} — {new Date(l.fecha_creacion).toLocaleDateString()}
            </option>
          ))}
        </select>
        <button
          onClick={cargarRentabilidad}
          disabled={!loteSeleccionado || cargando}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {cargando ? '⏳ Cargando...' : '🔍 Analizar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      {datos ? (
        <div>
          {/* KPIs de rentabilidad */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-5">
              <p className="text-sm opacity-90">Costo Total</p>
              <p className="text-2xl font-bold">${datos.costo_total?.toFixed(2) || '0'}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-5">
              <p className="text-sm opacity-90">Ingreso Total</p>
              <p className="text-2xl font-bold">${datos.ingreso_total?.toFixed(2) || '0'}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-5">
              <p className="text-sm opacity-90">Ganancia Neta</p>
              <p className="text-2xl font-bold">${datos.ganancia_neta?.toFixed(2) || '0'}</p>
            </div>
            <div className={`bg-gradient-to-br text-white rounded-lg p-5 ${
              (datos.margen_porcentaje || 0) > 0 
                ? 'from-emerald-500 to-emerald-600' 
                : 'from-red-500 to-red-600'
            }`}>
              <p className="text-sm opacity-90">Margen</p>
              <p className="text-2xl font-bold">{datos.margen_porcentaje?.toFixed(1) || '0'}%</p>
            </div>
          </div>

          {/* Desglose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">📈 Desglose de Costos</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Compra de animales</span>
                  <span className="font-semibold">${datos.costo_compra?.toFixed(2) || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alimentación</span>
                  <span className="font-semibold">${datos.costo_alimentacion?.toFixed(2) || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tratamientos</span>
                  <span className="font-semibold">${datos.costo_tratamientos?.toFixed(2) || '0'}</span>
                </div>
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${datos.costo_total?.toFixed(2) || '0'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">📊 Resumen del Lote</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Animales iniciales</span>
                  <span className="font-semibold">{datos.animales_iniciales || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Animales vendidos</span>
                  <span className="font-semibold text-green-600">{datos.animales_vendidos || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Animales muertos</span>
                  <span className="font-semibold text-red-600">{datos.animales_muertos || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Peso total vendido</span>
                  <span className="font-semibold">{datos.peso_total_vendido || 0} kg</span>
                </div>
                <div className="flex justify-between">
                  <span>Precio promedio/kg</span>
                  <span className="font-semibold">${datos.precio_promedio_kg?.toFixed(2) || '0'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : lotes.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-400">No hay lotes registrados. Cree lotes para ver su rentabilidad.</p>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-400">Seleccione un lote y presione "Analizar"</p>
        </div>
      )}
    </div>
  );
}