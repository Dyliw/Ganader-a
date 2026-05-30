import React, { useState, useEffect } from 'react';
import { almacenApi } from '../../api/almacenApi';

export default function OrdenesCompra() {
  const [sugerencias, setSugerencias] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [ordenGenerada, setOrdenGenerada] = useState(null);

  useEffect(() => {
    cargarSugerencias();
  }, []);

  const cargarSugerencias = async () => {
    setCargando(true);
    try {
      const res = await almacenApi.getSugerenciasCompra();
      setSugerencias(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const toggleSeleccion = (item) => {
    setSeleccionados(prev => {
      const existe = prev.find(s => s.id === item.id && s.tipo === item.tipo);
      if (existe) {
        return prev.filter(s => !(s.id === item.id && s.tipo === item.tipo));
      }
      return [...prev, item];
    });
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === sugerencias.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados([...sugerencias]);
    }
  };

  const generarOrden = async () => {
    if (seleccionados.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Seleccione al menos un producto' });
      return;
    }

    setGenerando(true);
    try {
      const res = await almacenApi.generarOrdenCompra({
        productos: seleccionados.map(s => ({
          tipo: s.tipo,
          id_producto: s.id,
          cantidad_sugerida: s.cantidad_sugerida
        }))
      });

      setOrdenGenerada(res.data);
      setMensaje({ tipo: 'exito', texto: '✅ Orden de compra generada exitosamente' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.detail || 'Error' });
    } finally {
      setGenerando(false);
    }
  };

  const totalEstimado = seleccionados.reduce((sum, item) => 
    sum + (item.precio_unitario * item.cantidad_sugerida), 0
  );

  if (cargando) return <div className="p-6 text-center">Analizando inventario...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">🛒 Órdenes de Compra Sugeridas</h2>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Orden generada */}
      {ordenGenerada && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">✅ Orden de Compra Generada</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Número de orden</p>
              <p className="font-bold text-lg">#{ordenGenerada.numero_orden}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total estimado</p>
              <p className="font-bold text-lg">${ordenGenerada.total_estimado?.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white rounded p-4 mb-4">
            <h4 className="font-semibold mb-2">Productos incluidos:</h4>
            {ordenGenerada.productos?.map((p, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span>{p.nombre}</span>
                <span>{p.cantidad} {p.unidad}</span>
              </div>
            ))}
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            📄 Descargar PDF
          </button>
        </div>
      )}

      {sugerencias.length === 0 ? (
        <div className="text-center py-10 bg-green-50 rounded-lg">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-semibold text-green-800">Inventario en niveles óptimos</p>
          <p className="text-sm text-gray-500">No se requieren compras en este momento</p>
        </div>
      ) : (
        <>
          {/* Barra de acciones */}
          <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={seleccionarTodos}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              {seleccionados.length === sugerencias.length ? '⬜ Deseleccionar todo' : '✅ Seleccionar todo'}
            </button>
            <div className="text-right">
              <span className="text-sm text-gray-500">Seleccionados: {seleccionados.length}</span>
              {seleccionados.length > 0 && (
                <p className="font-bold">Total est.: ${totalEstimado.toFixed(2)}</p>
              )}
            </div>
          </div>

          {/* Lista de sugerencias */}
          <div className="space-y-3 mb-6">
            {sugerencias.map(item => {
              const seleccionado = seleccionados.find(s => s.id === item.id && s.tipo === item.tipo);
              return (
                <div
                  key={`${item.tipo}-${item.id}`}
                  onClick={() => toggleSeleccion(item)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    seleccionado ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!seleccionado}
                      onChange={() => {}}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{item.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {item.tipo === 'ingrediente' ? '🥗 Ingrediente' : '💊 Medicamento'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.nivel_critico ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.nivel_critico ? '🔴 Crítico' : '🟡 Bajo'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Stock actual:</span>
                          <p className="font-bold">{item.stock_actual} {item.unidad}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Stock mínimo:</span>
                          <p>{item.stock_minimo} {item.unidad}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Sugerido comprar:</span>
                          <p className="font-bold text-indigo-700">{item.cantidad_sugerida} {item.unidad}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Precio est.:</span>
                          <p>${item.precio_unitario}/{item.unidad}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón generar orden */}
          {seleccionados.length > 0 && (
            <button
              onClick={generarOrden}
              disabled={generando}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {generando ? '⏳ Generando...' : `🛒 Generar Orden de Compra (${seleccionados.length} productos)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}