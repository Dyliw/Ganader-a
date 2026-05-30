from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from datetime import date

router = APIRouter()

def row_to_dict(row):
    """Convierte una fila de SQL en diccionario"""
    if row is None:
        return {}
    return dict(row._mapping) if hasattr(row, '_mapping') else dict(row)

def rows_to_list(rows):
    return [row_to_dict(r) for r in rows]

@router.get("/resumen")
def resumen_general(db: Session = Depends(get_db)):
    
    hoy = date.today()
    
    animales_row = db.execute(text("""
        SELECT 
            COUNT(*) FILTER (WHERE fecha_muerte IS NULL AND id_estado NOT IN 
                (SELECT id_estado FROM estado WHERE nombre = 'Vendido')) as total_vivos,
            COUNT(*) FILTER (WHERE sexo = 'macho' AND fecha_muerte IS NULL) as machos,
            COUNT(*) FILTER (WHERE sexo = 'hembra' AND fecha_muerte IS NULL) as hembras,
            COUNT(*) FILTER (WHERE id_estado = 
                (SELECT id_estado FROM estado WHERE nombre = 'Enfermo')) as enfermos,
            COUNT(*) FILTER (WHERE fecha_muerte IS NOT NULL) as muertos,
            COUNT(*) FILTER (WHERE id_estado = 
                (SELECT id_estado FROM estado WHERE nombre = 'Vendido')) as vendidos
        FROM animales
    """)).fetchone()
    
    animales_dict = {
        "total_vivos": getattr(animales_row, 'total_vivos', 0) or 0,
        "machos": getattr(animales_row, 'machos', 0) or 0,
        "hembras": getattr(animales_row, 'hembras', 0) or 0,
        "enfermos": getattr(animales_row, 'enfermos', 0) or 0,
        "muertos": getattr(animales_row, 'muertos', 0) or 0,
        "vendidos": getattr(animales_row, 'vendidos', 0) or 0
    }

    ultimos_ingresos_rows = db.execute(text("""
        SELECT 
            a.arete,
            a.clasificacion,
            a.sexo,
            COALESCE(
                (SELECT hp.peso FROM historial_peso hp 
                 WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                a.peso_entrada
            ) as peso_actual,
            a.peso_entrada,
            a.meses,
            a.fecha_ingreso,
            COALESCE(c.nombre, 'Sin corral') as corral_nombre,
            e.nombre as estado
        FROM animales a
        LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
        JOIN estado e ON a.id_estado = e.id_estado
        WHERE a.fecha_muerte IS NULL
        ORDER BY a.fecha_creacion DESC
        LIMIT 10
    """)).fetchall()
    
    ultimos_ingresos = []
    for a in ultimos_ingresos_rows:
        ultimos_ingresos.append({
            "arete": getattr(a, 'arete', ''),
            "clasificacion": getattr(a, 'clasificacion', ''),
            "sexo": getattr(a, 'sexo', ''),
            "peso_actual": float(getattr(a, 'peso_actual', 0) or 0),
            "peso_entrada": float(getattr(a, 'peso_entrada', 0) or 0),
            "meses": getattr(a, 'meses', 0) or 0,
            "fecha_ingreso": str(getattr(a, 'fecha_ingreso', '')),
            "corral_nombre": getattr(a, 'corral_nombre', 'Sin corral'),
            "estado": getattr(a, 'estado', 'Desconocido')
        })

    corrales_row = db.execute(text("""
        SELECT 
            COALESCE(SUM(capacidad), 0) as capacidad_total,
            COUNT(id_corral) FILTER (WHERE activo = true) as activos
        FROM corrales
    """)).fetchone()

    ocupacion_row = db.execute(text("""
        SELECT COUNT(*) as ocupacion_total
        FROM animales
        WHERE fecha_muerte IS NULL AND id_corral_actual IS NOT NULL
    """)).fetchone()

    detalle_corrales_rows = db.execute(text("""
        SELECT 
            c.id_corral,
            c.nombre,
            c.capacidad,
            tc.nombre as tipo,
            COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) as ocupacion,
            ROUND(
                COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) * 100.0 / 
                NULLIF(c.capacidad, 0), 1
            ) as porcentaje,
            c.activo,
            d.nombre as dieta_nombre
        FROM corrales c
        JOIN tipo_corral tc ON c.id_tipo_corral = tc.id_tipo
        JOIN dietas d ON c.dieta_actual = d.id_dieta
        LEFT JOIN animales a ON a.id_corral_actual = c.id_corral AND a.fecha_muerte IS NULL
        WHERE c.activo = true
        GROUP BY c.id_corral, tc.nombre, d.nombre
        ORDER BY c.nombre
    """)).fetchall()

    capacidad_total = getattr(corrales_row, 'capacidad_total', 0) or 0
    ocupacion_total = getattr(ocupacion_row, 'ocupacion_total', 0) or 0
    
    corrales_dict = {
        "capacidad_total": capacidad_total,
        "activos": getattr(corrales_row, 'activos', 0) or 0,
        "ocupacion_total": ocupacion_total,
        "porcentaje_ocupacion": round((ocupacion_total / capacidad_total * 100) if capacidad_total > 0 else 0, 1),
        "detalle": []
    }
    
    for c in detalle_corrales_rows:
        corrales_dict["detalle"].append({
            "id_corral": getattr(c, 'id_corral', 0),
            "nombre": getattr(c, 'nombre', ''),
            "capacidad": getattr(c, 'capacidad', 0),
            "tipo": getattr(c, 'tipo', ''),
            "ocupacion": getattr(c, 'ocupacion', 0) or 0,
            "porcentaje": float(getattr(c, 'porcentaje', 0) or 0),
            "activo": getattr(c, 'activo', True),
            "dieta_nombre": getattr(c, 'dieta_nombre', '')
        })

    retiro_row = db.execute(text("""
        SELECT COUNT(DISTINCT arete) as total
        FROM tratamientos
        WHERE fecha_disponible > CURRENT_DATE
    """)).fetchone()
    
    veterinario_dict = {
        "animales_en_retiro": getattr(retiro_row, 'total', 0) or 0
    }
    servicios_rows = db.execute(text("""
        SELECT 
            s.id_servicios,
            s.cantidad_kg,
            s.fecha_servicio,
            c.nombre as corral_nombre,
            d.nombre as dieta_nombre
        FROM servicios_alimentacion s
        JOIN corrales c ON s.id_corral = c.id_corral
        JOIN dietas d ON s.id_dieta = d.id_dieta
        WHERE s.fecha_servicio = CURRENT_DATE
        ORDER BY s.id_servicios DESC
        LIMIT 10
    """)).fetchall()
    
    alimentacion_dict = {
        "servicios_hoy": []
    }
    
    for s in servicios_rows:
        alimentacion_dict["servicios_hoy"].append({
            "id_servicios": getattr(s, 'id_servicios', 0),
            "cantidad_kg": float(getattr(s, 'cantidad_kg', 0) or 0),
            "corral_nombre": getattr(s, 'corral_nombre', ''),
            "dieta_nombre": getattr(s, 'dieta_nombre', '')
        })

    stock_bajo_row = db.execute(text("""
        SELECT COUNT(*) as total FROM (
            SELECT id_ingredientes FROM ingredientes 
            WHERE stock_actual <= stock_minimo AND activo = true
            UNION ALL
            SELECT id_medicamento FROM medicamentos 
            WHERE stock_actual <= stock_minimo AND activo = true
        ) t
    """)).fetchone()

    caducar_rows = db.execute(text("""
        SELECT 
            ea.id_entrada as id,
            COALESCE(i.nombre, m.nombre) as nombre,
            (ea.fecha_caducidad - CURRENT_DATE) as dias_restantes,
            ea.cantidad,
            ea.fecha_caducidad
        FROM entrada_almacen ea
        LEFT JOIN ingredientes i ON ea.id_ingrediente = i.id_ingredientes
        LEFT JOIN medicamentos m ON ea.id_medicamento = m.id_medicamento
        WHERE ea.fecha_caducidad IS NOT NULL
        AND ea.fecha_caducidad BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
        ORDER BY ea.fecha_caducidad ASC
        LIMIT 5
    """)).fetchall()
    
    almacen_dict = {
        "productos_stock_bajo": getattr(stock_bajo_row, 'total', 0) or 0,
        "proximos_caducar": []
    }
    
    for p in caducar_rows:
        almacen_dict["proximos_caducar"].append({
            "id": getattr(p, 'id', 0),
            "nombre": getattr(p, 'nombre', ''),
            "dias_restantes": getattr(p, 'dias_restantes', 0) or 0,
            "cantidad": float(getattr(p, 'cantidad', 0) or 0),
            "fecha_caducidad": str(getattr(p, 'fecha_caducidad', ''))
        })

    ventas_rows = db.execute(text("""
        SELECT 
            v.id_venta,
            v.fecha_venta,
            v.total,
            v.peso_total,
            v.precio_kg,
            c.nombre as comprador
        FROM ventas v
        JOIN compradores c ON v.id_comprador = c.id_comprador
        ORDER BY v.fecha_venta DESC
        LIMIT 5
    """)).fetchall()
    
    ventas_dict = {
        "ultimas": []
    }
    
    for v in ventas_rows:
        ventas_dict["ultimas"].append({
            "id_venta": getattr(v, 'id_venta', 0),
            "fecha_venta": str(getattr(v, 'fecha_venta', '')),
            "total": float(getattr(v, 'total', 0) or 0),
            "peso_total": float(getattr(v, 'peso_total', 0) or 0),
            "precio_kg": float(getattr(v, 'precio_kg', 0) or 0),
            "comprador": getattr(v, 'comprador', '')
        })

    alertas = []
    
    if almacen_dict["productos_stock_bajo"] > 0:
        alertas.append({
            "tipo": "critico",
            "icono": "⚠️",
            "titulo": f'{almacen_dict["productos_stock_bajo"]} productos con stock bajo',
            "mensaje": "Se requiere reabastecer inventario",
            "ruta": "/almacen"
        })
    
    if veterinario_dict["animales_en_retiro"] > 0:
        alertas.append({
            "tipo": "advertencia",
            "icono": "🚫",
            "titulo": f'{veterinario_dict["animales_en_retiro"]} animales en retiro',
            "mensaje": "No pueden ser vendidos aún",
            "ruta": "/veterinario"
        })
    
    if animales_dict["enfermos"] > 0:
        alertas.append({
            "tipo": "advertencia",
            "titulo": f'{animales_dict["enfermos"]} animales enfermos',
            "mensaje": "Requieren atención veterinaria",
            "ruta": "/animales"
        })

    if corrales_dict["porcentaje_ocupacion"] > 90:
        alertas.append({
            "tipo": "info",
            "titulo": "Ocupación de corrales alta",
            "mensaje": f'{corrales_dict["porcentaje_ocupacion"]}% de capacidad utilizada',
            "ruta": "/corrales"
        })

    return {
        "animales": animales_dict,
        "corrales": corrales_dict,
        "veterinario": veterinario_dict,
        "alimentacion": alimentacion_dict,
        "almacen": almacen_dict,
        "ventas": ventas_dict,
        "alertas": alertas,
        "fecha_actualizacion": str(hoy)
    }


