from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

class CatalogoService:
    
    @staticmethod
    def get_proveedores(db: Session) -> list:
        """Obtiene todos los proveedores activos"""
        try:
            proveedores = db.execute(text("""
                SELECT 
                    id_proveedor,
                    nombre,
                    rfc,
                    telefono
                FROM proveedores
                WHERE activo = true
                ORDER BY nombre
            """)).fetchall()
            
            return [
                {
                    "id_proveedor": p.id_proveedor,
                    "nombre": p.nombre,
                    "rfc": p.rfc,
                    "telefono": p.telefono
                }
                for p in proveedores
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener proveedores: {str(e)}")
    
    @staticmethod
    def get_corrales_disponibles(db: Session) -> list:
        """Obtiene corrales con su capacidad y ocupación actual"""
        try:
            corrales = db.execute(text("""
                SELECT 
                    c.id_corral,
                    c.nombre,
                    c.capacidad,
                    COUNT(a.arete)::INTEGER as ocupacion,
                    (c.capacidad - COUNT(a.arete))::INTEGER as disponibles
                FROM corrales c
                LEFT JOIN animales a 
                    ON a.id_corral_actual = c.id_corral 
                    AND a.fecha_muerte IS NULL
                WHERE c.activo = true
                GROUP BY c.id_corral, c.nombre, c.capacidad
                ORDER BY c.nombre
            """)).fetchall()
            
            return [
                {
                    "id_corral": c.id_corral,
                    "nombre": c.nombre,
                    "capacidad": c.capacidad,
                    "ocupacion": c.ocupacion,
                    "disponibles": c.disponibles
                }
                for c in corrales
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener corrales: {str(e)}")
    
    @staticmethod
    def get_estados(db: Session) -> list:
        """Obtiene todos los estados de animales"""
        try:
            estados = db.execute(text("""
                SELECT id_estado, nombre, descripcion
                FROM estado
                ORDER BY id_estado
            """)).fetchall()
            
            return [
                {
                    "id_estado": e.id_estado,
                    "nombre": e.nombre,
                    "descripcion": e.descripcion
                }
                for e in estados
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener estados: {str(e)}")
    
    @staticmethod
    def get_empleados(db: Session) -> list:
        """Obtiene empleados activos para dropdowns"""
        try:
            empleados = db.execute(text("""
                SELECT 
                    e.id_empleado,
                    e.nombre,
                    e.apellido_paterno,
                    p.nombre as puesto
                FROM empleados e
                JOIN puestos p ON e.id_puesto = p.id_puesto
                WHERE e.activo = true
                ORDER BY e.nombre
            """)).fetchall()
            
            return [
                {
                    "id_empleado": emp.id_empleado,
                    "nombre_completo": f"{emp.nombre} {emp.apellido_paterno}",
                    "puesto": emp.puesto
                }
                for emp in empleados
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener empleados: {str(e)}")
    
    @staticmethod
    def get_dietas(db: Session) -> list:
        """Obtiene dietas disponibles"""
        try:
            dietas = db.execute(text("""
                SELECT id_dieta, nombre, descripcion
                FROM dietas
                WHERE activo = true
                ORDER BY nombre
            """)).fetchall()
            
            return [
                {
                    "id_dieta": d.id_dieta,
                    "nombre": d.nombre,
                    "descripcion": d.descripcion
                }
                for d in dietas
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener dietas: {str(e)}")
    
    @staticmethod
    def get_tipos_corral(db: Session) -> list:
        """Obtiene tipos de corral"""
        try:
            tipos = db.execute(text("""
                SELECT id_tipo, nombre, descripcion
                FROM tipo_corral
                ORDER BY nombre
            """)).fetchall()
            
            return [
                {
                    "id_tipo": t.id_tipo,
                    "nombre": t.nombre,
                    "descripcion": t.descripcion
                }
                for t in tipos
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener tipos de corral: {str(e)}")
    
    @staticmethod
    def get_medicamentos(db: Session) -> list:
        """Obtiene medicamentos disponibles"""
        try:
            medicamentos = db.execute(text("""
                SELECT 
                    m.id_medicamento,
                    m.nombre,
                    m.tipo_dosis,
                    m.stock_actual,
                    m.unidad_medida,
                    tm.nombre as tipo
                FROM medicamentos m
                JOIN tipo_medicamento tm ON m.id_tipo_medicamento = tm.id_tipo
                WHERE m.activo = true
                ORDER BY m.nombre
            """)).fetchall()
            
            return [
                {
                    "id_medicamento": med.id_medicamento,
                    "nombre": med.nombre,
                    "tipo_dosis": med.tipo_dosis,
                    "stock": med.stock_actual,
                    "unidad": med.unidad_medida,
                    "tipo": med.tipo
                }
                for med in medicamentos
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener medicamentos: {str(e)}")
    
    @staticmethod
    def get_compradores(db: Session) -> list:
        """Obtiene compradores registrados"""
        try:
            compradores = db.execute(text("""
                SELECT id_comprador, nombre, rfc, telefono
                FROM compradores
                ORDER BY nombre
            """)).fetchall()
            
            return [
                {
                    "id_comprador": c.id_comprador,
                    "nombre": c.nombre,
                    "rfc": c.rfc,
                    "telefono": c.telefono
                }
                for c in compradores
            ]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener compradores: {str(e)}")