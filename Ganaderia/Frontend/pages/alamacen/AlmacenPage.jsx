import React, { useState } from 'react';
import DashboardAlmacen from './DashboardInventario';
import EntradaAlmacen from './EntradaAlmacen';
import AjustesInventario from './AjustesInventario';
import AlertasStock from './AlertasStock';
import HistorialMovimientos from './HistorialMovimientos';
import OrdenesCompra from './OrdenesCompra';

export default function AlmacenPage() {
  const [tabActiva, setTabActiva] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '' },
    { id: 'entradas', label: '📥 Entradas', icon: '' },
    { id: 'ajustes', label: '🔧 Ajustes', icon: '' },
    { id: 'historial', label: '📋 Historial', icon: '' },
    { id: 'alertas', label: '⚠️ Alertas', icon: '' },
    { id: 'ordenes', label: '🛒 Órdenes', icon: '' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🏗️ Módulo de Almacén</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              tabActiva === tab.id 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-lg shadow">
        {tabActiva === 'dashboard' && <DashboardAlmacen />}
        {tabActiva === 'entradas' && <EntradaAlmacen />}
        {tabActiva === 'ajustes' && <AjustesInventario />}
        {tabActiva === 'historial' && <HistorialMovimientos />}
        {tabActiva === 'alertas' && <AlertasStock />}
        {tabActiva === 'ordenes' && <OrdenesCompra />}
      </div>
    </div>
  );
}