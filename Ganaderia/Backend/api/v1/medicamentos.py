from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.services.medicamentos_service import MedicamentosService

router = APIRouter()

@router.get("")
def listar_medicamentos(db: Session = Depends(get_db)):
    """Lista todos los medicamentos activos e inactivos"""
    meds = db.execute(text("""
        SELECT 
            m.id_medicamento,
            m.nombre,
            m.tipo_dosis,
            m.dosis_fija,
            m.dosis_kg,
            m.requiere_retiro,
            m.id_tipo_medicamento,
            m.retiro_dias,
            m.stock_actual,
            m.stock_minimo,
            m.unidad_medida,
            m.activo,
            tm.nombre as tipo_medicamento_nombre
        FROM medicamentos m
        JOIN tipo_medicamento tm ON m.id_tipo_medicamento = tm.id_tipo
        ORDER BY m.nombre
    """)).fetchall()
    
    # Convertir a lista de diccionarios
    resultado = []
    for m in meds:
        resultado.append({
            "id_medicamento": m.id_medicamento,
            "nombre": m.nombre,
            "tipo_dosis": m.tipo_dosis,
            "dosis_fija": float(m.dosis_fija) if m.dosis_fija else None,
            "dosis_kg": float(m.dosis_kg) if m.dosis_kg else None,
            "requiere_retiro": m.requiere_retiro,
            "id_tipo_medicamento": m.id_tipo_medicamento,
            "retiro_dias": m.retiro_dias,
            "stock_actual": float(m.stock_actual) if m.stock_actual else 0,
            "stock_minimo": float(m.stock_minimo) if m.stock_minimo else 0,
            "unidad_medida": m.unidad_medida,
            "activo": m.activo,
            "tipo_medicamento_nombre": m.tipo_medicamento_nombre
        })
    
    return resultado


@router.get("/tipos")
def tipos_medicamento(db: Session = Depends(get_db)):
    """Lista los tipos de medicamento"""
    tipos = db.execute(text("""
        SELECT id_tipo, nombre, descripcion 
        FROM tipo_medicamento 
        ORDER BY nombre
    """)).fetchall()
    
    resultado = []
    for t in tipos:
        resultado.append({
            "id_tipo": t.id_tipo,
            "nombre": t.nombre,
            "descripcion": t.descripcion
        })
    
    return resultado


