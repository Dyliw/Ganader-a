import React, { useState } from 'react';
import RegistrarAnimal from './RegistrarAnimal';
import RegistrarLote from './RegistrarLote';
import GuiaTransito from './GuiaTransito';
import ListaRecepciones from './ListaRecepciones';
import RecepcionCompleta from './RecepcionCompleta';


export default function RecepcionPage() {
  const [tabActiva, setTabActiva] = useState('nueva');

  const tabs = [
    { id: 'nueva', label: '📥 Nueva Recepción', desc: 'Guía + Animales' },
    { id: 'lista', label: '📊 Recepciones', desc: 'Historial' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">📥 Módulo de Recepción</h1>
      <p className="text-gray-600 mb-6">Gestión de guías de tránsito y registro de animales</p>

      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-4 py-2 rounded-t transition ${
              tabActiva === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title={tab.desc}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {tabActiva === 'nueva' && <RecepcionCompleta />}
        {tabActiva === 'lista' && <ListaRecepciones />}
      </div>
    </div>
  );
}