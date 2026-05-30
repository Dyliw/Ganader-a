import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { corralesApi } from '../../api/corralesApi';

export default function DetalleCorral() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState('info');

  useEffect(() => {
    cargarDetalle();
  }, [id]);

  const cargarDetalle = async () => {
    try {
      const res = await corralesApi.getById(id);
      setData(res.data);
    } catch (error) {
      console.error('Error al cargar corral', error);
    } finally {
      setCargando(false);
    }
  };

  const toggleActivo = async () => {
    try {
      await corralesApi.deactivate(data.corral.id_corral);
      cargarDetalle(); // recargar
    } catch (error) {
      alert('Error al cambiar estado');
    }
  };

  if (cargando) return <div className="p-10 text-center text-gray-400">Cargando corral...</div>;
  if (!data) return <div className="p-10 text-center text-red-400">Corral no encontrado</div>;

  const { corral, animales, servicios, tratamientos } = data;

  return (
    <div className="min-h-screen bg-[#f6f5f2] p-6 md:p-10">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <button onClick={() => navigate('/corrales')} className="text-[#7a7a7a] hover:text-[#2f2f2f] mb-2">
            ← Volver a corrales
          </button>
          <h1 className="text-4xl font-semibold text-[#2f2f2f]">{corral.nombre}</h1>
          <p className="text-[#7a7a7a]">{corral.tipo_corral} · Dieta: {corral.dieta_nombre}</p>
        </div>
        <div className="flex gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            corral.activo ? 'bg-[#e4f0de] text-[#557244]' : 'bg-[#ececec] text-[#6e6e6e]'
          }`}>
            {corral.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            onClick={toggleActivo}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              corral.activo
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {corral.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button
            onClick={() => navigate(`/corrales/editar/${id}`)} // puedes usar el modal también
            className="bg-[#5f7c4d] text-white px-4 py-2 rounded-xl text-sm hover:bg-[#4e6840]"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ece8df]">
          <p className="text-[#7a7a7a] text-sm">Capacidad</p>
          <p className="text-2xl font-bold text-[#2f2f2f]">{corral.capacidad}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ece8df]">
          <p className="text-[#7a7a7a] text-sm">Ocupación</p>
          <p className="text-2xl font-bold text-[#2f2f2f]">{corral.ocupacion} / {corral.capacidad}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="h-2 rounded-full bg-[#5f7c4d]" style={{ width: `${Math.min(corral.porcentaje_ocupacion, 100)}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ece8df]">
          <p className="text-[#7a7a7a] text-sm">Peso promedio</p>
          <p className="text-2xl font-bold text-[#2f2f2f]">{corral.peso_promedio || '–'} kg</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ece8df]">
          <p className="text-[#7a7a7a] text-sm">Factor dieta</p>
          <p className="text-2xl font-bold text-[#2f2f2f]">{corral.factor ?? '–'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#ece8df]">
        {['info', 'animales', 'alimentacion', 'tratamientos'].map(tab => (
          <button
            key={tab}
            onClick={() => setTabActiva(tab)}
            className={`px-5 py-3 rounded-t-xl text-sm font-medium transition ${
              tabActiva === tab
                ? 'bg-white text-[#5f7c4d] border border-b-white -mb-[1px]'
                : 'text-[#7a7a7a] hover:text-[#2f2f2f]'
            }`}
          >
            {tab === 'info' && '📋 Información'}
            {tab === 'animales' && '🐄 Animales'}
            {tab === 'alimentacion' && '🍽️ Alimentación'}
            {tab === 'tratamientos' && '💊 Tratamientos'}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#ece8df] p-6">
        {tabActiva === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Detalles</h3>
              <dl className="space-y-2">
                <div className="flex justify-between"><dt className="text-[#7a7a7a]">Tipo:</dt><dd>{corral.tipo_corral}</dd></div>
                <div className="flex justify-between"><dt className="text-[#7a7a7a]">Dieta:</dt><dd>{corral.dieta_nombre}</dd></div>
                <div className="flex justify-between"><dt className="text-[#7a7a7a]">Factor:</dt><dd>{corral.factor || '–'}</dd></div>
                <div className="flex justify-between"><dt className="text-[#7a7a7a]">Estado:</dt><dd>{corral.activo ? 'Activo' : 'Inactivo'}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Distribución</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Machos</span>
                  <span className="font-bold">{animales.filter(a => a.sexo === 'macho').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hembras</span>
                  <span className="font-bold">{animales.filter(a => a.sexo === 'hembra').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>En retiro</span>
                  <span className="font-bold text-orange-600">{animales.filter(a => a.en_retiro).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tabActiva === 'animales' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#f8f6f1]">
                  <tr>
                    <th className="p-3">Arete</th>
                    <th className="p-3">Sexo</th>
                    <th className="p-3">Clasificación</th>
                    <th className="p-3 text-right">Peso (kg)</th>
                    <th className="p-3 text-right">Meses</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Retiro</th>
                  </tr>
                </thead>
                <tbody>
                  {animales.map(a => (
                    <tr key={a.arete} className="border-t border-[#f1eee8] hover:bg-[#fcfbf8]">
                      <td className="p-3 font-medium">{a.arete}</td>
                      <td className="p-3">{a.sexo === 'macho' ? '♂️' : '♀️'} {a.sexo}</td>
                      <td className="p-3">{a.clasificacion || '–'}</td>
                      <td className="p-3 text-right">{a.peso_actual} kg</td>
                      <td className="p-3 text-right">{a.meses}</td>
                      <td className="p-3">{a.estado}</td>
                      <td className="p-3">
                        {a.en_retiro ? <span className="text-orange-600 font-medium">Sí</span> : <span className="text-green-600">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tabActiva === 'alimentacion' && (
          <div>
            {servicios.length === 0 ? (
              <p className="text-[#7a7a7a]">No hay registros de alimentación.</p>
            ) : (
              <div className="space-y-3">
                {servicios.map(s => (
                  <div key={s.id_servicios} className="border border-[#f1eee8] rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{s.cantidad_kg} kg servidos</p>
                      <p className="text-sm text-[#7a7a7a]">{new Date(s.fecha_servicio).toLocaleDateString()} · {s.empleado}</p>
                      {s.observaciones && <p className="text-xs text-[#7a7a7a] mt-1">{s.observaciones}</p>}
                    </div>
                    <span className="text-[#5f7c4d] font-bold">{s.cantidad_kg} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tabActiva === 'tratamientos' && (
          <div>
            {tratamientos.length === 0 ? (
              <p className="text-[#7a7a7a]">No hay tratamientos registrados.</p>
            ) : (
              <div className="space-y-3">
                {tratamientos.map(t => (
                  <div key={`${t.arete}-${t.fecha_aplicacion}-${t.medicamento}`} className="border border-[#f1eee8] rounded-xl p-4 flex justify-between items-start">
                    <div>
                      <p className="font-medium">{t.medicamento} – <span className="text-sm">{t.dosis_aplicada}</span></p>
                      <p className="text-sm text-[#7a7a7a]">Arete: {t.arete} · {new Date(t.fecha_aplicacion).toLocaleDateString()} por {t.empleado}</p>
                      {t.observaciones && <p className="text-xs text-[#7a7a7a] mt-1">{t.observaciones}</p>}
                    </div>
                    <div className="text-right">
                      {t.fecha_disponible && new Date(t.fecha_disponible) > new Date() ? (
                        <span className="text-orange-600 text-sm">Retiro hasta {new Date(t.fecha_disponible).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-green-600 text-sm">Sin retiro</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}