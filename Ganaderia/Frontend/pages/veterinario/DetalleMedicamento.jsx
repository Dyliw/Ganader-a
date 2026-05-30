import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { medicamentosApi } from '../../api/medicamentosApi';

export default function DetalleMedicamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [med, setMed] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    medicamentosApi.getById(id)
      .then(res => setMed(res.data))
      .catch(() => navigate('/veterinario'))
      .finally(() => setCargando(false));
  }, [id]);

  const toggleActivo = async () => {
    await medicamentosApi.deactivate(med.id_medicamento);
    setMed(prev => ({ ...prev, activo: !prev.activo }));
  };

  if (cargando) return <div className="p-10 text-center text-gray-400">Cargando medicamento...</div>;
  if (!med) return null;

  const porcentajeStock = med.stock_actual > 0
    ? Math.min((med.stock_actual / med.stock_minimo) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f6f5f2] p-6 md:p-10">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <button onClick={() => navigate('/veterinario')} className="text-[#7a7a7a] hover:text-[#2f2f2f] mb-2">
            ← Volver a medicamentos
          </button>
          <h1 className="text-4xl font-semibold text-[#2f2f2f]">{med.nombre}</h1>
          <p className="text-[#7a7a7a]">{med.tipo_medicamento_nombre}</p>
        </div>
        <div className="flex gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            med.activo ? 'bg-[#e4f0de] text-[#557244]' : 'bg-[#ececec] text-[#6e6e6e]'
          }`}>
            {med.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            onClick={toggleActivo}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              med.activo
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {med.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button
            onClick={() => navigate(`/veterinario/editar/${id}`)} // O abrir modal
            className="bg-[#5f7c4d] text-white px-4 py-2 rounded-xl text-sm hover:bg-[#4e6840]"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stock */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ece8df]">
          <p className="text-[#7a7a7a] text-sm">Stock disponible</p>
          <p className="text-3xl font-bold text-[#2f2f2f]">{med.stock_actual} <span className="text-lg font-normal text-[#7a7a7a]">{med.unidad_medida}</span></p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="h-2 rounded-full bg-[#5f7c4d]"
              style={{ width: `${porcentajeStock}%` }}
            />
          </div>
          <p className="text-xs text-[#7a7a7a] mt-1">Mínimo: {med.stock_minimo} {med.unidad_medida}</p>
        </div>

        {/* Tipo de dosis */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ece8df]">
          <p className="text-[#7a7a7a] text-sm">Tipo de dosis</p>
          <p className="text-2xl font-bold text-[#2f2f2f] mt-1">{med.tipo_dosis}</p>
          {med.tipo_dosis === 'Fija' ? (
            <p className="text-sm text-[#7a7a7a]">Dosis: {med.dosis_fija} {med.unidad_medida}</p>
          ) : (
            <p className="text-sm text-[#7a7a7a]">Dosis: {med.dosis_kg} {med.unidad_medida}/kg</p>
          )}
        </div>

        {/* Retiro */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ece8df]">
          <p className="text-[#7a7a7a] text-sm">Periodo de retiro</p>
          {med.requiere_retiro ? (
            <>
              <p className="text-2xl font-bold text-orange-600 mt-1">{med.retiro_dias} días</p>
              <p className="text-xs text-[#7a7a7a]">El animal no puede venderse durante este periodo</p>
            </>
          ) : (
            <p className="text-2xl font-bold text-green-600 mt-1">No requiere</p>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#ece8df] p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Información general</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-[#7a7a7a]">Tipo de medicamento</dt>
                <dd className="font-medium">{med.tipo_medicamento_nombre}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#7a7a7a]">Fabricante</dt>
                <dd>{med.empresa_fabricante || 'No especificado'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#7a7a7a]">Stock mínimo</dt>
                <dd>{med.stock_minimo} {med.unidad_medida}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-sm text-[#7a7a7a] mb-2">Descripción / Indicaciones</h3>
            <p className="text-[#2f2f2f] bg-[#f8f6f1] rounded-xl p-4">
              {med.descripcion || 'Sin descripción.'}
            </p>
          </div>
        </div>
      </div>

      <div className="text-center text-[#7a7a7a] text-sm">
        💊 {med.nombre} · {med.tipo_medicamento_nombre}
      </div>
    </div>
  );
}