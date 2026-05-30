// frontend/src/api/dietasApi.js
import api from './axiosConfig';

export const dietasApi = {
    getAll: () =>
        api.get('/dietas'),
    
    getById: (id) =>
        api.get(`/dietas/${id}`),
    
    create: (data) =>
        api.post('/dietas', data),
    
    update: (id, data) =>
        api.put(`/dietas/${id}`, data),
    

    agregarIngrediente: (idDieta, data) =>
        api.post(`/dietas/${idDieta}/ingredientes`, data),
    

    actualizarIngrediente: (idDieta, idIngrediente, data) =>
        api.put(`/dietas/${idDieta}/ingredientes/${idIngrediente}`, data),
    
    eliminarIngrediente: (idDieta, idIngrediente) =>
        api.delete(`/dietas/${idDieta}/ingredientes/${idIngrediente}`),
    
    deactivate: (id) =>
        api.patch(`/dietas/${id}/desactivar`),
    
    getCosto: (id) =>
        api.get(`/dietas/${id}/costo`),
};

export const ingredientesApi = {
    getAll: () =>
        api.get('/ingredientes'),

    getById: (id) =>
        api.get(`/ingredientes/${id}`),
 
    create: (data) =>
        api.post('/ingredientes', data),
    
    update: (id, data) =>
        api.put(`/ingredientes/${id}`, data),
    
    updateStock: (id, data) =>
        api.patch(`/ingredientes/${id}/stock`, data),

    deactivate: (id) =>
        api.patch(`/ingredientes/${id}/desactivar`),
    
    getStockBajo: () =>
        api.get('/ingredientes/stock-bajo'),
};