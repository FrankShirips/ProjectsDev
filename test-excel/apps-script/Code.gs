/**
 * Recibe los resultados del test y los guarda en esta hoja de Google Sheets.
 *
 * Instalación (5 minutos):
 *  1. Crea una hoja de cálculo nueva en Google Sheets.
 *  2. Menú Extensiones → Apps Script. Borra el contenido y pega este archivo.
 *  3. Implementar → Nueva implementación → Tipo: Aplicación web.
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *  4. Copia la URL que termina en /exec y pégala en js/config.js → resultsEndpoint.
 */
const COLUMNS = [
  "fecha", "nombre", "correo", "telefono", "objetivo", "autoevaluacion", "version",
  "nota", "nivel", "basico", "intermedio", "avanzado", "experto",
  "teoria", "formulas", "archivo", "ruta", "horas", "minutos", "codigoArchivo", "detalle",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS);
      sheet.setFrozenRows(1);
    }
    const data = JSON.parse(e.postData.contents);
    sheet.appendRow(COLUMNS.map((c) => (data[c] === undefined ? "" : data[c])));
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("El receptor de resultados está activo.");
}
