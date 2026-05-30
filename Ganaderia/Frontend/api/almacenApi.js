import api from "./axiosConfig";

export const almacenApi = {
  getDashboard: () =>
    api.get('/almacen/dashboard'),

  registrarEntrada: (data) =>
    api.post('/almacen/entrada', data),

  getEntradas: (params = {}) => {
    const query = new URLSearchParams();
    if (params.tipo) query.append('tipo', params.tipo);
    if (params.fecha_desde) query.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta);
    if (params.proveedor) query.append('proveedor', params.proveedor);
    if (params.pagina) query.append('pagina', params.pagina);
    return api.get(`/almacen/entradas?${query.toString()}`);
  },

  registrarSalida: (data) =>
    api.post('/almacen/salida', data),

  registrarAjuste: (data) =>
    api.post('/almacen/ajuste', data),

  getHistorial: (params = {}) => {
    const query = new URLSearchParams();
    if (params.producto_id) query.append('producto_id', params.producto_id);
    if (params.tipo_movimiento) query.append('tipo_movimiento', params.tipo_movimiento);
    if (params.fecha_desde) query.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta);
    if (params.pagina) query.append('pagina', params.pagina);
    return api.get(`/almacen/historial?${query.toString()}`);
  },
  getAlertasStock: () =>
    api.get('/almacen/alertas-stock'),

  getProductosCaducar: (dias = 30) =>
    api.get(`/almacen/caducidades?dias=${dias}`),

  getSugerenciasCompra: () =>
    api.get('/almacen/sugerir-compra'),

  generarOrdenCompra: (data) =>
    api.post('/almacen/generar-orden', data),

  getOrdenesCompra: () =>
    api.get('/almacen/ordenes'),

  getEstadisticas: (periodo = 'mes') =>
    api.get(`/almacen/estadisticas?periodo=${periodo}`),

  getConsumoPromedio: (idProducto, dias = 30) =>
    api.get(`/almacen/consumo-promedio/${idProducto}?dias=${dias}`),

  getProductos: (tipo = 'todos') =>
    api.get(`/almacen/productos?tipo=${tipo}`),

  getProveedores: () =>
    api.get('/almacen/proveedores'),
};