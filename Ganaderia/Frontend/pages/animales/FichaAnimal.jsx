import React, { useState, useEffect } from 'react';
import { downloadPDF } from '../../utils/descargarPDF';
import { useParams, useNavigate } from 'react-router-dom';
import { animalesApi } from '../../api/animalesApi';
import { reportesApi } from '../../api/reportesApi';
export default function FichaAnimal() {
  const { arete } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [tabActiva, setTabActiva] = useState('info');
  const [historial, setHistorial] = useState({ movimientos: [], pesos: [], tratamientos: [] });
  const [cargando, setCargando] = useState(true);
  const [mostrarPesar, setMostrarPesar] = useState(false);
  const [mostrarCambiarEstado, setMostrarCambiarEstado] = useState(false);
  useEffect(() => {
    cargarDatos();
  }, [arete]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [animalRes, movRes, pesosRes, tratRes] = await Promise.all([
        animalesApi.getById(arete),
        animalesApi.getHistorialMovimientos(arete),
        animalesApi.getHistorialPesos(arete),
        animalesApi.getHistorialTratamientos(arete)
      ]);
      setAnimal(animalRes.data);
      setHistorial({
        movimientos: movRes.data || [],
        pesos: pesosRes.data || [],
        tratamientos: tratRes.data || []
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  // Estados de carga y error
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando datos de {arete}...</p>
        </div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🐄❓</div>
          <p className="text-xl text-gray-600">Animal no encontrado</p>
          <button 
            onClick={() => navigate('/animales')}
            className="mt-4 text-blue-600 hover:underline"
          >
            ← Volver al catálogo
          </button>
        </div>
      </div>
    );
  }
  const handleDescargarFicha = () =>{
    downloadPDF(
      reportesApi.generarPDF('ficha-animal', {arete: animal.arete}),
      `ficha_${animal.arete}.pdf`
    );
  };

  const estadoColores = {
    'Comprado': 'bg-blue-100 text-blue-800 border-blue-300',
    'Vendido': 'bg-purple-100 text-purple-800 border-purple-300',
    'Muerto': 'bg-red-100 text-red-800 border-red-300',
    'Enfermo': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Activo': 'bg-green-100 text-green-800 border-green-300',
  };

  const tabs = [
    { id: 'info', label: '📋 Información' },
    { id: 'pesos', label: '⚖️ Pesos' },
    { id: 'movimientos', label: '🔄 Movimientos' },
    { id: 'tratamientos', label: '💊 Tratamientos' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* ═══════════ HEADER ═══════════ */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
        
        {/* Barra superior con botón volver */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <button 
            onClick={() => navigate('/animales')}
            className="text-white/80 hover:text-white flex items-center gap-2 transition-colors"
          >
            <span>←</span> Volver al catálogo
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            
            {/* Identidad del animal */}
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="text-6xl bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center flex-shrink-0">
                {animal.sexo === 'macho' ? '🐂' : '🐄'}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{animal.arete}</h1>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${estadoColores[animal.estado_nombre] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                    {animal.estado_nombre}
                  </span>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium border border-indigo-300">
                    {animal.clasificacion || 'Sin clasificar'}
                  </span>
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium border border-teal-300">
                    📍 {animal.corral_nombre || 'Sin corral'}
                  </span>
                  <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium border border-pink-300">
                    {animal.sexo === 'macho' ? '♂️ Macho' : '♀️ Hembra'}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">

             <button onClick={handleDescargarFicha} className="bg-blue-600 text-white px-4 py-2 rounded">
  📄 Descargar Ficha
</button>
              <button 
                onClick={() => setMostrarCambiarEstado(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                🔄 Cambiar Estado
              </button>
              {mostrarCambiarEstado && (
                <ModalCambiarEstado
                  arete={arete}
                  estadoActual={animal.estado_nombre}
                  onClose={() => setMostrarCambiarEstado(false)}
                  onSuccess={() => {
                    setMostrarCambiarEstado(false);
                    cargarDatos();
                  }}
                />
              )}

              <button 
                onClick={() => setMostrarPesar(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
              >
                ⚖️ Registrar Peso
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md">
                Editar
              </button>
            </div>
          </div>

          {/* Cards de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
              <p className="text-amber-600 text-sm font-medium">⚖️ Peso actual</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">
                {animal.peso_actual || animal.peso_entrada}
                <span className="text-lg font-normal text-amber-600"> kg</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-blue-600 text-sm font-medium">🎂 Edad</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {animal.meses}
                <span className="text-lg font-normal text-blue-600"> meses</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <p className="text-green-600 text-sm font-medium">💰 Precio compra</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                ${animal.precio_compra?.toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <p className="text-purple-600 text-sm font-medium">📅 Ingreso</p>
              <p className="text-xl font-bold text-purple-900 mt-1">
                {animal.fecha_ingreso ? new Date(animal.fecha_ingreso).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'short', day: 'numeric'
                }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        
        {/* Navegación de tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`px-6 py-4 font-medium text-sm transition-all relative ${
                  tabActiva === tab.id
                    ? 'text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tabActiva === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de tabs */}
        <div className="p-6">
          
          {/* TAB: INFORMACIÓN */}
          {tabActiva === 'info' && (
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Datos generales */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-2xl">📝</span> Datos generales
                </h3>
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Arete</span>
                    <span className="font-semibold">{animal.arete}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Sexo</span>
                    <span className="font-semibold capitalize">{animal.sexo}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Clasificación</span>
                    <span className="font-semibold">{animal.clasificacion || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Proveedor</span>
                    <span className="font-semibold">{animal.proveedor_nombre || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Registrado por</span>
                    <span className="font-semibold">{animal.creado_por_nombre || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Peso entrada</span>
                    <span className="font-semibold">{animal.peso_entrada} kg</span>
                  </div>
                </div>
              </div>

              {/* Observaciones y estado */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-2xl"></span> Observaciones
                </h3>
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                  <p className="text-gray-700 italic">
                    {animal.observaciones || ' Sin observaciones registradas'}
                  </p>
                </div>

                {/* Si está muerto, mostrar info */}
                {animal.fecha_muerte && (
                  <div className="mt-4 p-5 bg-red-50 rounded-xl border border-red-200">
                    <h4 className="font-semibold text-red-800 flex items-center gap-2">
                      <span>💀</span> Registro de muerte
                    </h4>
                    <p className="text-red-700 mt-2">
                      📅 {new Date(animal.fecha_muerte).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                    <p className="text-red-600 mt-1 text-sm">
                      Causa: {animal.causa_muerte}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PESOS */}
          {tabActiva === 'pesos' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">⚖️</span> Historial de Pesos
                </h3>
                <button 
                  onClick={() => setMostrarPesar(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  + Nuevo registro
                </button>
              </div>

              {historial.pesos.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">⚖️</div>
                  <p className="text-lg">Sin registros de peso</p>
                  <p className="text-sm">El peso de entrada es: {animal.peso_entrada} kg</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left text-sm text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3 text-right">Peso (kg)</th>
                        <th className="px-6 py-3 text-right">Diferencia</th>
                        <th className="px-6 py-3 text-right">Ganancia diaria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {historial.pesos.map((registro, i) => {
                        const anterior = historial.pesos[i + 1];
                        const diff = anterior ? registro.peso - anterior.peso : null;
                        
                        // Calcular días entre registros
                        const diasDiff = anterior 
                          ? Math.round((new Date(registro.fecha) - new Date(anterior.fecha)) / (1000 * 60 * 60 * 24))
                          : null;
                        const gananciaDiaria = diff && diasDiff ? (diff / diasDiff) : null;
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              {new Date(registro.fecha).toLocaleDateString('es-MX', {
                                year: 'numeric', month: 'short', day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-lg">
                              {registro.peso}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {diff !== null ? (
                                <span className={`font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {gananciaDiaria !== null ? (
                                <span className={`text-sm ${gananciaDiaria > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {gananciaDiaria > 0 ? '+' : ''}{gananciaDiaria.toFixed(2)} kg/día
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: MOVIMIENTOS */}
          {tabActiva === 'movimientos' && (
            <div>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="text-2xl">🔄</span> Historial de Movimientos
              </h3>

              {historial.movimientos.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">🔄</div>
                  <p className="text-lg">Sin movimientos registrados</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Línea de tiempo */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                  
                  <div className="space-y-6">
                    {historial.movimientos.map((mov, i) => (
                      <div key={i} className="relative pl-12">
                        {/* Punto en la línea */}
                        <div className="absolute left-2.5 top-2 w-3 h-3 bg-blue-600 rounded-full border-4 border-white shadow"></div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <p className="font-medium text-gray-800">{mov.descripcion}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>📅 {new Date(mov.fecha_evento).toLocaleDateString('es-MX', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}</span>
                            {mov.empleado_nombre && (
                              <span>👤 {mov.empleado_nombre}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: TRATAMIENTOS */}
          {tabActiva === 'tratamientos' && (
            <div>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="text-2xl">💊</span> Historial de Tratamientos
              </h3>

              {historial.tratamientos.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">💊</div>
                  <p className="text-lg">Sin tratamientos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left text-sm text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Medicamento</th>
                        <th className="px-6 py-3 text-right">Dosis</th>
                        <th className="px-6 py-3">Retiro hasta</th>
                        <th className="px-6 py-3">Aplicado por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {historial.tratamientos.map((trat, i) => {
                        const enRetiro = trat.fecha_disponible && new Date(trat.fecha_disponible) > new Date();
                        
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm">
                              {new Date(trat.fecha_aplicacion).toLocaleDateString('es-MX')}
                            </td>
                            <td className="px-6 py-4 font-medium">{trat.medicamento_nombre}</td>
                            <td className="px-6 py-4 text-right">{trat.dosis_aplicada}</td>
                            <td className="px-6 py-4">
                              {trat.fecha_disponible ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  enRetiro 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {new Date(trat.fecha_disponible).toLocaleDateString('es-MX')}
                                  {enRetiro && ' 🔒'}
                                </span>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {trat.empleado_nombre || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ═══════════ MODAL REGISTRAR PESO ═══════════ */}
      {mostrarPesar && (
        <ModalRegistrarPeso 
          arete={arete}
          onClose={() => setMostrarPesar(false)}
          onSuccess={() => {
            setMostrarPesar(false);
            cargarDatos();
          }}
        />
      )}
    </div>
  );
}
// Componente ModalCambiarEstado
function ModalCambiarEstado({ arete, estadoActual, onClose, onSuccess }) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [causaMuerte, setCausaMuerte] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await animalesApi.cambiarEstado(arete, {
        estado: estadoSeleccionado,
        causa_muerte: estadoSeleccionado === 'Muerto' ? causaMuerte : null,
        observaciones
      });
      onSuccess();
    } catch (error) {
      alert('Error al cambiar estado');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-6 py-4">
          <h2 className="text-white font-bold text-lg">🔄 Cambiar Estado</h2>
          <p className="text-yellow-100 text-sm">{arete} — Actual: {estadoActual}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <select
            value={estadoSeleccionado}
            onChange={e => setEstadoSeleccionado(e.target.value)}
            className="w-full border-2 rounded-xl p-3"
            required
          >
            <option value="">Seleccionar nuevo estado...</option>
            <option value="Activo">Activo</option>
            <option value="Enfermo">Enfermo</option>
            <option value="Muerto">Muerto</option>
          </select>

          {estadoSeleccionado === 'Muerto' && (
            <input
              type="text"
              placeholder="Causa de muerte *"
              value={causaMuerte}
              onChange={e => setCausaMuerte(e.target.value)}
              className="w-full border-2 rounded-xl p-3"
              required
            />
          )}

          <textarea
            placeholder="Observaciones..."
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            className="w-full border-2 rounded-xl p-3"
            rows="2"
          />

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border-2 rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-xl">
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ═══════════ COMPONENTE MODAL ═══════════
function ModalRegistrarPeso({ arete, onClose, onSuccess }) {
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!peso || peso <= 0) return;
    
    setCargando(true);
    try {
      await animalesApi.registrarPeso(arete, {
        peso: parseFloat(peso),
        fecha: fecha
      });
      onSuccess();
    } catch (error) {
      alert('Error al registrar peso');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <h2 className="text-white font-bold text-lg">⚖️ Registrar Peso</h2>
          <p className="text-green-100 text-sm">{arete}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peso (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              value={peso}
              onChange={e => setPeso(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-green-500 focus:outline-none text-lg"
              placeholder="Ej: 350.5"
              autoFocus
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-green-500 focus:outline-none"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {cargando ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
