import React, { useState } from 'react';
import NuevaVenta from './NuevaVenta';
import HistorialVentas from './HistorialVentas';
import CompradoresPage from './CompradoresPage';

export default function VentasPage() {
  const [tabActiva, setTabActiva] = useState('nueva');

  const tabs = [
    { id: 'nueva', label: '🛒 Nueva Venta', icon: '' },
    { id: 'historial', label: '📋 Historial', icon: '' },
    { id: 'compradores', label: '👥 Compradores', icon: '' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">💰 Módulo de Ventas</h1>

      <div className="flex gap-1 mb-6 border-b pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              tabActiva === tab.id 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        {tabActiva === 'nueva' && <NuevaVenta />}
        {tabActiva === 'historial' && <HistorialVentas />}
        {tabActiva === 'compradores' && <CompradoresPage />}
      </div>
    </div>
  );
}