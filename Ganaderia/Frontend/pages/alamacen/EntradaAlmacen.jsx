import React, { useState, useEffect } from 'react';
import { almacenApi } from '../../api/almacenApi';

export default function EntradasAlmacen() {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  
  const [form, setForm] = useState({
    tipo_producto: 'ingrediente', // 'ingrediente' o 'medicamento'
    id_producto: '',
    cantidad: '',
    precio_unitario: '',
    fecha_caducidad: '',
    id_proveedor: '',
    fecha_entrada: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  useEffect(() => {
    cargarCatalogos();
    cargarEntradas();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [prodRes, provRes] = await Promise.all([
        almacenApi.getProductos(),
        almacenApi.getProveedores()
      ]);
      setProductos(prodRes.data);
      setProveedores(provRes.data);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const cargarEntradas = async () => {
    try {
      const res = await almacenApi.getEntradas({ pagina: 1 });
      setEntradas(res.data.entradas || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const productosFiltrados = productos.filter(p => 
    form.tipo_producto === 'todos' ? true : p.tipo === form.tipo_producto
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    try {
      const data = {
        ...form,
        cantidad: parseFloat(form.cantidad),
        precio_unitario: parseFloat(form.precio_unitario),
        id_producto: parseInt(form.id_producto),
        id_proveedor: parseInt(form.id_proveedor)
      };

      await almacenApi.registrarEntrada(data);
      
      setMensaje({ tipo: 'exito', texto: '✅ Entrada registrada exitosamente' });
      setForm(prev => ({
        ...prev,
        id_producto: '',
        cantidad: '',
        precio_unitario: '',
        fecha_caducidad: '',
        observaciones: ''
      }));
      cargarEntradas();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.detail || 'Error al registrar' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">📥 Entradas de Almacén</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          {mostrarForm ? '📋 Ver Entradas' : '+ Nueva Entrada'}
        </button>
      </div>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {mostrarForm ? (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Tipo de producto */}
            <div>
              <label className="block text-sm font-semibold mb-1">Tipo *</label>
              <select
                value={form.tipo_producto}
                onChange={e => setForm({...form, tipo_producto: e.target.value, id_producto: ''})}
                className="w-full border rounded p-2"
                required
              >
                <option value="ingrediente">Ingrediente</option>
                <option value="medicamento">Medicamento</option>
              </select>
            </div>

            {/* Producto */}
            <div>
              <label className="block text-sm font-semibold mb-1">Producto *</label>
              <select
                value={form.id_producto}
                onChange={e => setForm({...form, id_producto: e.target.value})}
                className="w-full border rounded p-2"
                required
              >
                <option value="">Seleccionar...</option>
                {productosFiltrados.map(p => (
                  <option key={`${p.tipo}-${p.id}`} value={p.id}>
                    {p.nombre} — Stock: {p.stock_actual} {p.unidad_medida}
                  </option>
                ))}
              </select>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-semibold mb-1">Cantidad *</label>
              <input
                type="number"
                value={form.cantidad}
                onChange={e => setForm({...form, cantidad: e.target.value})}
                className="w-full border rounded p-2"
                step="0.01"
                min="0"
                required
              />
            </div>

            {/* Precio unitario */}
            <div>
              <label className="block text-sm font-semibold mb-1">Precio Unitario *</label>
              <input
                type="number"
                value={form.precio_unitario}
                onChange={e => setForm({...form, precio_unitario: e.target.value})}
                className="w-full border rounded p-2"
                step="0.01"
                min="0"
                required
              />
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-semibold mb-1">Proveedor *</label>
              <select
                value={form.id_proveedor}
                onChange={e => setForm({...form, id_proveedor: e.target.value})}
                className="w-full border rounded p-2"
                required
              >
                <option value="">Seleccionar...</option>
                {proveedores.map(p => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Fecha caducidad */}
            <div>
              <label className="block text-sm font-semibold mb-1">Fecha Caducidad</label>
              <input
                type="date"
                value={form.fecha_caducidad}
                onChange={e => setForm({...form, fecha_caducidad: e.target.value})}
                className="w-full border rounded p-2"
              />
            </div>

            {/* Fecha entrada */}
            <div>
              <label className="block text-sm font-semibold mb-1">Fecha Entrada</label>
              <input
                type="date"
                value={form.fecha_entrada}
                onChange={e => setForm({...form, fecha_entrada: e.target.value})}
                className="w-full border rounded p-2"
              />
            </div>
          </div>

          {/* Observaciones */}
          <textarea
            value={form.observaciones}
            onChange={e => setForm({...form, observaciones: e.target.value})}
            className="w-full border rounded p-2"
            rows="2"
            placeholder="Observaciones..."
          />

          {/* Total calculado */}
          {form.cantidad && form.precio_unitario && (
            <div className="bg-gray-50 p-3 rounded text-right">
              <span className="text-gray-500">Total: </span>
              <span className="font-bold text-lg">
                ${(parseFloat(form.cantidad) * parseFloat(form.precio_unitario)).toFixed(2)}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {cargando ? '⏳ Registrando...' : '📥 Registrar Entrada'}
          </button>
        </form>
      ) : (
        /* Tabla de entradas recientes */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Producto</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-right p-3">Cantidad</th>
                <th className="text-right p-3">Precio Unit.</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map(e => (
                <tr key={e.id_entrada} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-sm">{new Date(e.fecha_entrada).toLocaleDateString()}</td>
                  <td className="p-3 font-medium">{e.producto_nombre}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      e.tipo === 'ingrediente' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      {e.tipo}
                    </span>
                  </td>
                  <td className="p-3 text-right">{e.cantidad}</td>
                  <td className="p-3 text-right">${e.precio_unitario}</td>
                  <td className="p-3 text-right font-bold">${(e.cantidad * e.precio_unitario).toFixed(2)}</td>
                  <td className="p-3 text-sm">{e.proveedor_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}