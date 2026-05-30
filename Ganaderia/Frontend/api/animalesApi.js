import api from "./axiosConfig";

export const animalesApi = {
    getAll: (params = {})=>{
        const queryParams = new URLSearchParams();
        if(params.estado && params.estado !=='todos') queryParams.append('estado', params.estado);
        if(params.sexo) queryParams.append('sexo', params.sexo);
        if(params.corral) queryParams.append('corral', params.corral);
        if(params.clasificacion) queryParams.append('clasificacion', params.clasifiacion);
        if(params.busqueda) queryParams.append('busqueda', params.busqueda);
        if(params.peso_min) queryParams.append('peso_min', params.peso_min);
        if(params.peso_max) queryParams.append('peso_max', params.peso_max);
        if(params.meses_min) queryParams.append('meses_min', params.meses_min);
        if(params.meses_max) queryParams.append('meses_max', params.meses_max);
        if(params.pagina) queryParams.append('pagina', params.pagina);
        if(params.limite) queryParams.append('limite', params.limite);

        queryParams.append('pagina', params.pagina || 1);
        queryParams.append('limite', params.limite || 20);
        const url =`/animales?${queryParams.toString()}`;
        console.log('Request urld:', url)

        return api.get(url);
    },
    getById: (arete) =>
        api.get(`/animales/${arete}`),
    update: (arete, data) =>
        api.put(`/animales/${arete}`, data),
    registarMuerte: (arete, data)=>
        api.post(`/animales/${arete}/muerte`, data),
    getHistorialMovimientos: (arete)=>
        api.get(`/animales/${arete}/movimientos`),
    getHisotialPesos: (arete)=>
        api.get(`/animales/${arete}/pesos`),
    registrarPeso: (arete, data)=>
        api.post(`/animales/${arete}`, data),
    getHistorialTratamientos: (arete)=>
        api.get(`/animales/${arete}/tratamientos`),
    generarPDF: (arete) => {
  window.open(`${api.defaults.baseURL}/animales/${arete}/pdf`, '_blank');
},
  cambiarEstado: (arete, data) => 
    api.patch(`/animales/${arete}/estado`, data),

  generarPDF: (arete) => 
    api.get(`/animales/${arete}/pdf`, { responseType: 'blob' }),
  
  abrirPDF: (arete) => {
    window.open(`${api.defaults.baseURL}/animales/${arete}/pdf`, '_blank')},
    
    getConteoEstados: () =>
        api.get(`/aniamles/conteo-estados`),
    moverAnimal: (arete, data)=>
        api.post(`/animales/${arete}/mover`, data),
    cambiarEstado: (arete, data)=>
        api.patch(`/animales/${arete}/muerte`, data),
    getEstados: ()=>
        api.get('/estado'),
    getHistorialPesos: (arete) => 
    api.get(`/animales/${arete}/pesos`),

  registrarPeso: (arete, data) => 
    api.post(`/animales/${arete}/pesos`, data),

  getHistorialMovimientos: (arete) => 
    api.get(`/animales/${arete}/movimientos`),

  getHistorialTratamientos: (arete) => 
    api.get(`/animales/${arete}/tratamientos`),
};