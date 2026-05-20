// ================================================================
//  CALENDARIO DE DANZA - Google Apps Script Backend
//  Despliega como Web App: Ejecutar como "Yo" / Acceso "Cualquiera"
// ================================================================

const SPREADSHEET_ID = '1sSbIBTdOGtqH1fm4SG_X36gweZBrwIM9P4gEUVEBzWo';
const PASSWORD_PROPERTY = 'ADMIN_PASSWORD';

// ── Ejecuta esto UNA SOLA VEZ para guardar la contraseña de forma segura ──
function setAdminPassword() {
  PropertiesService.getScriptProperties().setProperty(PASSWORD_PROPERTY, 'TuContraseñaSegura2026');
  Logger.log('Contraseña guardada correctamente.');
}

// ── Punto de entrada GET ──────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  let result;

  switch (action) {
    case 'getOutfits':    result = getOutfits(); break;
    case 'getHairstyles': result = getHairstyles(); break;
    case 'getCalendar':   result = getCalendar(e.parameter.month); break;
    default:              result = { error: 'Acción desconocida' };
  }

  return buildResponse(result);
}

// ── Punto de entrada POST ─────────────────────────────────────────────────
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  switch (action) {
    case 'login':         result = validatePassword(data.password); break;
    case 'addOutfit':     result = addOutfit(data); break;
    case 'addHairstyle':  result = addHairstyle(data); break;
    case 'saveDay':       result = saveDay(data); break;
    case 'deleteDay':     result = deleteDay(data.fecha); break;
    default:              result = { error: 'Acción desconocida' };
  }

  return buildResponse(result);
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Auth ──────────────────────────────────────────────────────────────────
function validatePassword(password) {
  const stored = PropertiesService.getScriptProperties().getProperty(PASSWORD_PROPERTY);
  return { success: password === stored };
}

// ── Helpers de Sheets ─────────────────────────────────────────────────────
function getSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function sheetToObjects(sheet, keys) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).map(row => {
    const obj = {};
    keys.forEach((k, i) => obj[k] = row[i]);
    return obj;
  });
}

// ── Uniformes ─────────────────────────────────────────────────────────────
function getOutfits() {
  const sheet = getSheet('uniformes', ['id', 'nombre', 'imagen', 'recomendaciones']);
  return sheetToObjects(sheet, ['id', 'nombre', 'imagen', 'recomendaciones']);
}

function addOutfit(data) {
  const sheet = getSheet('uniformes', ['id', 'nombre', 'imagen', 'recomendaciones']);
  const id = Date.now().toString();
  sheet.appendRow([id, data.nombre, data.imagen, data.recomendaciones || '']);
  return { success: true, id };
}

// ── Peinados ──────────────────────────────────────────────────────────────
function getHairstyles() {
  const sheet = getSheet('peinados', ['id', 'nombre', 'imagen']);
  return sheetToObjects(sheet, ['id', 'nombre', 'imagen']);
}

function addHairstyle(data) {
  const sheet = getSheet('peinados', ['id', 'nombre', 'imagen']);
  const id = Date.now().toString();
  sheet.appendRow([id, data.nombre, data.imagen]);
  return { success: true, id };
}

// ── Calendario ────────────────────────────────────────────────────────────
const CAL_HEADERS = ['fecha', 'uniforme_id', 'uniforme_nombre', 'uniforme_imagen', 'uniforme_recomendaciones', 'peinado_nombre', 'peinado_imagen'];
const CAL_KEYS    = ['fecha', 'uniforme_id', 'uniforme_nombre', 'uniforme_imagen', 'uniforme_recomendaciones', 'peinado_nombre', 'peinado_imagen'];

function getCalendar(month) {
  const sheet = getSheet('calendario', CAL_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const result = {};
  rows.slice(1).forEach(row => {
    const fecha = row[0];
    if (!month || String(fecha).startsWith(month)) {
      const obj = {};
      CAL_KEYS.forEach((k, i) => obj[k] = row[i]);
      result[fecha] = obj;
    }
  });
  return result;
}

function saveDay(data) {
  const sheet = getSheet('calendario', CAL_HEADERS);
  const values = sheet.getDataRange().getValues();
  const newRow = CAL_KEYS.map(k => data[k] || '');

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.fecha) {
      sheet.getRange(i + 1, 1, 1, CAL_KEYS.length).setValues([newRow]);
      return { success: true };
    }
  }
  sheet.appendRow(newRow);
  return { success: true };
}

function deleteDay(fecha) {
  const sheet = getSheet('calendario', CAL_HEADERS);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === fecha) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Fecha no encontrada' };
}
