import React, { useState, useEffect } from 'react';
import { recepcionApi } from '../../api/recepcionApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ListaRecepciones() {
  const [recepciones, setRecepciones] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(null);
  useEffect(() => {
    cargarRecepciones();
  }, [pagina]);

  const cargarRecepciones = async () => {
    setCargando(true);
    try {
      const res = await recepcionApi.listarRecepciones(pagina);
      setRecepciones(res.data.recepciones);
      setTotalPaginas(res.data.total_paginas);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const descargarPDF = async (idRecepcion) => {
    setDescargando(idRecepcion);
    
    try {
      const res = await recepcionApi.getDetalleRecepcion(idRecepcion);
      const data = res.data;
      const rec = data.recepcion;
      const animales = data.animales || [];
      
      // Crear PDF
      const doc = new jsPDF();
      
      // Encabezado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RECEPCIÓN DE GANADO', 105, 15, { align: 'center' });
      
      // Línea separadora
      doc.setLineWidth(0.5);
      doc.line(14, 20, 196, 20);
      
      // Datos de la recepción
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos de la Recepción:', 14, 30);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const datosRecepcion = [
        ['N° Guía:', rec.numero_guia || 'N/A'],
        ['Proveedor:', rec.proveedor || 'N/A'],
        ['Motivo:', rec.motivo || 'N/A'],
        ['Fecha Guía:', rec.fecha_guia ? new Date(rec.fecha_guia).toLocaleDateString() : 'N/A'],
        ['Fecha Recepción:', rec.fecha_recepcion ? new Date(rec.fecha_recepcion).toLocaleDateString() : 'N/A'],
        ['Recibido por:', rec.recibido_por || 'N/A'],
        ['Corral:', rec.corral_nombre || 'Sin asignar'],
      ];
      
      datosRecepcion.forEach(([label, value], i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, 38 + (i * 6));
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 50, 38 + (i * 6));
      });
      
      // Resumen de animales
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen:', 14, 85);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Programados: ${rec.animales_programados || 0}`, 14, 92);
      doc.text(`Recibidos: ${rec.animales_recibidos || 0}`, 80, 92);
      doc.text(`Muertos: ${rec.animales_muertos || 0}`, 14, 99);
      doc.text(`Enfermos: ${rec.animales_enfermos || 0}`, 80, 99);
      doc.text(`Registrados: ${rec.animales_registrados || 0}`, 14, 106);
      
      // Tabla de animales
      if (animales.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Animales Registrados:', 14, 118);
        
        const tablaData = animales.map(a => [
          a.arete || '',
          a.sexo || '',
          a.peso_entrada ? `${a.peso_entrada} kg` : '',
          a.meses || '',
          a.precio_compra ? `$${a.precio_compra}` : '',
          a.clasificacion || 'N/A',
          a.corral || 'N/A',
        ]);
        
        autoTable(doc, {
          startY: 122,
          head: [['Arete', 'Sexo', 'Peso', 'Meses', 'Precio', 'Clasificación', 'Corral']],
          body: tablaData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 15 },
            2: { cellWidth: 20 },
            3: { cellWidth: 15 },
            4: { cellWidth: 20 },
            5: { cellWidth: 25 },
            6: { cellWidth: 25 },
          },
        });
      }
      
      // Observaciones
      if (rec.observaciones) {
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 130;
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        // Dividir texto largo
        const obsLines = doc.splitTextToSize(rec.observaciones, 180);
        doc.text(obsLines, 14, finalY + 6);
      }
      
      // Pie de página
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Generado: ${new Date().toLocaleString()} - Página ${i} de ${pageCount}`,
          105, 290, { align: 'center' }
        );
      }
      
      // Descargar
      const nombreArchivo = `Recepcion_${rec.numero_guia || idRecepcion}.pdf`;
      doc.save(nombreArchivo);
      
      console.log('✅ PDF descargado:', nombreArchivo);
      
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error al descargar el PDF. Revisa la consola.');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">📊 Historial de Recepciones</h2>

      {cargando ? (
        <div className="text-center py-8 text-gray-500">⏳ Cargando...</div>
      ) : recepciones.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No hay recepciones registradas</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Guía</th>
                  <th className="p-2 text-left">Proveedor</th>
                  <th className="p-2 text-left">Motivo</th>
                  <th className="p-2 text-center">Prog.</th>
                  <th className="p-2 text-center">Recib.</th>
                  <th className="p-2 text-center">Reg.</th>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-center">PDF</th>
                </tr>
              </thead>
              <tbody>
                {recepciones.map(r => (
                  <tr key={r.id_recepcion} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-medium">{r.numero_guia}</td>
                    <td className="p-2">{r.proveedor}</td>
                    <td className="p-2">{r.motivo}</td>
                    <td className="p-2 text-center">{r.animales_programados}</td>
                    <td className="p-2 text-center">{r.animales_recibidos}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        r.animales_registrados >= r.animales_recibidos 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.animales_registrados}/{r.animales_recibidos}
                      </span>
                    </td>
                    <td className="p-2 text-xs">
                      {r.fecha_recepcion ? new Date(r.fecha_recepcion).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => descargarPDF(r.id_recepcion)}
                        disabled={descargando === r.id_recepcion}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50 transition"
                        title="Descargar PDF"
                      >
                        {descargando === r.id_recepcion ? '⏳' : '📄 PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                ← Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}