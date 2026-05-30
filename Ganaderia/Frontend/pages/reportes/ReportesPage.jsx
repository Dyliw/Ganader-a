import React, { useState } from 'react';
import InventarioAnimales from './InventarioAnimales';
import RentabilidadLote from './RentabilidadLote';
import ConsumoAlimento from './ConsumoAlimento';
import EntradasVentas from './EntradasVentas';
import CostoAnimal from './CostoAnimal';
import AnimalesCausa from './AnimalesCausa';
export default function ReportesPage() {
  const [tabActiva, setTabActiva] = useState('inventario');

  const tabs = [
    { id: 'inventario', label: '🐄 Inventario', hu: 'HU-REP-01' },
    { id: 'rentabilidad', label: '💰 Rentabilidad', hu: 'HU-REP-02' },
    { id: 'consumo', label: '🍽️ Consumo', hu: 'HU-REP-03' },
    { id: 'entradas', label: '📊 Entradas/Ventas', hu: 'HU-REP-04' },
    { id: 'costo', label: '💲 Costo Animal', hu: 'HU-REP-05' },
    { id: 'causas', label: '🏥 Causas', hu: 'HU-REP-06' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📊 Módulo de Reportes</h1>

      <div className="flex flex-wrap gap-1 mb-6 border-b pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-4 py-2 rounded-t text-sm ${tabActiva === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {tabActiva === 'inventario' && <InventarioAnimales />}
        {tabActiva === 'rentabilidad' && <RentabilidadLote />}
        {tabActiva === 'consumo' && <ConsumoAlimento />}
        {tabActiva === 'entradas' && <EntradasVentas />}
        {tabActiva === 'costo' && <CostoAnimal />}
        {tabActiva === 'causas' && <AnimalesCausa />}
      </div>
    </div>
  );
}