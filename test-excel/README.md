# Test de Nivel de Excel

Plataforma web (HTML + JavaScript, sin servidor) para diagnosticar el nivel de Excel de un estudiante. Al final le da una **nota de 0 a 100**, le asigna un **nivel** (Inicial, Básico, Intermedio, Avanzado o Experto) y le genera una **ruta de aprendizaje personalizada**.

## Cómo funciona el test

| Parte | Qué evalúa | Cómo se corrige |
|---|---|---|
| 1. Conocimientos | 20 preguntas de opción múltiple (5 por nivel), con opción «No lo sé» | Automática |
| 2. Práctica en Excel | El estudiante descarga **un solo libro .xlsx** con datos únicos (según un código): **una hoja por ejercicio** (Ej01…Ej16: tabla de datos, pregunta y celda amarilla para la fórmula) y un **caso práctico** (hojas Ventas/Respuestas). Lo resuelve en Excel y lo sube. | Se lee el archivo en el navegador: se comparan los resultados que calculó Excel con los esperados y se comprueba que haya fórmulas (no números escritos a mano). En los ejercicios que se arrastran hacia abajo se detecta si faltan los `$`. En el caso práctico también se revisan formato condicional, gráficos, tablas dinámicas y matrices dinámicas. |

Si el estudiante no tiene Excel, puede resolver los 16 ejercicios **en el navegador** (escribiendo las fórmulas en español o inglés; se evalúan con HyperFormula). Si sube el archivo, tienen prioridad las respuestas del archivo.

### Nota y nivel

- Cada ítem vale más según su nivel (Básico 1 pt, Intermedio 2, Avanzado 3, Experto 4). La nota es el porcentaje de puntos obtenidos.
- El **nivel** es el más alto aprobado (≥ 60 %) de forma consecutiva desde Básico. Si casi aprueba el siguiente, se indica «avanzando hacia…».
- Cada pregunta pertenece a un **tema**. Los temas con < 80 % entran en la ruta de aprendizaje como «Reforzar» o «Por aprender», en orden de nivel y con horas estimadas.

Todo esto se ajusta en `js/config.js`.

## Personalizar

- `js/config.js`: nombre de la academia, correo, WhatsApp, umbrales, puntos y envío de resultados.
- `js/content.js`: preguntas, ejercicios de fórmulas (cada uno se convierte en una hoja del Excel), temas de la ruta (nombre, contenido y horas de cada módulo).
- `js/file-task.js`: generación del libro de práctica (datos por estudiante, diseño de cada hoja) y su corrección.

## Recibir los resultados de tus estudiantes

Sin configurar nada, el estudiante ve su resultado y puede guardarlo en PDF, copiarlo o enviártelo por correo/WhatsApp (si pones tus datos en `config.js`).

Para que **cada resultado llegue automáticamente a una hoja de Google Sheets**:

1. Crea una hoja nueva en Google Sheets → **Extensiones → Apps Script**.
2. Pega el contenido de `apps-script/Code.gs` y guarda.
3. **Implementar → Nueva implementación → Aplicación web**, ejecutar como «Yo», acceso «Cualquier usuario».
4. Copia la URL `.../exec` en `resultsEndpoint` dentro de `js/config.js`.

## Publicar en GitHub Pages

Publicado en **https://frankshirips.github.io/ProjectsDev/** desde la rama `gh-pages`.

El workflow `.github/workflows/deploy-pages.yml` copia la carpeta `test-excel/` a `gh-pages` cada vez que hay cambios en `main` o en la rama de desarrollo; GitHub Pages se actualiza en 1–2 minutos. También puedes lanzarlo a mano desde la pestaña **Actions**.

## Probar en tu computador

```bash
cd test-excel
python3 -m http.server 8000
# abre http://localhost:8000
```

## Notas

- El progreso se guarda en el navegador del estudiante; si recarga la página, continúa donde iba.
- Como todo corre en el navegador, un estudiante con conocimientos técnicos podría ver las respuestas en el código. Para un test diagnóstico (no una certificación) esto suele ser aceptable; la parte del archivo usa datos distintos por estudiante.
- Librerías usadas (desde CDN): HyperFormula (GPL v3), ExcelJS y JSZip (MIT).
