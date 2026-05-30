import api from './axiosConfig';

export const ventasApi = {
  getAnimalesDisponibles: () =>
    api.get('/ventas/animales-disponibles'),

  buscarDisponibles: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    return api.get(`/ventas/disponibles?${query.toString()}`);
  },

  crearVenta: (data) =>
    api.post('/ventas', data),

  getVentas: (params = {}) => {
    const query = new URLSearchParams();
    if (params.fecha_desde) query.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta);
    if (params.comprador) query.append('comprador', params.comprador);
    if (params.pagina) query.append('pagina', params.pagina);
    return api.get(`/ventas?${query.toString()}`);
  },

  getVentaById: (id) =>
    api.get(`/ventas/${id}`),

  getDetalleVenta: (id) =>
    api.get(`/ventas/${id}/detalle`),

  generarPDF: (idVenta) =>
    api.get(`/ventas/${idVenta}/pdf`, { responseType: 'blob' }),

  getCompradores: () =>
    api.get('ventas/compradores'),

  createComprador: (data) =>
    api.post('/ventas/compradores', data),

  updateComprador: (id, data) =>
    api.put(`/ventas/compradores/${id}`, data),

  getEstadisticas: (periodo = 'mes') =>
    api.get(`/ventas/estadisticas?periodo=${periodo}`),
};