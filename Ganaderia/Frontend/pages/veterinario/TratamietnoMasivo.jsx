import React, { useState, useEffect } from 'react';
import { medicamentosApi } from '../../api/medicamentosApi';
import { corralesApi } from '../../api/corralesApi';

export default function TratamientoMasivo() {
  const [corrales, setCorrales] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [form, setForm] = useState({
    id_corral: '',
    id_medicamento: '',
    fecha_aplicacion: new Date().toISOString().split('T')[0],
    observaciones: '',
    id_empleado: 4
  });
  const [corralInfo, setCorralInfo] = useState(null);
  const [medicamentoInfo, setMedicamentoInfo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    Promise.all([
      medicamentosApi.getAll(),
      corralesApi.getAll()
    ]).then(([medRes, corrRes]) => {
      setMedicamentos(medRes.data);
      setCorrales(corrRes.data);
    });
  }, []);

  const handleSelectCorral = async (id) => {
    setForm(prev => ({ ...prev, id_corral: id }));
    if (!id) return;
    
    try {
      const res = await corralesApi.getById(id);
      setCorralInfo(res.data);
    } catch (error) {
      setCorralInfo(null);
    }
  };

  const handleSelectMedicamento = (id) => {
    setForm(prev => ({ ...prev, id_medicamento: id }));
    const med = medicamentos.find(m => m.id_medicamento === parseInt(id));
    setMedicamentoInfo(med);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    
    setCargando(true);
    try {
      const res = await medicamentosApi.aplicarTratamientoMasivo(form);
      setMensaje({ 
        tipo: 'exito', 
        texto: `✅ Tratamiento masivo aplicado a ${res.data.animales_tratados} animales del corral ${corralInfo?.corral?.nombre}` 
      });
      setConfirmando(false);
      setForm(prev => ({ ...prev, observaciones: '' }));
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.detail || 'Error' });
      setConfirmando(false);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">🏥 Tratamiento Masivo por Corral</h2>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Corral */}
          <div>
            <label className="block text-sm font-semibold mb-2">🏠 Corral *</label>
            <select
              value={form.id_corral}
              onChange={e => handleSelectCorral(e.target.value)}
              className="w-full border rounded-lg p-3"
              required
            >
              <option value="">Seleccione corral...</option>
              {corrales.map(c => (
                <option key={c.id_corral} value={c.id_corral}>
                  {c.nombre} — {c.ocupacion || 0} animales
                </option>
              ))}
            </select>
          </div>

          {/* Info corral */}
          {corralInfo && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-semibold">{corralInfo.corral.nombre}</p>
              <p className="text-sm">
                Animales: {corralInfo.animales?.length || 0} | 
                Peso promedio: {corralInfo.corral.peso_promedio || 'N/A'} kg
              </p>
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
              {medicamentos.filter(m => m.activo && m.stock_actual > 0).map(m => (
                <option key={m.id_medicamento} value={m.id_medicamento}>
                  {m.nombre} — Stock: {m.stock_actual} {m.unidad_medida}
                </option>
              ))}
            </select>
          </div>

          {medicamentoInfo?.requiere_retiro && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm">⚠️ Periodo de retiro: {medicamentoInfo.retiro_dias} días</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">📅 Fecha</label>
            <input
              type="date"
              value={form.fecha_aplicacion}
              onChange={e => setForm({...form, fecha_aplicacion: e.target.value})}
              className="w-full border rounded-lg p-3"
            />
          </div>

          <textarea
            value={form.observaciones}
            onChange={e => setForm({...form, observaciones: e.target.value})}
            className="w-full border rounded-lg p-3"
            rows="2"
            placeholder="Observaciones..."
          />

          {!confirmando ? (
            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700">
              🏥 Revisar y Confirmar
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="font-bold text-yellow-800">⚠️ Confirmar Tratamiento Masivo</p>
                <p className="text-sm mt-1">
                  Se aplicará <strong>{medicamentoInfo?.nombre}</strong> a 
                  <strong> {corralInfo?.animales?.length || 0} animales</strong> del corral 
                  <strong> {corralInfo?.corral?.nombre}</strong>.
                </p>
                <p className="text-sm">Stock actual: {medicamentoInfo?.stock_actual} {medicamentoInfo?.unidad_medida}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700"
                >
                  {cargando ? 'Aplicando...' : '✅ Confirmar Aplicación'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Lista de animales del corral */}
        {corralInfo?.animales && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">
              Animales en {corralInfo.corral.nombre} ({corralInfo.animales.length})
            </h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Arete</th>
                    <th className="py-2">Sexo</th>
                    <th className="py-2">Peso</th>
                    <th className="py-2">En retiro</th>
                  </tr>
                </thead>
                <tbody>
                  {corralInfo.animales.map(a => (
                    <tr key={a.arete} className="border-b">
                      <td className="py-2">{a.arete}</td>
                      <td>{a.sexo === 'macho' ? '♂️' : '♀️'}</td>
                      <td>{a.peso_actual || a.peso_entrada} kg</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${
                          a.en_retiro ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {a.en_retiro ? 'Sí' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}