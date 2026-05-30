import React, { useState, useEffect } from 'react';
import { recepcionApi } from '../../api/recepcionApi';

export default function GuiaTransito() {
  const [form, setForm] = useState({
    numero_guia: '',
    id_proveedor: '',
    motivo: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  const [proveedores, setProveedores] = useState([]);
  
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState(''); 
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    recepcionApi.getProveedores()
      .then(res => setProveedores(res.data || []))
      .catch(() => setProveedores([]));
  }, []);

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');
    setTipoMensaje('');
    
    try {
      const datos = {
        numero_guia: form.numero_guia.trim(),
        id_proveedor: parseInt(form.id_proveedor),
        motivo: form.motivo.trim(),
        fecha: form.fecha || null,
        observaciones: form.observaciones.trim() || null
      };
      if (!datos.numero_guia) {
        setMensaje('El número de guía es obligatorio');
        setTipoMensaje('error');
        setCargando(false);
        return;
      }
      if (!datos.id_proveedor || isNaN(datos.id_proveedor)) {
        setMensaje('Seleccione un proveedor');
        setTipoMensaje('error');
        setCargando(false);
        return;
      }
      if (!datos.motivo) {
        setMensaje('El motivo es obligatorio');
        setTipoMensaje('error');
        setCargando(false);
        return;
      }

      const res = await recepcionApi.registrarGuia(datos);
      
      setMensaje(`Guía #${res.data.id_guia || ''} registrada exitosamente`);
      setTipoMensaje('exito');
      
      // Limpiar formulario manteniendo valores iniciales (no undefined)
      setForm({
        numero_guia: '',
        id_proveedor: '',
        motivo: '',
        fecha: new Date().toISOString().split('T')[0],
        observaciones: ''
      });
      
    } catch (error) {
      console.error('Error completo:', error);
      let textoError = 'Error al registrar la guía';
      
      if (error.response?.status === 422) {
        const detail = error.response?.data?.detail;
        
        if (Array.isArray(detail)) {
          textoError = detail.map(err => err.msg).join('. ');
        } else if (typeof detail === 'string') {
          textoError = detail;
        } else if (typeof detail === 'object') {
          textoError = JSON.stringify(detail);
        }
      } else if (error.response?.data?.detail) {
        textoError = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else if (error.message) {
        textoError = error.message;
      }
      
      setMensaje(textoError);
      setTipoMensaje('error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">📋 Registrar Guía de Tránsito</h2>
      
      {mensaje && (
        <div className={`p-3 mb-4 rounded ${
          tipoMensaje === 'exito' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {mensaje}
        </div>
      )}

      <form onSubmit={manejarEnvio} className="space-y-4 max-w-lg">
        {/* Número de Guía */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Número de Guía *
          </label>
          <input
            type="text"
            name="numero_guia"
            value={form.numero_guia}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
            placeholder="Ej: GT-2024-001"
            required
          />
        </div>

        {/* Proveedor */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Proveedor *
          </label>
          <select
            name="id_proveedor"
            value={form.id_proveedor}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
            required
          >
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map(p => (
              <option key={p.id_proveedor} value={p.id_proveedor}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Motivo *
          </label>
          <input
            type="text"
            name="motivo"
            value={form.motivo}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
            placeholder="Ej: Compra de ganado"
            required
          />
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Fecha
          </label>
          <input
            type="date"
            name="fecha"
            value={form.fecha}
            onChange={manejarCambio}
            className="w-full border rounded p-2"
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Observaciones
          </label>
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
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {cargando ? '⏳ Registrando...' : '📋 Registrar Guía'}
        </button>
      </form>
    </div>
  );
}