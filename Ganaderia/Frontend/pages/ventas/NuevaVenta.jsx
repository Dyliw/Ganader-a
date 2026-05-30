import React, { useState, useEffect, useMemo } from 'react';
import { ventasApi } from '../../api/ventasApi';
import { medicamentosApi } from '../../api/medicamentosApi';

export default function NuevaVenta() {
  const [compradores, setCompradores] = useState([]);
  const [animalesDisponibles, setAnimalesDisponibles] = useState([]);
  const [animalesSeleccionados, setAnimalesSeleccionados] = useState([]);
  const [busquedaArete, setBusquedaArete] = useState('');
  const [form, setForm] = useState({
    id_comprador: '',
    precio_kg: '',
    fecha_venta: new Date().toISOString().split('T')[0],
  });
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [mostrarNuevoComprador, setMostrarNuevoComprador] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const [compRes, animRes] = await Promise.all([
        ventasApi.getCompradores(),  
      ventasApi.getAnimalesDisponibles()
      ]);
      setCompradores(compRes.data);
      setAnimalesDisponibles(animRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar datos iniciales' });
    }
  };

  // Agregar animal por arete
  const agregarAnimal = (arete) => {
    const animal = animalesDisponibles.find(a => a.arete === arete.toUpperCase());
    
    if (!animal) {
      setMensaje({ tipo: 'error', texto: `Animal "${arete}" no encontrado o no disponible` });
      return;
    }

    if (animalesSeleccionados.find(a => a.arete === animal.arete)) {
      setMensaje({ tipo: 'error', texto: 'Este animal ya está en la lista' });
      return;
    }

    if (animal.en_retiro) {
      setMensaje({ 
        tipo: 'error', 
        texto: `⚠️ ${animal.arete} está en periodo de retiro hasta ${new Date(animal.fecha_disponible).toLocaleDateString()}` 
      });
      return;
    }

    setAnimalesSeleccionados(prev => [...prev, animal]);
    setBusquedaArete('');
    setMensaje(null);
  };

  // Quitar animal de la lista
  const quitarAnimal = (arete) => {
    setAnimalesSeleccionados(prev => prev.filter(a => a.arete !== arete));
  };

  // Peso total de animales seleccionados
  const pesoTotal = useMemo(() => {
    return animalesSeleccionados.reduce((sum, a) => sum + (a.peso_actual || a.peso_entrada), 0);
  }, [animalesSeleccionados]);

  // Total de la venta
  const totalVenta = useMemo(() => {
    return pesoTotal * (parseFloat(form.precio_kg) || 0);
  }, [pesoTotal, form.precio_kg]);

  // Procesar venta
  const procesarVenta = async () => {
    // Validaciones
    if (!form.id_comprador) {
      setMensaje({ tipo: 'error', texto: 'Seleccione un comprador' });
      return;
    }
    if (!form.precio_kg || parseFloat(form.precio_kg) <= 0) {
      setMensaje({ tipo: 'error', texto: 'Ingrese un precio por kg válido' });
      return;
    }
    if (animalesSeleccionados.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Seleccione al menos un animal' });
      return;
    }

    setCargando(true);
    setMensaje(null);

    try {
      const data = {
        id_comprador: parseInt(form.id_comprador),
        precio_kg: parseFloat(form.precio_kg),
        fecha_venta: form.fecha_venta,
        animales: animalesSeleccionados.map(a => ({
          arete: a.arete,
          peso: a.peso_actual || a.peso_entrada
        }))
      };

      const res = await ventasApi.crearVenta(data);
      
      setVentaExitosa(res.data);
      setMensaje({ tipo: 'exito', texto: '✅ Venta procesada exitosamente' });
      
    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: error.response?.data?.detail || 'Error al procesar la venta' 
      });
    } finally {
      setCargando(false);
    }
  };

  const nuevaVenta = () => {
    setAnimalesSeleccionados([]);
    setForm({ id_comprador: '', precio_kg: '', fecha_venta: new Date().toISOString().split('T')[0] });
    setVentaExitosa(null);
    setMensaje(null);
    cargarDatosIniciales();
  };

  const descargarPDF = async () => {
    if (!ventaExitosa?.id_venta) return;
    
    try {
      const res = await ventasApi.generarPDF(ventaExitosa.id_venta);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `venta_${ventaExitosa.id_venta}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al generar PDF' });
    }
  };

  if (ventaExitosa) {
    return (
      <div className="p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-2xl font-bold text-green-800 mb-2">¡Venta Exitosa!</h2>
          <p className="text-lg mb-4">Venta #{ventaExitosa.id_venta} procesada correctamente</p>
          
          <div className="bg-white rounded-lg p-4 inline-block text-left mb-6">
            <p><strong>Comprador:</strong> {ventaExitosa.comprador}</p>
            <p><strong>Animales vendidos:</strong> {ventaExitosa.cantidad_animales}</p>
            <p><strong>Peso total:</strong> {ventaExitosa.peso_total} kg</p>
            <p><strong>Precio por kg:</strong> ${ventaExitosa.precio_kg}</p>
            <p className="text-xl font-bold text-green-700 mt-2">
              Total: ${ventaExitosa.total}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={descargarPDF}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              📄 Descargar Comprobante
            </button>
            <button
              onClick={nuevaVenta}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
            >
              🛒 Nueva Venta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">🛒 Procesar Nueva Venta</h2>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">📋 Datos de la Venta</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Comprador *</label>
                <div className="flex gap-2">
                  <select
                    value={form.id_comprador}
                    onChange={e => setForm({...form, id_comprador: e.target.value})}
                    className="flex-1 border rounded p-2"
                  >
                    <option value="">Seleccionar...</option>
                    {compradores.map(c => (
                      <option key={c.id_comprador} value={c.id_comprador}>{c.nombre}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setMostrarNuevoComprador(true)}
                    className="bg-gray-200 px-3 py-2 rounded hover:bg-gray-300"
                    title="Nuevo comprador"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Precio por kg *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={form.precio_kg}
                    onChange={e => setForm({...form, precio_kg: e.target.value})}
                    className="w-full border rounded p-2 pl-8"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Fecha</label>
                <input
                  type="date"
                  value={form.fecha_venta}
                  onChange={e => setForm({...form, fecha_venta: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>
            </div>
          </div>

          {/* Búsqueda de animales */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">🔍 Agregar Animales</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={busquedaArete}
                onChange={e => setBusquedaArete(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && agregarAnimal(busquedaArete)}
                className="flex-1 border rounded p-2 uppercase"
                placeholder="Ingrese arete (ej: BOV-001)..."
              />
              <button
                onClick={() => agregarAnimal(busquedaArete)}
                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
              >
                Agregar
              </button>
            </div>
            
            {/* Disponibles rápidos */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Animales disponibles:</p>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {animalesDisponibles.slice(0, 20).map(a => (
                  <button
                    key={a.arete}
                    onClick={() => agregarAnimal(a.arete)}
                    disabled={animalesSeleccionados.find(s => s.arete === a.arete)}
                    className={`px-2 py-1 rounded text-xs border ${
                      animalesSeleccionados.find(s => s.arete === a.arete)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {a.arete} ({a.peso_actual || a.peso_entrada}kg)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de animales seleccionados */}
          <div className="bg-white border rounded-lg">
            <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-semibold">
                Animales Seleccionados ({animalesSeleccionados.length})
              </h3>
              {animalesSeleccionados.length > 0 && (
                <button
                  onClick={() => setAnimalesSeleccionados([])}
                  className="text-red-600 text-sm hover:text-red-800"
                >
                  Quitar todos
                </button>
              )}
            </div>

            {animalesSeleccionados.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <p>Busque y agregue animales para la venta</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm border-b">
                      <th className="p-2">Arete</th>
                      <th className="p-2">Clasif.</th>
                      <th className="p-2">Sexo</th>
                      <th className="p-2 text-right">Peso</th>
                      <th className="p-2 text-right">Precio</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {animalesSeleccionados.map(a => {
                      const precioAnimal = (a.peso_actual || a.peso_entrada) * (parseFloat(form.precio_kg) || 0);
                      return (
                        <tr key={a.arete} className="border-t hover:bg-gray-50">
                          <td className="p-2 font-medium">{a.arete}</td>
                          <td className="p-2 text-sm">{a.clasificacion || '-'}</td>
                          <td className="p-2 text-sm">{a.sexo === 'macho' ? '♂️' : '♀️'}</td>
                          <td className="p-2 text-right">{a.peso_actual || a.peso_entrada} kg</td>
                          <td className="p-2 text-right font-medium">${precioAnimal.toFixed(2)}</td>
                          <td className="p-2">
                            <button
                              onClick={() => quitarAnimal(a.arete)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 sticky top-4">
            <h3 className="font-semibold text-lg mb-4">💵 Resumen de Venta</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Animales:</span>
                <span className="font-bold">{animalesSeleccionados.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Peso total:</span>
                <span className="font-bold">{pesoTotal.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Precio/kg:</span>
                <span className="font-bold">${parseFloat(form.precio_kg || 0).toFixed(2)}</span>
              </div>
              
              <hr />
              
              <div className="flex justify-between text-lg">
                <span className="font-bold">TOTAL:</span>
                <span className="font-bold text-emerald-700">${totalVenta.toFixed(2)}</span>
              </div>

              {animalesSeleccionados.length > 0 && form.precio_kg && (
                <div className="text-xs text-gray-400">
                  Promedio: {(pesoTotal / animalesSeleccionados.length).toFixed(1)} kg/animal
                </div>
              )}
            </div>

            <button
              onClick={procesarVenta}
              disabled={cargando || animalesSeleccionados.length === 0 || !form.precio_kg || !form.id_comprador}
              className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-lg font-semibold
                         hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? '⏳ Procesando...' : '💰 Procesar Venta'}
            </button>
          </div>
        </div>
      </div>

      {mostrarNuevoComprador && (
        <ModalNuevoComprador
          onClose={() => setMostrarNuevoComprador(false)}
          onSave={(nuevoComprador) => {
            setCompradores(prev => [...prev, nuevoComprador]);
            setForm(prev => ({ ...prev, id_comprador: nuevoComprador.id_comprador }));
            setMostrarNuevoComprador(false);
          }}
        />
      )}
    </div>
  );
}

// Componente modal para nuevo comprador
function ModalNuevoComprador({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre: '', rfc: '', telefono: '', direccion: '' });
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await ventasApi.createComprador(form);
      onSave(res.data);
    } catch (error) {
      alert('Error al crear comprador');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">👤 Nuevo Comprador</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Nombre o razón social *"
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
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
            <button type="submit" disabled={cargando} className="px-4 py-2 bg-emerald-600 text-white rounded">
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}