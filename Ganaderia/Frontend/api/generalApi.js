import api from './axiosConfig';

export const generalApi = {
  getResumenGeneral: () => 
    api.get('/principal/resumen'),
  getResumenAnimales: () => 
    api.get('/principal/animales'),

  getResumenCorrales: () => 
    api.get('/principal/corrales'),

  getResumenAlimentacion: () => 
    api.get('/principal/alimentacion'),

  getResumenVeterinario: () => 
    api.get('/principal/veterinario'),

  getResumenAlmacen: () => 
    api.get('/principal/almacen'),

  getResumenVentas: () => 
    api.get('/principal/ventas'),
};