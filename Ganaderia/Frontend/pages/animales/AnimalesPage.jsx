import React, { useState, useEffect } from "react";
import { animalesApi } from "../../api/animalesApi";
import { corralesApi } from "../../api/corralesApi";
import { useNavigate } from "react-router-dom";

export default function AnimalesPage() {
  const [animales, setAnimales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({
    estado: 'vivo',
    sexo: '',
    corral: '',
    clasificacion: '',
    busqueda: '',
    peso_min: '',
    peso_max: '',
    meses_min: '',
    meses_max: '',
    pagina: 1,
    limite: 20
  });
  const [corrales, setCorrales] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalAnimales, setTotalAnimales] = useState(0);
  const navigate = useNavigate();

  // Cargar corrales para filtros
  useEffect(() => {
    corralesApi.getAll()
      .then(res => {
        console.log("Corrales cargados:", res.data?.length);
        setCorrales(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error("Error al cargar corrales:", err));
  }, []);

  useEffect(() => {
    cargarAnimales();
  }, [filtros]);

  const cargarAnimales = async () => {
    setCargando(true);
    try {
      // Limpiar filtros vacíos para no enviarlos
      const filtrosLimpios = {};
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          filtrosLimpios[key] = value;
        }
      });

      console.log("🔍 Cargando animales con filtros:", filtrosLimpios);
      const res = await animalesApi.getAll(filtrosLimpios);
      console.log("📦 Respuesta:", res.data);

      setAnimales(res.data.animales || []);
      setTotalPaginas(res.data.total_paginas || 1);
      setTotalAnimales(res.data.total || 0);
    } catch (error) {
      console.error('❌ Error al cargar animales:', error);
      setAnimales([]);
    } finally {
      setCargando(false);
    }
  };

  const cambiarFiltro = (key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value, pagina: 1 }));
  };

  const cambiarPagina = (nuevaPagina) => {
    setFiltros(prev => ({ ...prev, pagina: nuevaPagina }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getBadgeColor = (estado) => {
    const colores = {
      'Comprado': 'bg-blue-100 text-blue-800 border border-blue-300',
      'Vendido': 'bg-purple-100 text-purple-800 border border-purple-300',
      'Muerto': 'bg-red-100 text-red-800 border border-red-300',
      'Enfermo': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'Activo': 'bg-green-100 text-green-800 border border-green-300',
    };
    return colores[estado] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  // Generar array de páginas para mostrar
  const getPaginasVisibles = () => {
    const paginas = [];
    const maxVisibles = 7;
    
    if (totalPaginas <= maxVisibles) {
      for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
    } else {
      paginas.push(1);
      let inicio = Math.max(2, filtros.pagina - 2);
      let fin = Math.min(totalPaginas - 1, filtros.pagina + 2);
      
      if (inicio > 2) paginas.push('...');
      for (let i = inicio; i <= fin; i++) paginas.push(i);
      if (fin < totalPaginas - 1) paginas.push('...');
      paginas.push(totalPaginas);
    }
    return paginas;
  };

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🐄 Catálogo de Animales</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalAnimales} animales encontrados
          </p>
        </div>
        <button
          onClick={() => navigate('/recepcion')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
        >
          + Nuevo Animal
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Búsqueda por arete */}
          <input
            type="text"
            placeholder="🔍 Buscar arete..."
            value={filtros.busqueda}
            onChange={e => cambiarFiltro('busqueda', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          />

          {/* Estado */}
          <select
            value={filtros.estado}
            onChange={e => cambiarFiltro('estado', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="vivo">Vivos</option>
            <option value="vendido">Vendidos</option>
            <option value="muerto">Muertos</option>
            <option value="Enfermo">Enfermos</option>
          </select>

          {/* Sexo */}
          <select
            value={filtros.sexo}
            onChange={e => cambiarFiltro('sexo', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          >
            <option value="">Ambos sexos</option>
            <option value="macho">♂️ Machos</option>
            <option value="hembra">♀️ Hembras</option>
          </select>

          {/* Corral */}
          <select
            value={filtros.corral}
            onChange={e => cambiarFiltro('corral', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          >
            <option value="">Todos los corrales</option>
            {corrales.map(c => (
              <option key={c.id_corral} value={c.id_corral}>
                {c.nombre}
              </option>
            ))}
          </select>

          {/* Clasificación */}
          <select
            value={filtros.clasificacion}
            onChange={e => cambiarFiltro('clasificacion', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          >
            <option value="">Todas las clasificaciones</option>
            <option value="Becerro">Becerro</option>
            <option value="Becerra">Becerra</option>
            <option value="Novillo">Novillo</option>
            <option value="Novilla">Novilla</option>
            <option value="Torete">Torete</option>
            <option value="Toro">Toro</option>
            <option value="Vaca">Vaca</option>
          </select>

          {/* Peso mínimo */}
          <input
            type="number"
            placeholder="Peso mín (kg)"
            value={filtros.peso_min}
            onChange={e => cambiarFiltro('peso_min', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          />

          {/* Peso máximo */}
          <input
            type="number"
            placeholder="Peso máx (kg)"
            value={filtros.peso_max}
            onChange={e => cambiarFiltro('peso_max', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          />

          {/* Meses mínimo */}
          <input
            type="number"
            placeholder="Meses mín"
            value={filtros.meses_min}
            onChange={e => cambiarFiltro('meses_min', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          />

          {/* Meses máximo */}
          <input
            type="number"
            placeholder="Meses máx"
            value={filtros.meses_max}
            onChange={e => cambiarFiltro('meses_max', e.target.value)}
            className="border rounded-lg p-2.5 text-sm"
          />

          {/* Botón limpiar filtros */}
          <button
            onClick={() => setFiltros({
              estado: 'vivo', sexo: '', corral: '', clasificacion: '',
              busqueda: '', peso_min: '', peso_max: '',
              meses_min: '', meses_max: '', pagina: 1, limite: 20
            })}
            className="border rounded-lg p-2.5 text-sm bg-gray-100 hover:bg-gray-200"
          >
            🔄 Limpiar filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {cargando ? (
          <div className="text-center py-16">
            <div className="animate-spin text-4xl mb-4">⚙️</div>
            <p className="text-gray-500">Cargando animales...</p>
          </div>
        ) : animales.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-6xl mb-4">🐄</p>
            <p className="text-xl text-gray-500">No se encontraron animales</p>
            <p className="text-sm text-gray-400 mt-2">Intenta ajustar los filtros</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Arete</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Clasificación</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Sexo</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Peso (kg)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Meses</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Corral</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {animales.map(animal => (
                    <tr
                      key={animal.arete}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/animales/${animal.arete}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-700">{animal.arete}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {animal.clasificacion || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {animal.sexo === 'macho' ? '♂️ Macho' : '♀️ Hembra'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {animal.peso_actual || animal.peso_entrada} kg
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {animal.meses}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {animal.corral_nombre || 
                          <span className="text-gray-400 italic">Sin asignar</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(animal.estado_nombre)}`}>
                          {animal.estado_nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/animales/${animal.arete}`);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          📋 Ver ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
                <p className="text-sm text-gray-500">
                  Página {filtros.pagina} de {totalPaginas} ({totalAnimales} animales)
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => cambiarPagina(filtros.pagina - 1)}
                    disabled={filtros.pagina === 1}
                    className="px-3 py-2 rounded-lg text-sm border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    ← Anterior
                  </button>

                  {/* Números de página */}
                  {getPaginasVisibles().map((pag, i) => (
                    pag === '...' ? (
                      <span key={`dots-${i}`} className="px-2 py-2 text-gray-400">...</span>
                    ) : (
                      <button
                        key={pag}
                        onClick={() => cambiarPagina(pag)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          filtros.pagina === pag
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'border hover:bg-gray-100'
                        }`}
                      >
                        {pag}
                      </button>
                    )
                  ))}

                  {/* Botón siguiente */}
                  <button
                    onClick={() => cambiarPagina(filtros.pagina + 1)}
                    disabled={filtros.pagina === totalPaginas}
                    className="px-3 py-2 rounded-lg text-sm border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}