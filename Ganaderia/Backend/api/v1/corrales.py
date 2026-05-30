from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.services.catalogo_service import CatalogoService

router = APIRouter()

@router.get("/disponibles", summary="Listar corrales con espacio disponible")
def listar_corrales_disponibles(db: Session = Depends(get_db)):
    """
    Obtiene corrales con espacio disponible.
    Útil para dropdowns en recepción y traslados.
    """
    try:
        corrales = CatalogoService.get_corrales_disponibles(db)
        disponibles = [c for c in corrales if c["disponibles"] > 0]
        return disponibles
    except Exception as e:
        print(f"❌ Error en disponibles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tipos", summary="Listar tipos de corral")
def listar_tipos_corral(db: Session = Depends(get_db)):
    """Obtiene todos los tipos de corral para dropdowns"""
    try:
        tipos = db.execute(text("""
            SELECT id_tipo, nombre, descripcion
            FROM tipo_corral
            ORDER BY nombre
        """)).fetchall()
        return [dict(t._mapping) for t in tipos]
    except Exception as e:
        print(f"❌ Error en tipos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def listar_corrales(db: Session = Depends(get_db)):
    """Lista todos los corrales con estadísticas de ocupación"""
    
    try:
        corrales = db.execute(text("""
            SELECT 
                c.id_corral,
                c.nombre,
                c.capacidad,
                c.activo,
                tc.nombre as tipo_corral,
                d.nombre as dieta_nombre,
                c.dieta_actual,
                COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) as ocupacion,
                COUNT(a.arete) FILTER (WHERE a.sexo = 'macho' AND a.fecha_muerte IS NULL) as machos,
                COUNT(a.arete) FILTER (WHERE a.sexo = 'hembra' AND a.fecha_muerte IS NULL) as hembras,
                c.capacidad - COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) as disponibles,
                ROUND(
                    (COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) * 100.0 / 
                     NULLIF(c.capacidad, 0)), 1
                ) as porcentaje_ocupacion,
                ROUND(AVG(COALESCE(
                    (SELECT hp.peso FROM historial_peso hp 
                     WHERE hp.arete = a.arete 
                     ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                )), 1) as peso_promedio
            FROM corrales c
            JOIN tipo_corral tc ON c.id_tipo_corral = tc.id_tipo
            JOIN dietas d ON c.dieta_actual = d.id_dieta
            LEFT JOIN animales a ON a.id_corral_actual = c.id_corral
            GROUP BY c.id_corral, tc.nombre, d.nombre
            ORDER BY c.nombre
        """)).fetchall()
        
        # CORRECCIÓN: Usar _mapping para todos
        return [dict(c._mapping) for c in corrales]
    except Exception as e:
        print(f"❌ Error en listar_corrales: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id_corral}")
def detalle_corral(id_corral: int, db: Session = Depends(get_db)):
    """Obtiene detalle de un corral con lista de animales"""
    
    try:
        # Info del corral
        corral = db.execute(text("""
            SELECT c.*, tc.nombre as tipo_corral, d.nombre as dieta_nombre, d.factor
            FROM corrales c
            JOIN tipo_corral tc ON c.id_tipo_corral = tc.id_tipo
            JOIN dietas d ON c.dieta_actual = d.id_dieta
            WHERE c.id_corral = :id
        """), {"id": id_corral}).fetchone()
        
        if not corral:
            raise HTTPException(status_code=404, detail="Corral no encontrado")
        
        # Animales en el corral
        animales = db.execute(text("""
            SELECT 
                a.arete,
                a.sexo,
                a.clasificacion,
                a.meses,
                a.peso_entrada,
                COALESCE(
                    (SELECT hp.peso FROM historial_peso hp 
                     WHERE hp.arete = a.arete 
                     ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                ) as peso_actual,
                a.fecha_ingreso,
                e.nombre as estado_nombre
            FROM animales a
            JOIN estado e ON a.id_estado = e.id_estado
            WHERE a.id_corral_actual = :id
            AND a.fecha_muerte IS NULL
            ORDER BY a.arete
        """), {"id": id_corral}).fetchall()
        
        return {
            "corral": dict(corral._mapping),
            "animales": [dict(a._mapping) for a in animales]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en detalle_corral: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def crear_corral(data: dict, db: Session = Depends(get_db)):
    """Crea un nuevo corral"""
    try:
        resultado = db.execute(text("""
            INSERT INTO corrales (nombre, capacidad, id_tipo_corral, dieta_actual)
            VALUES (:nombre, :capacidad, :tipo, :dieta)
            RETURNING id_corral
        """), {
            "nombre": data["nombre"],
            "capacidad": data["capacidad"],
            "tipo": data["id_tipo_corral"],
            "dieta": data["dieta_actual"]
        })
        db.commit()
        return {"mensaje": "Corral creado", "id_corral": resultado.fetchone().id_corral}
    except Exception as e:
        db.rollback()
        print(f"❌ Error en crear_corral: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{id_corral}")
def actualizar_corral(id_corral: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza un corral existente"""
    try:
        db.execute(text("""
            UPDATE corrales 
            SET nombre = COALESCE(:nombre, nombre),
                capacidad = COALESCE(:capacidad, capacidad),
                id_tipo_corral = COALESCE(:tipo, id_tipo_corral),
                dieta_actual = COALESCE(:dieta, dieta_actual),
                activo = COALESCE(:activo, activo)
            WHERE id_corral = :id
        """), {
            "id": id_corral,
            "nombre": data.get("nombre"),
            "capacidad": data.get("capacidad"),
            "tipo": data.get("id_tipo_corral"),
            "dieta": data.get("dieta_actual"),
            "activo": data.get("activo")
        })
        db.commit()
        return {"mensaje": "Corral actualizado"}
    except Exception as e:
        db.rollback()
        print(f"❌ Error en actualizar_corral: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{id_corral}/desactivar")
def desactivar_corral(id_corral: int, db: Session = Depends(get_db)):
    """Desactiva un corral"""
    try:
        db.execute(text("""
            UPDATE corrales SET activo = false WHERE id_corral = :id
        """), {"id": id_corral})
        db.commit()
        return {"mensaje": "Corral desactivado"}
    except Exception as e:
        db.rollback()
        print(f"❌ Error en desactivar_corral: {e}")
        raise HTTPException(status_code=400, detail=str(e))
@router.get("/{id_corral}")
def detalle_corral(id_corral: int, db: Session = Depends(get_db)):
    # Información del corral
    corral = db.execute(text("""
        SELECT c.*, tc.nombre as tipo_corral, d.nombre as dieta_nombre,
               d.id_dieta, d.factor,
               COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) as ocupacion,
               c.capacidad - COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) as disponibles,
               ROUND(COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) * 100.0 / c.capacidad, 1) as porcentaje_ocupacion,
               ROUND(AVG(COALESCE(
                   (SELECT hp.peso FROM historial_peso hp WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                   a.peso_entrada
               )), 1) as peso_promedio
        FROM corrales c
        JOIN tipo_corral tc ON c.id_tipo_corral = tc.id_tipo
        JOIN dietas d ON c.dieta_actual = d.id_dieta
        LEFT JOIN animales a ON a.id_corral_actual = c.id_corral
        WHERE c.id_corral = :id
        GROUP BY c.id_corral, tc.nombre, d.nombre, d.id_dieta, d.factor
    """), {"id": id_corral}).fetchone()

    if not corral:
        raise HTTPException(status_code=404, detail="Corral no encontrado")

    #Animales en el corral
    animales = db.execute(text("""
        SELECT 
            a.arete, a.sexo, a.clasificacion, a.meses,
            a.peso_entrada,
            COALESCE(
                (SELECT hp.peso FROM historial_peso hp WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                a.peso_entrada
            ) as peso_actual,
            a.fecha_ingreso,
            e.nombre as estado,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM tratamientos t 
                    WHERE t.arete = a.arete AND t.fecha_disponible > CURRENT_DATE
                ) THEN true ELSE false
            END as en_retiro
        FROM animales a
        JOIN estado e ON a.id_estado = e.id_estado
        WHERE a.id_corral_actual = :id AND a.fecha_muerte IS NULL
        ORDER BY a.arete
    """), {"id": id_corral}).fetchall()

    #Últimos servicios de alimentación (últimos 10)
    servicios = db.execute(text("""
        SELECT s.id_servicios, s.cantidad_kg, s.fecha_servicio, s.observaciones,
               e.nombre || ' ' || e.apellido_paterno as empleado
        FROM servicios_alimentacion s
        JOIN empleados e ON s.id_empleado = e.id_empleado
        WHERE s.id_corral = :id
        ORDER BY s.fecha_servicio DESC, s.id_servicios DESC
        LIMIT 10
    """), {"id": id_corral}).fetchall()

    #Tratamientos recientes de animales del corral
    tratamientos = db.execute(text("""
        SELECT t.arete, t.dosis_aplicada, t.fecha_aplicacion, t.fecha_disponible,
               m.nombre as medicamento, e.nombre || ' ' || e.apellido_paterno as empleado,
               t.observaciones
        FROM tratamientos t
        JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
        JOIN empleados e ON t.id_empleado = e.id_empleado
        WHERE t.arete IN (
            SELECT arete FROM animales WHERE id_corral_actual = :id
        )
        ORDER BY t.fecha_aplicacion DESC, t.id_tratamiento DESC
        LIMIT 15
    """), {"id": id_corral}).fetchall()

    return {
        "corral": dict(corral),
        "animales": [dict(a) for a in animales],
        "servicios": [dict(s) for s in servicios],
        "tratamientos": [dict(t) for t in tratamientos]
    }