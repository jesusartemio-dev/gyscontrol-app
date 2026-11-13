from http.server import BaseHTTPRequestHandler
from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XlsxImage
from openpyxl.utils import get_column_letter
from openpyxl.drawing.spreadsheet_drawing import OneCellAnchor, AnchorMarker
from openpyxl.drawing.xdr import XDRPositiveSize2D
from io import BytesIO
from email.parser import BytesParser
from email.policy import default
import json

SHEET_NAME = 'MATRIZ EPPs'
DATA_START_ROW = 9

# Encabezados de puesto: fila 8, columnas H-Q (8-17), individuales (no
# combinadas). La plantilla trae hasta 10 slots — proyectos con más puestos
# se capan a 10 (ver do_POST). Las columnas sobrantes se blanquean.
FILA_HEADER_PUESTOS = 8
COL_PUESTOS_INICIO = 8
COL_PUESTOS_FIN = 17
MAX_PUESTOS = COL_PUESTOS_FIN - COL_PUESTOS_INICIO + 1

COL_NUMERO = 2
COL_NOMBRE = 3
COL_EVIDENCIA = 4  # la foto del EPP
COL_RIESGO = 5
COL_PARTE = 6
COL_DURABILIDAD = 7


def reemplazar_placeholders(ws, cabecera: dict):
    for row in ws.iter_rows():
        for cell in row:
            if cell.value and isinstance(cell.value, str) and '{{' in cell.value:
                nueva = cell.value
                for k, v in cabecera.items():
                    placeholder = '{{' + k + '}}'
                    if placeholder in nueva:
                        nueva = nueva.replace(placeholder, str(v) if v else '')
                cell.value = nueva


def escribir_encabezados_puestos(ws, puestos: list) -> list:
    """Escribe los cargos del proyecto en la fila 8 (H8:Q8), capado a
    MAX_PUESTOS. openpyxl solo cambia el .value de la celda — preserva el
    estilo/rotación ya dibujados en la plantilla. Blanquea las columnas
    sobrantes (proyectos con menos de 10 puestos). Devuelve la lista
    [(puesto, columna), ...] efectivamente escrita."""
    puestos_capados = puestos[:MAX_PUESTOS]
    columnas = []
    for i in range(MAX_PUESTOS):
        col = COL_PUESTOS_INICIO + i
        if i < len(puestos_capados):
            ws.cell(FILA_HEADER_PUESTOS, col).value = puestos_capados[i]
            columnas.append((puestos_capados[i], col))
        else:
            ws.cell(FILA_HEADER_PUESTOS, col).value = None
    return columnas


def escribir_filas_mpp(ws, items: list, columnas_puestos: list):
    columnas_usadas = {col for _, col in columnas_puestos}
    for i, item in enumerate(items):
        r = DATA_START_ROW + i

        ws.cell(r, COL_NUMERO).value = i + 1
        ws.cell(r, COL_NOMBRE).value = item.get('nombre', '')
        ws.cell(r, COL_RIESGO).value = item.get('riesgo', '')
        ws.cell(r, COL_PARTE).value = item.get('parteCuerpo', '')
        ws.cell(r, COL_DURABILIDAD).value = item.get('durabilidad', '')
        # La columna 4 (EVIDENCIA) la llena colocar_imagenes()

        asignaciones = item.get('asignaciones', {})
        for puesto, col in columnas_puestos:
            ws.cell(r, col).value = 'X' if asignaciones.get(puesto) is True else None
        # Blanquear columnas de puestos sobrantes (proyectos con < 10 puestos)
        for col in range(COL_PUESTOS_INICIO, COL_PUESTOS_FIN + 1):
            if col not in columnas_usadas:
                ws.cell(r, col).value = None


# Un pixel son 9525 EMU, que es la unidad en la que Excel posiciona dibujos.
EMU_POR_PX = 9525

# Cuanto de la celda ocupa la foto. El resto es el aire para que no toque los
# bordes ni se monte sobre la cuadricula.
PROPORCION_EN_CELDA = 0.86


def ancho_columna_px(ws, col: int) -> int:
    """Ancho de la columna en pixeles. Excel lo guarda en caracteres."""
    dim = ws.column_dimensions.get(get_column_letter(col))
    chars = dim.width if dim and dim.width else (ws.sheet_format.defaultColWidth or 8.43)
    return int(round(chars * 7 + 5))


def alto_fila_px(ws, fila: int) -> int:
    """Alto de la fila en pixeles. Excel lo guarda en puntos."""
    dim = ws.row_dimensions.get(fila)
    puntos = dim.height if dim and dim.height else (ws.sheet_format.defaultRowHeight or 15)
    return int(round(puntos * 96 / 72))


