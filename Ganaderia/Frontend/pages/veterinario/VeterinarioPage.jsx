import React, {useState} from "react";
import AplicarTratamiento from "./AplicarTratamiento";
import AlertasCaducidad from "./AlertasCaducidad";
import TratamientoMasivo from "./TratamietnoMasivo";
import AnimalesEnRetiro from "./AnimalesEnRetiro";
import CatalogoMedicamentos from "./CatalogoMedicamentos";
import HistorialClinico from "./HistorialClinico";

export default function VeterinarioPage(){
    const [tabActiva, setTabActiva] = useState('catalogo');
     const tabs = [
    { id: 'catalogo', label: '💊 Catálogo', icon: '' },
    { id: 'aplicar', label: '💉 Aplicar', icon: '' },
    { id: 'masivo', label: '🏥 Masivo', icon: '' },
    { id: 'historial', label: '📋 Historial', icon: '' },
    { id: 'retiro', label: '🚫 En Retiro', icon: '' },
    { id: 'alertas', label: '⚠️ Alertas', icon: '' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">💊 Módulo Veterinario</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              tabActiva === tab.id 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-lg shadow">
        {tabActiva === 'catalogo' && <CatalogoMedicamentos />}
        {tabActiva === 'aplicar' && <AplicarTratamiento />}
        {tabActiva === 'masivo' && <TratamientoMasivo />}
        {tabActiva === 'historial' && <HistorialClinico />}
        {tabActiva === 'retiro' && <AnimalesEnRetiro />}
        {tabActiva === 'ventas' && <VentasSeguras />}
        {tabActiva === 'alertas' && <AlertasCaducidad />}
      </div>
    </div>
  );
}