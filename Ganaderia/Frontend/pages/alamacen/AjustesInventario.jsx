import React, { useState, useEffect } from 'react';
import { almacenApi } from '../../api/almacenApi';

export default function AjustesInventario() {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    tipo_producto: 'ingrediente',
    id_producto: '',
    tipo_ajuste: 'conteo', // 'conteo', 'merma', 'caducidad'
    cantidad_ajuste: '',
    motivo: ''
  });
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    almacenApi.getProductos().then(res => setProductos(res.data));
  }, []);

  const productosFiltrados = productos.filter(p => p.tipo === form.tipo_producto);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await almacenApi.registrarAjuste({
        ...form,
        id_producto: parseInt(form.id_producto),
        cantidad_ajuste: parseFloat(form.cantidad_ajuste)
      });
      
      setMensaje({ tipo: 'exito', texto: ' Ajuste registrado correctamente' });
      setForm(prev => ({ ...prev, id_producto: '', cantidad_ajuste: '', motivo: '' }));
      almacenApi.getProductos().then(res => setProductos(res.data));
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.detail || 'Error' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">🔧 Ajustes de Inventario</h2>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Tipo de Producto</label>
          <select
            value={form.tipo_producto}
            onChange={e => setForm({...form, tipo_producto: e.target.value, id_producto: ''})}
            className="w-full border rounded p-2"
          >
            <option value="ingrediente">Ingrediente</option>
            <option value="medicamento">Medicamento</option>
          </select>
        </div>

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
              <option key={p.id} value={p.id}>
                {p.nombre} — Stock: {p.stock_actual}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Tipo de Ajuste</label>
          <select
            value={form.tipo_ajuste}
            onChange={e => setForm({...form, tipo_ajuste: e.target.value})}
            className="w-full border rounded p-2"
          >
            <option value="conteo">Conteo físico</option>
            <option value="merma">Merma / Pérdida</option>
            <option value="caducidad">Caducidad</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">
            {form.tipo_ajuste === 'conteo' ? 'Nuevo Stock' : 'Cantidad a descontar'} *
          </label>
          <input
            type="number"
            value={form.cantidad_ajuste}
            onChange={e => setForm({...form, cantidad_ajuste: e.target.value})}
            className="w-full border rounded p-2"
            step="0.01"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {form.tipo_ajuste === 'conteo' 
              ? 'Ingrese el stock real contado' 
              : 'Cantidad a descontar del inventario'}
          </p>
        </div>

        <textarea
          value={form.motivo}
          onChange={e => setForm({...form, motivo: e.target.value})}
          className="w-full border rounded p-2"
          rows="2"
          placeholder="Motivo del ajuste..."
          required
        />

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
        >
          {cargando ? '⏳ Registrando...' : '🔧 Registrar Ajuste'}
        </button>
      </form>
    </div>
  );
}