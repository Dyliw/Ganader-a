import api from './axiosConfig';

export const reportesApi = {
  getInventarioAnimales: (params = {}) => {
    const query = new URLSearchParams();
    if (params.estado && params.estado !== 'todos') query.append('estado', params.estado);
    if (params.corral) query.append('corral', params.corral);
    return api.get(`/reportes/inventario-animales?${query.toString()}`);
  },

  getRentabilidadLote: (idLote) =>
    api.get(`/reportes/rentabilidad-lote/${idLote}`),

  getConsumoAlimento: (desde, hasta) =>
    api.get(`/reportes/consumo-alimento?desde=${desde}&hasta=${hasta}`),

  getEntradasVentas: (mes, anio) =>
    api.get(`/reportes/entradas-ventas?mes=${mes}&anio=${anio}`),

  getCostoAnimal: (arete) =>
    api.get(`/reportes/costo-animal/${arete}`),

  getAnimalesPorCausa: (params = {}) => {
    const query = new URLSearchParams();
    if (params.desde) query.append('desde', params.desde);
    if (params.hasta) query.append('hasta', params.hasta);
    return api.get(`/reportes/animales-causa?${query.toString()}`);
  },

 generarPDF: (tipo, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/pdf/${tipo}?${query}`, { responseType: 'blob' });
},

  getLotes: () =>
    api.get('/reportes/lotes'),
};