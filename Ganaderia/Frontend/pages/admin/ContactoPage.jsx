import React, { useState, useEffect } from 'react';
import { contactosApi } from '../../api/contactosApi';
import { empleadosApi } from '../../api/empleadosApi';

export default function ContactosPage() {
  const [tabActiva, setTabActiva] = useState('proveedores');
  const [proveedores, setProveedores] = useState([]);
  const [compradores, setCompradores] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState({
    tipo: 'Proveedor',
    // campos comunes
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    rfc: '',
    telefono: '',
    celular: '',
    email: '',
    direccion: '',
    municipio: '',
    estado_procedencia: '',
    codigo_postal: '',
    contacto_nombre: '',
    contacto_apellido: '',
    tipo_persona: 'Física',
    notas: '',
    // campos específicos de empleado
    id_puesto: '',
    fecha_contrato: new Date().toISOString().split('T')[0],
    crear_usuario: false,
    usuario: '',
    contrasena: '',
    activo: true,
  });

  const [puestos, setPuestos] = useState([]);

  useEffect(() => {
    cargarDatos();
    // Cargar puestos para empleados
    empleadosApi.getPuestos().then(res => setPuestos(res.data)).catch(() => {});
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [provRes, compRes, empRes] = await Promise.all([
        contactosApi.getProveedores(),
        contactosApi.getCompradores(),
        empleadosApi.getAll(),
      ]);
      setProveedores(provRes.data);
      setCompradores(compRes.data);
      setEmpleados(empRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleEdit = (contacto, tipo) => {
    setEditando(contacto);
    const base = {
      tipo: tipo || 'Proveedor',
      nombre: contacto.nombre || '',
      apellido_paterno: contacto.apellido_paterno || '',
      apellido_materno: contacto.apellido_materno || '',
      rfc: contacto.rfc || '',
      telefono: contacto.telefono || '',
      celular: contacto.celular || '',
      email: contacto.email || '',
      direccion: contacto.direccion || '',
      municipio: contacto.municipio || '',
      estado_procedencia: contacto.estado_procedencia || contacto.estado || '',
      codigo_postal: contacto.codigo_postal || '',
      contacto_nombre: contacto.contacto_nombre || '',
      contacto_apellido: contacto.contacto_apellido || '',
      tipo_persona: contacto.tipo_persona || 'Física',
      notas: contacto.notas || '',
    };

    if (tipo === 'Empleado') {
      setForm({
        ...base,
        tipo: 'Empleado',
        id_puesto: contacto.id_puesto || '',
        fecha_contrato: contacto.fecha_contrato ? new Date(contacto.fecha_contrato).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        crear_usuario: !!contacto.tiene_usuario,
        usuario: contacto.usuario_login || contacto.usuario || '',
        contrasena: '', // no se muestra por seguridad
        activo: contacto.activo !== undefined ? contacto.activo : true,
      });
    } else {
      setForm({ ...base, tipo: tipo || 'Proveedor' });
    }
    setMostrarForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (editando) {
        if (form.tipo === 'Empleado') {
          await empleadosApi.update(editando.id_empleado, {
            ...data,
            id_puesto: parseInt(data.id_puesto) || undefined,
          });
        } else {
          await contactosApi.update(
            form.tipo === 'Proveedor' ? 'proveedor' : 'comprador',
            editando.id_proveedor || editando.id_comprador,
            data
          );
        }
      } else {
        if (form.tipo === 'Empleado') {
          await empleadosApi.create({
            ...data,
            id_puesto: parseInt(data.id_puesto),
          });
        } else {
          await contactosApi.create(data);
        }
      }
      setMostrarForm(false);
      setEditando(null);
      cargarDatos();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.detail || error.message));
    }
  };

  const filtrar = (lista) => {
    if (!busqueda.trim()) return lista;
    const term = busqueda.toLowerCase();
    return lista.filter(item =>
      item.nombre?.toLowerCase().includes(term) ||
      item.rfc?.toLowerCase().includes(term) ||
      (item.municipio && item.municipio.toLowerCase().includes(term)) ||
      (item.puesto_nombre && item.puesto_nombre.toLowerCase().includes(term))
    );
  };

  const listaActual =
    tabActiva === 'proveedores'
      ? proveedores
      : tabActiva === 'compradores'
      ? compradores
      : empleados;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">👥 Directorio de Contactos</h1>
        <button
          onClick={() => {
            setEditando(null);
            setForm({
              tipo: tabActiva === 'proveedores' ? 'Proveedor' : tabActiva === 'compradores' ? 'Comprador' : 'Empleado',
              nombre: '',
              apellido_paterno: '',
              apellido_materno: '',
              rfc: '',
              telefono: '',
              celular: '',
              email: '',
              direccion: '',
              municipio: '',
              estado_procedencia: '',
              codigo_postal: '',
              contacto_nombre: '',
              contacto_apellido: '',
              tipo_persona: 'Física',
              notas: '',
              id_puesto: '',
              fecha_contrato: new Date().toISOString().split('T')[0],
              crear_usuario: false,
              usuario: '',
              contrasena: '',
              activo: true,
            });
            setMostrarForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Nuevo Contacto
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTabActiva('proveedores')}
          className={`px-4 py-2 rounded-t font-medium ${
            tabActiva === 'proveedores' ? 'bg-blue-600 text-white' : 'bg-gray-100'
          }`}
        >
          Proveedores ({proveedores.length})
        </button>
        <button
          onClick={() => setTabActiva('compradores')}
          className={`px-4 py-2 rounded-t font-medium ${
            tabActiva === 'compradores' ? 'bg-green-600 text-white' : 'bg-gray-100'
          }`}
        >
          Compradores ({compradores.length})
        </button>
        <button
          onClick={() => setTabActiva('empleados')}
          className={`px-4 py-2 rounded-t font-medium ${
            tabActiva === 'empleados' ? 'bg-purple-600 text-white' : 'bg-gray-100'
          }`}
        >
          Empleados ({empleados.length})
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, RFC..."
          className="w-full md:w-96 border rounded-lg p-3"
        />
      </div>

      {/* Lista de contactos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrar(listaActual).map(contacto => {
          const esEmpleado = tabActiva === 'empleados';
          const id = esEmpleado ? contacto.id_empleado : (contacto.id_proveedor || contacto.id_comprador);
          return (
            <div key={id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">
                    {esEmpleado
                      ? `${contacto.nombre} ${contacto.apellido_paterno || ''}`
                      : contacto.nombre}
                  </h3>
                  {esEmpleado && (
                    <p className="text-sm text-gray-600">
                      {contacto.puesto_nombre || 'Sin puesto'}
                    </p>
                  )}
                  {!esEmpleado && contacto.apellido_paterno && (
                    <p className="text-sm text-gray-600">
                      {contacto.apellido_paterno} {contacto.apellido_materno || ''}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  tabActiva === 'proveedores' ? 'bg-blue-100 text-blue-800'
                    : tabActiva === 'compradores' ? 'bg-green-100 text-green-800'
                    : esEmpleado ? (contacto.activo ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-600')
                    : ''
                }`}>
                  {tabActiva === 'proveedores' ? 'Proveedor'
                    : tabActiva === 'compradores' ? 'Comprador'
                    : contacto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Datos */}
              <div className="space-y-1 text-sm">
                {contacto.rfc && (
                  <p className="text-gray-500">RFC: <span className="font-medium">{contacto.rfc}</span></p>
                )}
                {esEmpleado ? (
                  <>
                    {contacto.email && <p className="text-gray-500">📧 {contacto.email}</p>}
                    {contacto.telefono && <p className="text-gray-500">📞 {contacto.telefono}</p>}
                    {contacto.fecha_contrato && (
                      <p className="text-gray-500">📅 Desde {new Date(contacto.fecha_contrato).toLocaleDateString()}</p>
                    )}
                    {contacto.tiene_usuario && (
                      <p className="text-green-700 text-xs font-medium">🔑 Acceso al sistema</p>
                    )}
                  </>
                ) : (
                  <>
                    {contacto.telefono && <p className="text-gray-500">📞 {contacto.telefono}</p>}
                    {contacto.celular && <p className="text-gray-500">📱 {contacto.celular}</p>}
                    {contacto.email && <p className="text-gray-500">📧 {contacto.email}</p>}
                    {contacto.municipio && (
                      <p className="text-gray-500">
                        {contacto.municipio}, {contacto.estado_procedencia || contacto.estado}
                      </p>
                    )}
                    {contacto.contacto_nombre && (
                      <p className="text-gray-500">
                        Contacto: {contacto.contacto_nombre} {contacto.contacto_apellido || ''}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 mt-4 pt-3 border-t">
                <button
                  onClick={() => handleEdit(contacto, esEmpleado ? 'Empleado' : tabActiva === 'proveedores' ? 'Proveedor' : 'Comprador')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={async () => {
                    if (confirm('¿Desactivar este contacto?')) {
                      if (esEmpleado) {
                        await empleadosApi.deactivate(contacto.id_empleado);
                      } else {
                        await contactosApi.deactivate(
                          tabActiva === 'proveedores' ? 'proveedor' : 'comprador',
                          contacto.id_proveedor || contacto.id_comprador
                        );
                      }
                      cargarDatos();
                    }
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🚫 Desactivar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editando ? 'Editar Contacto' : 'Nuevo Contacto'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold mb-1">Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full border rounded p-2"
                  required
                >
                  <option value="Proveedor">Proveedor</option>
                  <option value="Comprador">Comprador</option>
                  <option value="Empleado">Empleado</option>
                </select>
              </div>

              {/* Campos comunes para proveedor/comprador */}
              {form.tipo !== 'Empleado' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        {form.tipo_persona === 'Moral' ? 'Razón Social *' : 'Nombre *'}
                      </label>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={e => setForm({...form, nombre: e.target.value})}
                        className="w-full border rounded p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">RFC</label>
                      <input
                        type="text"
                        value={form.rfc}
                        onChange={e => setForm({...form, rfc: e.target.value.toUpperCase()})}
                        className="w-full border rounded p-2"
                        maxLength="13"
                      />
                    </div>
                  </div>
                  {form.tipo_persona === 'Física' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Apellido Paterno</label>
                        <input
                          type="text"
                          value={form.apellido_paterno}
                          onChange={e => setForm({...form, apellido_paterno: e.target.value})}
                          className="w-full border rounded p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Apellido Materno</label>
                        <input
                          type="text"
                          value={form.apellido_materno}
                          onChange={e => setForm({...form, apellido_materno: e.target.value})}
                          className="w-full border rounded p-2"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Teléfono</label>
                      <input type="text" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Celular</label>
                      <input type="text" value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Email</label>
                      <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Municipio</label>
                      <input type="text" value={form.municipio} onChange={e => setForm({...form, municipio: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Estado</label>
                      <input type="text" value={form.estado_procedencia || form.estado} onChange={e => setForm({...form, estado_procedencia: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">C.P.</label>
                      <input type="text" value={form.codigo_postal} onChange={e => setForm({...form, codigo_postal: e.target.value})} className="w-full border rounded p-2" maxLength="10" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Dirección</label>
                    <textarea value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} className="w-full border rounded p-2" rows="2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Contacto Nombre</label>
                      <input type="text" value={form.contacto_nombre} onChange={e => setForm({...form, contacto_nombre: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Contacto Apellido</label>
                      <input type="text" value={form.contacto_apellido} onChange={e => setForm({...form, contacto_apellido: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Notas</label>
                    <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} className="w-full border rounded p-2" rows="2" placeholder="Información adicional..." />
                  </div>
                </>
              ) : (
                /* Campos específicos de Empleado */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Nombre *</label>
                      <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full border rounded p-2" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Apellido Paterno *</label>
                      <input type="text" value={form.apellido_paterno} onChange={e => setForm({...form, apellido_paterno: e.target.value})} className="w-full border rounded p-2" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Apellido Materno</label>
                      <input type="text" value={form.apellido_materno} onChange={e => setForm({...form, apellido_materno: e.target.value})} className="w-full border rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">RFC</label>
                      <input type="text" value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value.toUpperCase()})} className="w-full border rounded p-2" maxLength="13" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Puesto *</label>
                    <select value={form.id_puesto} onChange={e => setForm({...form, id_puesto: e.target.value})} className="w-full border rounded p-2" required>
                      <option value="">Seleccione puesto...</option>
                      {puestos.map(p => <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Fecha de Contrato</label>
                    <input type="date" value={form.fecha_contrato} onChange={e => setForm({...form, fecha_contrato: e.target.value})} className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Notas / Observaciones</label>
                    <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} className="w-full border rounded p-2" rows="2" />
                  </div>
                  {/* Usuario del sistema */}
                  <div className="flex items-center gap-3 mt-4">
                    <input type="checkbox" checked={form.crear_usuario} onChange={e => setForm({...form, crear_usuario: e.target.checked})} className="w-5 h-5" />
                    <label className="font-medium">Crear usuario de sistema</label>
                  </div>
                  {form.crear_usuario && (
                    <div className="pl-4 border-l-4 border-purple-500 space-y-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Nombre de usuario *</label>
                        <input type="text" value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value})} className="w-full border rounded p-2" required={form.crear_usuario} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Contraseña {editando ? '(dejar en blanco para mantener)' : '*'}</label>
                        <input type="password" value={form.contrasena} onChange={e => setForm({...form, contrasena: e.target.value})} className="w-full border rounded p-2" required={form.crear_usuario && !editando} />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 border rounded">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {editando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}