import React, { useState, useEffect } from 'react';
import { generalApi } from '../api/generalApi';
import { useNavigate } from 'react-router-dom';


export default function Mainpage() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    cargarDashboard();
    // Actualizar cada 5 minutos
    const intervalo = setInterval(cargarDashboard, 300000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarDashboard = async () => {
    try {
      const res = await generalApi.getResumenGeneral();
      setDatos(res.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar el dashboard');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-500">Cargando panel de control...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 text-xl">⚠️ {error}</p>
        <button onClick={cargarDashboard} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 Panel de Control</h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('es-MX', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </p>
        </div>
        <button
          onClick={cargarDashboard}
          className="bg-white border px-4 py-2 rounded-lg shadow-sm hover:shadow-md flex items-center gap-2"
        >
          🔄 Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          titulo="Total Animales"
          valor={datos?.animales?.total_vivos || 0}
          subtitulo={`${datos?.animales?.machos || 0} machos · ${datos?.animales?.hembras || 0} hembras`}
          color="bg-blue-500"
          icono="🐄"
          onClick={() => navigate('/animales')}
        />
        <KpiCard
          titulo="Corrales Activos"
          valor={`${datos?.corrales?.ocupacion_total || 0} / ${datos?.corrales?.capacidad_total || 0}`}
          subtitulo={`${datos?.corrales?.porcentaje_ocupacion || 0}% ocupación`}
          color="bg-green-500"
          icono="🏠"
          onClick={() => navigate('/corrales')}
        />
        <KpiCard
          titulo="En Retiro"
          valor={datos?.veterinario?.animales_en_retiro || 0}
          subtitulo="No disponibles para venta"
          color="bg-orange-500"
          icono="🚫"
          alerta={datos?.veterinario?.animales_en_retiro > 0}
          onClick={() => navigate('/veterinario')}
        />
        <KpiCard
          titulo="Alertas Stock"
          valor={datos?.almacen?.productos_stock_bajo || 0}
          subtitulo="Productos bajo mínimo"
          color="bg-red-500"
          icono="⚠️"
          alerta={datos?.almacen?.productos_stock_bajo > 0}
          onClick={() => navigate('/almacen')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <Seccion titulo="🏠 Estado de Corrales" ruta="/corrales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {datos?.corrales?.detalle?.map(corral => (
                <div
                  key={corral.id_corral}
                  className="border rounded-lg p-3 hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() => navigate(`/corrales/${corral.id_corral}`)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">{corral.nombre}</span>
                    <span className="text-xs text-gray-500">{corral.tipo}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div
                      className={`h-2 rounded-full ${
                        corral.porcentaje >= 90 ? 'bg-red-500' :
                        corral.porcentaje >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(corral.porcentaje, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{corral.ocupacion}/{corral.capacidad}</span>
                    <span>{corral.porcentaje}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion titulo="🐄 Últimos Animales Registrados" ruta="/animales">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Arete</th>
                    <th className="text-left p-2">Clasificación</th>
                    <th className="text-left p-2">Sexo</th>
                    <th className="text-right p-2">Peso</th>
                    <th className="text-left p-2">Corral</th>
                    <th className="text-left p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datos?.animales?.ultimos_ingresos?.map(a => (
                    <tr
                      key={a.arete}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/animales/${a.arete}`)}
                    >
                      <td className="p-2 font-medium">{a.arete}</td>
                      <td className="p-2">{a.clasificacion || '-'}</td>
                      <td className="p-2">{a.sexo === 'macho' ? '♂️' : '♀️'}</td>
                      <td className="p-2 text-right">{a.peso_actual || a.peso_entrada} kg</td>
                      <td className="p-2">{a.corral_nombre || '-'}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          a.estado === 'Enfermo' ? 'bg-yellow-100 text-yellow-800' :
                          a.estado === 'Muerto' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {a.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>

          <Seccion titulo="🍽️ Alimentación Hoy" ruta="/alimentacion">
            {datos?.alimentacion?.servicios_hoy?.length > 0 ? (
              <div className="space-y-2">
                {datos.alimentacion.servicios_hoy.map(s => (
                  <div key={s.id_servicios} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{s.corral_nombre}</span>
                      <span className="text-sm text-gray-500 ml-2">{s.dieta_nombre}</span>
                    </div>
                    <span className="font-bold">{s.cantidad_kg} kg</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Aún no se han registrado servicios hoy</p>
            )}
          </Seccion>

          <Seccion titulo="💰 Últimas Ventas" ruta="/ventas">
            {datos?.ventas?.ultimas?.length > 0 ? (
              <div className="space-y-2">
                {datos.ventas.ultimas.map(v => (
                  <div key={v.id_venta} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm text-gray-500">{new Date(v.fecha_venta).toLocaleDateString()}</span>
                      <span className="font-medium ml-2">{v.comprador}</span>
                    </div>
                    <span className="font-bold text-green-700">${v.total}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No hay ventas registradas</p>
            )}
          </Seccion>
        </div>

        <div className="space-y-8">
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3">🚨 Atención Requerida</h3>
            <div className="space-y-2">
              {datos?.alertas?.map((alerta, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm cursor-pointer hover:opacity-80 ${
                    alerta.tipo === 'critico' ? 'bg-red-50 border border-red-200 text-red-800' :
                    alerta.tipo === 'advertencia' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                    'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}
                  onClick={() => navigate(alerta.ruta)}
                >
                  <p className="font-semibold">{alerta.icono} {alerta.titulo}</p>
                  <p className="text-xs mt-1">{alerta.mensaje}</p>
                </div>
              ))}
              {(!datos?.alertas || datos.alertas.length === 0) && (
                <p className="text-green-600 text-sm">✅ Todo en orden</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3">📊 Distribución</h3>
            <div className="space-y-3">
              <BarraDistribucion
                label="Machos"
                valor={datos?.animales?.machos || 0}
                total={datos?.animales?.total_vivos || 1}
                color="bg-blue-500"
              />
              <BarraDistribucion
                label="Hembras"
                valor={datos?.animales?.hembras || 0}
                total={datos?.animales?.total_vivos || 1}
                color="bg-pink-500"
              />
              <BarraDistribucion
                label="Enfermos"
                valor={datos?.animales?.enfermos || 0}
                total={datos?.animales?.total_vivos || 1}
                color="bg-yellow-500"
              />
              <BarraDistribucion
                label="En retiro"
                valor={datos?.veterinario?.animales_en_retiro || 0}
                total={datos?.animales?.total_vivos || 1}
                color="bg-orange-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-3">⏰ Próximos a Caducar</h3>
            {datos?.almacen?.proximos_caducar?.length > 0 ? (
              <div className="space-y-2">
                {datos.almacen.proximos_caducar.map(p => (
                  <div key={p.id} className="flex justify-between text-sm p-2 bg-yellow-50 rounded">
                    <span>{p.nombre}</span>
                    <span className="font-bold text-yellow-700">{p.dias_restantes} días</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-600 text-sm">✅ Sin caducidades próximas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ titulo, valor, subtitulo, color, icono, alerta, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`${color} text-white rounded-lg p-5 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1 relative overflow-hidden`}
    >
      <div className="absolute top-2 right-2 text-4xl opacity-20">{icono}</div>
      <p className="text-sm opacity-90">{titulo}</p>
      <p className="text-3xl font-bold mt-2">{valor}</p>
      <p className="text-xs mt-1 opacity-80">{subtitulo}</p>
      {alerta && (
        <span className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full animate-pulse" />
      )}
    </div>
  );
}

function Seccion({ titulo, ruta, children }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">{titulo}</h3>
        <button
          onClick={() => navigate(ruta)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Ver todo →
        </button>
      </div>
      {children}
    </div>
  );
}

function BarraDistribucion({ label, valor, total, color }) {
  const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{valor} ({porcentaje}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.max(porcentaje, 2)}%` }}
        />
      </div>
    </div>
  );
}