@router.get("/animales")
def resumen_animales(db: Session = Depends(get_db)):
    """Resumen rápido de animales"""
    row = db.execute(text("""
        SELECT 
            COUNT(*) FILTER (WHERE fecha_muerte IS NULL AND id_estado NOT IN 
                (SELECT id_estado FROM estado WHERE nombre = 'Vendido')) as total_vivos,
            COUNT(*) FILTER (WHERE sexo = 'macho' AND fecha_muerte IS NULL) as machos,
            COUNT(*) FILTER (WHERE sexo = 'hembra' AND fecha_muerte IS NULL) as hembras,
            COUNT(*) FILTER (WHERE id_estado = 
                (SELECT id_estado FROM estado WHERE nombre = 'Enfermo')) as enfermos
        FROM animales
    """)).fetchone()
    
    return {
        "total_vivos": getattr(row, 'total_vivos', 0) or 0,
        "machos": getattr(row, 'machos', 0) or 0,
        "hembras": getattr(row, 'hembras', 0) or 0,
        "enfermos": getattr(row, 'enfermos', 0) or 0
    }

@router.get("/corrales")
def resumen_corrales(db: Session = Depends(get_db)):
    """Resumen rápido de corrales"""
    rows = db.execute(text("""
        SELECT 
            c.id_corral, c.nombre, c.capacidad,
            COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) as ocupacion,
            ROUND(COUNT(a.arete) FILTER (WHERE a.fecha_muerte IS NULL) * 100.0 / c.capacidad, 1) as porcentaje
        FROM corrales c
        LEFT JOIN animales a ON a.id_corral_actual = c.id_corral AND a.fecha_muerte IS NULL
        WHERE c.activo = true
        GROUP BY c.id_corral
    """)).fetchall()
    
    return [{
        "id_corral": getattr(r, 'id_corral', 0),
        "nombre": getattr(r, 'nombre', ''),
        "capacidad": getattr(r, 'capacidad', 0),
        "ocupacion": getattr(r, 'ocupacion', 0) or 0,
        "porcentaje": float(getattr(r, 'porcentaje', 0) or 0)
    } for r in rows]

