import React, { useState, useEffect } from 'react';
import { medicamentosApi } from '../../api/medicamentosApi';
import { useNavigate } from 'react-router-dom';

export default function CatalogoMedicamentos() {
  const navigate = useNavigate();
  const [medicamentos, setMedicamentos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({
    nombre: '',
    tipo_dosis: 'Fija',
    dosis_fija: '',
    dosis_kg: '',
    requiere_retiro: false,
    id_tipo_medicamento: '',
    retiro_dias: 0,
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: 'ml'
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [medRes, tipRes] = await Promise.all([
        medicamentosApi.getAll(),
        medicamentosApi.getTiposMedicamento()
      ]);
      setMedicamentos(medRes.data);
      setTipos(tipRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleEdit = (med) => {
    setEditando(med);
    setForm({
      nombre: med.nombre,
      tipo_dosis: med.tipo_dosis,
      dosis_fija: med.dosis_fija || '',
      dosis_kg: med.dosis_kg || '',
      requiere_retiro: med.requiere_retiro,
      id_tipo_medicamento: med.id_tipo_medicamento,
      retiro_dias: med.retiro_dias,
      stock_actual: med.stock_actual,
      stock_minimo: med.stock_minimo,
      unidad_medida: med.unidad_medida
    });
    setMostrarForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        dosis_fija: form.tipo_dosis === 'Fija' ? parseFloat(form.dosis_fija) : null,
        dosis_kg: form.tipo_dosis === 'Proporcional' ? parseFloat(form.dosis_kg) : null,
        id_tipo_medicamento: parseInt(form.id_tipo_medicamento),
        requiere_retiro: form.requiere_retiro,
        retiro_dias: form.requiere_retiro ? parseInt(form.retiro_dias) : 0
      };

      if (editando) {
        await medicamentosApi.update(editando.id_medicamento, data);
      } else {
        await medicamentosApi.create(data);
      }

      setMostrarForm(false);
      setEditando(null);
      cargarDatos();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (cargando) return <div className="p-6 text-center">Cargando catálogo...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">💊 Catálogo de Medicamentos</h2>
        <button
          onClick={() => { setEditando(null); setMostrarForm(true); }}
          className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
        >
          + Nuevo Medicamento
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Tipo Dosis</th>
              <th className="text-center p-3">Retiro</th>
              <th className="text-right p-3">Stock</th>
              <th className="text-center p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {medicamentos.map(med => (
              <tr key={med.id_medicamento} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <p className="font-medium">{med.nombre}</p>
                  <p className="text-xs text-gray-500">{med.tipo_medicamento_nombre}</p>
                </td>
                <td className="p-3">
                  {med.tipo_dosis === 'Fija' 
                    ? `Fija: ${med.dosis_fija} ${med.unidad_medida}`
                    : `Peso: ${med.dosis_kg} ${med.unidad_medida}/kg`}
                </td>
                <td className="p-3 text-center">
                  {med.requiere_retiro 
                    ? <span className="text-orange-600">{med.retiro_dias} días</span>
                    : <span className="text-green-600">No</span>}
                </td>
                <td className="p-3 text-right">
                  <span className={med.stock_actual <= med.stock_minimo ? 'text-red-600 font-bold' : ''}>
                    {med.stock_actual}
                  </span>
                  <span className="text-gray-400"> / {med.stock_minimo}</span>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    med.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {med.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3">
  <button
    onClick={() => navigate(`/medicamentos/${med.id_medicamento}`)}
    className="text-[#5f7c4d] hover:text-[#4e6840] font-medium"
  >
    Ver
  </button>
</td>
                <td className="p-3">
                  <button
                    onClick={() => handleEdit(med)}
                    className="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    ✏️
                  </button>
                  
                  <button
                    onClick={() => medicamentosApi.deactivate(med.id_medicamento).then(cargarDatos)}
                    className="text-red-600 hover:text-red-800"
                  >
                    {med.activo ? '🚫' : '✅'}
                  </button>
                  
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
      </div>

      {/* Modal Form */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editando ? 'Editar Medicamento' : 'Nuevo Medicamento'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                placeholder="Nombre"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full border rounded p-2"
                required
              />

              <select
                value={form.id_tipo_medicamento}
                onChange={e => setForm({...form, id_tipo_medicamento: e.target.value})}
                className="w-full border rounded p-2"
                required
              >
                <option value="">Tipo de medicamento</option>
                {tipos.map(t => (
                  <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>
                ))}
              </select>

              <select
                value={form.tipo_dosis}
                onChange={e => setForm({...form, tipo_dosis: e.target.value})}
                className="w-full border rounded p-2"
              >
                <option value="Fija">Dosis Fija</option>
                <option value="Proporcional">Proporcional al peso</option>
              </select>

              {form.tipo_dosis === 'Fija' ? (
                <input
                  type="number"
                  placeholder="Dosis fija"
                  value={form.dosis_fija}
                  onChange={e => setForm({...form, dosis_fija: e.target.value})}
                  className="w-full border rounded p-2"
                  step="0.01"
                  required
                />
              ) : (
                <input
                  type="number"
                  placeholder="Dosis por kg"
                  value={form.dosis_kg}
                  onChange={e => setForm({...form, dosis_kg: e.target.value})}
                  className="w-full border rounded p-2"
                  step="0.0001"
                  required
                />
              )}

              <input
                placeholder="Unidad de medida (ml, g, etc.)"
                value={form.unidad_medida}
                onChange={e => setForm({...form, unidad_medida: e.target.value})}
                className="w-full border rounded p-2"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Stock actual"
                  value={form.stock_actual}
                  onChange={e => setForm({...form, stock_actual: e.target.value})}
                  className="border rounded p-2"
                />
                <input
                  type="number"
                  placeholder="Stock mínimo"
                  value={form.stock_minimo}
                  onChange={e => setForm({...form, stock_minimo: e.target.value})}
                  className="border rounded p-2"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requiere_retiro}
                  onChange={e => setForm({...form, requiere_retiro: e.target.checked})}
                />
                ¿Requiere periodo de retiro?
              </label>

              {form.requiere_retiro && (
                <input
                  type="number"
                  placeholder="Días de retiro"
                  value={form.retiro_dias}
                  onChange={e => setForm({...form, retiro_dias: e.target.value})}
                  className="w-full border rounded p-2"
                  required
                />
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 border rounded">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}