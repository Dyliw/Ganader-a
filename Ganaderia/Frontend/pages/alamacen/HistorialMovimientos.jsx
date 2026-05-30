import React, { useState, useEffect } from 'react';
import { almacenApi } from '../../api/almacenApi';

export default function HistorialMovimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({
    producto_id: '',
    tipo_movimiento: '',
    fecha_desde: '',
    fecha_hasta: '',
    pagina: 1
  });
  const [cargando, setCargando] = useState(false);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [filtros]);

  const cargarProductos = async () => {
    try {
      const res = await almacenApi.getProductos('todos');
      setProductos(res.data);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtros.producto_id) params.producto_id = filtros.producto_id;
      if (filtros.tipo_movimiento) params.tipo_movimiento = filtros.tipo_movimiento;
      if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
      if (filtros.pagina) params.pagina = filtros.pagina;

      const res = await almacenApi.getHistorial(params);
      setMovimientos(res.data.movimientos || []);
      setTotalPaginas(res.data.total_paginas || 1);
      setTotalRegistros(res.data.total || 0);
    } catch (error) {
      console.error('Error:', error);
      setMovimientos([]);
    } finally {
      setCargando(false);
    }
  };

  const cambiarFiltro = (key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value, pagina: 1 }));
  };

  const getTipoBadge = (tipo) => {
    const estilos = {
      'entrada': 'bg-green-100 text-green-800',
      'salida': 'bg-red-100 text-red-800',
      'ajuste': 'bg-yellow-100 text-yellow-800'
    };
    const etiquetas = {
      'entrada': '📥 Entrada',
      'salida': '📤 Salida',
      'ajuste': '🔧 Ajuste'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${estilos[tipo] || 'bg-gray-100'}`}>
        {etiquetas[tipo] || tipo}
      </span>
    );
  };

  const getTipoProductoBadge = (tipo) => {
    return tipo === 'ingrediente' ? '🥗' : '💊';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatearDinero = (valor) => {
    if (!valor || valor === 0) return '-';
    return `$${parseFloat(valor).toFixed(2)}`;
  };

  // Calcular totales
  const totalEntradas = movimientos
    .filter(m => m.tipo_movimiento === 'entrada')
    .reduce((sum, m) => sum + parseFloat(m.cantidad || 0), 0);
  
  const totalSalidas = movimientos
    .filter(m => m.tipo_movimiento === 'salida')
    .reduce((sum, m) => sum + parseFloat(m.cantidad || 0), 0);

  const limpiarFiltros = () => {
    setFiltros({
      producto_id: '',
      tipo_movimiento: '',
      fecha_desde: '',
      fecha_hasta: '',
      pagina: 1
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">📋 Historial de Movimientos</h2>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Producto */}
          <select
            value={filtros.producto_id}
            onChange={e => cambiarFiltro('producto_id', e.target.value)}
            className="border rounded p-2 text-sm"
          >
            <option value="">Todos los productos</option>
            {productos.map(p => (
              <option key={`${p.tipo}_${p.id}`} value={`${p.tipo}_${p.id}`}>
                {getTipoProductoBadge(p.tipo)} {p.nombre}
              </option>
            ))}
          </select>

          {/* Tipo movimiento */}
          <select
            value={filtros.tipo_movimiento}
            onChange={e => cambiarFiltro('tipo_movimiento', e.target.value)}
            className="border rounded p-2 text-sm"
          >
            <option value="">Todos los movimientos</option>
            <option value="entrada">📥 Entradas</option>
            <option value="salida">📤 Salidas</option>
            <option value="ajuste">🔧 Ajustes</option>
          </select>

          {/* Fecha desde */}
          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={e => cambiarFiltro('fecha_desde', e.target.value)}
            className="border rounded p-2 text-sm"
          />

          {/* Fecha hasta */}
          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={e => cambiarFiltro('fecha_hasta', e.target.value)}
            className="border rounded p-2 text-sm"
          />

          {/* Limpiar */}
          <button
            onClick={limpiarFiltros}
            className="bg-gray-200 hover:bg-gray-300 rounded p-2 text-sm transition-colors"
          >
            🔄 Limpiar filtros
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total registros</p>
          <p className="text-2xl font-bold">{totalRegistros}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">Total entradas</p>
          <p className="text-2xl font-bold text-green-800">{totalEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">Total salidas</p>
          <p className="text-2xl font-bold text-red-800">{totalSalidas.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Fecha</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Tipo</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Producto</th>
              <th className="text-right p-3 text-sm font-medium text-gray-600">Cantidad</th>
              <th className="text-right p-3 text-sm font-medium text-gray-600">Precio Unit.</th>
              <th className="text-right p-3 text-sm font-medium text-gray-600">Subtotal</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Descripción</th>
              <th className="text-left p-3 text-sm font-medium text-gray-600">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {movimientos.length === 0 && !cargando ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  No se encontraron movimientos
                </td>
              </tr>
            ) : (
              movimientos.map((mov, index) => (
                <tr key={`${mov.tipo_movimiento}-${mov.id_movimiento}-${index}`} 
                    className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-sm whitespace-nowrap">
                    {formatearFecha(mov.fecha)}
                  </td>
                  <td className="p-3">
                    {getTipoBadge(mov.tipo_movimiento)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{getTipoProductoBadge(mov.tipo_producto)}</span>
                      <span className="font-medium">{mov.producto_nombre}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <span className={mov.tipo_movimiento === 'salida' ? 'text-red-600' : 'text-green-600'}>
                      {mov.tipo_movimiento === 'salida' ? '-' : '+'}
                      {parseFloat(mov.cantidad).toFixed(2)}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">{mov.unidad}</span>
                  </td>
                  <td className="p-3 text-right text-sm">
                    {formatearDinero(mov.precio_unitario)}
                  </td>
                  <td className="p-3 text-right text-sm font-medium">
                    <span className={mov.tipo_movimiento === 'salida' ? 'text-red-600' : 'text-green-600'}>
                      {formatearDinero(mov.subtotal)}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600 max-w-xs">
                    <p className="truncate" title={mov.descripcion}>
                      {mov.descripcion || '-'}
                    </p>
                    {mov.proveedor_nombre && (
                      <p className="text-xs text-gray-400">Prov: {mov.proveedor_nombre}</p>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {mov.empleado_nombre || mov.proveedor_nombre || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => cambiarFiltro('pagina', filtros.pagina - 1)}
            disabled={filtros.pagina === 1}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            ← Anterior
          </button>
          
          {Array.from({ length: Math.min(totalPaginas, 10) }, (_, i) => {
            let numPagina;
            if (totalPaginas <= 10) {
              numPagina = i + 1;
            } else if (filtros.pagina <= 5) {
              numPagina = i + 1;
            } else if (filtros.pagina >= totalPaginas - 4) {
              numPagina = totalPaginas - 9 + i;
            } else {
              numPagina = filtros.pagina - 5 + i;
            }
            
            return (
              <button
                key={numPagina}
                onClick={() => cambiarFiltro('pagina', numPagina)}
                className={`px-3 py-1 rounded ${
                  filtros.pagina === numPagina
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {numPagina}
              </button>
            );
          })}

          <button
            onClick={() => cambiarFiltro('pagina', filtros.pagina + 1)}
            disabled={filtros.pagina === totalPaginas}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Loading */}
      {cargando && (
        <div className="text-center py-4 text-gray-500">
          ⏳ Cargando historial...
        </div>
      )}
    </div>
  );
}