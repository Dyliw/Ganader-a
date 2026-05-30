from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db

router = APIRouter()

@router.get("")
def listar_empleados(db: Session = Depends(get_db)):
    """Lista todos los empleados con su puesto y estado de usuario"""
    empleados = db.execute(text("""
        SELECT e.*, p.nombre as puesto_nombre,
               CASE WHEN u.id_usuarios IS NOT NULL THEN true ELSE false END as tiene_usuario
        FROM empleados e
        JOIN puestos p ON e.id_puesto = p.id_puesto
        LEFT JOIN usuarios u ON e.id_empleado = u.id_empleado
        ORDER BY e.apellido_paterno, e.nombre
    """)).fetchall()
    return [dict(emp._mapping) for emp in empleados]

@router.get("/{id_empleado}")
def obtener_empleado(id_empleado: int, db: Session = Depends(get_db)):
    emp = db.execute(text("""
        SELECT e.*, p.nombre as puesto_nombre,
               u.usuario as usuario_login, u.activo as usuario_activo
        FROM empleados e
        JOIN puestos p ON e.id_puesto = p.id_puesto
        LEFT JOIN usuarios u ON e.id_empleado = u.id_empleado
        WHERE e.id_empleado = :id
    """), {"id": id_empleado}).fetchone()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return dict(emp)

@router.post("")
def crear_empleado(data: dict, db: Session = Depends(get_db)):
    """
    data: {
        nombre, apellido_paterno, apellido_materno, rfc,
        id_puesto, fecha_contrato, observaciones,
        crear_usuario: bool,
        usuario: str (si crear_usuario),
        contrasena: str (si crear_usuario)
    }
    """
    result = db.execute(text("""
        INSERT INTO empleados (nombre, apellido_paterno, apellido_materno, rfc,
                               id_puesto, fecha_contrato, observaciones, usuario, contrasena, activo)
        VALUES (:nombre, :ape_pat, :ape_mat, :rfc, :puesto, COALESCE(:fecha, CURRENT_DATE),
                :obs, :usuario, :contrasena, true)
        RETURNING id_empleado
    """), {
        "nombre": data["nombre"],
        "ape_pat": data["apellido_paterno"],
        "ape_mat": data.get("apellido_materno"),
        "rfc": data.get("rfc"),
        "puesto": data["id_puesto"],
        "fecha": data.get("fecha_contrato"),
        "obs": data.get("observaciones"),
        "usuario": data.get("usuario") if data.get("crear_usuario") else None,
        "contrasena": data.get("contrasena") if data.get("crear_usuario") else None
    })
    id_empleado = result.fetchone().id_empleado
    if data.get("crear_usuario") and data.get("usuario"):
        db.execute(text("""
            INSERT INTO usuarios (id_empleado, usuario, contrasena, activo)
            VALUES (:id_emp, :usr, :pass, true)
            ON CONFLICT (id_empleado) DO UPDATE
            SET usuario = :usr, contrasena = :pass, activo = true
        """), {"id_emp": id_empleado, "usr": data["usuario"], "pass": data["contrasena"]})

    db.commit()
    return {"mensaje": "Empleado creado", "id_empleado": id_empleado}

@router.put("/{id_empleado}")
def actualizar_empleado(id_empleado: int, data: dict, db: Session = Depends(get_db)):
    db.execute(text("""
        UPDATE empleados
        SET nombre = COALESCE(:nombre, nombre),
            apellido_paterno = COALESCE(:ape_pat, apellido_paterno),
            apellido_materno = :ape_mat,
            rfc = COALESCE(:rfc, rfc),
            id_puesto = COALESCE(:puesto, id_puesto),
            fecha_contrato = COALESCE(:fecha, fecha_contrato),
            observaciones = :obs,
            activo = COALESCE(:activo, activo)
        WHERE id_empleado = :id
    """), {
        "id": id_empleado,
        "nombre": data.get("nombre"),
        "ape_pat": data.get("apellido_paterno"),
        "ape_mat": data.get("apellido_materno"),
        "rfc": data.get("rfc"),
        "puesto": data.get("id_puesto"),
        "fecha": data.get("fecha_contrato"),
        "obs": data.get("observaciones"),
        "activo": data.get("activo")
    })

    if data.get("crear_usuario") and data.get("usuario"):
        # Actualizar o crear usuario
        db.execute(text("""
            INSERT INTO usuarios (id_empleado, usuario, contrasena, activo)
            VALUES (:id_emp, :usr, :pass, true)
            ON CONFLICT (id_empleado) DO UPDATE
            SET usuario = :usr, contrasena = :pass, activo = true
        """), {"id_emp": id_empleado, "usr": data["usuario"], "pass": data["contrasena"]})
    elif data.get("crear_usuario") == False: 
        db.execute(text("UPDATE usuarios SET activo = false WHERE id_empleado = :id"), {"id": id_empleado})

    db.commit()
    return {"mensaje": "Empleado actualizado"}
@router.get("/puestos")
def listar_puestos(db: Session = Depends(get_db)):
    puestos = db.execute(text("SELECT * FROM puestos ORDER BY nombre")).fetchall()
    return [dict(p._mapping) for p in puestos]
@router.delete("/{id_empleado}")
def eliminar_empleado(id_empleado: int, db: Session = Depends(get_db)):
    db.execute(text("UPDATE empleados SET activo = false WHERE id_empleado = :id"), {"id": id_empleado})
    db.execute(text("UPDATE usuarios SET activo = false WHERE id_empleado = :id"), {"id": id_empleado})
    db.commit()
    return {"mensaje": "Empleado desactivado"}