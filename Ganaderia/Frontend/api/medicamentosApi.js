import api from './axiosConfig';

export const medicamentosApi = {
  getAll: () => 
    api.get('/medicamentos'),

  getById: (id) => 
    api.get(`/medicamentos/${id}`),

  create: (data) => 
    api.post('/medicamentos', data),

  update: (id, data) => 
    api.put(`/medicamentos/${id}`, data),

  deactivate: (id) => 
    api.patch(`/medicamentos/${id}/desactivar`),

  // Aplicar tratamiento individual
  aplicarTratamiento: (data) => 
    api.post('/medicamentos/tratamientos', data),

  // Aplicar tratamiento masivo a un corral
  aplicarTratamientoMasivo: (data) => 
    api.post('/medicamentos/tratamientos/masivo', data),

  // Calcular dosis
  calcularDosis: (idMedicamento, arete) => 
    api.get(`/medicamentos/${idMedicamento}/dosis/${arete}`),

  getHistorialAnimal: (arete, params = {}) => {
    const query = new URLSearchParams();
    if (params.desde) query.append('desde', params.desde);
    if (params.hasta) query.append('hasta', params.hasta);
    return api.get(`/medicamentos/historial/${arete}?${query.toString()}`);
  },

  getHistorialGeneral: (params = {}) => {
    const query = new URLSearchParams();
    if (params.desde) query.append('desde', params.desde);
    if (params.hasta) query.append('hasta', params.hasta);
    if (params.medicamento) query.append('medicamento', params.medicamento);
    if (params.empleado) query.append('empleado', params.empleado);
    if (params.pagina) query.append('pagina', params.pagina);
    return api.get(`/medicamentos/historial?${query.toString()}`);
  },

  getCaducados: () => 
    api.get('/medicamentos/caducados'),

  getProximosCaducar: (dias = 30) => 
    api.get(`/medicamentos/proximos-caducar?dias=${dias}`),

  getStockBajo: () => 
    api.get('/medicamentos/stock-bajo'),

  getAnimalesEnRetiro: () => 
    api.get('/medicamentos/animales-en-retiro'),

  getAnimalesDisponiblesVenta: () => 
    api.get('/medicamentos/animales-disponibles-venta'),

  getTiposMedicamento: () => 
    api.get('/medicamentos/tipos'),

  getDashboard: () => 
    api.get('/medicamentos/dashboard'),
};