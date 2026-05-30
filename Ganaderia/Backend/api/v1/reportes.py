from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
import traceback
from datetime import date

router = APIRouter()

def row_to_dict(row):
    """Convierte una fila de SQLAlchemy a diccionario de forma segura"""
    if row is None:
        return {}
    return dict(row._mapping)


# ============================================================
# HU-REP-01: INVENTARIO TOTAL DE ANIMALES
# ============================================================
@router.get("/inventario-animales")
def inventario_animales(
    estado: str = Query("todos"),
    corral: str = Query(""),
    db: Session = Depends(get_db)
):
    """HU-REP-01: Inventario total de animales con filtros"""
    
    try:
        condiciones = []
        params = {}
        
        if estado == 'vivo':
            condiciones.append("e.nombre NOT IN ('Muerto', 'Vendido')")
        elif estado == 'muerto':
            condiciones.append("e.nombre = 'Muerto'")
        elif estado == 'vendido':
            condiciones.append("e.nombre = 'Vendido'")
        elif estado == 'enfermo':
            condiciones.append("e.nombre = 'Enfermo'")
        
        if corral:
            condiciones.append("a.id_corral_actual = :corral")
            params['corral'] = int(corral)
        
        where_clause = " AND ".join(condiciones) if condiciones else "1=1"
        
        # Resumen general
        query_resumen = f"""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE e.nombre NOT IN ('Muerto', 'Vendido')) as vivos,
                COUNT(*) FILTER (WHERE e.nombre = 'Vendido') as vendidos,
                COUNT(*) FILTER (WHERE e.nombre = 'Muerto') as muertos,
                COUNT(*) FILTER (WHERE e.nombre = 'Enfermo') as enfermos,
                ROUND(AVG(a.meses), 1) as edad_promedio,
                ROUND(AVG(a.peso_entrada), 1) as peso_promedio_entrada
            FROM animales a
            JOIN estado e ON a.id_estado = e.id_estado
            WHERE {where_clause}
        """
        resumen = db.execute(text(query_resumen), params).fetchone()
        
        # Por clasificación
        query_clasificacion = f"""
            SELECT 
                COALESCE(a.clasificacion, 'Sin clasificar') as clasificacion,
                COUNT(*) as cantidad,
                ROUND(AVG(a.meses), 1) as meses_promedio,
                ROUND(AVG(COALESCE(
                    (SELECT hp.peso FROM historial_peso hp 
                     WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                )), 1) as peso_promedio
            FROM animales a
            JOIN estado e ON a.id_estado = e.id_estado
            WHERE {where_clause}
            GROUP BY a.clasificacion
            ORDER BY cantidad DESC
        """
        por_clasificacion = db.execute(text(query_clasificacion), params).fetchall()
        
        # Por corral
        query_corral = f"""
            SELECT 
                COALESCE(c.nombre, 'Sin corral') as corral,
                COALESCE(c.capacidad, 0) as capacidad,
                COUNT(*) as ocupacion,
                CASE 
                    WHEN COALESCE(c.capacidad, 0) > 0 
                    THEN ROUND(COUNT(*) * 100.0 / c.capacidad, 1)
                    ELSE 0 
                END as porcentaje,
                COUNT(*) FILTER (WHERE a.sexo = 'macho') as machos,
                COUNT(*) FILTER (WHERE a.sexo = 'hembra') as hembras,
                ROUND(AVG(COALESCE(
                    (SELECT hp.peso FROM historial_peso hp 
                     WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                )), 1) as peso_promedio
            FROM animales a
            JOIN estado e ON a.id_estado = e.id_estado
            LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
            WHERE {where_clause}
            GROUP BY c.nombre, c.capacidad
            ORDER BY c.nombre NULLS LAST
        """
        por_corral = db.execute(text(query_corral), params).fetchall()
        
        # Por sexo
        query_sexo = f"""
            SELECT 
                a.sexo,
                COUNT(*) as cantidad
            FROM animales a
            JOIN estado e ON a.id_estado = e.id_estado
            WHERE {where_clause}
            GROUP BY a.sexo
            ORDER BY cantidad DESC
        """
        por_sexo = db.execute(text(query_sexo), params).fetchall()
        
        return {
            "resumen": row_to_dict(resumen),
            "por_clasificacion": [row_to_dict(c) for c in por_clasificacion],
            "por_corral": [row_to_dict(c) for c in por_corral],
            "por_sexo": [row_to_dict(s) for s in por_sexo]
        }
        
    except Exception as e:
        print("❌ Error en inventario-animales:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================
# HU-REP-02: RENTABILIDAD DE UN LOTE
# ============================================================
@router.get("/rentabilidad-lote/{id_lote}")
def rentabilidad_lote(id_lote: int, db: Session = Depends(get_db)):
    """HU-REP-02: Rentabilidad de un lote"""
    
    try:
        # Verificar que el lote existe
        lote = db.execute(text("""
            SELECT id_lote, nombre FROM lotes WHERE id_lote = :id
        """), {"id": id_lote}).fetchone()
        
        if not lote:
            raise HTTPException(status_code=404, detail="Lote no encontrado")
        
        # Animales del lote
        animales = db.execute(text("""
            SELECT 
                COUNT(*) as total_inicial,
                COUNT(*) FILTER (WHERE e.nombre = 'Vendido') as vendidos,
                COUNT(*) FILTER (WHERE e.nombre = 'Muerto') as muertos,
                COUNT(*) FILTER (WHERE e.nombre NOT IN ('Muerto', 'Vendido')) as activos,
                SUM(precio_compra) as costo_compra_total
            FROM animales a
            JOIN estado e ON a.id_estado = e.id_estado
            WHERE a.id_lote = :id
        """), {"id": id_lote}).fetchone()
        
        # Ingresos por ventas de este lote
        ventas = db.execute(text("""
            SELECT 
                COUNT(vd.arete) as animales_vendidos,
                COALESCE(SUM(v.precio_kg * a.peso_entrada), 0) as ingreso_total,
                COALESCE(SUM(a.peso_entrada), 0) as peso_total_vendido,
                COALESCE(AVG(v.precio_kg), 0) as precio_promedio_kg
            FROM venta_detalle vd
            JOIN ventas v ON vd.id_venta = v.id_venta
            JOIN animales a ON vd.arete = a.arete
            WHERE a.id_lote = :id
        """), {"id": id_lote}).fetchone()
        
        # Costo de alimentación (aproximado por días en granja)
        costo_alimentacion = db.execute(text("""
            SELECT COALESCE(SUM(s.cantidad_kg * 5.0), 0) as total
            FROM servicios_alimentacion s
            WHERE s.id_corral IN (
                SELECT DISTINCT id_corral_actual 
                FROM animales 
                WHERE id_lote = :id AND id_corral_actual IS NOT NULL
            )
        """), {"id": id_lote}).fetchone()
        
        # Costo de tratamientos del lote
        costo_tratamientos = db.execute(text("""
            SELECT COALESCE(SUM(t.dosis_aplicada * 
                CASE 
                    WHEN m.tipo_dosis = 'Fija' THEN COALESCE(m.dosis_fija, 1)
                    ELSE COALESCE(m.dosis_kg, 0.01)
                END * 2.0
            ), 0) as total
            FROM tratamientos t
            JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
            WHERE t.arete IN (
                SELECT arete FROM animales WHERE id_lote = :id
            )
        """), {"id": id_lote}).fetchone()
        
        costo_compra = float(animales.costo_compra_total) if animales.costo_compra_total else 0
        costo_alim = float(costo_alimentacion.total) if costo_alimentacion else 0
        costo_trat = float(costo_tratamientos.total) if costo_tratamientos else 0
        ingreso_total = float(ventas.ingreso_total) if ventas.ingreso_total else 0
        
        costo_total = costo_compra + costo_alim + costo_trat
        ganancia_neta = ingreso_total - costo_total
        margen = (ganancia_neta / costo_total * 100) if costo_total > 0 else 0
        
        return {
            "lote": lote.nombre,
            "id_lote": id_lote,
            "animales_iniciales": animales.total_inicial or 0,
            "animales_vendidos": ventas.animales_vendidos or 0,
            "animales_muertos": animales.muertos or 0,
            "animales_activos": animales.activos or 0,
            "costo_compra": round(costo_compra, 2),
            "costo_alimentacion": round(costo_alim, 2),
            "costo_tratamientos": round(costo_trat, 2),
            "costo_total": round(costo_total, 2),
            "ingreso_total": round(ingreso_total, 2),
            "ganancia_neta": round(ganancia_neta, 2),
            "margen_porcentaje": round(margen, 1),
            "peso_total_vendido": round(float(ventas.peso_total_vendido or 0), 1),
            "precio_promedio_kg": round(float(ventas.precio_promedio_kg or 0), 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error en rentabilidad-lote:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================
# HU-REP-03: CONSUMO DE ALIMENTO POR PERÍODO
# ============================================================
@router.get("/consumo-alimento")
def consumo_alimento(
    desde: str = Query(None),
    hasta: str = Query(None),
    db: Session = Depends(get_db)
):
    """HU-REP-03: Consumo de alimento por período"""
    
    try:
        # Si no se especifican fechas, usar mes actual
        hoy = date.today()
        if not desde:
            desde = hoy.replace(day=1).isoformat()
        if not hasta:
            hasta = hoy.isoformat()
        
        # Total de kg servidos
        total = db.execute(text("""
            SELECT 
                COALESCE(SUM(s.cantidad_kg), 0) as total_kg,
                COUNT(*) as total_servicios,
                COUNT(DISTINCT s.id_corral) as corrales_atendidos,
                COUNT(DISTINCT s.fecha_servicio) as dias_servicio
            FROM servicios_alimentacion s
            WHERE s.fecha_servicio BETWEEN :desde AND :hasta
        """), {"desde": desde, "hasta": hasta}).fetchone()
        
        # Costo total
        costo_total = db.execute(text("""
            SELECT COALESCE(SUM(s.cantidad_kg * 
                COALESCE(
                    (SELECT SUM((di.porcentaje/100.0) * i.precio_unitario)
                     FROM dieta_ingredientes di
                     JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
                     WHERE di.id_dieta = s.id_dieta),
                    5.0
                )
            ), 0) as total
            FROM servicios_alimentacion s
            WHERE s.fecha_servicio BETWEEN :desde AND :hasta
        """), {"desde": desde, "hasta": hasta}).fetchone()
        
        # Consumo por corral
        por_corral = db.execute(text("""
            SELECT 
                c.nombre as corral,
                COUNT(s.id_servicios) as servicios,
                SUM(s.cantidad_kg) as total_kg,
                ROUND(SUM(s.cantidad_kg) / COUNT(DISTINCT s.fecha_servicio), 1) as promedio_diario,
                ROUND(SUM(s.cantidad_kg * 
                    COALESCE(
                        (SELECT SUM((di.porcentaje/100.0) * i.precio_unitario)
                         FROM dieta_ingredientes di
                         JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
                         WHERE di.id_dieta = s.id_dieta),
                        5.0
                    )
                ), 2) as costo
            FROM servicios_alimentacion s
            JOIN corrales c ON s.id_corral = c.id_corral
            WHERE s.fecha_servicio BETWEEN :desde AND :hasta
            GROUP BY c.nombre
            ORDER BY total_kg DESC
        """), {"desde": desde, "hasta": hasta}).fetchall()
        
        # Consumo por día
        por_dia = db.execute(text("""
            SELECT 
                s.fecha_servicio as fecha,
                SUM(s.cantidad_kg) as total_kg,
                COUNT(*) as servicios
            FROM servicios_alimentacion s
            WHERE s.fecha_servicio BETWEEN :desde AND :hasta
            GROUP BY s.fecha_servicio
            ORDER BY s.fecha_servicio
        """), {"desde": desde, "hasta": hasta}).fetchall()
        
        # Ingredientes más consumidos
        ingredientes = db.execute(text("""
            SELECT 
                i.nombre,
                i.unidad_medida,
                ROUND(SUM(s.cantidad_kg * di.porcentaje / 100.0), 1) as total_consumido,
                ROUND(SUM(s.cantidad_kg * di.porcentaje / 100.0 * i.precio_unitario / 100.0), 2) as costo
            FROM servicios_alimentacion s
            JOIN dieta_ingredientes di ON s.id_dieta = di.id_dieta
            JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
            WHERE s.fecha_servicio BETWEEN :desde AND :hasta
            GROUP BY i.id_ingredientes, i.nombre, i.unidad_medida
            ORDER BY total_consumido DESC
        """), {"desde": desde, "hasta": hasta}).fetchall()
        
        return {
            "periodo": {"desde": desde, "hasta": hasta},
            "total_kg": round(float(total.total_kg), 1),
            "total_servicios": total.total_servicios,
            "corrales_atendidos": total.corrales_atendidos,
            "dias_servicio": total.dias_servicio,
            "costo_total": round(float(costo_total.total or 0), 2),
            "promedio_diario_kg": round(float(total.total_kg) / total.dias_servicio if total.dias_servicio > 0 else 0, 1),
            "por_corral": [row_to_dict(c) for c in por_corral],
            "por_dia": [row_to_dict(d) for d in por_dia],
            "ingredientes_consumidos": [row_to_dict(i) for i in ingredientes]
        }
        
    except Exception as e:
        print("❌ Error en consumo-alimento:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================
# HU-REP-04: ENTRADAS Y VENTAS POR MES
# ============================================================
@router.get("/entradas-ventas")
def entradas_ventas(
    mes: int = Query(None),
    anio: int = Query(None),
    db: Session = Depends(get_db)
):
    """HU-REP-04: Entradas y ventas por mes"""
    
    try:
        hoy = date.today()
        if not mes:
            mes = hoy.month
        if not anio:
            anio = hoy.year
        
        # Validar mes
        if mes < 1 or mes > 12:
            raise HTTPException(status_code=400, detail="Mes inválido (1-12)")
        
        desde = f"{anio}-{mes:02d}-01"
        # Último día del mes
        if mes == 12:
            hasta = f"{anio}-12-31"
        else:
            from calendar import monthrange
            ultimo_dia = monthrange(anio, mes)[1]
            hasta = f"{anio}-{mes:02d}-{ultimo_dia}"
        
        # Entradas de animales (compras)
        entradas_animales = db.execute(text("""
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(precio_compra), 0) as costo_total,
                ROUND(AVG(precio_compra), 2) as costo_promedio,
                ROUND(AVG(peso_entrada), 1) as peso_promedio,
                SUM(peso_entrada) as peso_total
            FROM animales
            WHERE fecha_ingreso BETWEEN :desde AND :hasta
        """), {"desde": desde, "hasta": hasta}).fetchone()
        
        # Ventas del mes
        ventas = db.execute(text("""
            SELECT 
                COUNT(*) as cantidad_ventas,
                COUNT(vd.arete) as animales_vendidos,
                COALESCE(SUM(v.total), 0) as ingreso_total,
                COALESCE(SUM(v.peso_total), 0) as peso_total,
                ROUND(AVG(v.precio_kg), 2) as precio_promedio_kg
            FROM ventas v
            LEFT JOIN venta_detalle vd ON v.id_venta = vd.id_venta
            WHERE v.fecha_venta BETWEEN :desde AND :hasta
        """), {"desde": desde, "hasta": hasta}).fetchone()
        
        # Entradas de almacén
        entradas_almacen = db.execute(text("""
            SELECT 
                COUNT(*) as cantidad,
                COALESCE(SUM(cantidad * precio_unitario), 0) as costo_total,
                COUNT(DISTINCT id_proveedor) as proveedores
            FROM entrada_almacen
            WHERE fecha_entrada BETWEEN :desde AND :hasta
        """), {"desde": desde, "hasta": hasta}).fetchone()
        
        # Animales muertos en el mes
        muertes = db.execute(text("""
            SELECT 
                COUNT(*) as cantidad,
                COUNT(DISTINCT causa_muerte) as causas_diferentes
            FROM animales
            WHERE fecha_muerte BETWEEN :desde AND :hasta
        """), {"desde": desde, "hasta": hasta}).fetchone()
        
        # Tratamientos aplicados
        tratamientos = db.execute(text("""
            SELECT 
                COUNT(*) as cantidad,
                COUNT(DISTINCT arete) as animales_tratados,
                COUNT(DISTINCT id_medicamento) as medicamentos_usados
            FROM tratamientos
            WHERE fecha_aplicacion BETWEEN :desde AND :hasta
        """), {"desde": desde, "hasta": hasta}).fetchone()
        
        # Ventas por comprador
        ventas_por_comprador = db.execute(text("""
            SELECT 
                c.nombre as comprador,
                COUNT(v.id_venta) as ventas,
                COALESCE(SUM(v.total), 0) as total_compras
            FROM ventas v
            JOIN compradores c ON v.id_comprador = c.id_comprador
            WHERE v.fecha_venta BETWEEN :desde AND :hasta
            GROUP BY c.nombre
            ORDER BY total_compras DESC
        """), {"desde": desde, "hasta": hasta}).fetchall()
        
        # Balance
        ingreso_total = float(ventas.ingreso_total or 0)
        costo_compras = float(entradas_animales.costo_total or 0)
        costo_almacen = float(entradas_almacen.costo_total or 0)
        balance = ingreso_total - costo_compras - costo_almacen
        
        return {
            "periodo": {"mes": mes, "anio": anio, "desde": desde, "hasta": hasta},
            "entradas_animales": float(entradas_animales.cantidad or 0),
            "costo_compras": round(costo_compras, 2),
            "costo_promedio_animal": round(float(entradas_animales.costo_promedio or 0), 2),
            "peso_promedio_entrada": round(float(entradas_animales.peso_promedio or 0), 1),
            "peso_total_entrada": round(float(entradas_animales.peso_total or 0), 1),
            "ventas_animales": float(ventas.animales_vendidos or 0),
            "cantidad_ventas": float(ventas.cantidad_ventas or 0),
            "ingreso_ventas": round(ingreso_total, 2),
            "peso_vendido": round(float(ventas.peso_total or 0), 1),
            "precio_promedio_kg": round(float(ventas.precio_promedio_kg or 0), 2),
            "entradas_almacen": round(costo_almacen, 2),
            "muertes_mes": float(muertes.cantidad or 0),
            "tratamientos_mes": float(tratamientos.cantidad or 0),
            "animales_tratados": float(tratamientos.animales_tratados or 0),
            "balance": round(balance, 2),
            "ventas_por_comprador": [row_to_dict(v) for v in ventas_por_comprador]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error en entradas-ventas:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================
# HU-REP-05: COSTO TOTAL ACUMULADO DE UN ANIMAL
# ============================================================
@router.get("/costo-animal/{arete}")
def costo_animal(arete: str, db: Session = Depends(get_db)):
    """HU-REP-05: Costo total acumulado de un animal"""
    
    try:
        animal = db.execute(text("""
            SELECT a.*, p.nombre as proveedor_nombre,
                   e.nombre as estado_nombre,
                   c.nombre as corral_nombre
            FROM animales a
            LEFT JOIN proveedores p ON a.id_proveedor = p.id_proveedor
            LEFT JOIN estado e ON a.id_estado = e.id_estado
            LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
            WHERE a.arete = :arete
        """), {"arete": arete}).fetchone()
        
        if not animal:
            raise HTTPException(status_code=404, detail="Animal no encontrado")
        
        # Costo de alimentación
        costo_alimentacion = db.execute(text("""
            SELECT COALESCE(SUM(s.cantidad_kg * 
                COALESCE(
                    (SELECT SUM((di.porcentaje/100.0) * i.precio_unitario)
                     FROM dieta_ingredientes di
                     JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
                     WHERE di.id_dieta = s.id_dieta),
                    5.0
                )
            ), 0) as total
            FROM servicios_alimentacion s
            WHERE s.id_corral IN (
                SELECT id_corral_actual FROM animales WHERE arete = :arete
            )
            AND s.fecha_servicio >= (SELECT fecha_ingreso FROM animales WHERE arete = :arete)
        """), {"arete": arete}).fetchone()
        
        # Costo de tratamientos
        costo_tratamientos = db.execute(text("""
            SELECT 
                COUNT(*) as total_tratamientos,
                COALESCE(SUM(t.dosis_aplicada * 
                    CASE 
                        WHEN m.tipo_dosis = 'Fija' THEN COALESCE(m.dosis_fija, 5)
                        ELSE COALESCE(m.dosis_kg * 200, 5)
                    END * 0.5
                ), 0) as costo_estimado,
                STRING_AGG(DISTINCT m.nombre, ', ') as medicamentos_usados
            FROM tratamientos t
            JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
            WHERE t.arete = :arete
        """), {"arete": arete}).fetchone()
        
        # Pesos registrados
        pesos = db.execute(text("""
            SELECT fecha, peso
            FROM historial_peso
            WHERE arete = :arete
            ORDER BY fecha ASC
        """), {"arete": arete}).fetchall()
        
        # Ganancia diaria
        ganancia_diaria = None
        if len(pesos) >= 2:
            primer_peso = pesos[0]
            ultimo_peso = pesos[-1]
            dias = (ultimo_peso.fecha - primer_peso.fecha).days
            if dias > 0:
                ganancia_diaria = round((float(ultimo_peso.peso) - float(primer_peso.peso)) / dias, 3)
        
        costo_compra = float(animal.precio_compra)
        costo_alim = float(costo_alimentacion.total) if costo_alimentacion else 0
        costo_trat = float(costo_tratamientos.costo_estimado) if costo_tratamientos else 0
        costo_total = costo_compra + costo_alim + costo_trat
        
        return {
            "arete": arete,
            "clasificacion": animal.clasificacion,
            "sexo": animal.sexo,
            "estado": animal.estado_nombre,
            "corral": animal.corral_nombre,
            "costo_compra": round(costo_compra, 2),
            "costo_alimentacion": round(costo_alim, 2),
            "costo_tratamientos": round(costo_trat, 2),
            "costo_total": round(costo_total, 2),
            "proveedor": animal.proveedor_nombre,
            "meses_en_granja": animal.meses,
            "fecha_ingreso": animal.fecha_ingreso.isoformat() if animal.fecha_ingreso else None,
            "total_tratamientos": costo_tratamientos.total_tratamientos if costo_tratamientos else 0,
            "medicamentos_usados": costo_tratamientos.medicamentos_usados if costo_tratamientos else None,
            "total_pesos_registrados": len(pesos),
            "ganancia_diaria_peso": ganancia_diaria,
            "peso_entrada": float(animal.peso_entrada),
            "pesos_historial": [{"fecha": p.fecha.isoformat(), "peso": float(p.peso)} for p in pesos[-10:]]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print("❌ Error en costo-animal:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================
# HU-REP-06: ANIMALES POR CAUSA DE MUERTE
# ============================================================
@router.get("/animales-causa")
def animales_causa(
    desde: str = Query(None),
    hasta: str = Query(None),
    db: Session = Depends(get_db)
):
    """HU-REP-06: Animales por causa de muerte"""
    
    try:
        resultados = db.execute(text("""
            SELECT 
                COALESCE(causa_muerte, 'No especificada') as causa_muerte,
                COUNT(*) as cantidad,
                ROUND(AVG(meses), 1) as edad_promedio,
                ROUND(AVG(peso_entrada), 1) as peso_promedio,
                MIN(fecha_muerte) as primera_muerte,
                MAX(fecha_muerte) as ultima_muerte,
                STRING_AGG(DISTINCT arete, ', ' ORDER BY arete) as aretes
            FROM animales
            WHERE fecha_muerte IS NOT NULL
            AND (:desde IS NULL OR fecha_muerte >= :desde::date)
            AND (:hasta IS NULL OR fecha_muerte <= :hasta::date)
            GROUP BY causa_muerte
            ORDER BY cantidad DESC
        """), {"desde": desde, "hasta": hasta}).fetchall()
        
        return {
            "total_muertes": sum(r.cantidad for r in resultados),
            "causas": [row_to_dict(r) for r in resultados]
        }
        
    except Exception as e:
        print("❌ Error en animales-causa:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================
# LOTES (AUXILIAR)
# ============================================================
@router.get("/lotes")
def listar_lotes(db: Session = Depends(get_db)):
    """Lista lotes disponibles para reportes"""
    try:
        lotes = db.execute(text("""
            SELECT id_lote, nombre, descripcion, fecha_creacion
            FROM lotes
            ORDER BY fecha_creacion DESC
        """)).fetchall()
        
        return [row_to_dict(l) for l in lotes]
        
    except Exception as e:
        print("⚠️ Tabla 'lotes' no encontrada o error:", e)
        return []


# ============================================================
# HU-REP-07: GENERAR PDF (ESTRUCTURA BÁSICA)
# ============================================================
@router.get("/pdf/{tipo_reporte}")
def generar_pdf(
    tipo_reporte: str,
    estado: str = Query(None),
    corral: str = Query(None),
    desde: str = Query(None),
    hasta: str = Query(None),
    mes: int = Query(None),
    anio: int = Query(None),
    arete: str = Query(None),
    id_lote: int = Query(None),
    db: Session = Depends(get_db)
):
    """HU-REP-07: Genera reporte en formato HTML (para convertir a PDF)"""
    
    try:
        html = """
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                h1 { color: #1a56db; text-align: center; }
                h2 { color: #374151; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #d1d5db; }
                td { padding: 8px; border: 1px solid #d1d5db; }
                .header { text-align: center; margin-bottom: 30px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; }
                .kpi { display: inline-block; padding: 15px; margin: 10px; background: #f9fafb; border-radius: 8px; text-align: center; min-width: 120px; }
                .kpi-value { font-size: 24px; font-weight: bold; color: #1a56db; }
                .kpi-label { font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>SISTEMA GANADERO - REPORTE</h1>
                <p>Fecha de generación: """ + date.today().isoformat() + """</p>
            </div>
        """
        
        if tipo_reporte == "inventario":
            datos = inventario_animales(estado or "todos", corral or "", db)
            html += "<h2>📊 Inventario de Animales</h2>"
            html += f"<p>Total: {datos['resumen']['total']} | Vivos: {datos['resumen']['vivos']} | Vendidos: {datos['resumen']['vendidos']} | Muertos: {datos['resumen']['muertos']}</p>"
            html += "<table><tr><th>Corral</th><th>Ocupación</th><th>%</th><th>Machos</th><th>Hembras</th></tr>"
            for c in datos.get("por_corral", []):
                html += f"<tr><td>{c['corral']}</td><td>{c['ocupacion']}/{c['capacidad']}</td><td>{c['porcentaje']}%</td><td>{c['machos']}</td><td>{c['hembras']}</td></tr>"
            html += "</table>"
        
        elif tipo_reporte == "costo-animal" and arete:
            datos = costo_animal(arete, db)
            html += f"<h2>💲 Costo Animal: {arete}</h2>"
            html += f"<p>Costo compra: ${datos['costo_compra']}</p>"
            html += f"<p>Costo alimentación: ${datos['costo_alimentacion']}</p>"
            html += f"<p>Costo tratamientos: ${datos['costo_tratamientos']}</p>"
            html += f"<h3>TOTAL: ${datos['costo_total']}</h3>"
        
        elif tipo_reporte == "rentabilidad-lote" and id_lote:
            datos = rentabilidad_lote(id_lote, db)
            html += f"<h2>💰 Rentabilidad: {datos.get('lote', 'Lote')}</h2>"
            html += f"<p>Costo total: ${datos['costo_total']}</p>"
            html += f"<p>Ingreso: ${datos['ingreso_total']}</p>"
            html += f"<p>Ganancia: ${datos['ganancia_neta']} ({datos['margen_porcentaje']}%)</p>"
        
        elif tipo_reporte == "consumo-alimento":
            datos = consumo_alimento(desde, hasta, db)
            html += f"<h2>🍽️ Consumo: {desde} al {hasta}</h2>"
            html += f"<p>Total: {datos['total_kg']} kg | Costo: ${datos['costo_total']}</p>"
        
        elif tipo_reporte == "entradas-ventas":
            datos = entradas_ventas(mes, anio, db)
            html += f"<h2>📊 Entradas y Ventas: {mes}/{anio}</h2>"
            html += f"<p>Balance: ${datos['balance']}</p>"
        
        elif tipo_reporte == "animales-causa":
            datos = animales_causa(desde, hasta, db)
            html += f"<h2>🏥 Causas de Muerte</h2><p>Total: {datos['total_muertes']}</p>"
            for c in datos.get("causas", []):
                html += f"<p>{c['causa_muerte']}: {c['cantidad']}</p>"
        
        html += """
            <div class="footer">
                <p>Este reporte fue generado automáticamente por el Sistema Ganadero</p>
            </div>
        </body>
        </html>
        """
        
        return {"html": html, "tipo": tipo_reporte}
        
    except Exception as e:
        print("❌ Error en generar-pdf:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")