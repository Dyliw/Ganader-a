import React, { useState, useEffect } from 'react';
import { medicamentosApi } from '../../api/medicamentosApi';

export default function AplicarTratamiento() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [form, setForm] = useState({
    arete: '',
    id_medicamento: '',
    dosis_aplicada: '',
    fecha_aplicacion: new Date().toISOString().split('T')[0],
    observaciones: '',
    id_empleado: 4
  });
  const [medicamentoInfo, setMedicamentoInfo] = useState(null);
  const [animalInfo, setAnimalInfo] = useState(null);
  const [dosisCalculada, setDosisCalculada] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [buscandoAnimal, setBuscandoAnimal] = useState(false);

  useEffect(() => {
    medicamentosApi.getAll().then(res => setMedicamentos(res.data));
  }, []);

  // Cuando selecciona medicamento, mostrar info
  const handleSelectMedicamento = (id) => {
    setForm(prev => ({ ...prev, id_medicamento: id }));
    const med = medicamentos.find(m => m.id_medicamento === parseInt(id));
    setMedicamentoInfo(med);
    setDosisCalculada(null);
    
    // Si ya hay arete, calcular dosis
    if (form.arete && id) {
      calcularDosisAutomatica(id, form.arete);
    }
  };

  // Buscar animal por arete
  const handleBuscarAnimal = async () => {
    if (!form.arete.trim()) return;
    
    setBuscandoAnimal(true);
    try {
      const { animalesApi } = await import('../../api/animalesApi');
      const res = await animalesApi.getById(form.arete.trim().toUpperCase());
      setAnimalInfo(res.data);
      
      if (form.id_medicamento) {
        calcularDosisAutomatica(form.id_medicamento, form.arete);
      }
    } catch (error) {
      setAnimalInfo(null);
      setMensaje({ tipo: 'error', texto: 'Animal no encontrado' });
    } finally {
      setBuscandoAnimal(false);
    }
  };

  // Calcular dosis automática
  const calcularDosisAutomatica = async (idMed, arete) => {
    try {
      const res = await medicamentosApi.calcularDosis(idMed, arete);
      setDosisCalculada(res.data);
      setForm(prev => ({ 
        ...prev, 
        dosis_aplicada: res.data.dosis_calculada 
      }));
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al calcular dosis' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    try {
      const res = await medicamentosApi.aplicarTratamiento({
        ...form,
        dosis_aplicada: parseFloat(form.dosis_aplicada),
        id_medicamento: parseInt(form.id_medicamento)
      });

      setMensaje({ 
        tipo: 'exito', 
        texto: `✅ Tratamiento aplicado. ${res.data.fecha_disponible ? 
          `Animal en retiro hasta: ${new Date(res.data.fecha_disponible).toLocaleDateString()}` : 
          'Sin periodo de retiro.'}`
      });

      // Limpiar
      setForm(prev => ({
        ...prev,
        arete: '',
        dosis_aplicada: '',
        observaciones: ''
      }));
      setAnimalInfo(null);
      setDosisCalculada(null);

    } catch (error) {
      setMensaje({ 
        tipo: 'error', 
        texto: error.response?.data?.detail || 'Error al aplicar tratamiento' 
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">💉 Aplicar Tratamiento Individual</h2>

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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Arete del animal */}
            <div>
              <label className="block text-sm font-semibold mb-2">🐄 Arete del Animal *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.arete}
                  onChange={e => setForm({...form, arete: e.target.value.toUpperCase()})}
                  onBlur={handleBuscarAnimal}
                  className="flex-1 border rounded-lg p-3 uppercase"
                  placeholder="Ej: BOV-001"
                  required
                />
                <button
                  type="button"
                  onClick={handleBuscarAnimal}
                  disabled={buscandoAnimal}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  {buscandoAnimal ? '🔍...' : '🔍 Buscar'}
                </button>
              </div>
            </div>

            {/* Info del animal encontrado */}
            {animalInfo && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Clasificación:</span>
                    <p className="font-semibold">{animalInfo.clasificacion || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Peso actual:</span>
                    <p className="font-semibold">{animalInfo.peso_actual || animalInfo.peso_entrada} kg</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Estado:</span>
                    <p className="font-semibold">{animalInfo.estado_nombre}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Corral:</span>
                    <p className="font-semibold">{animalInfo.corral_nombre || 'Sin asignar'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Medicamento */}
            <div>
              <label className="block text-sm font-semibold mb-2">💊 Medicamento *</label>
              <select
                value={form.id_medicamento}
                onChange={e => handleSelectMedicamento(e.target.value)}
                className="w-full border rounded-lg p-3"
                required
              >
                <option value="">Seleccione medicamento...</option>
                {medicamentos.filter(m => m.activo).map(m => (
                  <option key={m.id_medicamento} value={m.id_medicamento}>
                    {m.nombre} — {m.tipo_dosis === 'Fija' ? 'Dosis fija' : 'Por peso'} 
                    — Stock: {m.stock_actual}
                  </option>
                ))}
              </select>
            </div>

            {/* Info del medicamento */}
            {medicamentoInfo && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="font-semibold">{medicamentoInfo.nombre}</p>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <p>{medicamentoInfo.tipo_dosis === 'Fija' ? 'Dosis Fija' : 'Proporcional al peso'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Stock:</span>
                    <p className={medicamentoInfo.stock_actual <= medicamentoInfo.stock_minimo ? 'text-red-600 font-bold' : ''}>
                      {medicamentoInfo.stock_actual} {medicamentoInfo.unidad_medida}
                    </p>
                  </div>
                  {medicamentoInfo.requiere_retiro && (
                    <div>
                      <span className="text-gray-500">Retiro:</span>
                      <p className="text-orange-600 font-bold">{medicamentoInfo.retiro_dias} días</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <p>{medicamentoInfo.tipo_medicamento_nombre}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Dosis */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                💉 Dosis ({medicamentoInfo?.unidad_medida || 'ml'}) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.dosis_aplicada}
                  onChange={e => setForm({...form, dosis_aplicada: e.target.value})}
                  className="flex-1 border rounded-lg p-3"
                  step="0.01"
                  min="0"
                  required
                />
                {dosisCalculada && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ 
                      ...prev, 
                      dosis_aplicada: dosisCalculada.dosis_calculada 
                    }))}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                  >
                    💡 {dosisCalculada.dosis_calculada}
                  </button>
                )}
              </div>
              {dosisCalculada && (
                <p className="text-sm text-gray-500 mt-1">
                  {dosisCalculada.tipo_dosis === 'Fija' 
                    ? `Dosis fija: ${dosisCalculada.dosis_fija} ${medicamentoInfo?.unidad_medida}`
                    : `Cálculo: ${dosisCalculada.dosis_kg} × ${dosisCalculada.peso_animal} kg = ${dosisCalculada.dosis_calculada} ${medicamentoInfo?.unidad_medida}`
                  }
                </p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-semibold mb-2">📅 Fecha de Aplicación</label>
              <input
                type="date"
                value={form.fecha_aplicacion}
                onChange={e => setForm({...form, fecha_aplicacion: e.target.value})}
                className="w-full border rounded-lg p-3"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-semibold mb-2">📝 Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm({...form, observaciones: e.target.value})}
                className="w-full border rounded-lg p-3"
                rows="2"
                placeholder="Síntomas, motivo del tratamiento..."
              />
            </div>

            {/* Retiro info */}
            {medicamentoInfo?.requiere_retiro && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  ⚠️ Este medicamento requiere {medicamentoInfo.retiro_dias} días de retiro.
                  El animal no podrá venderse hasta después de ese periodo.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando || !animalInfo}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold
                         hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {cargando ? '⏳ Aplicando...' : '💉 Aplicar Tratamiento'}
            </button>
          </form>
        </div>

        <div>
          {animalInfo ? (
            <UltimosTratamientos arete={animalInfo.arete} />
          ) : (
            <div className="bg-gray-50 rounded-lg p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">🐄</p>
              <p>Busque un animal para ver su historial</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UltimosTratamientos({ arete }) {
  const [tratamientos, setTratamientos] = useState([]);

  useEffect(() => {
    medicamentosApi.getHistorialAnimal(arete, { limite: 10 })
      .then(res => setTratamientos(res.data.tratamientos || res.data))
      .catch(() => setTratamientos([]));
  }, [arete]);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold mb-3">📋 Últimos Tratamientos</h3>
      {tratamientos.length === 0 ? (
        <p className="text-gray-400 text-sm">Sin tratamientos previos</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tratamientos.map((t, i) => (
            <div key={i} className="bg-white p-3 rounded border text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{t.medicamento_nombre}</span>
                <span className="text-gray-500">{new Date(t.fecha_aplicacion).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-600">Dosis: {t.dosis_aplicada}</p>
              {t.fecha_disponible && (
                <p className={`text-xs ${new Date(t.fecha_disponible) > new Date() ? 'text-orange-600' : 'text-green-600'}`}>
                  {new Date(t.fecha_disponible) > new Date() 
                    ? `⚠️ En retiro hasta: ${new Date(t.fecha_disponible).toLocaleDateString()}`
                    : '✅ Retiro cumplido'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}