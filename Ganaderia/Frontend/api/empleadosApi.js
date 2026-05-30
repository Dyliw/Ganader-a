import api from "./axiosConfig";

export const empleadosApi = {
  getAll: () => api.get('/empleados'),
  getById: (id) => api.get(`/empleados/${id}`),
  create: (data) => api.post('/empleados', data),
  update: (id, data) => api.put(`/empleados/${id}`, data),
  deactivate: (id) => api.delete(`/empleados/${id}`),
getPuestos: () => api.get('/empleados/puestos'),
};