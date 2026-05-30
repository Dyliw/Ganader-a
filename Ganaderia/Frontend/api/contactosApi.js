import api from './axiosConfig';

export const contactosApi = {
  getProveedores: () => 
   api.get('/proveedores'),

  getCompradores: () => 
    api.get('/contactos/compradores'),
  
  buscar: (tipo, termino) => 
    api.get(`/contactos/buscar?tipo=${tipo}&q=${termino}`),
  
  create: (data) => 
    api.post('/contactos', data),
  
  update: (tipo, id, data) => 
    api.put(`/contactos/${tipo}/${id}`, data),
  
  deactivate: (tipo, id) => 
    api.patch(`/contactos/${tipo}/${id}/desactivar`),

  createRapido: (data) => 
    api.post('/contactos/rapido', data),
};