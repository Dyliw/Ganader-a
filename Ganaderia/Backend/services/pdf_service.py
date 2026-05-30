# backend/app/services/pdf_service.py
from weasyprint import HTML
from datetime import date
from typing import List, Dict, Any

class PDFService:
    # ======================== ESTILOS BASE ========================
    BASE_CSS = """
    @page {
        size: A4;
        margin: 2cm 1.5cm 2.5cm 1.5cm;
        @top-center {
            content: element(header);
            font-family: 'Helvetica', sans-serif;
        }
        @bottom-center {
            content: element(footer);
            font-family: 'Helvetica', sans-serif;
            font-size: 10px;
            color: #666;
        }
    }
    body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 12px;
        color: #333;
        line-height: 1.5;
    }
    h1 { color: #2f2f2f; font-size: 24px; margin-bottom: 10px; }
    h2 { color: #5f7c4d; font-size: 18px; }
    h3 { color: #2f2f2f; font-size: 14px; margin-top: 20px; }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
    }
    th {
        background-color: #f8f6f1;
        color: #2f2f2f;
        font-weight: bold;
        padding: 10px;
        text-align: left;
        border-bottom: 2px solid #5f7c4d;
    }
    td {
        padding: 8px 10px;
        border-bottom: 1px solid #ece8df;
    }
    .total-row td { font-weight: bold; background-color: #f8f6f1; }
    .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
    }
    .badge-success { background: #e4f0de; color: #557244; }
    .badge-danger { background: #fde0e0; color: #a94442; }
    .header { text-align: left; margin-bottom: 20px; border-bottom: 3px solid #5f7c4d; padding-bottom: 10px; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; border-top: 1px solid #ece8df; padding-top: 10px; }
    .data-table { margin: 10px 0; }
    .data-table td { border: none; padding: 5px 10px; }
    .left-col { width: 40%; font-weight: bold; }
    """

    # ==================== COMPONENTES HTML BASE ====================
    @staticmethod
    def _build_header(company_name: str = "Ganadera El Rosario", title: str = "Reporte") -> str:
        return f"""
        <div class="header">
            <table style="width:100%; border:none; margin:0;">
                <tr>
                    <td style="border:none; text-align:left;">
                        <h1 style="margin:0;">{company_name}</h1>
                        <p style="margin:0; color:#666;">Sistema de Gestión Ganadera</p>
                    </td>
                    <td style="border:none; text-align:right;">
                        <p style="font-size:14px; font-weight:bold; color:#5f7c4d;">{title}</p>
                        <p style="font-size:10px;">Fecha: {date.today().strftime('%d/%m/%Y')}</p>
                    </td>
                </tr>
            </table>
        </div>
        """

    @staticmethod
    def _build_footer() -> str:
        return f"""
        <div class="footer">
            <p>Documento generado automáticamente. Para aclaraciones contacte al administrador.</p>
            <p>© {date.today().year} Ganadera El Rosario. Todos los derechos reservados.</p>
        </div>
        """

    @staticmethod
    def _wrap_html(body_content: str, title: str = "Reporte", extra_css: str = "") -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>{PDFService.BASE_CSS} {extra_css}</style>
        </head>
        <body>
            <header>{PDFService._build_header(title=title)}</header>
            <footer>{PDFService._build_footer()}</footer>
            <main>{body_content}</main>
        </body>
        </html>
        """

    @staticmethod
    def generate_pdf(html_content: str, landscape: bool = False) -> bytes:
        """Convierte HTML a bytes de PDF."""
        doc = HTML(string=html_content).render()
        # Si se requiere apaisado, se puede ajustar con CSS @page { size: A4 landscape; }
        # pero por simplicidad se deja retrato.
        return doc.write_pdf()

    # ==================== REPORTES ESPECÍFICOS ====================

    # --- 1. VENTAS ---
    @staticmethod
    def venta_pdf(venta: Dict[str, Any], detalles: List[Dict[str, Any]]) -> bytes:
        rows = ""
        for d in detalles:
            rows += f"""
            <tr>
                <td>{d.get('arete','')}</td>
                <td>{d.get('clasificacion','')}</td>
                <td>{d.get('sexo','')}</td>
                <td style="text-align:right">{d.get('peso',0):.1f} kg</td>
                <td style="text-align:right">${venta['precio_kg']:.2f}</td>
                <td style="text-align:right">${d.get('subtotal',0):.2f}</td>
            </tr>
            """
        body = f"""
            <h2>Comprobante de Venta #{venta.get('id_venta','')}</h2>
            <table class="data-table">
                <tr><td class="left-col">Comprador:</td><td>{venta.get('comprador','')}</td></tr>
                <tr><td>RFC:</td><td>{venta.get('rfc','')}</td></tr>
                <tr><td>Fecha:</td><td>{venta.get('fecha_venta','')}</td></tr>
                <tr><td>Estatus:</td><td>{venta.get('estatus','')}</td></tr>
            </table>
            <table>
                <thead><tr><th>Arete</th><th>Clasificación</th><th>Sexo</th><th>Peso</th><th>Precio/kg</th><th>Subtotal</th></tr></thead>
                <tbody>{rows}</tbody>
                <tfoot><tr class="total-row"><td colspan="5" style="text-align:right;">Total</td><td style="text-align:right;">${venta.get('total',0):,.2f}</td></tr></tfoot>
            </table>
            <p style="margin-top:30px;">Firma del comprador: ___________________________</p>
        """
        html = PDFService._wrap_html(body, title=f"Venta #{venta.get('id_venta','')}")
        return PDFService.generate_pdf(html)

    # --- 2. INVENTARIO DE ANIMALES ---
    @staticmethod
    def inventario_pdf(resumen: Dict[str, Any], por_corral: List[Dict[str, Any]]) -> bytes:
        rows_corral = ""
        for c in por_corral:
            rows_corral += f"""
            <tr>
                <td>{c.get('corral','')}</td>
                <td style="text-align:right">{c.get('capacidad','')}</td>
                <td style="text-align:right">{c.get('ocupacion','')}</td>
                <td style="text-align:right">{c.get('porcentaje','')}%</td>
                <td style="text-align:right">{c.get('machos','')}</td>
                <td style="text-align:right">{c.get('hembras','')}</td>
                <td style="text-align:right">{c.get('peso_promedio','')} kg</td>
            </tr>
            """
        body = f"""
            <h2>Inventario de Animales</h2>
            <table class="data-table">
                <tr><td class="left-col">Total animales:</td><td>{resumen.get('total',0)}</td></tr>
                <tr><td>Vivos:</td><td>{resumen.get('vivos',0)}</td></tr>
                <tr><td>Vendidos:</td><td>{resumen.get('vendidos',0)}</td></tr>
                <tr><td>Muertos:</td><td>{resumen.get('muertos',0)}</td></tr>
            </table>
            <h3>Detalle por corral</h3>
            <table>
                <thead><tr><th>Corral</th><th>Capacidad</th><th>Ocupación</th><th>%</th><th>Machos</th><th>Hembras</th><th>Peso prom.</th></tr></thead>
                <tbody>{rows_corral}</tbody>
            </table>
        """
        html = PDFService._wrap_html(body, title="Inventario de Animales")
        return PDFService.generate_pdf(html)

    # --- 3. ORDEN DE COMPRA ---
    @staticmethod
    def orden_compra_pdf(orden: Dict[str, Any]) -> bytes:
        productos_rows = ""
        for p in orden.get('productos', []):
            total = p.get('cantidad',0) * p.get('precio_unitario',0)
            productos_rows += f"""
            <tr>
                <td>{p.get('nombre','')}</td>
                <td style="text-align:right">{p.get('cantidad','')}</td>
                <td>{p.get('unidad','')}</td>
                <td style="text-align:right">${p.get('precio_unitario',0):.2f}</td>
                <td style="text-align:right">${total:.2f}</td>
            </tr>
            """
        body = f"""
            <h2>Orden de Compra #{orden.get('numero_orden','')}</h2>
            <p><strong>Fecha:</strong> {date.today().strftime('%d/%m/%Y')}</p>
            <p><strong>Proveedor sugerido:</strong> Según historial</p>
            <table>
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Unidad</th><th>Precio Unit.</th><th>Total</th></tr></thead>
                <tbody>{productos_rows}</tbody>
                <tfoot><tr class="total-row"><td colspan="4" style="text-align:right;">Total estimado</td><td style="text-align:right;">${orden.get('total_estimado',0):,.2f}</td></tr></tfoot>
            </table>
            <p style="margin-top:30px;">___________________________<br>Firma del administrador</p>
        """
        html = PDFService._wrap_html(body, title="Orden de Compra")
        return PDFService.generate_pdf(html)

    # --- 4. FICHA DE ANIMAL (Guía de tránsito + historial) ---
    @staticmethod
    def ficha_animal_pdf(animal: Dict[str, Any], proveedor: Dict[str, Any],
                         pesos: List[Dict[str, Any]], tratamientos: List[Dict[str, Any]]) -> bytes:
        pesos_rows = ""
        for p in pesos:
            pesos_rows += f"<tr><td>{p.get('fecha','')}</td><td style='text-align:right'>{p.get('peso',0)} kg</td></tr>"
        
        trat_rows = ""
        for t in tratamientos:
            retiro = "Sin retiro"
            if t.get('fecha_disponible') and str(t['fecha_disponible']) > str(date.today()):
                retiro = f"Hasta {t['fecha_disponible']}"
            trat_rows += f"<tr><td>{t.get('fecha_aplicacion','')}</td><td>{t.get('medicamento','')}</td><td style='text-align:right'>{t.get('dosis_aplicada','')}</td><td>{retiro}</td></tr>"
        
        body = f"""
            <h2>Ficha del Animal {animal.get('arete','')}</h2>
            <table class="data-table">
                <tr><td class="left-col">Arete:</td><td>{animal.get('arete','')}</td></tr>
                <tr><td>Sexo:</td><td>{animal.get('sexo','')}</td></tr>
                <tr><td>Clasificación:</td><td>{animal.get('clasificacion','')}</td></tr>
                <tr><td>Peso entrada:</td><td>{animal.get('peso_entrada',0)} kg</td></tr>
                <tr><td>Peso actual:</td><td>{animal.get('peso_actual','')} kg</td></tr>
                <tr><td>Meses:</td><td>{animal.get('meses','')}</td></tr>
                <tr><td>Proveedor:</td><td>{proveedor.get('nombre','')} (RFC: {proveedor.get('rfc','')})</td></tr>
                <tr><td>Fecha ingreso:</td><td>{animal.get('fecha_ingreso','')}</td></tr>
                <tr><td>Precio compra:</td><td>${animal.get('precio_compra',0):,.2f}</td></tr>
                <tr><td>Estado:</td><td>{animal.get('estado','')}</td></tr>
                <tr><td>Corral:</td><td>{animal.get('corral_nombre','Sin asignar')}</td></tr>
            </table>
            
            <h3>Historial de Pesos</h3>
            <table><thead><tr><th>Fecha</th><th>Peso</th></tr></thead><tbody>{pesos_rows}</tbody></table>
            
            <h3>Tratamientos aplicados</h3>
            <table><thead><tr><th>Fecha</th><th>Medicamento</th><th>Dosis</th><th>Retiro</th></tr></thead><tbody>{trat_rows}</tbody></table>
        """
        html = PDFService._wrap_html(body, title=f"Ficha {animal.get('arete','')}")
        return PDFService.generate_pdf(html)

    # --- 5. CONSUMO DE ALIMENTO ---
    @staticmethod
    def consumo_alimento_pdf(resumen: Dict[str, Any], servicios: List[Dict[str, Any]]) -> bytes:
        rows = ""
        for s in servicios:
            rows += f"<tr><td>{s.get('fecha_servicio','')}</td><td>{s.get('corral','')}</td><td style='text-align:right'>{s.get('cantidad_kg',0)} kg</td><td>{s.get('empleado','')}</td></tr>"
        
        body = f"""
            <h2>Consumo de Alimento</h2>
            <p><strong>Periodo:</strong> {resumen.get('desde','')} al {resumen.get('hasta','')}</p>
            <p><strong>Total consumido:</strong> {resumen.get('total_kg',0)} kg</p>
            <p><strong>Promedio diario:</strong> {resumen.get('promedio_diario',0)} kg</p>
            <table>
                <thead><tr><th>Fecha</th><th>Corral</th><th>Cantidad</th><th>Servido por</th></tr></thead>
                <tbody>{rows}</tbody>
            </table>
        """
        html = PDFService._wrap_html(body, title="Reporte de Consumo de Alimento")
        return PDFService.generate_pdf(html)

    # --- 6. DIETA ---
    @staticmethod
    def dieta_pdf(dieta: Dict[str, Any], ingredientes: List[Dict[str, Any]]) -> bytes:
        ing_rows = ""
        total_costo = 0.0
        for i in ingredientes:
            costo = (i.get('porcentaje',0)/100.0) * i.get('precio_unitario',0)
            total_costo += costo
            ing_rows += f"<tr><td>{i.get('nombre','')}</td><td style='text-align:right'>{i.get('porcentaje',0)}%</td><td style='text-align:right'>${i.get('precio_unitario',0):.2f}</td><td style='text-align:right'>${costo:.2f}</td></tr>"
        
        body = f"""
            <h2>Dieta: {dieta.get('nombre','')}</h2>
            <p><strong>Factor:</strong> {dieta.get('factor','')} | <strong>Activo:</strong> {dieta.get('activo','')}</p>
            <p><strong>Descripción:</strong> {dieta.get('descripcion','')}</p>
            <table>
                <thead><tr><th>Ingrediente</th><th>Porcentaje</th><th>Precio Unit.</th><th>Contribución</th></tr></thead>
                <tbody>{ing_rows}</tbody>
                <tfoot><tr class="total-row"><td colspan="3" style="text-align:right;">Costo total/kg</td><td>${total_costo:.2f}</td></tr></tfoot>
            </table>
        """
        html = PDFService._wrap_html(body, title=f"Dieta {dieta.get('nombre','')}")
        return PDFService.generate_pdf(html)

    # --- 7. CATÁLOGO DE MEDICAMENTOS ---
    @staticmethod
    def medicamentos_catalogo_pdf(medicamentos: List[Dict[str, Any]]) -> bytes:
        rows = ""
        for m in medicamentos:
            rows += f"<tr><td>{m.get('nombre','')}</td><td>{m.get('tipo_medicamento_nombre','')}</td><td>{m.get('tipo_dosis','')}</td><td style='text-align:right'>{m.get('stock_actual','')}</td><td>{m.get('unidad_medida','')}</td><td>{'Sí' if m.get('requiere_retiro') else 'No'}</td></tr>"
        body = f"""
            <h2>Catálogo de Medicamentos</h2>
            <table>
                <thead><tr><th>Nombre</th><th>Tipo</th><th>Dosis</th><th>Stock</th><th>Unidad</th><th>Retiro</th></tr></thead>
                <tbody>{rows}</tbody>
            </table>
        """
        html = PDFService._wrap_html(body, title="Medicamentos")
        return PDFService.generate_pdf(html)

    # --- 8. MOVIMIENTOS DE ALMACÉN ---
    @staticmethod
    def movimientos_almacen_pdf(entradas: List[Dict[str, Any]], salidas: List[Dict[str, Any]], periodo: str) -> bytes:
        rows = ""
        for e in entradas:
            rows += f"<tr><td>{e.get('fecha_entrada','')}</td><td>Entrada</td><td>{e.get('producto_nombre','')}</td><td style='text-align:right'>{e.get('cantidad','')}</td><td>{e.get('proveedor_nombre','')}</td></tr>"
        for s in salidas:
            rows += f"<tr><td>{s.get('fecha','')}</td><td>Salida</td><td>{s.get('producto_nombre','')}</td><td style='text-align:right'>{s.get('cantidad','')}</td><td>{s.get('motivo','')}</td></tr>"
        body = f"""
            <h2>Movimientos de Almacén</h2>
            <p><strong>Período:</strong> {periodo}</p>
            <table>
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Referencia</th></tr></thead>
                <tbody>{rows}</tbody>
            </table>
        """
        html = PDFService._wrap_html(body, title="Movimientos Almacén")
        return PDFService.generate_pdf(html)

    # --- 9. RENTABILIDAD DE UN ANIMAL ---
    @staticmethod
    def rentabilidad_animal_pdf(animal: Dict[str, Any], costo_total: float, ingreso_venta: float) -> bytes:
        ganancia = ingreso_venta - costo_total
        color = "green" if ganancia >= 0 else "red"
        body = f"""
            <h2>Rentabilidad del Animal {animal.get('arete','')}</h2>
            <table class="data-table">
                <tr><td class="left-col">Costo de compra:</td><td>${animal.get('precio_compra',0):,.2f}</td></tr>
                <tr><td>Costo alimentación:</td><td>${animal.get('costo_alimentacion',0):,.2f}</td></tr>
                <tr><td>Costo tratamientos:</td><td>${animal.get('costo_tratamientos',0):,.2f}</td></tr>
                <tr><td>Costo total acumulado:</td><td>${costo_total:,.2f}</td></tr>
                <tr><td>Ingreso por venta:</td><td>${ingreso_venta:,.2f}</td></tr>
                <tr class="total-row"><td>Ganancia/Pérdida:</td><td style="color:{color}; font-weight:bold;">${ganancia:,.2f}</td></tr>
            </table>
        """
        html = PDFService._wrap_html(body, title=f"Rentabilidad {animal.get('arete','')}")
        return PDFService.generate_pdf(html)