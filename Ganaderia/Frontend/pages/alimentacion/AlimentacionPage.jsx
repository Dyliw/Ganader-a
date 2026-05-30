import React, { useState } from 'react';
import ServirComida from './ServirComida';
import HistorialServicios from './HitorialServicios';
import DashboardConsumo from './DashboardConsumo';

export default function AlimentacionPage() {
  const [tabActiva, setTabActiva] = useState('servir');

  const tabs = [
    { id: 'servir', label: ' Servir Comida', icon: '🍽️' },
    { id: 'historial', label: ' Historial', icon: '📋' },
    { id: 'dashboard', label: ' Consumo', icon: '📊' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🍽️ Módulo de Alimentación</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-4 py-2 rounded-t transition-colors ${
              tabActiva === tab.id 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-lg shadow p-6">
        {tabActiva === 'servir' && <ServirComida />}
        {tabActiva === 'historial' && <HistorialServicios />}
        {tabActiva === 'dashboard' && <DashboardConsumo />}
      </div>
    </div>
  );
}