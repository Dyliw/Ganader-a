import React, { useState, useEffect } from 'react';
import { empleadosApi } from '../../api/empleadosApi';

export default function FormEmpleado({ empleado, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    rfc: '',
    id_puesto: '',
    fecha_contrato: new Date().toISOString().split('T')[0],
    observaciones: '',
    crear_usuario: false,
    usuario: '',
    contrasena: '',
    activo: true
  });
  const [puestos, setPuestos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    empleadosApi.getPuestos().then(res => setPuestos(res.data));
    if (empleado) {
      setForm({
        nombre: empleado.nombre || '',
        apellido_paterno: empleado.apellido_paterno || '',
        apellido_materno: empleado.apellido_materno || '',
        rfc: empleado.rfc || '',
        id_puesto: empleado.id_puesto || '',
        fecha_contrato: empleado.fecha_contrato ? new Date(empleado.fecha_contrato).toISOString().split('T')[0] : '',
        observaciones: empleado.observaciones || '',
        crear_usuario: !!empleado.tiene_usuario,
        usuario: empleado.usuario_login || empleado.usuario || '',
        contrasena: '', // no se muestra por seguridad
        activo: empleado.activo
      });
    }
  }, [empleado]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const data = {
        ...form,
        id_puesto: parseInt(form.id_puesto)
      };
      if (empleado) {
        await empleadosApi.update(empleado.id_empleado, data);
      } else {
        await empleadosApi.create(data);
      }
      onSave();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.detail || error.message));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#fcfbf8] rounded-[32px] p-8 w-full max-w-lg shadow-xl border border-[#ece8df]">
        <h2 className="text-2xl font-semibold text-[#2f2f2f] mb-6">
          {empleado ? 'Editar Empleado' : 'Nuevo Empleado'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Nombre*"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
              className="bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
              required
            />
            <input
              placeholder="Apellido Paterno*"
              value={form.apellido_paterno}
              onChange={e => setForm({...form, apellido_paterno: e.target.value})}
              className="bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
              required
            />
            <input
              placeholder="Apellido Materno"
              value={form.apellido_materno}
              onChange={e => setForm({...form, apellido_materno: e.target.value})}
              className="bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
            />
            <input
              placeholder="RFC"
              value={form.rfc}
              onChange={e => setForm({...form, rfc: e.target.value})}
              className="bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
            />
          </div>

          <select
            value={form.id_puesto}
            onChange={e => setForm({...form, id_puesto: e.target.value})}
            className="w-full bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
            required
          >
            <option value="">Seleccione un puesto*</option>
            {puestos.map(p => (
              <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>
            ))}
          </select>

          <input
            type="date"
            value={form.fecha_contrato}
            onChange={e => setForm({...form, fecha_contrato: e.target.value})}
            className="w-full bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
          />

          <textarea
            placeholder="Observaciones"
            value={form.observaciones}
            onChange={e => setForm({...form, observaciones: e.target.value})}
            className="w-full bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
            rows="2"
          />

          {/* Toggle para crear usuario */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.crear_usuario}
              onChange={e => setForm({...form, crear_usuario: e.target.checked})}
              className="w-5 h-5 accent-[#5f7c4d]"
            />
            <label className="text-[#2f2f2f]">Crear usuario de sistema</label>
          </div>

          {form.crear_usuario && (
            <div className="space-y-3 pl-2 border-l-4 border-[#5f7c4d] p-4">
              <input
                placeholder="Nombre de usuario*"
                value={form.usuario}
                onChange={e => setForm({...form, usuario: e.target.value})}
                className="w-full bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
                required={form.crear_usuario}
              />
              <input
                type="password"
                placeholder="Contraseña*"
                value={form.contrasena}
                onChange={e => setForm({...form, contrasena: e.target.value})}
                className="w-full bg-[#f4f1ea] border border-transparent rounded-2xl p-4 outline-none focus:border-[#6c8c5a] focus:bg-white transition"
                required={form.crear_usuario && !empleado} // al editar no obligatorio si no se cambia
              />
              <p className="text-xs text-[#7a7a7a]">
                {empleado ? 'Dejar en blanco para mantener la contraseña actual.' : 'La contraseña se almacenará.'}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl border border-[#ece8df] text-[#7a7a7a] hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="px-6 py-3 rounded-2xl bg-[#5f7c4d] text-white hover:bg-[#4e6840] transition font-medium">
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}