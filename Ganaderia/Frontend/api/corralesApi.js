import api from "./axiosConfig";

export const corralesApi = {
  getAll: () =>
    api.get('/corrales'),

  getById: (idCorral) =>
    api.get(`/corrales/${idCorral}`),

  create: (data) =>
    api.post('/corrales', data),

  update: (id, data) =>
    api.put(`/corrales/${id}`, data),

  deactivate: (id) =>
    api.patch(`/corrales/${id}/desactivar`),

  getOcupacion: (id) =>
    api.get(`/corrales/${id}/ocupacion`),

  getTiposCorral: () =>
    api.get('/corrales/tipos'),

  moverAnimales: (data) =>
    api.post('/corrales/mover-animales', data),
};