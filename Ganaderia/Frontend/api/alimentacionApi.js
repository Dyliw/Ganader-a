import api from "./axiosConfig";

export const alimentacionApi={
    servirComida: (data) =>
        api.post('/alimentacion/servir', data),

     calcularComida: (idCorral, fecha = null) => {
    const params = fecha ? `?fecha=${fecha}` : '';
    return api.get(`/alimentacion/calcular/${idCorral}${params}`);
  },

  getHistorial : (params ={})=>{
    const query = new URLSearchParams();
    if(params.corral) query.append('corral', params.corral);
    if (params.fecha_desde) query.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta);
    if (params.empleado) query.append('empleado', params.empleado);
    if (params.pagina) query.append('pagina', params.pagina);
    return api.get(`/alimentacion/historial?${query.toString()}`);
  },
  getResumenConsumo: (fecha = null) => {
    const params = fecha ? `?fecha=${fecha}` : '';
    return api.get(`/alimentacion/resumen${params}`);
  },

  getCorralesConDieta: () => 
    api.get('/alimentacion/corrales-dieta'),

  sustituirIngrediente: (data) => 
    api.post('/alimentacion/sustituir-ingrediente', data),

  programarComida: (data) => 
    api.post('/alimentacion/programar', data),

  getProgramadas: (corral = null) => {
    const params = corral ? `?corral=${corral}` : '';
    return api.get(`/alimentacion/programadas${params}`);
  },

}