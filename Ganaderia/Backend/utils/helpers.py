def rows_to_dict(rows):
    """
    Convierte resultados de SQLAlchemy a lista de diccionarios.
    Maneja Row, RowMapping y objetos normales.
    """
    if rows is None:
        return []
    
    resultado = []
    for row in rows:
        try:
            if hasattr(row, '_mapping'):
                resultado.append(dict(row._mapping))
            elif hasattr(row, '_asdict'):
                resultado.append(row._asdict())
            elif hasattr(row, '_fields'):
                resultado.append(dict(zip(row._fields, row)))
            else:
                if hasattr(row, 'keys'):
                    resultado.append({k: getattr(row, k) for k in row.keys()})
                else:
                    resultado.append(dict(row))
        except (TypeError, AttributeError):
            resultado.append({"error": f"No se pudo convertir: {str(row)}"})
    
    return resultado


def row_to_dict(row):
    """Convierte una sola fila a diccionario"""
    if row is None:
        return None
    
    try:
        if hasattr(row, '_mapping'):
            return dict(row._mapping)
        elif hasattr(row, '_asdict'):
            return row._asdict()
        elif hasattr(row, '_fields'):
            return dict(zip(row._fields, row))
        else:
            return dict(row)
    except:
        return {"error": "No se pudo convertir"}