def colocar_imagenes(ws, imagenes: dict, cantidad_items: int):
    """
    Pone la foto de cada EPP en su fila, tomada de la base.

    Antes las fotos venian incrustadas en la plantilla y ancladas a filas
    fijas: la de la fila 12 era la del EPP que cayera en la fila 12. Por eso
    el catalogo no se podia tocar — agregar o reordenar un EPP descolocaba
    todas las siguientes. Ahora la imagen viaja con el equipo, asi que
    primero se quitan las de la plantilla y despues se colocan las que
    correspondan.

    `imagenes` es {orden: bytes}; un EPP sin foto simplemente deja la celda
    vacia en vez de heredar la del vecino.
    """
    # Quitar solo las del area de datos: los logos de la cabecera se quedan.
    conservadas = []
    for img in getattr(ws, '_images', []):
        fila = None
        try:
            fila = img.anchor._from.row + 1  # openpyxl cuenta desde 0
        except AttributeError:
            pass
        if fila is None or fila < DATA_START_ROW:
            conservadas.append(img)
    ws._images = conservadas

    if not imagenes:
        return 0

    colocadas = 0
    for orden, datos in sorted(imagenes.items()):
        if orden < 1 or orden > cantidad_items:
            continue
        fila = DATA_START_ROW + orden - 1
        try:
            img = XlsxImage(BytesIO(datos))
        except Exception:
            # Un formato que Pillow no entienda no debe tumbar la exportacion.
            continue
        if not img.width or not img.height:
            continue

        # Se mide contra la celda de verdad, no contra un alto fijo: las filas
        # de la plantilla van de 190 a 227 puntos, asi que con un valor
        # constante la foto salia a un tercio del alto disponible.
        celda_w = ancho_columna_px(ws, COL_EVIDENCIA)
        celda_h = alto_fila_px(ws, fila)

        escala = min(
            celda_w * PROPORCION_EN_CELDA / float(img.width),
            celda_h * PROPORCION_EN_CELDA / float(img.height),
        )
        ancho = max(1, int(img.width * escala))
        alto = max(1, int(img.height * escala))
        img.width, img.height = ancho, alto

        # Anclada a la celda con el sobrante repartido a los dos lados: con el
        # ancla simple la foto se pega a la esquina superior izquierda.
        marca = AnchorMarker(
            col=COL_EVIDENCIA - 1,
            colOff=int((celda_w - ancho) / 2 * EMU_POR_PX),
            row=fila - 1,
            rowOff=int((celda_h - alto) / 2 * EMU_POR_PX),
        )
        img.anchor = OneCellAnchor(
            _from=marca,
            ext=XDRPositiveSize2D(ancho * EMU_POR_PX, alto * EMU_POR_PX),
        )
        ws.add_image(img)
        colocadas += 1
    return colocadas


def parsear_multipart(body: bytes, content_type: str) -> dict:
    parser_input = b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body
    msg = BytesParser(policy=default).parsebytes(parser_input)
    parts = {}
    for part in msg.iter_parts():
        nombre = part.get_param('name', header='content-disposition')
        if nombre:
            parts[nombre] = part.get_payload(decode=True)
    return parts


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            content_type = self.headers.get('Content-Type', '')
            body = self.rfile.read(content_length)

            parts = parsear_multipart(body, content_type)
            plantilla_bytes = parts.get('plantilla')
            data_bag_raw = parts.get('dataBag')

            if not plantilla_bytes or not data_bag_raw:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Faltan plantilla o dataBag')
                return

            data_bag = json.loads(data_bag_raw.decode('utf-8'))
            cabecera = data_bag.get('cabecera', {})
            items = data_bag.get('items', [])
            puestos = data_bag.get('puestos', [])

            if len(puestos) > MAX_PUESTOS:
                print(
                    f'[mpp.render-xlsx] {len(puestos)} puestos recibidos, '
                    f'capando a {MAX_PUESTOS} (límite de la plantilla)'
                )

            wb = load_workbook(BytesIO(plantilla_bytes))
            ws = wb[SHEET_NAME]
            reemplazar_placeholders(ws, cabecera)
            columnas_puestos = escribir_encabezados_puestos(ws, puestos)
            escribir_filas_mpp(ws, items, columnas_puestos)

            # Fotos de los EPP: llegan como partes "imagen_<orden>". Si no
            # viene ninguna se dejan las de la plantilla, para que una
            # exportacion vieja siga saliendo igual.
            imagenes = {}
            for nombre, datos in parts.items():
                if nombre.startswith('imagen_') and datos:
                    try:
                        imagenes[int(nombre[len('imagen_'):])] = datos
                    except ValueError:
                        pass
            if imagenes:
                colocadas = colocar_imagenes(ws, imagenes, len(items))
                print(f'[mpp.render-xlsx] {colocadas} imagenes colocadas desde la base')

            output = BytesIO()
            wb.save(output)
            output_bytes = output.getvalue()

            self.send_response(200)
            self.send_header(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            self.send_header('Content-Length', str(len(output_bytes)))
            self.end_headers()
            self.wfile.write(output_bytes)

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e),
                'type': type(e).__name__
            }).encode('utf-8'))
