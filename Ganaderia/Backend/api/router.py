from fastapi import APIRouter

from app.api.v1 import recepcion, corrales, animales, alimentacion, almacen, catalogos, compradores, contactos, dietas, ingredientes, medicamentos, principal, reportes, proveedores, ventas, auth, empleados

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autentificación"])
api_router.include_router(recepcion.router, prefix="/recepcion", tags=["Recepción"])
api_router.include_router(corrales.router, prefix="/corrales", tags=["Corrales"])
api_router.include_router(animales.router, prefix="/animales", tags=["Animales"])
api_router.include_router(alimentacion.router, prefix="/alimentacion", tags=["Alimentación"])
api_router.include_router(almacen.router, prefix="/almacen", tags=["Almacén"])
api_router.include_router(catalogos.router, prefix="/catalogos", tags=["Catálogos"])
api_router.include_router(compradores.router, prefix="/compradores", tags=["Compradores"])
api_router.include_router(contactos.router, prefix="/contactos", tags=["Contactos"])
api_router.include_router(dietas.router, prefix="/dietas", tags=["Dietas"])
api_router.include_router(ingredientes.router, prefix="/ingredientes", tags=["Ingredientes"])
api_router.include_router(medicamentos.router, prefix="/medicamentos", tags=["Medicamentos"])
api_router.include_router(principal.router, prefix="/principal", tags=["Principal"])
api_router.include_router(empleados.router, prefix="/empleados", tags=["Empleados"])
api_router.include_router(proveedores.router, prefix="/proveedores", tags=["Proveedores"])
api_router.include_router(reportes.router, prefix="/reportes", tags=["Reportes"])
api_router.include_router(ventas.router, prefix="/ventas", tags=["Ventas"])
