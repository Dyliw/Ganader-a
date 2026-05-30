from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, datetime
from typing import Optional

from app.db.database import get_db
from app.services.pdf_service import PDFService

router = APIRouter()

@router.get("/{tipo}")
def generar_pdf(
    tipo: str,
    arete: Optional[str] = Query(None),
    id_venta: Optional[int] = Query(None),
    id_dieta: Optional[int] = Query(None),
    id_orden: Optional[int] = Query(None),
    desde: Optional[str] = Query(None), 
    hasta: Optional[str] = Query(None),
    mes: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Endpoint unificado para generar PDFs.
    El parámetro 'tipo' determina el reporte a generar.
    """
    try:
        if tipo == "ficha-animal":
            if not arete:
                raise HTTPException(status_code=400, detail="Se requiere 'arete'")

            animal = db.execute(text("""
                SELECT a.*, e.nombre as estado, c.nombre as corral_nombre,
                       COALESCE(
                           (SELECT hp.peso FROM historial_peso hp 
                            WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                           a.peso_entrada
                       ) as peso_actual
                FROM animales a
                JOIN estado e ON a.id_estado = e.id_estado
                LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
                WHERE a.arete = :arete
            """), {"arete": arete}).fetchone()

            if not animal:
                raise HTTPException(status_code=404, detail="Animal no encontrado")

            proveedor = db.execute(text(
                "SELECT * FROM proveedores WHERE id_proveedor = :id"
            ), {"id": animal.id_proveedor}).fetchone()

            pesos = db.execute(text("""
                SELECT fecha::text, peso FROM historial_peso
                WHERE arete = :arete ORDER BY fecha
            """), {"arete": arete}).fetchall()

            tratamientos = db.execute(text("""
                SELECT t.fecha_aplicacion::text, m.nombre as medicamento,
                       t.dosis_aplicada, t.fecha_disponible::text
                FROM tratamientos t
                JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
                WHERE t.arete = :arete
                ORDER BY t.fecha_aplicacion DESC
            """), {"arete": arete}).fetchall()

            pdf = PDFService.ficha_animal_pdf(
                dict(animal),
                dict(proveedor) if proveedor else {},
                [dict(p) for p in pesos],
                [dict(t) for t in tratamientos]
            )
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=ficha_{arete}.pdf"}
            )
        elif tipo == "venta":
            if not id_venta:
                raise HTTPException(status_code=400, detail="Se requiere 'id_venta'")
            
            venta = db.execute(text("""
                SELECT v.*, c.nombre as comprador, c.rfc
                FROM ventas v
                JOIN compradores c ON v.id_comprador = c.id_comprador
                WHERE v.id_venta = :id
            """), {"id": id_venta}).fetchone()

            if not venta:
                raise HTTPException(status_code=404, detail="Venta no encontrada")
            
            detalles = db.execute(text("""
                SELECT vd.arete, a.clasificacion, a.sexo,
                       COALESCE(
                           (SELECT hp.peso FROM historial_peso hp 
                            WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                           a.peso_entrada
                       ) as peso,
                       vd.precio as subtotal
                FROM venta_detalle vd
                JOIN animales a ON vd.arete = a.arete
                WHERE vd.id_venta = :id
            """), {"id": id_venta}).fetchall()

            pdf = PDFService.venta_pdf(
                dict(venta),
                [dict(d) for d in detalles]
            )
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=venta_{id_venta}.pdf"}
            )

        elif tipo == "inventario":
            resumen = db.execute(text("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE e.nombre NOT IN ('Muerto', 'Vendido')) as vivos,
                    COUNT(*) FILTER (WHERE e.nombre = 'Vendido') as vendidos,
                    COUNT(*) FILTER (WHERE e.nombre = 'Muerto') as muertos
                FROM animales a
                JOIN estado e ON a.id_estado = e.id_estado
            """)).fetchone()

            por_corral = db.execute(text("""
                SELECT 
                    COALESCE(c.nombre, 'Sin corral') as corral,
                    COALESCE(c.capacidad, 0) as capacidad,
                    COUNT(*) as ocupacion,
                    ROUND(COUNT(*) * 100.0 / NULLIF(c.capacidad, 0), 1) as porcentaje,
                    COUNT(*) FILTER (WHERE a.sexo = 'macho') as machos,
                    COUNT(*) FILTER (WHERE a.sexo = 'hembra') as hembras,
                    ROUND(AVG(COALESCE(
                        (SELECT hp.peso FROM historial_peso hp WHERE hp.arete = a.arete ORDER BY hp.fecha DESC LIMIT 1),
                        a.peso_entrada
                    )), 1) as peso_promedio
                FROM animales a
                JOIN estado e ON a.id_estado = e.id_estado
                LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
                GROUP BY c.nombre, c.capacidad
                ORDER BY c.nombre
            """)).fetchall()

            pdf = PDFService.inventario_pdf(
                dict(resumen),
                [dict(c) for c in por_corral]
            )
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": "inline; filename=inventario.pdf"}
            )

        elif tipo == "consumo-alimento":
            desde = desde or date.today().replace(day=1).isoformat()
            hasta = hasta or date.today().isoformat()

            resumen = db.execute(text("""
                SELECT 
                    SUM(s.cantidad_kg) as total_kg,
                    ROUND(AVG(s.cantidad_kg), 2) as promedio_diario,
                    MIN(s.fecha_servicio)::text as desde,
                    MAX(s.fecha_servicio)::text as hasta
                FROM servicios_alimentacion s
                WHERE s.fecha_servicio BETWEEN :desde AND :hasta
            """), {"desde": desde, "hasta": hasta}).fetchone()

            servicios = db.execute(text("""
                SELECT s.fecha_servicio::text, c.nombre as corral, s.cantidad_kg,
                       e.nombre || ' ' || e.apellido_paterno as empleado
                FROM servicios_alimentacion s
                JOIN corrales c ON s.id_corral = c.id_corral
                JOIN empleados e ON s.id_empleado = e.id_empleado
                WHERE s.fecha_servicio BETWEEN :desde AND :hasta
                ORDER BY s.fecha_servicio DESC
                LIMIT 50
            """), {"desde": desde, "hasta": hasta}).fetchall()

            pdf = PDFService.consumo_alimento_pdf(
                dict(resumen) if resumen else {},
                [dict(s) for s in servicios]
            )
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=consumo_alimento_{desde}_{hasta}.pdf"}
            )

        elif tipo == "dieta":
            if not id_dieta:
                raise HTTPException(status_code=400, detail="Se requiere 'id_dieta'")
            
            dieta = db.execute(text(
                "SELECT * FROM dietas WHERE id_dieta = :id"
            ), {"id": id_dieta}).fetchone()

            if not dieta:
                raise HTTPException(status_code=404, detail="Dieta no encontrada")
            
            ingredientes = db.execute(text("""
                SELECT i.nombre, di.porcentaje, i.precio_unitario
                FROM dieta_ingredientes di
                JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
                WHERE di.id_dieta = :id
            """), {"id": id_dieta}).fetchall()

            pdf = PDFService.dieta_pdf(
                dict(dieta),
                [dict(i) for i in ingredientes]
            )
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=dieta_{id_dieta}.pdf"}
            )

        elif tipo == "medicamentos":
            medicamentos = db.execute(text("""
                SELECT m.nombre, tm.nombre as tipo_medicamento_nombre,
                       m.tipo_dosis, m.stock_actual, m.unidad_medida,
                       m.requiere_retiro
                FROM medicamentos m
                JOIN tipo_medicamento tm ON m.id_tipo_medicamento = tm.id_tipo
                WHERE m.activo = true
                ORDER BY m.nombre
            """)).fetchall()

            pdf = PDFService.medicamentos_catalogo_pdf([dict(m) for m in medicamentos])
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": "inline; filename=medicamentos.pdf"}
            )

        elif tipo == "movimientos-almacen":
            desde = desde or date.today().replace(day=1).isoformat()
            hasta = hasta or date.today().isoformat()

            entradas = db.execute(text("""
                SELECT ea.fecha_entrada::text, COALESCE(i.nombre, m.nombre) as producto_nombre,
                       ea.cantidad, p.nombre as proveedor_nombre
                FROM entrada_almacen ea
                LEFT JOIN ingredientes i ON ea.id_ingrediente = i.id_ingredientes
                LEFT JOIN medicamentos m ON ea.id_medicamento = m.id_medicamento
                LEFT JOIN proveedores p ON ea.id_proveedor = p.id_proveedor
                WHERE ea.fecha_entrada BETWEEN :desde AND :hasta
                ORDER BY ea.fecha_entrada DESC
            """), {"desde": desde, "hasta": hasta}).fetchall()

            salidas = db.execute(text("""
                SELECT s.fecha_servicio::text as fecha, 'Alimento corral ' || c.nombre as producto_nombre,
                       s.cantidad_kg as cantidad, 'Servicio alimentación' as motivo
                FROM servicios_alimentacion s
                JOIN corrales c ON s.id_corral = c.id_corral
                WHERE s.fecha_servicio BETWEEN :desde AND :hasta
                ORDER BY s.fecha_servicio DESC
                LIMIT 50
            """), {"desde": desde, "hasta": hasta}).fetchall()

            pdf = PDFService.movimientos_almacen_pdf(
                [dict(e) for e in entradas],
                [dict(s) for s in salidas],
                f"{desde} / {hasta}"
            )
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=almacen_{desde}_{hasta}.pdf"}
            )
        elif tipo == "rentabilidad-animal":
            if not arete:
                raise HTTPException(status_code=400, detail="Se requiere 'arete'")
            
            animal = db.execute(text("""
                SELECT a.*, 
                       COALESCE(
                           (SELECT SUM(s.cantidad_kg * 
                               (SELECT SUM((di.porcentaje/100.0) * i.precio_unitario)
                                FROM dieta_ingredientes di
                                JOIN ingredientes i ON di.id_ingredientes = i.id_ingredientes
                                WHERE di.id_dieta = s.id_dieta)
                           ) FROM servicios_alimentacion s WHERE s.id_corral IN (
                               SELECT id_corral_actual FROM animales WHERE arete = :arete
                           )), 0) as costo_alimentacion,
                       COALESCE(
                           (SELECT SUM(t.dosis_aplicada * 10) FROM tratamientos t WHERE t.arete = :arete), 0
                       ) as costo_tratamientos
                FROM animales a
                WHERE a.arete = :arete
            """), {"arete": arete}).fetchone()

            if not animal:
                raise HTTPException(status_code=404, detail="Animal no encontrado")

            costo_total = float(animal.precio_compra) + float(animal.costo_alimentacion) + float(animal.costo_tratamientos)

            # Ingreso por venta si fue vendido
            ingreso = db.execute(text("""
                SELECT COALESCE(vd.precio, 0) as ingreso
                FROM venta_detalle vd
                WHERE vd.arete = :arete
            """), {"arete": arete}).fetchone()
            ingreso_venta = float(ingreso.ingreso) if ingreso else 0.0

            pdf = PDFService.rentabilidad_animal_pdf(
                dict(animal),
                costo_total,
                ingreso_venta
            )
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=rentabilidad_{arete}.pdf"}
            )
        elif tipo == "orden-compra":
            productos_sugeridos = db.execute(text("""
                SELECT 
                    i.nombre,
                    CASE 
                        WHEN i.stock_actual = 0 THEN i.stock_minimo * 2
                        ELSE (i.stock_minimo * 2) - i.stock_actual
                    END as cantidad,
                    i.unidad_medida as unidad,
                    i.precio_unitario
                FROM ingredientes i
                WHERE i.activo = true AND i.stock_actual < i.stock_minimo * 1.5
            """)).fetchall()

            orden = {
                "numero_orden": f"OC-{date.today().strftime('%Y%m%d')}-001",
                "total_estimado": sum(p.cantidad * p.precio_unitario for p in productos_sugeridos),
                "productos": [dict(p) for p in productos_sugeridos]
            }

            pdf = PDFService.orden_compra_pdf(orden)
            return Response(
                content=pdf,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename=orden_compra.pdf"}
            )

        else:
            raise HTTPException(status_code=400, detail=f"Tipo de PDF '{tipo}' no soportado")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")