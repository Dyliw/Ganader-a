# backend/app/api/v1/animales.py
from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.db.database import get_db

router = APIRouter()


@router.get("")
@router.get("")
def listar_animales(
    estado: str = Query("todos"),
    sexo: str = Query(""),
    corral: str = Query(""),
    clasificacion: str = Query(""),
    busqueda: str = Query(""),
    peso_min: float = Query(None),
    peso_max: float = Query(None),
    meses_min: int = Query(None),
    meses_max: int = Query(None),
    pagina: int = Query(1, ge=1),
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lista animales con filtros"""
    
    condiciones = []
    params = {}

    if estado == 'vivo':
        condiciones.append("e.nombre NOT IN ('Muerto', 'Vendido')")
    elif estado == 'muerto':
        condiciones.append("e.nombre = 'Muerto'")
    elif estado == 'vendido':
        condiciones.append("e.nombre = 'Vendido'")
    elif estado == 'Enfermo':
        condiciones.append("e.nombre = 'Enfermo'")

    if sexo:
        condiciones.append("a.sexo = :sexo")
        params["sexo"] = sexo
  
    if corral:
        condiciones.append("a.id_corral_actual = :corral")
        params["corral"] = int(corral)
    
    if clasificacion:
        condiciones.append("a.clasificacion = :clasif")
        params["clasif"] = clasificacion
 
    if busqueda:
        condiciones.append("a.arete ILIKE :busqueda")
        params["busqueda"] = f"%{busqueda}%"
    
    if peso_min is not None:
        condiciones.append("""
            COALESCE(
                (SELECT hp.peso FROM historial_peso hp 
                 WHERE hp.arete = a.arete 
                 ORDER BY hp.fecha DESC LIMIT 1),
                a.peso_entrada
            ) >= :peso_min
        """)
        params["peso_min"] = peso_min

    if peso_max is not None:
        condiciones.append("""
            COALESCE(
                (SELECT hp.peso FROM historial_peso hp 
                 WHERE hp.arete = a.arete 
                 ORDER BY hp.fecha DESC LIMIT 1),
                a.peso_entrada
            ) <= :peso_max
        """)
        params["peso_max"] = peso_max
 
    if meses_min is not None:
        condiciones.append("a.meses >= :meses_min")
        params["meses_min"] = meses_min
  
    if meses_max is not None:
        condiciones.append("a.meses <= :meses_max")
        params["meses_max"] = meses_max
    
    where = " AND ".join(condiciones) if condiciones else "1=1"
    offset = (pagina - 1) * limite
    
    total = db.execute(text(f"""
        SELECT COUNT(*) as total
        FROM animales a
        JOIN estado e ON a.id_estado = e.id_estado
        WHERE {where}
    """), params).fetchone().total
 
    animales = db.execute(text(f"""
        SELECT 
            a.arete,
            a.sexo,
            a.clasificacion,
            a.meses,
            a.peso_entrada,
            a.precio_compra,
            a.fecha_ingreso,
            a.observaciones,
            e.nombre as estado_nombre,
            c.nombre as corral_nombre,
            p.nombre as proveedor_nombre,
            COALESCE(
                (SELECT hp.peso FROM historial_peso hp 
                 WHERE hp.arete = a.arete 
                 ORDER BY hp.fecha DESC LIMIT 1),
                a.peso_entrada
            ) as peso_actual
        FROM animales a
        JOIN estado e ON a.id_estado = e.id_estado
        LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
        LEFT JOIN proveedores p ON a.id_proveedor = p.id_proveedor
        WHERE {where}
        ORDER BY a.fecha_creacion DESC, a.arete
        LIMIT :limite OFFSET :offset
    """), {**params, "limite": limite, "offset": offset}).fetchall()
    
    total_paginas = max(1, (total + limite - 1) // limite)
    
    return {
        "animales": [dict(a._mapping) for a in animales],
        "total": total,
        "pagina": pagina,
        "limite": limite,
        "total_paginas": total_paginas
    }

@router.get("/{arete}")
def ficha_animal(arete: str, db: Session = Depends(get_db)):
    """Obtiene la ficha completa de un animal"""
    
    try:
        animal = db.execute(text("""
            SELECT
                a.arete,
                a.sexo,
                a.clasificacion,
                a.meses,
                a.peso_entrada,
                a.precio_compra,
                a.fecha_ingreso,
                a.observaciones,
                a.fecha_muerte,
                a.causa_muerte,
                e.nombre as estado_nombre,
                c.nombre as corral_nombre,
                p.nombre as proveedor_nombre,
                emp.nombre || ' ' || emp.apellido_paterno as creado_por_nombre,
                COALESCE(
                    (SELECT hp.peso FROM historial_peso hp
                     WHERE hp.arete = a.arete
                     ORDER BY hp.fecha DESC LIMIT 1),
                    a.peso_entrada
                ) as peso_actual
            FROM animales a
            JOIN estado e ON a.id_estado = e.id_estado
            LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
            LEFT JOIN proveedores p ON a.id_proveedor = p.id_proveedor
            LEFT JOIN empleados emp ON a.creado_por = emp.id_empleado
            WHERE a.arete = :arete
        """), {"arete": arete}).fetchone()
        
        if not animal:
            raise HTTPException(status_code=404, detail="Animal no encontrado")
        
        return {
            "arete": animal[0],
            "sexo": animal[1],
            "clasificacion": animal[2] or "",
            "meses": animal[3],
            "peso_entrada": float(animal[4]) if animal[4] else 0,
            "precio_compra": float(animal[5]) if animal[5] else 0,
            "fecha_ingreso": str(animal[6]) if animal[6] else None,
            "observaciones": animal[7] or "",
            "fecha_muerte": str(animal[8]) if animal[8] else None,
            "causa_muerte": animal[9] or "",
            "estado_nombre": animal[10],
            "corral_nombre": animal[11] or "Sin asignar",
            "proveedor_nombre": animal[12] or "N/A",
            "creado_por_nombre": animal[13] or "N/A",
            "peso_actual": float(animal[14]) if animal[14] else 0
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/{arete}")
def editar_animal(arete: str, data: dict, db: Session = Depends(get_db)):
    """Edita datos básicos del animal"""
    try:
        db.execute(text("""
            UPDATE animales 
            SET observaciones = COALESCE(:obs, observaciones),
                id_corral_actual = COALESCE(:corral, id_corral_actual),
                meses = COALESCE(:meses, meses)
            WHERE arete = :arete
        """), {
            "arete": arete,
            "obs": data.get("observaciones"),
            "corral": data.get("id_corral"),
            "meses": data.get("meses")
        })
        db.commit()
        return {"mensaje": "Animal actualizado"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{arete}/estado")
def cambiar_estado(arete: str, data: dict, db: Session = Depends(get_db)):
    """Cambia manualmente el estado del animal"""
    try:
        estado = db.execute(
            text("SELECT nombre FROM estado WHERE id_estado = :id"),
            {"id": data["id_estado"]}
        ).fetchone()
        
        if not estado:
            raise HTTPException(status_code=404, detail="Estado no encontrado")
        
        db.execute(text("""
            UPDATE animales SET id_estado = :estado WHERE arete = :arete
        """), {"estado": data["id_estado"], "arete": arete})
        
        if estado[0] == 'Muerto' and data.get("causa_muerte"):
            db.execute(text("""
                UPDATE animales 
                SET fecha_muerte = COALESCE(:fecha, CURRENT_DATE),
                    causa_muerte = :causa
                WHERE arete = :arete
            """), {
                "arete": arete,
                "fecha": data.get("fecha_muerte"),
                "causa": data["causa_muerte"]
            })
        
        db.execute(text("""
            INSERT INTO historial_eventos (arete, id_tipo, descripcion, id_empleado)
            VALUES (:arete, 
                    (SELECT id_tipo FROM tipo_evento WHERE nombre = 'Enfermedad'),
                    :desc, :emp)
        """), {
            "arete": arete,
            "desc": f"Cambio de estado a: {estado[0]}. {data.get('observaciones', '')}",
            "emp": data.get("id_empleado", 4)
        })
        
        db.commit()
        return {"mensaje": f"Estado cambiado a: {estado[0]}"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{arete}/muerte")
def registrar_muerte(arete: str, data: dict, db: Session = Depends(get_db)):
    """Registra la muerte de un animal"""

    animal = db.execute(
        text("SELECT arete, fecha_muerte FROM animales WHERE arete = :arete"),
        {"arete": arete}
    ).fetchone()
    
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    
    if animal.fecha_muerte:
        raise HTTPException(status_code=400, detail="El animal ya está registrado como muerto")

    estado_muerto = db.execute(
        text("SELECT id_estado FROM estado WHERE nombre = 'Muerto'")
    ).fetchone()
    
    if not estado_muerto:
        estado_muerto = db.execute(
            text("INSERT INTO estado (nombre, descripcion) VALUES ('Muerto', 'Animal fallecido') RETURNING id_estado")
        ).fetchone()
    
    db.execute(text("""
        UPDATE animales 
        SET id_estado = :estado,
            fecha_muerte = COALESCE(:fecha, CURRENT_DATE),
            causa_muerte = :causa,
            id_corral_actual = NULL
        WHERE arete = :arete
    """), {
        "arete": arete,
        "estado": estado_muerto.id_estado,
        "fecha": data.get("fecha_muerte"),
        "causa": data.get("causa_muerte", "No especificada")
    })

    db.execute(text("""
        INSERT INTO historial_eventos (arete, id_tipo, descripcion, id_empleado)
        VALUES (:arete, 
                (SELECT id_tipo FROM tipo_evento WHERE nombre = 'Muerte'),
                :desc, :emp)
    """), {
        "arete": arete,
        "desc": f"Muerte registrada. Causa: {data.get('causa_muerte', 'No especificada')}",
        "emp": data.get("id_empleado", 1)
    })
    
    db.commit()
    
    return {
        "mensaje": "Muerte registrada correctamente",
        "arete": arete,
        "fecha_muerte": str(data.get("fecha_muerte", date.today()))
    }

@router.get("/{arete}/pesos")
def historial_pesos(arete: str, db: Session = Depends(get_db)):
    """Obtener el historial de pesos de un animale"""
    try:
        pesos = db.execute(text("""
            SELECT 
                hp.peso,
                hp.fecha
            FROM historial_peso hp
            WHERE hp.arete = :arete
            ORDER BY hp.fecha DESC
        """), {"arete": arete}).fetchall()
        
        return [
            {
                "peso": float(p[0]),
                "fecha": str(p[1]) if p[1] else None
            }
            for p in pesos
        ]
    except Exception as e:
        return []


@router.get("/{arete}/movimientos")
def historial_movimientos(arete: str, db: Session = Depends(get_db)):
    """Obtiene el historial de movimientos de un animal"""
    try:
        movimientos = db.execute(text("""
            SELECT 
                he.descripcion,
                he.fecha_evento,
                emp.nombre || ' ' || emp.apellido_paterno as empleado_nombre,
                te.nombre as tipo_evento
            FROM historial_eventos he
            JOIN tipo_evento te ON he.id_tipo = te.id_tipo
            LEFT JOIN empleados emp ON he.id_empleado = emp.id_empleado
            WHERE he.arete = :arete
            ORDER BY he.fecha_evento DESC
        """), {"arete": arete}).fetchall()
        
        return [
            {
                "descripcion": m[0],
                "fecha_evento": str(m[1]) if m[1] else None,
                "empleado_nombre": m[2] or "Sistema",
                "tipo_evento": m[3]
            }
            for m in movimientos
        ]
    except Exception as e:
        return []


@router.get("/{arete}/tratamientos")
def historial_tratamientos(arete: str, db: Session = Depends(get_db)):
    """Obtiene el historial de tratamientos de un animal"""
    try:
        tratamientos = db.execute(text("""
            SELECT 
                t.fecha_aplicacion,
                m.nombre as medicamento_nombre,
                t.dosis_aplicada,
                t.fecha_disponible,
                emp.nombre || ' ' || emp.apellido_paterno as empleado_nombre,
                t.observaciones
            FROM tratamientos t
            JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
            LEFT JOIN empleados emp ON t.id_empleado = emp.id_empleado
            WHERE t.arete = :arete
            ORDER BY t.fecha_aplicacion DESC
        """), {"arete": arete}).fetchall()
        
        return [
            {
                "fecha_aplicacion": str(t[0]) if t[0] else None,
                "medicamento_nombre": t[1],
                "dosis_aplicada": float(t[2]) if t[2] else 0,
                "fecha_disponible": str(t[3]) if t[3] else None,
                "empleado_nombre": t[4] or "N/A",
                "observaciones": t[5] or ""
            }
            for t in tratamientos
        ]
    except Exception as e:
        return []


@router.post("/{arete}/pesos")
def registrar_peso(arete: str, data: dict, db: Session = Depends(get_db)):
    """Registra un nuevo peso para el animal"""
    try:
        db.execute(text("""
            INSERT INTO historial_peso (arete, fecha, peso)
            VALUES (:arete, COALESCE(:fecha, CURRENT_DATE), :peso)
        """), {
            "arete": arete,
            "fecha": data.get("fecha"),
            "peso": data["peso"]
        })
        db.commit()
        return {"mensaje": "Peso registrado exitosamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{arete}/mover")
def mover_animal(arete: str, data: dict, db: Session = Depends(get_db)):
    """Mueve un animal a otro corral"""
    try:
        corral = db.execute(text("""
            SELECT capacidad, 
                   (SELECT COUNT(*) FROM animales 
                    WHERE id_corral_actual = :id AND fecha_muerte IS NULL) as ocupacion
            FROM corrales WHERE id_corral = :id
        """), {"id": data["id_corral_destino"]}).fetchone()
        
        if not corral:
            raise HTTPException(status_code=404, detail="Corral no encontrado")
        
        if corral[1] >= corral[0]:
            raise HTTPException(status_code=400, detail="Corral destino lleno")
        
        animal = db.execute(
            text("SELECT id_corral_actual FROM animales WHERE arete = :arete"),
            {"arete": arete}
        ).fetchone()
        
        db.execute(text("""
            UPDATE animales SET id_corral_actual = :destino WHERE arete = :arete
        """), {"destino": data["id_corral_destino"], "arete": arete})
        
        db.execute(text("""
            INSERT INTO historial_eventos (arete, id_tipo, descripcion, id_empleado)
            VALUES (:arete, 
                    (SELECT id_tipo FROM tipo_evento WHERE nombre = 'Movimiento'),
                    :desc, :emp)
        """), {
            "arete": arete,
            "desc": f"Movido de corral {animal[0]} a corral {data['id_corral_destino']}",
            "emp": data.get("id_empleado", 4)
        })
        
        db.commit()
        return {"mensaje": "Animal movido exitosamente"}

    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
@router.get("/{arete}/pdf", response_class=HTMLResponse)
def generar_pdf_animal(arete: str, db: Session = Depends(get_db)):
    """Genera una ficha PDF del animal"""
    
    animal = db.execute(text("""
        SELECT 
            a.*,
            e.nombre as estado_nombre,
            c.nombre as corral_nombre,
            p.nombre as proveedor_nombre,
            emp.nombre || ' ' || emp.apellido_paterno as creado_por_nombre,
            COALESCE(
                (SELECT hp.peso FROM historial_peso hp 
                 WHERE hp.arete = a.arete 
                 ORDER BY hp.fecha DESC LIMIT 1),
                a.peso_entrada
            ) as peso_actual
        FROM animales a
        JOIN estado e ON a.id_estado = e.id_estado
        LEFT JOIN corrales c ON a.id_corral_actual = c.id_corral
        LEFT JOIN proveedores p ON a.id_proveedor = p.id_proveedor
        LEFT JOIN empleados emp ON a.creado_por = emp.id_empleado
        WHERE a.arete = :arete
    """), {"arete": arete}).fetchone()
    
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    
    # Obtener historial de pesos
    pesos = db.execute(text("""
        SELECT fecha, peso
        FROM historial_peso
        WHERE arete = :arete
        ORDER BY fecha DESC
    """), {"arete": arete}).fetchall()
    
    # Obtener tratamientos
    tratamientos = db.execute(text("""
        SELECT t.fecha_aplicacion, t.dosis_aplicada, t.observaciones,
               m.nombre as medicamento_nombre,
               t.fecha_disponible
        FROM tratamientos t
        JOIN medicamentos m ON t.id_medicamento = m.id_medicamento
        WHERE t.arete = :arete
        ORDER BY t.fecha_aplicacion DESC
    """), {"arete": arete}).fetchall()
    
    # Obtener movimientos
    movimientos = db.execute(text("""
        SELECT he.fecha_evento, he.descripcion, te.nombre as tipo_evento,
               emp.nombre || ' ' || emp.apellido_paterno as empleado_nombre
        FROM historial_eventos he
        JOIN tipo_evento te ON he.id_tipo = te.id_tipo
        LEFT JOIN empleados emp ON he.id_empleado = emp.id_empleado
        WHERE he.arete = :arete
        ORDER BY he.fecha_evento DESC
    """), {"arete": arete}).fetchall()
    
    animal_dict = dict(animal)
    
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Ficha de {arete}</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: 'Segoe UI', Arial, sans-serif; 
                padding: 40px; 
                color: #333;
                max-width: 210mm;
                margin: 0 auto;
            }}
            .header {{ 
                text-align: center; 
                margin-bottom: 30px; 
                padding-bottom: 20px;
                border-bottom: 3px solid #2563eb;
            }}
            .header h1 {{ color: #1e40af; font-size: 28px; }}
            .header .arete {{ font-size: 36px; font-weight: bold; color: #1e3a8a; }}
            .header .fecha {{ color: #666; font-size: 14px; }}
            
            .section {{ margin-bottom: 25px; page-break-inside: avoid; }}
            .section h2 {{ 
                color: #1e40af; 
                font-size: 18px; 
                margin-bottom: 12px;
                padding-bottom: 5px;
                border-bottom: 1px solid #dbeafe;
            }}
            
            .info-grid {{ 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 10px; 
            }}
            .info-item {{ 
                padding: 8px 12px; 
                background: #f8fafc; 
                border-radius: 6px;
                border: 1px solid #e2e8f0;
            }}
            .info-item .label {{ font-size: 11px; color: #64748b; text-transform: uppercase; }}
            .info-item .value {{ font-size: 16px; font-weight: 600; color: #1e293b; }}
            
            table {{ 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 13px;
            }}
            th {{ 
                background: #2563eb; 
                color: white; 
                padding: 8px 10px; 
                text-align: left;
                font-size: 12px;
            }}
            td {{ 
                padding: 8px 10px; 
                border-bottom: 1px solid #e2e8f0; 
            }}
            tr:nth-child(even) {{ background: #f8fafc; }}
            
            .badge {{
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }}
            .badge-vivo {{ background: #dcfce7; color: #166534; }}
            .badge-muerto {{ background: #fee2e2; color: #991b1b; }}
            .badge-vendido {{ background: #f3e8ff; color: #6b21a8; }}
            .badge-enfermo {{ background: #fef9c3; color: #854d0e; }}
            
            .footer {{ 
                margin-top: 40px; 
                text-align: center; 
                font-size: 12px; 
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
            }}
            
            @media print {{
                body {{ padding: 20px; }}
                .no-print {{ display: none; }}
            }}
            
            .btn-print {{
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2563eb;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            .btn-print:hover {{ background: #1d4ed8; }}
        </style>
    </head>
    <body>
        <button class="btn-print no-print" onclick="window.print()">
            Imprimir / Guardar PDF
        </button>
        
        <div class="header">
            <p style="font-size: 14px; color: #64748b;">SISTEMA DE GESTIÓN GANADERA</p>
            <p class="arete">{arete}</p>
            <p class="fecha">Ficha generada el: {date.today().strftime('%d/%m/%Y')}</p>
        </div>
        
        <!-- DATOS GENERALES -->
        <div class="section">
            <h2>Datos Generales</h2>
            <div class="info-grid">
                <div class="info-item">
                    <p class="label">Estado</p>
                    <p class="value">
                        <span class="badge badge-{animal_dict.get('estado_nombre', '').lower()}">
                            {animal_dict.get('estado_nombre', 'N/A')}
                        </span>
                    </p>
                </div>
                <div class="info-item">
                    <p class="label">Sexo</p>
                    <p class="value">{'♂️ Macho' if animal_dict.get('sexo') == 'macho' else '♀️ Hembra'}</p>
                </div>
                <div class="info-item">
                    <p class="label">Clasificación</p>
                    <p class="value">{animal_dict.get('clasificacion', 'No disponible')}</p>
                </div>
                <div class="info-item">
                    <p class="label">Edad</p>
                    <p class="value">{animal_dict.get('meses', 'N/A')} meses</p>
                </div>
                <div class="info-item">
                    <p class="label">Peso actual</p>
                    <p class="value">{animal_dict.get('peso_actual', animal_dict.get('peso_entrada', 'N/A'))} kg</p>
                </div>
                <div class="info-item">
                    <p class="label">Peso entrada</p>
                    <p class="value">{animal_dict.get('peso_entrada', 'N/A')} kg</p>
                </div>
                <div class="info-item">
                    <p class="label">Precio compra</p>
                    <p class="value">${animal_dict.get('precio_compra', 0):,.2f}</p>
                </div>
                <div class="info-item">
                    <p class="label">Fecha ingreso</p>
                    <p class="value">{str(animal_dict.get('fecha_ingreso', 'N/A'))}</p>
                </div>
                <div class="info-item">
                    <p class="label">Corral</p>
                    <p class="value">{animal_dict.get('corral_nombre', 'Sin asignar')}</p>
                </div>
                <div class="info-item">
                    <p class="label">Proveedor</p>
                    <p class="value">{animal_dict.get('proveedor_nombre', 'N/A')}</p>
                </div>
            </div>
        </div>
    """
    
    # Si está muerto, mostrar info de muerte
    if animal_dict.get('fecha_muerte'):
        html += f"""
        <div class="section" style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
            <h2 style="color: #dc2626;">Registro de Muerte</h2>
            <p><strong>Fecha:</strong> {animal_dict.get('fecha_muerte')}</p>
            <p><strong>Causa:</strong> {animal_dict.get('causa_muerte', 'No especificada')}</p>
        </div>
        """
    
    # Historial de pesos
    html += """
        <div class="section">
            <h2>⚖️ Historial de Pesos</h2>
    """
    if pesos:
        html += """
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Peso (kg)</th></tr>
                </thead>
                <tbody>
        """
        for p in pesos:
            html += f"<tr><td>{p.fecha}</td><td><strong>{p.peso}</strong></td></tr>"
        html += "</tbody></table>"
    else:
        html += "<p style='color: #94a3b8;'>Sin registros de peso</p>"
    html += "</div>"
    
    # Tratamientos
    html += """
        <div class="section">
            <h2>Historial de Tratamientos</h2>
    """
    if tratamientos:
        html += """
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Medicamento</th><th>Dosis</th><th>Retiro hasta</th></tr>
                </thead>
                <tbody>
        """
        for t in tratamientos:
            retiro = str(t.fecha_disponible) if t.fecha_disponible else 'N/A'
            html += f"<tr><td>{t.fecha_aplicacion}</td><td>{t.medicamento_nombre}</td><td>{t.dosis_aplicada}</td><td>{retiro}</td></tr>"
        html += "</tbody></table>"
    else:
        html += "<p style='color: #94a3b8;'>Sin tratamientos registrados</p>"
    html += "</div>"
    
    # Movimientos
    html += """
        <div class="section">
            <h2>Historial de Movimientos</h2>
    """
    if movimientos:
        html += """
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Responsable</th></tr>
                </thead>
                <tbody>
        """
        for m in movimientos:
            html += f"<tr><td>{m.fecha_evento}</td><td>{m.tipo_evento}</td><td>{m.descripcion}</td><td>{m.empleado_nombre or 'N/A'}</td></tr>"
        html += "</tbody></table>"
    else:
        html += "<p style='color: #94a3b8;'>Sin movimientos registrados</p>"
    html += "</div>"
    
    # Footer
    html += f"""
        <div class="footer">
            <p>© {date.today().year} Sistema de Gestión Ganadera - Documento generado automáticamente</p>
            <p>{date.today().strftime('%d de %B de %Y')}</p>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)