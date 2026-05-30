import api from './axiosConfig';

export const recepcionApi = {
  registrarRecepcionCompleta: (data) => 
    api.post('/recepcion/completa', data), 

  registrarAnimal: (data) => 
    api.post('/recepcion/animal', data),

  registrarRango: (data) => 
    api.post('/recepcion/animales-rango', data),

  registrarGuia: (data) => 
    api.post('/recepcion/guia', data),

  listarRecepciones: (pagina = 1) => 
    api.get(`/recepcion/recepciones?pagina=${pagina}`),

    getDetalleRecepcion: (id) => 
    api.get(`/recepcion/recepciones/${id}`),

  getProveedores: () => 
    api.get('/proveedores'),

  getCorralesDisponibles: () => 
    api.get('/corrales/disponibles'),
  
  getCorrales: () => 
    api.get('/corrales'),

  getEstados: () => 
    api.get('/catalogos/estados'),

  getEmpleados: () => 
    api.get('/catalogos/empleados'),

  getDietas: () => 
    api.get('/catalogos/dietas'),

  getTiposCorral: () => 
    api.get('/catalogos/tipos-corral'),

  getMedicamentos: () => 
    api.get('/catalogos/medicamentos'),

  getCompradores: () => 
    api.get('/catalogos/compradores'),
  crearProveedor: (data)=>
    api.post('/proveedores', data),
  actualizarProveedor: (id, data)=>
    api.put(`/proveedores/${id}`, data),
};