import api from './axiosConfig'

generarPDF: (tipo, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/reportes/pdf/${tipo}?${query}`, { responseType: 'blob' });
}