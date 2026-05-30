import React, { useState, useEffect } from 'react';
import { reportesApi } from '../../api/reportesApi';
import { corralesApi } from '../../api/corralesApi';

export default function InventarioAnimales() {
  const [datos, setDatos] = useState(null);
  const [corrales, setCorrales] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCorral, setFiltroCorral] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    corralesApi.getAll().then(res => setCorrales(res.data));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroCorral]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await reportesApi.getInventarioAnimales({
        estado: filtroEstado !== 'todos' ? filtroEstado : '',
        corral: filtroCorral
      });
      setDatos(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const descargarPDF = async () => {
    const res = await reportesApi.generarPDF('inventario', {
      estado: filtroEstado,
      corral: filtroCorral
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventario-animales.pdf';
    link.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">🐄 Inventario de Animales</h2>
        <button onClick={descargarPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          📄 Descargar PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border rounded p-2">
          <option value="todos">Todos</option>
          <option value="vivo">Vivos</option>
          <option value="vendido">Vendidos</option>
          <option value="muerto">Muertos</option>
        </select>
        <select value={filtroCorral} onChange={e => setFiltroCorral(e.target.value)} className="border rounded p-2">
          <option value="">Todos los corrales</option>
          {corrales.map(c => <option key={c.id_corral} value={c.id_corral}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Resumen */}
      {datos?.resumen && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-500">Total animales</p>
            <p className="text-2xl font-bold">{datos.resumen.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-gray-500">Vivos</p>
            <p className="text-2xl font-bold text-green-700">{datos.resumen.vivos}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-500">Vendidos</p>
            <p className="text-2xl font-bold text-purple-700">{datos.resumen.vendidos}</p>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <p className="text-sm text-gray-500">Muertos</p>
            <p className="text-2xl font-bold text-red-700">{datos.resumen.muertos}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Corral</th>
            <th className="text-right p-3">Capacidad</th>
            <th className="text-right p-3">Ocupación</th>
            <th className="text-right p-3">%</th>
            <th className="text-right p-3">Machos</th>
            <th className="text-right p-3">Hembras</th>
            <th className="text-right p-3">Peso prom.</th>
          </tr>
        </thead>
        <tbody>
          {datos?.por_corral?.map(c => (
            <tr key={c.corral} className="border-t">
              <td className="p-3">{c.corral}</td>
              <td className="p-3 text-right">{c.capacidad}</td>
              <td className="p-3 text-right">{c.ocupacion}</td>
              <td className="p-3 text-right">{c.porcentaje}%</td>
              <td className="p-3 text-right">{c.machos}</td>
              <td className="p-3 text-right">{c.hembras}</td>
              <td className="p-3 text-right">{c.peso_promedio} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}