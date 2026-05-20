# Calendario de Danza — Guía de Implementación

## Estructura del proyecto

```
elianana-danza/
├── index.html        ← App principal (no tocar la URL de GAS hasta el paso 4)
├── Code.gs           ← Código para Google Apps Script
├── outfits/          ← Pon aquí las fotos de uniformes
│   └── LEEME.txt
└── peinados/         ← Pon aquí las fotos de peinados
    └── LEEME.txt
```

---

## PASO 1 — Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja nueva
2. Llámala como quieras (ej: *"Danza Calendar DB"*)
3. Copia el **ID** de la URL:
   ```
   https://docs.google.com/spreadsheets/d/ ►ESTE_ES_EL_ID◄ /edit
   ```

---

## PASO 2 — Crear el Apps Script

1. Ve a [script.google.com](https://script.google.com) → **Nuevo proyecto**
2. Borra todo el código que aparece por defecto
3. Pega el contenido completo del archivo `Code.gs`
4. Reemplaza la línea:
   ```js
   const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
   ```
   con el ID copiado en el Paso 1

---

## PASO 3 — Guardar la contraseña de forma segura

1. En el editor de Apps Script, selecciona la función `setAdminPassword` en el menú
2. Antes de ejecutarla, abre `Code.gs` y cambia:
   ```js
   PropertiesService.getScriptProperties().setProperty(PASSWORD_PROPERTY, 'TuContraseñaSegura2026');
   ```
   por la contraseña que quieras
3. Haz clic en **Ejecutar** (solo necesitas hacerlo una vez)
4. Autoriza los permisos cuando te lo pida

> ⚠️ La contraseña queda almacenada en el servidor de Google, nunca en el código visible del frontend.

---

## PASO 4 — Publicar como Web App

1. En el editor de Apps Script: **Implementar** → **Nueva implementación**
2. Tipo: **Aplicación web**
3. Configuración:
   - Ejecutar como: **Yo (tu cuenta de Google)**
   - Quién tiene acceso: **Cualquiera**
4. Clic en **Implementar** → Copia la **URL** que aparece

5. Abre `index.html` y reemplaza:
   ```js
   const GAS_URL = 'TU_APPS_SCRIPT_URL_AQUI';
   ```
   con la URL copiada

---

## PASO 5 — Agregar imágenes

- Copia las fotos de uniformes dentro de la carpeta `/outfits/`
- Copia las fotos de peinados dentro de la carpeta `/peinados/`
- Usa nombres de archivo simples y sin espacios:
  ```
  ✅  jean-negro.jpg
  ✅  vestido-rojo.png
  ❌  Jean Negro (foto).JPG
  ```

---

## PASO 6 — Abrir la app

Abre `index.html` en el navegador (o súbelo a tu hosting).

Para usar el panel de coordinadora:
1. Clic en **"Coordinadora"** (arriba a la derecha)
2. Ingresa la contraseña que configuraste
3. Ve a **Uniformes** → registra cada uniforme con su nombre y archivo
4. Ve a **Peinados** → registra cada peinado
5. Ve a **Programar** → asigna uniforme + peinado a cada fecha

---

## Flujo de uso diario

```
Coordinadora abre panel → selecciona fecha → elige uniforme → elige peinado → Publicar
                                                  ↓
                          Las alumnas abren el calendario y ven qué llevar ese día
```

---

## Notas técnicas

- Las hojas de Google Sheets se crean automáticamente la primera vez que se guarda un dato
- Si cambias la contraseña, vuelve a ejecutar `setAdminPassword()` en Apps Script
- Si actualizas `Code.gs`, debes crear una **nueva implementación** en Apps Script (no editar la existente)
- Los links de Pinterest/externas funcionan directamente como imagen de peinado
