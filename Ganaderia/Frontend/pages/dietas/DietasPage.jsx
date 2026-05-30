import React, { useState, useEffect } from "react";
import { dietasApi, ingredientesApi } from "../../api/dietasApi";

export default function DietasPage() {
  const [dietas, setDietas] = useState([]);
  const [dietaSeleccionada, setDietaSeleccionada] = useState(null);
  const [mostrarFormDieta, setMostrarFormDieta] = useState(false);
  const [mostrarFormIngrediente, setMostrarFormIngrediente] = useState(false);
  const [dietaEditar, setDietaEditar] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  // Formulario de dieta
  const [formDieta, setFormDieta] = useState({
    nombre: '',
    factor: 0.03,
    descripcion: ''
  });

  // Formulario para agregar ingrediente
  const [formIngrediente, setFormIngrediente] = useState({
    id_ingrediente: '',
    porcentaje: ''
  });

  const [ingredientesDisponibles, setIngredientesDisponibles] = useState([]);

  useEffect(() => {
    cargarDietas();
    cargarIngredientes();
  }, []);

  const cargarDietas = async () => {
    try {
      const res = await dietasApi.getAll();
      setDietas(res.data);
    } catch (error) {
      mostrarMensaje('error', 'Error al cargar dietas');
    } finally {
      setCargando(false);
    }
  };

  const cargarIngredientes = async () => {
    try {
      const res = await ingredientesApi.getAll();
      setIngredientesDisponibles(res.data.filter(i => i.activo));
    } catch (error) {
      console.error('Error cargando ingredientes:', error);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const verDetalle = async (id) => {
    try {
      const res = await dietasApi.getById(id);
      setDietaSeleccionada(res.data);
    } catch (error) {
      mostrarMensaje('error', 'Error al cargar detalle');
    }
  };

  // Abrir form para crear dieta
  const nuevaDieta = () => {
    setDietaEditar(null);
    setFormDieta({ nombre: '', factor: 0.03, descripcion: '' });
    setMostrarFormDieta(true);
  };

  // Abrir form para editar dieta
  const editarDieta = (dieta) => {
    setDietaEditar(dieta);
    setFormDieta({
      nombre: dieta.nombre,
      factor: dieta.factor || 0.03,
      descripcion: dieta.descripcion || ''
    });
    setMostrarFormDieta(true);
  };

  // Guardar dieta (crear o editar)
  const guardarDieta = async (e) => {
    e.preventDefault();
    try {
      if (dietaEditar) {
        await dietasApi.update(dietaEditar.id_dieta, formDieta);
        mostrarMensaje('exito', 'Dieta actualizada');
      } else {
        await dietasApi.create(formDieta);
        mostrarMensaje('exito', 'Dieta creada');
      }
      setMostrarFormDieta(false);
      cargarDietas();
      if (dietaSeleccionada?.dieta?.id_dieta === dietaEditar?.id_dieta) {
        verDetalle(dietaEditar.id_dieta);
      }
    } catch (error) {
      mostrarMensaje('error', error.response?.data?.detail || 'Error al guardar');
    }
  };

  // Agregar ingrediente a la dieta seleccionada
  const agregarIngrediente = async (e) => {
    e.preventDefault();
    if (!dietaSeleccionada) return;
    
    try {
      await dietasApi.agregarIngrediente(dietaSeleccionada.dieta.id_dieta, {
        id_ingrediente: parseInt(formIngrediente.id_ingrediente),
        porcentaje: parseFloat(formIngrediente.porcentaje)
      });
      mostrarMensaje('exito', 'Ingrediente agregado');
      setMostrarFormIngrediente(false);
      setFormIngrediente({ id_ingrediente: '', porcentaje: '' });
      verDetalle(dietaSeleccionada.dieta.id_dieta);
    } catch (error) {
      mostrarMensaje('error', error.response?.data?.detail || 'Error al agregar');
    }
  };

  // Eliminar ingrediente
  const eliminarIngrediente = async (idIngrediente) => {
    if (!window.confirm('¿Eliminar este ingrediente de la dieta?')) return;
    
    try {
      await dietasApi.eliminarIngrediente(dietaSeleccionada.dieta.id_dieta, idIngrediente);
      mostrarMensaje('exito', 'Ingrediente eliminado');
      verDetalle(dietaSeleccionada.dieta.id_dieta);
    } catch (error) {
      mostrarMensaje('error', 'Error al eliminar');
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 text-lg">⏳ Cargando dietas...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🥗 Gestión de Dietas</h1>
        <button
          onClick={nuevaDieta}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nueva Dieta
        </button>
      </div>

      {/* Mensajes */}
      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg ${
          mensaje.tipo === 'exito' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de dietas */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-lg mb-4">Dietas disponibles</h2>
            
            {dietas.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hay dietas creadas</p>
            ) : (
              <div className="space-y-2">
                {dietas.map(dieta => (
                  <div
                    key={dieta.id_dieta}
                    onClick={() => verDetalle(dieta.id_dieta)}
                    className={`p-3 rounded-lg cursor-pointer border-2 transition-all hover:shadow-md ${
                      dietaSeleccionada?.dieta?.id_dieta === dieta.id_dieta 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold">{dieta.nombre}</span>
                        <div className="text-xs text-gray-500 mt-1">
                          {dieta.total_ingredientes || 0} ingredientes
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        dieta.activo 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {dieta.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 text-sm">
                      <span className="text-gray-500">
                        Factor: {dieta.factor || 'N/A'}
                      </span>
                      {dieta.costo_kg && (
                        <span className="font-bold text-green-700">
                          ${dieta.costo_kg}/kg
                        </span>
                      )}
                    </div>
                    
                    {dieta.suma_porcentajes !== 100 && dieta.total_ingredientes > 0 && (
                      <div className="text-xs text-orange-600 mt-2 bg-orange-50 p-1 rounded">
                        ⚠️ Suma: {dieta.suma_porcentajes}% (debe ser 100%)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalle de dieta seleccionada */}
        <div className="lg:col-span-2">
          {dietaSeleccionada ? (
            <div className="bg-white rounded-lg shadow p-6">
              {/* Encabezado */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{dietaSeleccionada.dieta.nombre}</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {dietaSeleccionada.dieta.descripcion || 'Sin descripción'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editarDieta(dietaSeleccionada.dieta)}
                    className="px-3 py-1 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setMostrarFormIngrediente(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    + Agregar ingrediente
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Factor</p>
                  <p className="text-xl font-bold">{dietaSeleccionada.dieta.factor || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Costo por kg</p>
                  <p className="text-xl font-bold text-green-700">
                    ${dietaSeleccionada.dieta.costo_kg || '0'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Ingredientes</p>
                  <p className="text-xl font-bold">{dietaSeleccionada.ingredientes.length}</p>
                </div>
              </div>

              {/* Tabla de ingredientes */}
              <h3 className="font-semibold text-lg mb-3">🧂 Composición</h3>
              
              {dietaSeleccionada.ingredientes.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-400">
                  <p className="text-3xl mb-2">🧂</p>
                  <p>No hay ingredientes en esta dieta</p>
                  <button
                    onClick={() => setMostrarFormIngrediente(true)}
                    className="mt-3 text-blue-600 hover:underline text-sm"
                  >
                    + Agregar primer ingrediente
                  </button>
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Ingrediente</th>
                        <th className="text-right p-3">%</th>
                        <th className="text-right p-3">Costo/kg</th>
                        <th className="text-right p-3">Aporte $</th>
                        <th className="text-center p-3">Stock</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dietaSeleccionada.ingredientes.map(ing => (
                        <tr key={ing.id_ingredientes} className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium">{ing.nombre}</td>
                          <td className="p-3 text-right">{ing.porcentaje}%</td>
                          <td className="p-3 text-right text-gray-600">${ing.precio_unitario}</td>
                          <td className="p-3 text-right font-semibold">${ing.costo_porcentaje}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              ing.stock_actual > 100 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {ing.stock_actual} {ing.unidad_medida}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => eliminarIngrediente(ing.id_ingredientes)}
                              className="text-red-500 hover:text-red-700"
                              title="Eliminar ingrediente"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td className="p-3">TOTAL</td>
                        <td className={`p-3 text-right ${
                          dietaSeleccionada.suma_porcentajes !== 100 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {dietaSeleccionada.suma_porcentajes}%
                        </td>
                        <td colSpan="4"></td>
                      </tr>
                    </tfoot>
                  </table>

                  {dietaSeleccionada.suma_porcentajes !== 100 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="font-semibold text-yellow-800">
                        ⚠️ La suma de porcentajes no es 100%
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {dietaSeleccionada.suma_porcentajes < 100 
                          ? `Falta ${(100 - dietaSeleccionada.suma_porcentajes).toFixed(1)}% para completar`
                          : `Sobra ${(dietaSeleccionada.suma_porcentajes - 100).toFixed(1)}%`
                        }
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-10 text-center text-gray-400">
              <p className="text-5xl mb-4">🥗</p>
              <p className="text-lg">Selecciona una dieta para ver sus detalles</p>
              <p className="text-sm mt-2">O crea una nueva dieta con el botón superior</p>
            </div>
          )}
        </div>
      </div>

      {mostrarFormDieta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {dietaEditar ? ' Editar Dieta' : ' Nueva Dieta'}
            </h2>
            <form onSubmit={guardarDieta} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formDieta.nombre}
                  onChange={e => setFormDieta({...formDieta, nombre: e.target.value})}
                  className="w-full border rounded-lg p-3"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Factor (kg de alimento por kg de peso vivo)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formDieta.factor}
                  onChange={e => setFormDieta({...formDieta, factor: parseFloat(e.target.value)})}
                  className="w-full border rounded-lg p-3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ej: 0.03 = 3% del peso vivo en alimento
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formDieta.descripcion}
                  onChange={e => setFormDieta({...formDieta, descripcion: e.target.value})}
                  className="w-full border rounded-lg p-3"
                  rows="3"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setMostrarFormDieta(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {dietaEditar ? 'Actualizar' : 'Crear Dieta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarFormIngrediente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">🧂 Agregar Ingrediente</h2>
            <form onSubmit={agregarIngrediente} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ingrediente *</label>
                <select
                  value={formIngrediente.id_ingrediente}
                  onChange={e => setFormIngrediente({...formIngrediente, id_ingrediente: e.target.value})}
                  className="w-full border rounded-lg p-3"
                  required
                >
                  <option value="">Seleccionar ingrediente...</option>
                  {ingredientesDisponibles.map(ing => (
                    <option key={ing.id_ingredientes} value={ing.id_ingredientes}>
                      {ing.nombre} — ${ing.precio_unitario}/{ing.unidad_medida} — Stock: {ing.stock_actual}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Porcentaje (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={formIngrediente.porcentaje}
                  onChange={e => setFormIngrediente({...formIngrediente, porcentaje: e.target.value})}
                  className="w-full border rounded-lg p-3"
                  placeholder="Ej: 25.5"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setMostrarFormIngrediente(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}