@router.get("/veterinario")
def resumen_veterinario(db: Session = Depends(get_db)):
    """Resumen del módulo veterinario"""
    retiro = db.execute(text("""
        SELECT COUNT(DISTINCT arete) as en_retiro
        FROM tratamientos WHERE fecha_disponible > CURRENT_DATE
    """)).fetchone()
    
    tratamientos_hoy = db.execute(text("""
        SELECT COUNT(*) as total FROM tratamientos 
        WHERE fecha_aplicacion = CURRENT_DATE
    """)).fetchone()
    
    return {
        "animales_en_retiro": getattr(retiro, 'en_retiro', 0) or 0,
        "tratamientos_hoy": getattr(tratamientos_hoy, 'total', 0) or 0
    }

@router.get("/alimentacion")
def resumen_alimentacion(db: Session = Depends(get_db)):
    """Resumen de alimentación"""
    hoy = db.execute(text("""
        SELECT COUNT(*) as servicios, COALESCE(SUM(cantidad_kg), 0) as total_kg
        FROM servicios_alimentacion WHERE fecha_servicio = CURRENT_DATE
    """)).fetchone()
    
    return {
        "servicios_hoy": getattr(hoy, 'servicios', 0) or 0,
        "total_kg_hoy": float(getattr(hoy, 'total_kg', 0) or 0)
    }

@router.get("/almacen")
def resumen_almacen(db: Session = Depends(get_db)):
    """Resumen de almacén"""
    stock_bajo = db.execute(text("""
        SELECT COUNT(*) as total FROM (
            SELECT 1 FROM ingredientes WHERE stock_actual <= stock_minimo AND activo = true
            UNION ALL
            SELECT 1 FROM medicamentos WHERE stock_actual <= stock_minimo AND activo = true
        ) t
    """)).fetchone()
    
    return {
        "productos_stock_bajo": getattr(stock_bajo, 'total', 0) or 0
    }

@router.get("/ventas")
def resumen_ventas(db: Session = Depends(get_db)):
    """Resumen de ventas"""
    mes = db.execute(text("""
        SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total_mes
        FROM ventas 
        WHERE fecha_venta >= date_trunc('month', CURRENT_DATE)
    """)).fetchone()
    
    return {
        "ventas_mes": getattr(mes, 'total_ventas', 0) or 0,
        "total_mes": float(getattr(mes, 'total_mes', 0) or 0)
    }