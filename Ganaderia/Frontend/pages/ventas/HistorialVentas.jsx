import React, { useState, useEffect } from 'react';
import { ventasApi } from '../../api/ventasApi';

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [compradores, setCompradores] = useState([]);
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    comprador: '',
    pagina: 1
  });
  const [cargando, setCargando] = useState(false);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  useEffect(() => {
    ventasApi.getCompradores().then(res => setCompradores(res.data));
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [filtros]);

  const cargarVentas = async () => {
    setCargando(true);
    try {
      const res = await ventasApi.getVentas(filtros);
      setVentas(res.data.ventas || []);
      setTotalPaginas(res.data.total_paginas || 1);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const res = await ventasApi.getDetalleVenta(id);
      setVentaSeleccionada(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await ventasApi.generarPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      alert('Error al generar PDF');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">📋 Historial de Ventas</h2>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={e => setFiltros({...filtros, fecha_desde: e.target.value, pagina: 1})}
            className="border rounded p-2"
            placeholder="Desde"
          />
          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={e => setFiltros({...filtros, fecha_hasta: e.target.value, pagina: 1})}
            className="border rounded p-2"
            placeholder="Hasta"
          />
          <select
            value={filtros.comprador}
            onChange={e => setFiltros({...filtros, comprador: e.target.value, pagina: 1})}
            className="border rounded p-2"
          >
            <option value="">Todos los compradores</option>
            {compradores.map(c => (
              <option key={c.id_comprador} value={c.id_comprador}>{c.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => setFiltros({ fecha_desde: '', fecha_hasta: '', comprador: '', pagina: 1 })}
            className="bg-gray-200 rounded p-2 hover:bg-gray-300"
          >
            🔄 Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de ventas */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Comprador</th>
              <th className="text-right p-3">Animales</th>
              <th className="text-right p-3">Peso Total</th>
              <th className="text-right p-3">Precio/kg</th>
              <th className="text-right p-3">Total</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={v.id_venta} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">#{v.id_venta}</td>
                <td className="p-3 text-sm">{new Date(v.fecha_venta).toLocaleDateString()}</td>
                <td className="p-3">{v.comprador}</td>
                <td className="p-3 text-right">{v.cantidad_animales}</td>
                <td className="p-3 text-right">{v.peso_total} kg</td>
                <td className="p-3 text-right">${v.precio_kg}</td>
                <td className="p-3 text-right font-bold text-emerald-700">${v.total}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => verDetalle(v.id_venta)}
                    className="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => descargarPDF(v.id_venta)}
                    className="text-red-600 hover:text-red-800"
                  >
                    📄
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ventas.length === 0 && !cargando && (
        <div className="text-center py-10 text-gray-400">
          No se encontraron ventas
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              onClick={() => setFiltros({...filtros, pagina: i + 1})}
              className={`px-3 py-1 rounded ${
                filtros.pagina === i + 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal detalle de venta */}
      {ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detalle Venta #{ventaSeleccionada.venta.id_venta}</h2>
              <button onClick={() => setVentaSeleccionada(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-bold">{new Date(ventaSeleccionada.venta.fecha_venta).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Comprador</p>
                <p className="font-bold">{ventaSeleccionada.venta.comprador}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Peso total</p>
                <p className="font-bold">{ventaSeleccionada.venta.peso_total} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Precio/kg</p>
                <p className="font-bold">${ventaSeleccionada.venta.precio_kg}</p>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Animales Vendidos</h3>
            <table className="w-full mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Arete</th>
                  <th className="text-left p-2">Clasificación</th>
                  <th className="text-right p-2">Peso</th>
                  <th className="text-right p-2">Precio</th>
                </tr>
              </thead>
              <tbody>
                {ventaSeleccionada.animales?.map(a => (
                  <tr key={a.arete} className="border-t">
                    <td className="p-2 font-medium">{a.arete}</td>
                    <td className="p-2 text-sm">{a.clasificacion}</td>
                    <td className="p-2 text-right">{a.peso} kg</td>
                    <td className="p-2 text-right">${a.precio}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan="3" className="p-2 text-right">TOTAL:</td>
                  <td className="p-2 text-right text-emerald-700">${ventaSeleccionada.venta.total}</td>
                </tr>
              </tfoot>
            </table>

            <button
              onClick={() => descargarPDF(ventaSeleccionada.venta.id_venta)}
              className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
            >
              📄 Descargar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}