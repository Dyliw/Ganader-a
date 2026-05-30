// frontend/src/utils/downloadPDF.js
export async function downloadPDF(promise, filename) {
  try {
    const res = await promise;
    // Crear URL desde el blob
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'documento.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error descargando PDF:', error);
    alert('No se pudo generar el PDF');
  }
}