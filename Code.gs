// ================================================================
//  CALENDARIO DE DANZA - Google Apps Script Backend
//  Despliega como Web App: Ejecutar como "Yo" / Acceso "Cualquiera"
// ================================================================

const SPREADSHEET_ID = '1sSbIBTdOGtqH1fm4SG_X36gweZBrwIM9P4gEUVEBzWo';
const PASSWORD_PROPERTY = 'ADMIN_PASSWORD';

// ── Ejecuta esto UNA SOLA VEZ para guardar la contraseña de forma segura ──
function setAdminPassword() {
  PropertiesService.getScriptProperties().setProperty(PASSWORD_PROPERTY, 'danza2026');
  Logger.log('Contraseña guardada correctamente.');
}

function debugPassword() {
  const stored = PropertiesService.getScriptProperties().getProperty(PASSWORD_PROPERTY);
  Logger.log('Contraseña guardada: "' + stored + '" (longitud: ' + (stored ? stored.length : 0) + ')');
}

// ── Punto de entrada GET ──────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  let result;

  switch (action) {
    case 'getOutfits':    result = getOutfits(); break;
    case 'getHairstyles': result = getHairstyles(); break;
    case 'getCalendar':   result = getCalendar(e.parameter.month); break;
    case 'getPersonas':   result = getPersonas(); break;
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
    case 'login':           result = validatePassword(data.password); break;
    case 'addOutfit':       result = addOutfit(data); break;
    case 'addHairstyle':    result = addHairstyle(data); break;
    case 'saveDay':         result = saveDay(data); break;
    case 'deleteDay':       result = deleteDay(data.fecha); break;
    case 'deleteOutfit':    result = deleteOutfit(data.id); break;
    case 'deleteHairstyle': result = deleteHairstyle(data.id); break;
    case 'uploadImage':     result = uploadImageToDrive(data); break;
    case 'addPersona':      result = addPersona(data); break;
    case 'deletePersona':   result = deletePersona(data.id); break;
    case 'pruneOldDays':    result = pruneOldDays(); break;
    default:                result = { error: 'Acción desconocida' };
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
const CAL_HEADERS = ['fecha', 'uniforme_id', 'uniforme_nombre', 'uniforme_imagen', 'uniforme_recomendaciones', 'peinado_nombre', 'peinado_imagen', 'personas', 'director', 'director2'];
const CAL_KEYS    = ['fecha', 'uniforme_id', 'uniforme_nombre', 'uniforme_imagen', 'uniforme_recomendaciones', 'peinado_nombre', 'peinado_imagen', 'personas', 'director', 'director2'];

// Zona horaria de la hoja (ej. America/Bogota). Se usa para que una celda de
// tipo Fecha se lea SIEMPRE en el mismo día en que se guardó, sin importar la
// zona horaria del proyecto Apps Script. Cacheada para no reabrir la hoja.
let _tz = null;
function getTZ() {
  if (!_tz) _tz = SpreadsheetApp.openById(SPREADSHEET_ID).getSpreadsheetTimeZone();
  return _tz;
}

function normalizeFecha(v) {
  // Celda de tipo Fecha: formatear en la zona horaria de la hoja (evita el
  // desfase de un día que borraba la agenda antes de tiempo).
  if (v && typeof v.getFullYear === 'function') {
    return Utilities.formatDate(v, getTZ(), 'yyyy-MM-dd');
  }
  const s = String(v || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const d = new Date(s);
  if (d && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, getTZ(), 'yyyy-MM-dd');
  }
  return s;
}

// Limpia filas duplicadas del calendario, dejando solo la última de cada fecha
function dedupeCalendar() {
  const sheet = getSheet('calendario', CAL_HEADERS);
  const values = sheet.getDataRange().getValues();
  const seen = {};
  // Recorrer de abajo hacia arriba para mantener la última y borrar las anteriores
  for (let i = values.length - 1; i >= 1; i--) {
    const fecha = normalizeFecha(values[i][0]);
    if (seen[fecha]) {
      sheet.deleteRow(i + 1);
    } else {
      seen[fecha] = true;
    }
  }
  Logger.log('Fechas únicas: ' + Object.keys(seen).length);
  return { success: true, unique: Object.keys(seen).length };
}

function getCalendar(month) {
  const sheet = getSheet('calendario', CAL_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const result = {};
  rows.slice(1).forEach(row => {
    const fecha = normalizeFecha(row[0]);
    if (!month || fecha.startsWith(month)) {
      const obj = {};
      CAL_KEYS.forEach((k, i) => obj[k] = i === 0 ? fecha : row[i]);
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
    if (normalizeFecha(values[i][0]) === data.fecha) {
      sheet.getRange(i + 1, 1, 1, CAL_KEYS.length).setValues([newRow]);
      return { success: true };
    }
  }
  sheet.appendRow(newRow);
  return { success: true };
}

// ── Subida de imagen a Drive ──────────────────────────────────────────────
function uploadImageToDrive(data) {
  const folders = DriveApp.getFoldersByName('Danza-Imagenes');
  const folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder('Danza-Imagenes');
  const blob    = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, data.fileName);
  const file    = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { success: true, url: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000` };
}

// Migra URLs viejas de Drive (uc?export=view o lh3.googleusercontent.com) al formato thumbnail
function migrateDriveUrls() {
  const sheets = [
    { name: 'uniformes', col: 2 },  // columna 'imagen' (índice 2 en 0-based, columna 3 en 1-based)
    { name: 'peinados',  col: 2 },
    { name: 'calendario', col: 3 }, // columna 'uniforme_imagen'
  ];
  let total = 0;
  sheets.forEach(s => {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(s.name);
    if (!sheet) return;
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const url = String(values[i][s.col] || '');
      const m = url.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
      if (m && url !== `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`) {
        sheet.getRange(i + 1, s.col + 1).setValue(`https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`);
        total++;
      }
    }
  });
  Logger.log('URLs migradas: ' + total);
  return { success: true, migrated: total };
}

// ── Eliminar de biblioteca ────────────────────────────────────────────────
function deleteOutfit(id) {
  const sheet  = getSheet('uniformes', ['id','nombre','imagen','recomendaciones']);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false };
}

function deleteHairstyle(id) {
  const sheet  = getSheet('peinados', ['id','nombre','imagen']);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false };
}

function deleteDay(fecha) {
  const sheet = getSheet('calendario', CAL_HEADERS);
  const values = sheet.getDataRange().getValues();
  const tried = [];
  for (let i = 1; i < values.length; i++) {
    const raw = values[i][0];
    const norm = normalizeFecha(raw);
    tried.push({ raw: String(raw), norm: norm, match: norm === fecha });
    if (norm === fecha) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Fecha no encontrada', buscada: fecha, filas: tried };
}

// ── Personas ──────────────────────────────────────────────────────────────
// Ejecuta UNA VEZ desde el editor para cargar la lista inicial del grupo
function seedPersonas() {
  const nombres = [
    'Salomé Caballero',
    'Salomé Gamez',
    'Fernanda',
    'Jireth',
    'Danna Sarai',
    'Eliana',
    'Katty',
    'Georgeth',
    'Sirley',
    'Ana Conrado',
  ];
  const sheet = getSheet('personas', ['id','nombre']);
  const existing = sheet.getDataRange().getValues().slice(1).map(r => r[1]);
  let added = 0;
  nombres.forEach(n => {
    if (!existing.includes(n)) {
      sheet.appendRow([Date.now().toString() + Math.floor(Math.random()*1000), n]);
      added++;
      Utilities.sleep(5);
    }
  });
  Logger.log('Personas agregadas: ' + added);
}

function getPersonas() {
  const sheet = getSheet('personas', ['id', 'nombre']);
  return sheetToObjects(sheet, ['id', 'nombre']);
}

function addPersona(data) {
  const sheet = getSheet('personas', ['id', 'nombre']);
  const id = Date.now().toString();
  sheet.appendRow([id, data.nombre]);
  return { success: true, id };
}

function deletePersona(id) {
  const sheet  = getSheet('personas', ['id', 'nombre']);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { success: true }; }
  }
  return { success: false };
}

// ── Limpiar días pasados ──────────────────────────────────────────────────
function pruneOldDays() {
  const sheet = getSheet('calendario', CAL_HEADERS);
  const values = sheet.getDataRange().getValues();
  // "Hoy" en la zona horaria de la hoja. Solo se borra lo ESTRICTAMENTE
  // anterior a hoy (fecha < hoy), así el día actual se mantiene hasta que pase.
  const todayStr = Utilities.formatDate(new Date(), getTZ(), 'yyyy-MM-dd');
  let removed = 0;
  for (let i = values.length - 1; i >= 1; i--) {
    const fecha = normalizeFecha(values[i][0]);
    if (fecha && fecha < todayStr) { sheet.deleteRow(i + 1); removed++; }
  }
  return { success: true, removed };
}
