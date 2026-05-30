import React, { useState, useEffect } from 'react';
import { recepcionApi } from '../../api/recepcionApi';
import jsPDF from 'jspdf';


export default function RecepcionCompleta() {
  // Paso actual del wizard
  const [paso, setPaso] = useState(1); // 1=Guía, 2=Recepción, 3=Animales, 4=Confirmación
  
  // Datos de la guía
  const [guia, setGuia] = useState({
    numero_guia: '',
    id_proveedor: '',
    motivo: '',
    fecha_guia: new Date().toISOString().split('T')[0],
    observaciones_guia: ''
  });

  // Datos de la recepción
  const [recepcion, setRecepcion] = useState({
    animales_programados: '',
    animales_recibidos: '',
    animales_muertos: 0,
    animales_enfermos: 0,
    id_corral: '',
    observaciones_recepcion: ''
  });

  // Modo de registro de animales
  const [modoAnimales, setModoAnimales] = useState('rango'); // 'rango' o 'individual'
  
  // Rango de animales
  const [rango, setRango] = useState({
    arete_inicial: '',
    arete_final: '',
    sexo: 'macho',
    peso_promedio: '',
    meses_promedio: '',
    precio_compra: ''
  });

  // Lista de animales individuales
  const [animalesIndividuales, setAnimalesIndividuales] = useState([]);
  const [nuevoAnimal, setNuevoAnimal] = useState({
    arete: '', sexo: 'macho', peso_entrada: '', meses: '', precio_compra: ''
  });

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [corrales, setCorrales] = useState([]);
  
  // UI
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const [provRes, corrRes] = await Promise.all([
        recepcionApi.getProveedores(),
        recepcionApi.getCorralesDisponibles()
      ]);
      setProveedores(provRes.data);
      setCorrales(corrRes.data);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  // Calcular animales programados según rango
  useEffect(() => {
    if (modoAnimales === 'rango' && rango.arete_inicial && rango.arete_final) {
      const matchInicial = rango.arete_inicial.match(/^(.+?)(\d+)$/);
      const matchFinal = rango.arete_final.match(/^(.+?)(\d+)$/);
      
      if (matchInicial && matchFinal && matchInicial[1] === matchFinal[1]) {
        const inicio = parseInt(matchInicial[2]);
        const fin = parseInt(matchFinal[2]);
        if (fin >= inicio) {
          setRecepcion(prev => ({
            ...prev,
            animales_programados: fin - inicio + 1,
            animales_recibidos: fin - inicio + 1
          }));
        }
      }
    }
  }, [rango.arete_inicial, rango.arete_final, modoAnimales]);

  const agregarAnimalIndividual = () => {
    if (!nuevoAnimal.arete || !nuevoAnimal.peso_entrada) return;
    
    setAnimalesIndividuales(prev => [...prev, { ...nuevoAnimal }]);
    setNuevoAnimal({ arete: '', sexo: 'macho', peso_entrada: '', meses: '', precio_compra: '' });
    
    // Actualizar contador
    setRecepcion(prev => ({
      ...prev,
      animales_programados: prev.animales_programados + 1,
      animales_recibidos: prev.animales_recibidos + 1
    }));
  };

  const eliminarAnimalIndividual = (index) => {
    setAnimalesIndividuales(prev => prev.filter((_, i) => i !== index));
    setRecepcion(prev => ({
      ...prev,
      animales_programados: Math.max(0, prev.animales_programados - 1),
      animales_recibidos: Math.max(0, prev.animales_recibidos - 1)
    }));
  };

const generarPDF = () => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text('Guía de Tránsito', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Número: ${guia.numero_guia}`, 20, 40);
  doc.text(`Fecha: ${guia.fecha_guia}`, 20, 50);
  doc.text(`Proveedor: ${proveedores.find(p => p.id_proveedor == guia.id_proveedor)?.nombre}`, 20, 60);
  doc.text(`Motivo: ${guia.motivo}`, 20, 70);
  doc.text(`Animales: ${recepcion.animales_recibidos}`, 20, 80);
  
  doc.save(`Guia_${guia.numero_guia}.pdf`);
};
  const manejarEnvio = async () => {
    setCargando(true);
    
    try {
      const datos = {
        // Guía
        numero_guia: guia.numero_guia,
        id_proveedor: parseInt(guia.id_proveedor),
        motivo: guia.motivo,
        fecha_guia: guia.fecha_guia,
        observaciones_guia: guia.observaciones_guia,
        
        // Recepción
        animales_programados: parseInt(recepcion.animales_programados),
        animales_recibidos: parseInt(recepcion.animales_recibidos),
        animales_muertos: parseInt(recepcion.animales_muertos) || 0,
        animales_enfermos: parseInt(recepcion.animales_enfermos) || 0,
        id_corral: recepcion.id_corral ? parseInt(recepcion.id_corral) : null,
        observaciones_recepcion: recepcion.observaciones_recepcion,
        
        // Animales
        animales: modoAnimales === 'individual' ? animalesIndividuales : undefined,
        rango_animales: modoAnimales === 'rango' ? {
          ...rango,
          peso_promedio: parseFloat(rango.peso_promedio),
          meses_promedio: parseInt(rango.meses_promedio),
          precio_compra: parseFloat(rango.precio_compra),
          id_proveedor: parseInt(guia.id_proveedor),
          id_corral: recepcion.id_corral ? parseInt(recepcion.id_corral) : null
        } : undefined
      };

      const res = await recepcionApi.registrarRecepcionCompleta(datos);
      setResultado(res.data);
      setPaso(4); // Ir a confirmación
      
    } catch (error) {
      setResultado({
        mensaje: 'Error',
        errores_animales: [error.response?.data?.detail || 'Error al registrar']
      });
    } finally {
      setCargando(false);
    }
  };
return (
  <div className="min-h-screen bg-gradient-to-br from-[#f4f1e8] via-[#e7efe3] to-[#d7e4d1] py-10 px-4">
    <div className="max-w-5xl mx-auto bg-[#fdfcf8]/90 backdrop-blur-md shadow-2xl rounded-3xl border border-[#d9d2c3] overflow-hidden">

      <div className="bg-[#3f5c45] p-8 text-white">
        <h1 className="text-3xl font-bold tracking-wide">
          🐄 Recepción de Ganado
        </h1>
        <p className="text-sm opacity-80 mt-2">
          Gestión de guía, recepción y registro de animales
        </p>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-10">
          {['Guía', 'Recepción', 'Animales', 'Confirmación'].map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center relative">
              
              {i !== 3 && (
                <div
                  className={`absolute top-5 left-1/2 w-full h-1 z-0 ${
                    paso > i + 1
                      ? 'bg-[#6b8e5e]'
                      : 'bg-[#d8d4ca]'
                  }`}
                />
              )}

              <div
                className={`z-10 w-10 h-10 flex items-center justify-center rounded-full font-bold shadow-md transition-all duration-300
                ${
                  paso === i + 1
                    ? 'bg-[#3f5c45] text-white scale-110'
                    : paso > i + 1
                    ? 'bg-[#7a8b5c] text-white'
                    : 'bg-[#ece8de] text-[#7a7567]'
                }`}
              >
                {i + 1}
              </div>

              <span
                className={`mt-3 text-sm font-medium ${
                  paso === i + 1
                    ? 'text-[#3f5c45]'
                    : 'text-[#6f6b5f]'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {paso === 1 && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold text-[#3f5c45] mb-6">
              📋 Datos de la Guía
            </h2>

            <div className="grid md:grid-cols-2 gap-5">

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#4f4a3f]">
                  Número de Guía
                </label>

                <input
                  type="text"
                  value={guia.numero_guia}
                  onChange={e =>
                    setGuia({ ...guia, numero_guia: e.target.value })
                  }
                  placeholder="Ej: GT-2026-001"
                  className="w-full rounded-2xl border border-[#d3cab8] bg-[#faf8f2] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6b8e5e] transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#4f4a3f]">
                  Proveedor
                </label>

                <select
                  value={guia.id_proveedor}
                  onChange={e =>
                    setGuia({ ...guia, id_proveedor: e.target.value })
                  }
                  className="w-full rounded-2xl border border-[#d3cab8] bg-[#faf8f2] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6b8e5e]"
                >
                  <option value="">Seleccionar proveedor...</option>

                  {proveedores.map(p => (
                    <option
                      key={p.id_proveedor}
                      value={p.id_proveedor}
                    >
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#4f4a3f]">
                  Motivo
                </label>

                <select
                  value={guia.motivo}
                  onChange={e =>
                    setGuia({ ...guia, motivo: e.target.value })
                  }
                  className="w-full rounded-2xl border border-[#d3cab8] bg-[#faf8f2] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6b8e5e]"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="Compra">Compra de ganado</option>
                  <option value="Traslado interno">Traslado interno</option>
                  <option value="Devolución">Devolución</option>
                  <option value="Consignación">Consignación</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#4f4a3f]">
                  Fecha
                </label>

                <input
                  type="date"
                  value={guia.fecha_guia}
                  onChange={e =>
                    setGuia({ ...guia, fecha_guia: e.target.value })
                  }
                  className="w-full rounded-2xl border border-[#d3cab8] bg-[#faf8f2] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6b8e5e]"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-[#4f4a3f]">
                Observaciones
              </label>

              <textarea
                rows="4"
                value={guia.observaciones_guia}
                onChange={e =>
                  setGuia({
                    ...guia,
                    observaciones_guia: e.target.value
                  })
                }
                className="w-full mt-2 rounded-2xl border border-[#d3cab8] bg-[#faf8f2] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6b8e5e]"
                placeholder="Notas adicionales..."
              />
            </div>

            <button
              onClick={() => setPaso(2)}
              disabled={
                !guia.numero_guia ||
                !guia.id_proveedor ||
                !guia.motivo
              }
              className="mt-8 w-full rounded-2xl bg-gradient-to-r from-[#3f5c45] to-[#6b8e5e] py-4 text-white font-semibold shadow-lg hover:scale-[1.01] transition disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        )}
        {paso === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-[#3f5c45] mb-6">
              📦 Datos de Recepción
            </h2>

            <div className="grid md:grid-cols-2 gap-5">

              {[
                ['Animales Programados', 'animales_programados'],
                ['Animales Recibidos', 'animales_recibidos'],
                ['Muertos en tránsito', 'animales_muertos'],
                ['Llegaron enfermos', 'animales_enfermos']
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="text-sm font-semibold text-[#4f4a3f]">
                    {label}
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={recepcion[key]}
                    onChange={e =>
                      setRecepcion({
                        ...recepcion,
                        [key]: e.target.value
                      })
                    }
                    className="w-full mt-2 rounded-2xl border border-[#d3cab8] bg-[#faf8f2] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6b8e5e]"
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-[#4f4a3f]">
                  Corral asignado
                </label>

                <select
                  value={recepcion.id_corral}
                  onChange={e =>
                    setRecepcion({
                      ...recepcion,
                      id_corral: e.target.value
                    })
                  }
                  className="w-full mt-2 rounded-2xl border border-[#d3cab8] bg-[#faf8f2] px-4 py-3 outline-none focus:ring-2 focus:ring-[#6b8e5e]"
                >
                  <option value="">Sin asignar</option>

                  {corrales.map(c => (
                    <option key={c.id_corral} value={c.id_corral}>
                      {c.nombre} ({c.disponibles} disponibles)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setPaso(1)}
                className="px-6 py-3 rounded-2xl bg-[#b8ab96] text-white hover:opacity-90"
              >
                ← Atrás
              </button>

              <button
                onClick={() => setPaso(3)}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#3f5c45] to-[#6b8e5e] text-white font-semibold shadow-lg"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-[#3f5c45] mb-6">
              🐄 Registro de Animales
            </h2>

            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setModoAnimales('rango')}
                className={`px-5 py-3 rounded-2xl font-medium transition
                ${
                  modoAnimales === 'rango'
                    ? 'bg-[#3f5c45] text-white shadow-md'
                    : 'bg-[#ece8de] text-[#4f4a3f]'
                }`}
              >
                📦 Por Rango
              </button>

              <button
                onClick={() => setModoAnimales('individual')}
                className={`px-5 py-3 rounded-2xl font-medium transition
                ${
                  modoAnimales === 'individual'
                    ? 'bg-[#3f5c45] text-white shadow-md'
                    : 'bg-[#ece8de] text-[#4f4a3f]'
                }`}
              >
                📝 Individual
              </button>
            </div>

            {/* RANGO */}
            {modoAnimales === 'rango' && (
              <div className="bg-[#f7f4ed] border border-[#ddd4c4] rounded-3xl p-6 shadow-sm">
                <div className="grid md:grid-cols-2 gap-5">

                  <input
                    type="text"
                    placeholder="Arete inicial"
                    value={rango.arete_inicial}
                    onChange={e =>
                      setRango({
                        ...rango,
                        arete_inicial: e.target.value
                      })
                    }
                    className="rounded-2xl border border-[#d3cab8] bg-white px-4 py-3"
                  />

                  <input
                    type="text"
                    placeholder="Arete final"
                    value={rango.arete_final}
                    onChange={e =>
                      setRango({
                        ...rango,
                        arete_final: e.target.value
                      })
                    }
                    className="rounded-2xl border border-[#d3cab8] bg-white px-4 py-3"
                  />

                  <input
                    type="number"
                    placeholder="Peso promedio"
                    value={rango.peso_promedio}
                    onChange={e =>
                      setRango({
                        ...rango,
                        peso_promedio: e.target.value
                      })
                    }
                    className="rounded-2xl border border-[#d3cab8] bg-white px-4 py-3"
                  />

                  <input
                    type="number"
                    placeholder="Meses promedio"
                    value={rango.meses_promedio}
                    onChange={e =>
                      setRango({
                        ...rango,
                        meses_promedio: e.target.value
                      })
                    }
                    className="rounded-2xl border border-[#d3cab8] bg-white px-4 py-3"
                  />
                </div>
              </div>
            )}

            {/* INDIVIDUAL */}
            {modoAnimales === 'individual' && (
              <div className="space-y-5">

                <div className="bg-[#f7f4ed] border border-[#ddd4c4] rounded-3xl p-6">
                  <div className="grid md:grid-cols-5 gap-3">

                    <input
                      type="text"
                      placeholder="Arete"
                      value={nuevoAnimal.arete}
                      onChange={e =>
                        setNuevoAnimal({
                          ...nuevoAnimal,
                          arete: e.target.value
                        })
                      }
                      className="rounded-2xl border border-[#d3cab8] px-4 py-3"
                    />

                    <select
                      value={nuevoAnimal.sexo}
                      onChange={e =>
                        setNuevoAnimal({
                          ...nuevoAnimal,
                          sexo: e.target.value
                        })
                      }
                      className="rounded-2xl border border-[#d3cab8] px-4 py-3"
                    >
                      <option value="macho">Macho</option>
                      <option value="hembra">Hembra</option>
                    </select>

                    <input
                      type="number"
                      placeholder="Peso"
                      value={nuevoAnimal.peso_entrada}
                      onChange={e =>
                        setNuevoAnimal({
                          ...nuevoAnimal,
                          peso_entrada: e.target.value
                        })
                      }
                      className="rounded-2xl border border-[#d3cab8] px-4 py-3"
                    />

                    <input
                      type="number"
                      placeholder="Meses"
                      value={nuevoAnimal.meses}
                      onChange={e =>
                        setNuevoAnimal({
                          ...nuevoAnimal,
                          meses: e.target.value
                        })
                      }
                      className="rounded-2xl border border-[#d3cab8] px-4 py-3"
                    />

                    <input
                      type="number"
                      placeholder="Precio"
                      value={nuevoAnimal.precio_compra}
                      onChange={e =>
                        setNuevoAnimal({
                          ...nuevoAnimal,
                          precio_compra: e.target.value
                        })
                      }
                      className="rounded-2xl border border-[#d3cab8] px-4 py-3"
                    />
                  </div>

                  <button
                    onClick={agregarAnimalIndividual}
                    className="mt-5 bg-[#5d7a55] hover:bg-[#4f6949] text-white px-5 py-3 rounded-2xl shadow-md transition"
                  >
                    + Agregar Animal
                  </button>
                </div>

                {/* TABLA */}
                {animalesIndividuales.length > 0 && (
                  <div className="overflow-hidden rounded-3xl border border-[#d8d0c0] shadow-sm">
                    <table className="w-full">
                      <thead className="bg-[#e4ddcf] text-[#4f4a3f]">
                        <tr>
                          <th className="p-4 text-left">Arete</th>
                          <th className="p-4 text-left">Sexo</th>
                          <th className="p-4 text-left">Peso</th>
                          <th className="p-4 text-left">Meses</th>
                          <th className="p-4 text-left">Precio</th>
                          <th className="p-4"></th>
                        </tr>
                      </thead>

                      <tbody className="bg-white">
                        {animalesIndividuales.map((a, i) => (
                          <tr
                            key={i}
                            className="border-t border-[#ece7da] hover:bg-[#f9f7f2]"
                          >
                            <td className="p-4">{a.arete}</td>
                            <td className="p-4 capitalize">{a.sexo}</td>
                            <td className="p-4">{a.peso_entrada} kg</td>
                            <td className="p-4">{a.meses}</td>
                            <td className="p-4">${a.precio_compra}</td>

                            <td className="p-4">
                              <button
                                onClick={() =>
                                  eliminarAnimalIndividual(i)
                                }
                                className="text-red-500 hover:text-red-700"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setPaso(2)}
                className="px-6 py-3 rounded-2xl bg-[#b8ab96] text-white"
              >
                ← Atrás
              </button>

              <button
                onClick={manejarEnvio}
                disabled={cargando}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#3f5c45] to-[#6b8e5e] text-white py-4 text-lg font-semibold shadow-lg hover:scale-[1.01] transition"
              >
                {cargando
                  ? '⏳ Registrando...'
                  : '✅ Completar Recepción'}
              </button>
            </div>
          </div>
        )}

        {paso === 4 && resultado && (
          <div className="text-center py-10">
            <div className="text-7xl mb-4">🌿</div>

            <h2 className="text-3xl font-bold text-[#3f5c45] mb-3">
              ¡Recepción Registrada!
            </h2>

            <p className="text-[#5e5a4f] text-lg mb-2">
              {resultado.mensaje}
            </p>

            <div className="bg-[#f4f1e8] border border-[#ddd4c4] rounded-3xl p-6 mt-6 inline-block text-left">
              <p className="mb-2">
                <strong>Guía:</strong> {resultado.numero_guia}
              </p>

              <p>
                <strong>Animales registrados:</strong>{' '}
                {resultado.animales_registrados}
              </p>
            </div>

            <button
              onClick={() => {
                setPaso(1);
                setResultado(null);
                setGuia({
                  ...guia,
                  numero_guia: '',
                  observaciones_guia: ''
                });
                setAnimalesIndividuales([]);
              }}
              className="mt-8 bg-gradient-to-r from-[#3f5c45] to-[#6b8e5e] text-white px-8 py-4 rounded-2xl shadow-lg"
            >
              Nueva Recepción
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
}