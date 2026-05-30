import React, { useState, useEffect } from 'react';
import { recepcionApi } from '../../api/recepcionApi';
import AutocompleteInput from '../../components/common/Autocompletado';


export default function RegistrarAnimal() {

  const [form, setForm] = useState({
    arete: '',
    sexo: 'macho',
    peso_entrada: '',
    meses: '',
    precio_compra: '',
    id_proveedor: '',
    id_corral: '',
    observaciones: ''
  });

  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [corrales, setCorrales] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  // =============================================
  // SOLO UN useEffect y SOLO UNA función cargarCatalogos
  // =============================================
  useEffect(() => {
    cargarCatalogos();
  }, []);

   const cargarCatalogos = async () => {
    setCargandoCatalogos(true);
    try {
      const [provRes, corrRes] = await Promise.all([
        recepcionApi.getProveedores(),
        recepcionApi.getCorralesDisponibles()
      ]);

      // Verificar que la respuesta tenga datos
      console.log('Proveedores recibidos:', provRes.data);
      console.log('Corrales recibidos:', corrRes.data);

      // Mapear proveedores para el AutocompleteInput
      const proveedoresMapeados = (provRes.data || []).map(p => ({
        id: p.id_proveedor,
        label: p.nombre || 'Sin nombre',
        sublabel: p.rfc ? `RFC: ${p.rfc}` : undefined,
        extra: p.telefono || p.celular || undefined
      }));

      // Mapear proveedores para el AutocompleteInput
      setProveedores(proveedoresMapeados)
      setCorrales(corrRes.data);
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
      mostrarMensaje('error', 'No se pudieron cargar los catálogos. Verifica que el backend esté corriendo.');
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

    const manejarSeleccionProveedor = (option) => {
    if (option) {
      setProveedorSeleccionado(option);
      setForm(prev => ({ ...prev, id_proveedor: option.id }));
    } else {
      setProveedorSeleccionado(null);
      setForm(prev => ({ ...prev, id_proveedor: '' }));
    }
  };

  const validarFormulario = () => {
    if (!form.arete.trim()) return 'El arete es obligatorio';
    if (!form.peso_entrada || form.peso_entrada <= 0) return 'Peso inválido';
    if (!form.meses || form.meses < 1 || form.meses > 300) return 'Meses inválidos (1-300)';
    if (!form.precio_compra || form.precio_compra <= 0) return 'Precio inválido';
    if (!form.id_proveedor) return 'Seleccione un proveedor';
    return null;
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();

    const error = validarFormulario();
    if (error) {
      mostrarMensaje('error', error);
      return;
    }

    setCargando(true);
    try {
      const datos = {
        ...form,
        peso_entrada: parseFloat(form.peso_entrada),
        meses: parseInt(form.meses),
        precio_compra: parseFloat(form.precio_compra),
        id_proveedor: parseInt(form.id_proveedor),
        id_corral: form.id_corral ? parseInt(form.id_corral) : null
      };

      const respuesta = await recepcionApi.registrarAnimal(datos);
      mostrarMensaje('exito', `✅ ${respuesta.data.mensaje}`);

      // Limpiar formulario
      setForm(prev => ({
        ...prev,
        arete: '',
        peso_entrada: '',
        meses: '',
        precio_compra: '',
        observaciones: ''
      }));
      setProveedorSeleccionado(null);
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al registrar animal';
      mostrarMensaje('error', msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">🐄 Registrar Animal Individual</h2>

      {mensaje && (
        <div className={`p-3 mb-4 rounded ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' :
          mensaje.tipo === 'info' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={manejarEnvio} className="space-y-4 max-w-lg">
        {/* Arete */}
        <div>
          <label className="block text-sm font-medium mb-1">Arete *</label>
          <input
            type="text"
            name="arete"
            value={form.arete}
            onChange={manejarCambio}
            className="w-full border rounded p-2 uppercase"
            placeholder="Ej: BOV-2024-001"
            required
          />
        </div>

        {/* Sexo */}
        <div>
          <label className="block text-sm font-medium mb-1">Sexo *</label>
          <select
            name="sexo"
            value={form.sexo}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
          >
            <option value="macho">Macho</option>
            <option value="hembra">Hembra</option>
          </select>
        </div>

        {/* Peso y Meses */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Peso (kg) *</label>
            <input
              type="number"
              name="peso_entrada"
              value={form.peso_entrada}
              onChange={manejarCambio}
              className="w-full border rounded p-2"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meses *</label>
            <input
              type="number"
              name="meses"
              value={form.meses}
              onChange={manejarCambio}
              className="w-full border rounded p-2"
              min="1"
              max="300"
              required
            />
          </div>
        </div>

        {/* Precio de compra */}
        <div>
          <label className="block text-sm font-medium mb-1">Precio de compra *</label>
          <input
            type="number"
            name="precio_compra"
            value={form.precio_compra}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Proveedor con Autocomplete */}
        <div>
            <label className="block text-sm font-medium mb-1">
            🏢 Proveedor / Ganadería *
          </label>
          <AutocompleteInput
            options={proveedores}
            value={proveedorSeleccionado?.label || ''}
            onChange={manejarSeleccionProveedor}
            placeholder="Buscar proveedor por nombre o RFC..."
            required
          />
          {cargandoCatalogos && (
            <p className="text-xs text-gray-400 mt-1">Cargando proveedores...</p>
          )}
          {!cargandoCatalogos && proveedores.length === 0 && (
            <p className="text-xs text-orange-500 mt-1">
              ⚠️ No hay proveedores registrados. Agregue uno en el directorio de contactos.
            </p>
          )}
        </div>

        {/* Corral */}
        <div>
          <label className="block text-sm font-medium mb-1">Corral</label>
          <select
            name="id_corral"
            value={form.id_corral}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
          >
            <option value="">Sin asignar</option>
            {corrales.map(c => (
              <option key={c.id_corral} value={c.id_corral}>
                {c.nombre} ({c.disponibles || c.capacidad} lugares)
              </option>
            ))}
          </select>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
            rows="3"
            placeholder="Notas adicionales..."
          />
        </div>

        {/* Botón */}
        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {cargando ? '⏳ Registrando...' : '✅ Registrar Animal'}
        </button>
      </form>
    </div>
  );
}