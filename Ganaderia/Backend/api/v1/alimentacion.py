from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.services.alimentacion_service import AlimentacionService
from app.api.v1.seguridad import get_current_active_user, require_permission

router = APIRouter()

@router.get("/corrales-dieta")
def corrales_con_dieta(db: Session = Depends(get_db)):
    """Lista corrales con su dieta y ocupación"""
    
    corrales = db.execute(text("""
        SELECT 
            c.id_corral,
            c.nombre,
            c.capacidad,
            d.nombre as dieta_nombre,
            d.id_dieta,
            CAST(COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) AS INTEGER) as ocupacion
        FROM corrales c
        JOIN dietas d ON c.dieta_actual = d.id_dieta
        LEFT JOIN animales a ON a.id_corral_actual = c.id_corral
        WHERE c.activo = true
        GROUP BY c.id_corral, d.nombre, d.id_dieta
        ORDER BY c.nombre
    """)).fetchall()
    
    resultado = []
    for c in corrales:
        resultado.append({
            "id_corral": c.id_corral,
            "nombre": c.nombre,
            "capacidad": c.capacidad,
            "dieta_nombre": c.dieta_nombre,
            "id_dieta": c.id_dieta,
            "ocupacion": c.ocupacion
        })
    
    return resultado

@router.get("/calcular/{id_corral}")
def calcular_comida(id_corral: int, fecha: str = Query(None), db: Session = Depends(get_db)):
    """Calcula la cantidad de comida sugerida para un corral"""
    try:
        return AlimentacionService.calcular_comida_sugerida(db, id_corral)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al calcular: {str(e)}")

@router.post("/servir")
def servir_comida(data: dict, db: Session = Depends(get_db)):
    """Registra servicio de comida y descuenta ingredientes"""
    try:
        return AlimentacionService.servir_comida(db, data)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/historial")
def historial_servicios(
    corral: str = Query(None),
    fecha_desde: str = Query(None),
    fecha_hasta: str = Query(None),
    empleado: str = Query(None),
    pagina: int = Query(1, ge=1),
    db: Session = Depends(get_db)
):
    """Historial de servicios de alimentación"""
    filtros = {
        "corral": corral,
        "fecha_desde": fecha_desde,
        "fecha_hasta": fecha_hasta,
        "empleado": empleado,
        "pagina": pagina
    }
    return AlimentacionService.obtener_historial(db, filtros)


@router.get("/resumen")
def resumen_consumo(fecha: str = Query(None), db: Session = Depends(get_db)):
    """Resumen de consumo por corral en una fecha"""
    
    resumen = db.execute(text("""
        SELECT 
            c.nombre as corral,
            COUNT(s.id_servicios) as servicios,
            COALESCE(SUM(s.cantidad_kg), 0) as total_kg,
            d.nombre as dieta
        FROM servicios_alimentacion s
        JOIN corrales c ON s.id_corral = c.id_corral
        JOIN dietas d ON s.id_dieta = d.id_dieta
        WHERE (:fecha IS NULL OR s.fecha_servicio = CAST(:fecha AS DATE))
        GROUP BY c.nombre, d.nombre
        ORDER BY total_kg DESC
    """), {"fecha": fecha}).fetchall()
    
    resultado = []
    for r in resumen:
        resultado.append({
            "corral": r.corral,
            "servicios": r.servicios,
            "total_kg": float(r.total_kg),
            "dieta": r.dieta
        })
    
    return resultado