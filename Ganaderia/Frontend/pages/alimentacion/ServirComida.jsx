import React, { useState, useEffect } from 'react';
import { alimentacionApi } from '../../api/alimentacionApi';
import { corralesApi } from '../../api/corralesApi';

export default function ServirComida() {
  const [corrales, setCorrales] = useState([]);
  const [form, setForm] = useState({
    id_corral: '',
    cantidad_kg: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [corralInfo, setCorralInfo] = useState(null);
  const [sugerido, setSugerido] = useState(null);
  const [ingredientesFaltantes, setIngredientesFaltantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarSustitucion, setMostrarSustitucion] = useState(false);

  useEffect(() => {
    cargarCorrales();
  }, []);

  const cargarCorrales = async () => {
    try {
      const res = await alimentacionApi.getCorralesConDieta();
      setCorrales(res.data);
    } catch (error) {
      console.error('Error cargando corrales:', error);
    }
  };
const handleSelectCorral = async (idCorral) => {
  setForm(prev => ({ ...prev, id_corral: idCorral }));
  setCorralInfo(null);
  setSugerido(null);
  setIngredientesFaltantes([]);
  
  if (!idCorral) return;

  try {
    // Obtener info del corral + animales
    const corralRes = await corralesApi.getById(idCorral);
    console.log('📦 Respuesta corral:', corralRes.data); 
    setCorralInfo(corralRes.data);

    // Calcular comida sugerida
    const calcRes = await alimentacionApi.calcularComida(idCorral);
    console.log('🧮 Respuesta cálculo:', calcRes.data); 
    if (calcRes.data) {
      setSugerido(calcRes.data);
      
      // Si hay kg sugeridos, ponerlos en el form
      if (calcRes.data.kg_sugeridos && calcRes.data.kg_sugeridos > 0) {
        setForm(prev => ({ 
          ...prev, 
          cantidad_kg: calcRes.data.kg_sugeridos 
      ? Math.round(calcRes.data.kg_sugeridos).toString() 
      : ''
        }));
      }
    } else {
      console.warn('⚠️ Respuesta de cálculo vacía:', calcRes);
      setMensaje({ tipo: 'error', texto: 'No se pudo calcular la comida sugerida' });
    }
  } catch (error) {
    console.error('❌ Error en handleSelectCorral:', error);
    console.error('Respuesta del error:', error.response?.data);
    setMensaje({ 
      tipo: 'error', 
      texto: error.response?.data?.detail || 'Error al calcular comida sugerida' 
    });
  }
};

  const handleServir = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);
    
    try {
      const data = {
        ...form,
        cantidad_kg: parseFloat(form.cantidad_kg)
      };
      
      const res = await alimentacionApi.servirComida(data);
      
      setMensaje({ 
        tipo: 'exito', 
        texto: `✅ ${res.data.mensaje} - Ingredientes descontados correctamente` 
      });
      
      // Limpiar form
      setForm(prev => ({ 
        ...prev, 
        cantidad_kg: '',
        observaciones: ''
      }));
      setSugerido(null);
      
    } catch (error) {
      const detail = error.response?.data?.detail;
      
      // Si es error de stock insuficiente
      if (error.response?.status === 409 && error.response?.data?.faltantes) {
        setIngredientesFaltantes(error.response.data.faltantes);
        setMostrarSustitucion(true);
        setMensaje({ 
          tipo: 'error', 
          texto: '⚠️ Stock insuficiente para algunos ingredientes' 
        });
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: detail || 'Error al servir comida' 
        });
      }
    } finally {
      setCargando(false);
    }
  };

  // Usar cantidad sugerida
  const usarSugerido = () => {
    if (sugerido?.kg_sugeridos) {
      setForm(prev => ({ 
        ...prev, 
        cantidad_kg: Math.round(sugerido?.kg_sugeridos) 
      }));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">🍽️ Servir Comida a Corral</h2>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${
          mensaje.tipo === 'exito' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div>
          <form onSubmit={handleServir} className="space-y-4">
            {/* Selección de corral */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                🏠 Corral *
              </label>
              <select
                value={form.id_corral}
                onChange={e => handleSelectCorral(e.target.value)}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Seleccione un corral...</option>
                {corrales.map(c => (
                  <option key={c.id_corral} value={c.id_corral}>
                    {c.nombre} — Dieta: {c.dieta_nombre} — {c.ocupacion}/{c.capacidad} animales
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                📅 Fecha del servicio *
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm({...form, fecha: e.target.value})}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                ⚖️ Cantidad (kg) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.cantidad_kg}
                  onChange={e => setForm({...form, cantidad_kg: e.target.value})}
                  className="flex-1 border rounded-lg p-3"
                  step="0.1"
                  min="0"
                  placeholder="Ingrese kg de alimento..."
                  required
                />
                {sugerido?.kg_sugeridos && (
                  <button
                    type="button"
                    onClick={usarSugerido}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    title="Usar cantidad sugerida según peso del corral"
                  >
                    💡 Sugerido
                  </button>
                )}
              </div>
              {sugerido && (
                <p className="text-sm text-gray-500 mt-1">
                  Sugerido: <strong>{Math.round(sugerido?.kg_sugeridos)} kg</strong> — 
                  Peso total corral: {sugerido.peso_total_corral} kg — 
                  Factor dieta: {sugerido.factor_dieta}
                </p>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                📝 Observaciones
              </label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm({...form, observaciones: e.target.value})}
                className="w-full border rounded-lg p-3"
                rows="2"
                placeholder="Notas adicionales..."
              />
            </div>

            <button
              type="submit"
              disabled={cargando || !form.id_corral || !form.cantidad_kg}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold
                         hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {cargando ? '⏳ Sirviendo...' : '🍽️ Servir Comida'}
            </button>
          </form>
        </div>

        {/* Panel de información */}
        <div>
          {corralInfo ? (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4">
                📋 Info del Corral: {corralInfo.corral.nombre}
              </h3>
              
              {/* Dieta actual */}
              <div className="mb-4 p-3 bg-white rounded border">
                <p className="text-sm text-gray-500">Dieta asignada</p>
                <p className="font-bold text-lg">{corralInfo.corral.dieta_nombre}</p>
                <p className="text-sm text-gray-600">
                  Factor: {corralInfo.corral.factor || 'N/A'}
                </p>
              </div>

              {/* Animales */}
              <div className="mb-4 p-3 bg-white rounded border">
                <p className="text-sm text-gray-500 mb-2">
                  Animales en corral ({corralInfo.animales?.length || 0})
                </p>
                <div className="max-h-48 overflow-y-auto">
                  {corralInfo.animales?.slice(0, 10).map(a => (
                    <div key={a.arete} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span>{a.arete}</span>
                      <span className="text-gray-500">
                        {a.peso_actual || a.peso_entrada} kg
                      </span>
                    </div>
                  ))}
                  {corralInfo.animales?.length > 10 && (
                    <p className="text-sm text-gray-400 mt-1">
                      ...y {corralInfo.animales.length - 10} más
                    </p>
                  )}
                </div>
              </div>

              {/* Sugerencia */}
              {sugerido && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    💡 Cálculo automático
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Peso total:</span>
                      <p className="font-bold">{sugerido.peso_total_corral} kg</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Factor:</span>
                      <p className="font-bold">{sugerido.factor_dieta}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Sugerido:</span>
                      <p className="font-bold text-blue-700">
                        {Math.round(sugerido?.kg_sugeridos)} kg
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">🏠</p>
              <p>Seleccione un corral para ver su información</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de sustitución de ingredientes */}
      {mostrarSustitucion && (
        <SustitucionModal
          ingredientesFaltantes={ingredientesFaltantes}
          idCorral={form.id_corral}
          onClose={() => setMostrarSustitucion(false)}
          onSustituir={(sustituciones) => {
            // Lógica para sustituir
            console.log('Sustituciones:', sustituciones);
            setMostrarSustitucion(false);
          }}
        />
      )}
    </div>
  );
}

// Componente para sustituir ingredientes
function SustitucionModal({ ingredientesFaltantes, onClose, onSustituir }) {
  const [sustituciones, setSustituciones] = useState({});
  const [ingredientesDisponibles, setIngredientesDisponibles] = useState([]);

  useEffect(() => {
    // Cargar ingredientes disponibles (todos los activos)
    import('../../api/dietasApi').then(module => {
      module.ingredientesApi.getAll().then(res => {
        setIngredientesDisponibles(res.data.filter(i => i.activo && i.stock_actual > 0));
      });
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">🔄 Sustituir Ingredientes Faltantes</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Los siguientes ingredientes no tienen stock suficiente. Puede sustituirlos temporalmente:
        </p>

        {ingredientesFaltantes.map(ing => (
          <div key={ing.id_ingrediente} className="mb-4 p-3 bg-red-50 rounded border border-red-200">
            <p className="font-semibold">{ing.nombre}</p>
            <p className="text-sm text-red-600">
              Necesario: {ing.necesario} {ing.unidad_medida} | 
              Disponible: {ing.disponible} {ing.unidad_medida}
            </p>
            <p className="text-sm text-red-600">
              Faltante: {ing.faltante} {ing.unidad_medida}
            </p>
            
            <select
              className="mt-2 w-full border rounded p-2"
              value={sustituciones[ing.id_ingrediente] || ''}
              onChange={e => setSustituciones({
                ...sustituciones,
                [ing.id_ingrediente]: e.target.value
              })}
            >
              <option value="">Seleccionar sustituto...</option>
              {ingredientesDisponibles
                .filter(i => i.id_ingredientes !== ing.id_ingrediente)
                .map(i => (
                  <option key={i.id_ingredientes} value={i.id_ingredientes}>
                    {i.nombre} (Stock: {i.stock_actual} {i.unidad_medida})
                  </option>
                ))
              }
            </select>
          </div>
        ))}

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancelar
          </button>
          <button 
            onClick={() => onSustituir(sustituciones)}
            className="px-4 py-2 bg-orange-600 text-white rounded"
          >
            Aplicar Sustituciones
          </button>
        </div>
      </div>
    </div>
  );
}