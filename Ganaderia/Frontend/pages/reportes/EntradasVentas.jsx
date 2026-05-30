import React, { useState } from 'react';
import { reportesApi } from '../../api/reportesApi';

export default function EntradasVentas() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const cargarEntradasVentas = async () => {
    setCargando(true);
    try {
      const res = await reportesApi.getEntradasVentas(mes, anio);
      setDatos(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await reportesApi.generarPDF('entradas-ventas', { mes, anio });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `entradas-ventas-${mes}-${anio}.pdf`;
      link.click();
    } catch (err) {
      alert('Error al generar PDF');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">📊 Entradas y Ventas por Mes</h2>
        <button onClick={handleDescargarPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          📄 Descargar PDF
        </button>
      </div>

      <div className="flex gap-4 items-end mb-6">
        <div>
          <label className="block text-sm font-semibold mb-1">Mes</label>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="border rounded p-2">
            {meses.map((nombre, i) => (
              <option key={i} value={i + 1}>{nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Año</label>
          <input
            type="number"
            value={anio}
            onChange={e => setAnio(parseInt(e.target.value))}
            className="border rounded p-2 w-24"
          />
        </div>
        <button
          onClick={cargarEntradasVentas}
          disabled={cargando}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {cargando ? '⏳...' : '🔍 Consultar'}
        </button>
      </div>

      {datos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Entradas */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-green-700 mb-3">📥 Entradas de Animales</h3>
            <div className="text-4xl font-bold text-green-600 mb-4">{datos.entradas_animales || 0}</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Costo total compras</span>
                <span className="font-semibold">${datos.costo_compras?.toFixed(2) || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Entradas almacén</span>
                <span className="font-semibold">${datos.entradas_almacen?.toFixed(2) || '0'}</span>
              </div>
            </div>
          </div>

          {/* Ventas */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-blue-700 mb-3">📤 Ventas</h3>
            <div className="text-4xl font-bold text-blue-600 mb-4">{datos.ventas_animales || 0}</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Ingreso total</span>
                <span className="font-semibold">${datos.ingreso_ventas?.toFixed(2) || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Peso total vendido</span>
                <span className="font-semibold">{datos.peso_vendido || 0} kg</span>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="md:col-span-2 border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3">💰 Balance del Mes</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="text-xl font-bold text-green-600">${datos.ingreso_ventas?.toFixed(2) || '0'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Egresos</p>
                <p className="text-xl font-bold text-red-600">${datos.costo_compras?.toFixed(2) || '0'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance</p>
                <p className={`text-xl font-bold ${(datos.balance || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${datos.balance?.toFixed(2) || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          {cargando ? 'Cargando...' : 'Seleccione mes y año, luego presione Consultar'}
        </div>
      )}
    </div>
  );
}