@router.post("")
def crear_medicamento(data: dict, db: Session = Depends(get_db)):
    """Crea un nuevo medicamento"""
    try:
        result = db.execute(text("""
            INSERT INTO medicamentos (
                nombre, tipo_dosis, dosis_fija, dosis_kg, 
                requiere_retiro, id_tipo_medicamento, retiro_dias,
                stock_actual, stock_minimo, unidad_medida
            )
            VALUES (
                :nombre, :tipo_dosis, :dosis_fija, :dosis_kg,
                :requiere_retiro, :id_tipo_medicamento, :retiro_dias,
                :stock_actual, :stock_minimo, :unidad_medida
            )
            RETURNING id_medicamento
        """), {
            "nombre": data["nombre"],
            "tipo_dosis": data["tipo_dosis"],
            "dosis_fija": data.get("dosis_fija"),
            "dosis_kg": data.get("dosis_kg"),
            "requiere_retiro": data.get("requiere_retiro", False),
            "id_tipo_medicamento": data["id_tipo_medicamento"],
            "retiro_dias": data.get("retiro_dias", 0),
            "stock_actual": data.get("stock_actual", 0),
            "stock_minimo": data.get("stock_minimo", 0),
            "unidad_medida": data["unidad_medida"]
        })
        db.commit()
        
        return {
            "mensaje": "Medicamento creado exitosamente", 
            "id_medicamento": result.fetchone().id_medicamento
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{id_medicamento}")
def actualizar_medicamento(id_medicamento: int, data: dict, db: Session = Depends(get_db)):
    """Actualiza un medicamento existente"""
    try:
        db.execute(text("""
            UPDATE medicamentos 
            SET nombre = COALESCE(:nombre, nombre),
                tipo_dosis = COALESCE(:tipo_dosis, tipo_dosis),
                dosis_fija = :dosis_fija,
                dosis_kg = :dosis_kg,
                requiere_retiro = COALESCE(:requiere_retiro, requiere_retiro),
                id_tipo_medicamento = COALESCE(:id_tipo_medicamento, id_tipo_medicamento),
                retiro_dias = COALESCE(:retiro_dias, retiro_dias),
                stock_actual = COALESCE(:stock_actual, stock_actual),
                stock_minimo = COALESCE(:stock_minimo, stock_minimo),
                unidad_medida = COALESCE(:unidad_medida, unidad_medida)
            WHERE id_medicamento = :id
        """), {
            "id": id_medicamento,
            "nombre": data.get("nombre"),
            "tipo_dosis": data.get("tipo_dosis"),
            "dosis_fija": data.get("dosis_fija"),
            "dosis_kg": data.get("dosis_kg"),
            "requiere_retiro": data.get("requiere_retiro"),
            "id_tipo_medicamento": data.get("id_tipo_medicamento"),
            "retiro_dias": data.get("retiro_dias"),
            "stock_actual": data.get("stock_actual"),
            "stock_minimo": data.get("stock_minimo"),
            "unidad_medida": data.get("unidad_medida")
        })
        db.commit()
        return {"mensaje": "Medicamento actualizado exitosamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{id_medicamento}/desactivar")
def desactivar_medicamento(id_medicamento: int, db: Session = Depends(get_db)):
    """Activa/desactiva un medicamento"""
    db.execute(text("""
        UPDATE medicamentos 
        SET activo = NOT activo 
        WHERE id_medicamento = :id
    """), {"id": id_medicamento})
    db.commit()
    return {"mensaje": "Estado del medicamento cambiado"}


@router.get("/{id_medicamento}/dosis/{arete}")
def calcular_dosis(id_medicamento: int, arete: str, db: Session = Depends(get_db)):
    """Calcula la dosis automática para un animal"""
    return MedicamentosService.calcular_dosis(db, id_medicamento, arete)


@router.post("/tratamientos")
def aplicar_tratamiento(data: dict, db: Session = Depends(get_db)):
    """Aplica un tratamiento individual"""
    try:
        return MedicamentosService.aplicar_tratamiento(db, data)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tratamientos/masivo")
def aplicar_masivo(data: dict, db: Session = Depends(get_db)):
    """Aplica tratamiento a todos los animales de un corral"""
    try:
        return MedicamentosService.aplicar_tratamiento_masivo(db, data)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/historial/{arete}")
def historial_animal(
    arete: str, 
    desde: str = Query(None),
    hasta: str = Query(None),
    db: Session = Depends(get_db)
):
    """Historial de tratamientos de un animal específico"""
    
    query = """
        SELECT 
            t.id_tratamiento,
            t.arete,
            t.dosis_aplicada,
            t.fecha_aplicacion,
            t.fecha_disponible,
            t.observaciones,
            m.nombre as medicamento_nombre,
            e.nombre || ' ' || e.apellido_paterno as empleado_nombre
        FROM tratamientos t
        JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
        JOIN empleados e ON t.id_empleado = e.id_empleado
        WHERE t.arete = :arete
    """
    params = {"arete": arete}
    
    if desde:
        query += " AND t.fecha_aplicacion >= :desde"
        params["desde"] = desde
    if hasta:
        query += " AND t.fecha_aplicacion <= :hasta"
        params["hasta"] = hasta
    
    query += " ORDER BY t.fecha_aplicacion DESC"
    
    tratamientos = db.execute(text(query), params).fetchall()
    
    resultado = []
    for t in tratamientos:
        resultado.append({
            "id_tratamiento": t.id_tratamiento,
            "arete": t.arete,
            "dosis_aplicada": float(t.dosis_aplicada),
            "fecha_aplicacion": str(t.fecha_aplicacion),
            "fecha_disponible": str(t.fecha_disponible) if t.fecha_disponible else None,
            "observaciones": t.observaciones,
            "medicamento_nombre": t.medicamento_nombre,
            "empleado_nombre": t.empleado_nombre
        })
    
    return resultado


@router.get("/historial")
def historial_general(
    desde: str = Query(None),
    hasta: str = Query(None),
    medicamento: int = Query(None),
    empleado: int = Query(None),
    pagina: int = Query(1, ge=1),
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Historial general de tratamientos con paginación"""
    
    condiciones = ["1=1"]
    params = {}
    
    if desde:
        condiciones.append("t.fecha_aplicacion >= :desde")
        params["desde"] = desde
    if hasta:
        condiciones.append("t.fecha_aplicacion <= :hasta")
        params["hasta"] = hasta
    if medicamento:
        condiciones.append("t.id_medicamento = :med")
        params["med"] = medicamento
    if empleado:
        condiciones.append("t.id_empleado = :emp")
        params["emp"] = empleado
    
    where = " AND ".join(condiciones)
    offset = (pagina - 1) * limite

    total = db.execute(text(f"""
        SELECT COUNT(*) as total
        FROM tratamientos t
        WHERE {where}
    """), params).fetchone().total

    tratamientos = db.execute(text(f"""
        SELECT 
            t.id_tratamiento,
            t.arete,
            t.dosis_aplicada,
            t.fecha_aplicacion,
            t.fecha_disponible,
            t.observaciones,
            m.nombre as medicamento_nombre,
            e.nombre || ' ' || e.apellido_paterno as empleado_nombre
        FROM tratamientos t
        JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
        JOIN empleados e ON t.id_empleado = e.id_empleado
        WHERE {where}
        ORDER BY t.fecha_aplicacion DESC
        LIMIT :limite OFFSET :offset
    """), {**params, "limite": limite, "offset": offset}).fetchall()
    
    resultado = []
    for t in tratamientos:
        resultado.append({
            "id_tratamiento": t.id_tratamiento,
            "arete": t.arete,
            "dosis_aplicada": float(t.dosis_aplicada),
            "fecha_aplicacion": str(t.fecha_aplicacion),
            "fecha_disponible": str(t.fecha_disponible) if t.fecha_disponible else None,
            "observaciones": t.observaciones,
            "medicamento_nombre": t.medicamento_nombre,
            "empleado_nombre": t.empleado_nombre
        })
    
    return {
        "tratamientos": resultado,
        "total": total,
        "pagina": pagina,
        "total_paginas": max(1, (total + limite - 1) // limite)
    }


@router.get("/caducados")
def caducados(db: Session = Depends(get_db)):
    """Medicamentos caducados con stock"""
    return MedicamentosService.obtener_caducados(db)


@router.get("/proximos-caducar")
def proximos_caducar(dias: int = Query(30), db: Session = Depends(get_db)):
    """Medicamentos próximos a caducar"""
    from datetime import date, timedelta
    fecha_limite = date.today() + timedelta(days=dias)
    
    proximos = db.execute(text("""
        SELECT 
            m.id_medicamento,
            m.nombre,
            m.stock_actual,
            m.unidad_medida,
            ea.fecha_caducidad,
            (ea.fecha_caducidad - CURRENT_DATE) as dias_restantes
        FROM entrada_almacen ea
        JOIN medicamentos m ON ea.id_medicamento = m.id_medicamento
        WHERE ea.fecha_caducidad BETWEEN CURRENT_DATE AND :limite
        AND m.stock_actual > 0
        AND m.activo = true
        ORDER BY ea.fecha_caducidad ASC
    """), {"limite": fecha_limite}).fetchall()
    
    resultado = []
    for p in proximos:
        resultado.append({
            "id_medicamento": p.id_medicamento,
            "nombre": p.nombre,
            "stock_actual": float(p.stock_actual),
            "unidad_medida": p.unidad_medida,
            "fecha_caducidad": str(p.fecha_caducidad),
            "dias_restantes": p.dias_restantes
        })
    
    return resultado


@router.get("/stock-bajo")
def stock_bajo(db: Session = Depends(get_db)):
    """Medicamentos con stock bajo"""
    bajos = db.execute(text("""
        SELECT 
            id_medicamento,
            nombre,
            stock_actual,
            stock_minimo,
            unidad_medida
        FROM medicamentos 
        WHERE stock_actual <= stock_minimo 
        AND activo = true
        ORDER BY (stock_actual - stock_minimo) ASC
    """)).fetchall()
    
    resultado = []
    for b in bajos:
        resultado.append({
            "id_medicamento": b.id_medicamento,
            "nombre": b.nombre,
            "stock_actual": float(b.stock_actual),
            "stock_minimo": float(b.stock_minimo),
            "unidad_medida": b.unidad_medida
        })
    
    return resultado

@router.get("/animales-en-retiro")
def animales_en_retiro(db: Session = Depends(get_db)):
    """Animales en periodo de retiro"""
    return MedicamentosService.obtener_animales_en_retiro(db)


@router.get("/animales-disponibles-venta")
def disponibles_venta(db: Session = Depends(get_db)):
    """Animales disponibles para venta (sin retiro)"""
    return MedicamentosService.obtener_animales_disponibles_venta(db)

@router.get("/{id_medicamento}")
def detalle_medicamento(id_medicamento: int, db: Session = Depends(get_db)):
    med = db.execute(text("""
        SELECT m.*, tm.nombre as tipo_medicamento_nombre
        FROM medicamentos m
        JOIN tipo_medicamento tm ON m.id_tipo_medicamento = tm.id_tipo
        WHERE m.id_medicamento = :id
    """), {"id": id_medicamento}).fetchone()

    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")

    try:
        return dict(med._mapping)
    except AttributeError:
        return {col: getattr(med, col) for col in med.keys()}

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    """Datos para el dashboard veterinario"""
    
    tratamientos_hoy = db.execute(text(
        "SELECT COUNT(*) as total FROM tratamientos WHERE fecha_aplicacion = CURRENT_DATE"
    )).fetchone().total
    
    animales_retiro = len(MedicamentosService.obtener_animales_en_retiro(db))
    
    caducados = len(MedicamentosService.obtener_caducados(db))
    
    stock_bajo_count = db.execute(text(
        "SELECT COUNT(*) as total FROM medicamentos WHERE stock_actual <= stock_minimo AND activo = true"
    )).fetchone().total
    
    return {
        "tratamientos_hoy": tratamientos_hoy,
        "animales_en_retiro": animales_retiro,
        "medicamentos_caducados": caducados,
        "stock_bajo": stock_bajo_count
    }