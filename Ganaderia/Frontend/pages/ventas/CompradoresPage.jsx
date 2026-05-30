import React, { useState, useEffect } from 'react';
import { ventasApi } from '../../api/ventasApi';

export default function CompradoresPage() {
  const [compradores, setCompradores] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', rfc: '', telefono: '', direccion: '' });
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargarCompradores(); }, []);

  const cargarCompradores = async () => {
    try {
      const res = await ventasApi.getCompradores();
      setCompradores(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleEdit = (c) => {
    setEditando(c);
    setForm({ nombre: c.nombre, rfc: c.rfc || '', telefono: c.telefono || '', direccion: c.direccion || '' });
    setMostrarForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await ventasApi.updateComprador(editando.id_comprador, form);
      } else {
        await ventasApi.createComprador(form);
      }
      setMostrarForm(false);
      setEditando(null);
      setForm({ nombre: '', rfc: '', telefono: '', direccion: '' });
      cargarCompradores();
    } catch (error) {
      alert('Error al guardar');
    }
  };

  if (cargando) return <div className="p-6 text-center">Cargando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">👥 Compradores</h2>
        <button
          onClick={() => { setEditando(null); setForm({ nombre: '', rfc: '', telefono: '', direccion: '' }); setMostrarForm(true); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
        >
          + Nuevo Comprador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {compradores.map(c => (
          <div key={c.id_comprador} className="border rounded-lg p-4 hover:shadow-md">
            <h3 className="font-bold text-lg">{c.nombre}</h3>
            {c.rfc && <p className="text-sm text-gray-500">RFC: {c.rfc}</p>}
            {c.telefono && <p className="text-sm">📞 {c.telefono}</p>}
            {c.direccion && <p className="text-sm text-gray-500">📍 {c.direccion}</p>}
            <button
              onClick={() => handleEdit(c)}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
            >
              ✏️ Editar
            </button>
          </div>
        ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editando ? 'Editar' : 'Nuevo'} Comprador</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                placeholder="Nombre *"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full border rounded p-2"
                required
              />
              <input
                placeholder="RFC"
                value={form.rfc}
                onChange={e => setForm({...form, rfc: e.target.value})}
                className="w-full border rounded p-2"
              />
              <input
                placeholder="Teléfono"
                value={form.telefono}
                onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full border rounded p-2"
              />
              <textarea
                placeholder="Dirección"
                value={form.direccion}
                onChange={e => setForm({...form, direccion: e.target.value})}
                className="w-full border rounded p-2"
                rows="2"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 border rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}