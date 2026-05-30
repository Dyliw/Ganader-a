import React, { useState, useEffect } from 'react';
import { corralesApi } from '../../api/corralesApi';
import { useNavigate } from 'react-router-dom';

export default function CorralesPage() {
  const [corrales, setCorrales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [corralEditar, setCorralEditar] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    cargarCorrales();
  }, []);

  const cargarCorrales = async () => {
    try {
      const res = await corralesApi.getAll();
      setCorrales(res.data);
    } catch (error) {
      console.error('Error al cargar corrales:', error);
    } finally {
      setCargando(false);
    }
  };

  const getColorOcupacion = (porcentaje) => {
    if (porcentaje >= 90) return 'bg-red-500';
    if (porcentaje >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (cargando) return <div className="text-center p-10">Cargando corrales...</div>;

  return (
    <div className="min-h-screen bg-[#f6f5f2] p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-semibold text-[#2f2f2f] tracking-tight"> Corrales</h1>
        <p className="text-[#7a7a7a] mt-1">
    Gestión y monitoreo de ocupación
  </p>
        <button
          onClick={() => {
            setCorralEditar(null);
            setMostrarForm(true);
          }}
          className="
            bg-[#5f7c4d]
            hover:bg-[#4e6840]
            text-white
            px-5
            py-3
            rounded-2xl
            transition-all
            shadow-sm
            font-medium
            "
        >
          + Nuevo Corral
        </button>
      </div>

      {/* Grid de corrales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {corrales.map(corral => (
          <div
            key={corral.id_corral}
            className="
              bg-white/90
              backdrop-blur-sm
              rounded-[28px]
              border
              border-[#ece8df]
              shadow-[0_4px_20px_rgba(0,0,0,0.04)]
              hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)]
              transition-all
              duration-300
              cursor-pointer
              overflow-hidden
              "
            onClick={() => navigate(`/corrales/${corral.id_corral}`)}
          >
            {/* Header de la card */}
            <div className="p-6 border-b border-[#f1eee8]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-semibold text-[#2d2d2d]">{corral.nombre}</h3>
                  <span className="text-sm text-[#8a8a8a] tracking-wide">{corral.tipo_corral}</span>
                </div>
                <span
                className={`
                  px-3 py-1 rounded-full text-xs font-medium
                  ${corral.activo
                    ? 'bg-[#e4f0de] text-[#557244]'
                    : 'bg-[#ececec] text-[#6e6e6e]'
                  }
                `}
              >
  {corral.activo ? 'Activo' : 'Inactivo'}
</span>
              </div>
            </div>

            {/* Cuerpo de la card */}
            <div className="p-6">
              {/* Barra de ocupación */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Ocupación</span>
                  <span className="h-3 rounded-full transition-all duration-500">
                    {corral.ocupacion} / {corral.capacidad}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${getColorOcupacion(corral.porcentaje_ocupacion)}`}
                    style={{ width: `${Math.min(corral.porcentaje_ocupacion, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-[#f8f6f1] p-2 rounded">
                  <p className="text-gray-500">Disponibles</p>
                  <p className="font-bold text-blue-700">{corral.disponibles}</p>
                </div>
                <div className="bg-[#f8f6f1] p-4 rounded-2xl">
                  <p className="text-gray-500">Dieta</p>
                  <p className="font-bold text-purple-700 truncate">{corral.dieta_nombre}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-gray-500">Machos</p>
                  <p className="font-bold text-green-700">{corral.machos || 0}</p>
                </div>
                <div className="bg-pink-50 p-2 rounded">
                  <p className="text-gray-500">Hembras</p>
                  <p className="font-bold text-pink-700">{corral.hembras || 0}</p>
                </div>
              </div>

              {/* Peso promedio */}
              {corral.peso_promedio && (
                <div className="mt-3 text-center bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-500">Peso promedio: </span>
                  <span className="font-bold">{corral.peso_promedio} kg</span>
                </div>
              )}
            </div>

            {/* Footer con acciones */}
            <div className="
              p-5
              border-t
              border-[#f1eee8]
              bg-[#fcfbf8]
              flex
              justify-end
              gap-3
              ">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCorralEditar(corral);
                  setMostrarForm(true);
                }}
                className="
                text-[#5f7c4d]
                hover:bg-[#eef4ea]
                text-sm
                px-4
                py-2
                rounded-xl
                transition-all
                "
              >
               Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/corrales/${corral.id_corral}`);
                }}
              className="
                bg-[#5f7c4d]
                hover:bg-[#4f6841]
                text-white
                text-sm
                px-4
                py-2
                rounded-xl
                transition-all
                  "
              >
               Ver detalle
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de formulario */}
      {mostrarForm && (
        <FormCorral
          corral={corralEditar}
          onClose={() => setMostrarForm(false)}
          onSave={() => {
            setMostrarForm(false);
            cargarCorrales();
          }}
        />
      )}
    </div>
  );
}

// Componente del modal (simplificado)
function FormCorral({ corral, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: corral?.nombre || '',
    capacidad: corral?.capacidad || '',
    id_tipo_corral: corral?.id_tipo_corral || '',
    dieta_actual: corral?.dieta_actual || ''
  });
  const [tiposCorral, setTiposCorral] = useState([]);
  const [dietas, setDietas] = useState([]);

  useEffect(() => {
    corralesApi.getTiposCorral().then(res => setTiposCorral(res.data));
    // Asumiendo que tienes api de dietas
    // dietasApi.getAll().then(res => setDietas(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (corral) {
        await corralesApi.update(corral.id_corral, form);
      } else {
        await corralesApi.create(form);
      }
      onSave();
    } catch (error) {
      alert('Error al guardar');
    }
  };

  return (
    <div className="
fixed inset-0
bg-black/30
backdrop-blur-sm
flex
items-center
justify-center
z-50
p-4
">
      <div className="
bg-[#fcfbf8]
rounded-[32px]
p-8
w-full
max-w-md
shadow-[0_10px_40px_rgba(0,0,0,0.10)]
border
border-[#ece8df]
">
        <h2 className="text-xl font-bold mb-4">
          {corral ? 'Editar Corral' : 'Nuevo Corral'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre del corral"
            value={form.nombre}
            onChange={e => setForm({...form, nombre: e.target.value})}
            className="
w-full
bg-[#f4f1ea]
border
border-transparent
rounded-2xl
p-4
outline-none
focus:border-[#6c8c5a]
focus:bg-white
transition-all
"
            required
          />
          <input
            type="number"
            placeholder="Capacidad"
            value={form.capacidad}
            onChange={e => setForm({...form, capacidad: e.target.value})}
            className="w-full border rounded p-2"
            required
          />
          <select
            value={form.id_tipo_corral}
            onChange={e => setForm({...form, id_tipo_corral: e.target.value})}
            className="w-full border rounded p-2"
            required
          >
            <option value="">Tipo de corral</option>
            {tiposCorral.map(t => (
              <option key={t.id_tipo} value={t.id_tipo}>{t.nombre}</option>
            ))}
          </select>
          <div className="flex gap-3 justify-end mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}