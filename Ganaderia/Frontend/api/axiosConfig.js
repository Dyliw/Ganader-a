import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    console.log('Request:', config.method?.toUpperCase(), config.url);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token agregado a la petición');
    }
    
    if(config.params){
      console.log('Params: ', config.params);
    }
    if (config.data){
      console.log('Data:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(' Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Error API:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      params: error.config?.params,
    });
    
    // Manejar errores específicos
    if (error.response?.status === 401) {
      console.warn('⚠️ Token inválido o expirado');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 422) {
      console.warn('⚠️ Error de validación (422). Datos enviados:', error.config?.params);
    }
    
    if (error.response?.status === 500) {
      console.error('🔥 Error del servidor:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;