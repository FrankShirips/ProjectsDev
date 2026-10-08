/*
 * Banco de contenido del test: niveles, temas (ruta de aprendizaje),
 * preguntas teóricas y ejercicios de fórmulas.
 *
 * Cada ítem tiene `level` (1-4) y `topic` (id de TOPICS). Con eso se calcula
 * la nota, el nivel y la ruta personalizada.
 */
(function () {
  const LEVELS = [
    { id: 1, name: "Básico", short: "B", desc: "Maneja la interfaz, fórmulas sencillas y funciones esenciales." },
    { id: 2, name: "Intermedio", short: "I", desc: "Usa referencias absolutas, funciones lógicas, condicionales y de búsqueda." },
    { id: 3, name: "Avanzado", short: "A", desc: "Analiza datos con tablas dinámicas, fechas, criterios múltiples y fórmulas combinadas." },
    { id: 4, name: "Experto", short: "E", desc: "Domina matrices dinámicas, automatización y modelos de datos." },
  ];

  // Temas = módulos posibles de la ruta de aprendizaje (ordenados por nivel).
  const TOPICS = [
    { id: "fundamentos", level: 1, name: "Fundamentos de Excel", hours: 4,
      content: "Interfaz, libros y hojas, tipos de datos, formato de celdas, atajos esenciales, impresión." },
    { id: "basicas", level: 1, name: "Fórmulas y funciones básicas", hours: 4,
      content: "Operadores, jerarquía de operaciones, SUMA, PROMEDIO, MAX, MIN, CONTAR, CONTARA, REDONDEAR." },
    { id: "referencias", level: 2, name: "Referencias relativas, absolutas y mixtas", hours: 2,
      content: "Uso de $, copiar fórmulas, celdas de parámetros, nombres de rango." },
    { id: "logicas", level: 2, name: "Funciones lógicas", hours: 3,
      content: "SI, SI anidado, Y, O, SI.CONJUNTO, SI.ERROR." },
    { id: "condicionales", level: 2, name: "Resumen con criterios", hours: 3,
      content: "CONTAR.SI, SUMAR.SI, CONTAR.SI.CONJUNTO, SUMAR.SI.CONJUNTO, PROMEDIO.SI, comodines." },
    { id: "busqueda", level: 2, name: "Funciones de búsqueda", hours: 4,
      content: "BUSCARV, BUSCARX, INDICE + COINCIDIR, búsqueda aproximada vs. exacta." },
    { id: "datos", level: 2, name: "Gestión de datos", hours: 3,
      content: "Ordenar, filtrar, tablas (Ctrl+T), validación de datos, formato condicional, quitar duplicados." },
    { id: "texto-fechas", level: 3, name: "Texto y fechas", hours: 3,
      content: "IZQUIERDA, EXTRAE, CONCAT/&, NOMPROPIO, TEXTO, FECHA, MES, AÑO, DIAS.LAB, FIN.MES." },
    { id: "dinamicas", level: 3, name: "Tablas dinámicas y gráficos", hours: 5,
      content: "Tablas y gráficos dinámicos, segmentaciones, campos calculados, dashboards." },
    { id: "matriciales", level: 4, name: "Matrices dinámicas y fórmulas avanzadas", hours: 5,
      content: "SUMAPRODUCTO, FILTRAR, UNICOS, ORDENAR, LET, LAMBDA, búsquedas con varios criterios." },
    { id: "automatizacion", level: 4, name: "Power Query, Power Pivot y macros", hours: 8,
      content: "Importar y transformar datos con Power Query, modelo de datos, DAX básico, grabadora de macros y VBA." },
  ];

  // ---------------------------------------------------------------------------
  // Parte 1: preguntas teóricas (opción múltiple). `answer` = índice correcto.
  // ---------------------------------------------------------------------------
  const QUESTIONS = [
    // Nivel 1
    { id: "q1", level: 1, topic: "fundamentos",
      text: "¿Con qué carácter debe empezar una fórmula en Excel?",
      options: ["#", "=", "@", "&"], answer: 1 },
    { id: "q2", level: 1, topic: "basicas",
      text: "¿Qué resultado devuelve =2+3*4?",
      options: ["20", "14", "24", "9"], answer: 1 },
    { id: "q3", level: 1, topic: "fundamentos",
      text: "La celda C5 se encuentra en…",
      options: ["La columna 5, fila C", "La columna C, fila 5", "La hoja 5, columna C", "La fila 3, columna 5"], answer: 1 },
    { id: "q4", level: 1, topic: "basicas",
      text: "¿Qué función cuenta las celdas que contienen cualquier valor (números o texto) en un rango?",
      options: ["CONTAR", "CONTARA", "CONTAR.BLANCO", "SUMA"], answer: 1 },
    { id: "q5", level: 1, topic: "fundamentos",
      text: "Una celda muestra ##### . ¿Qué suele significar?",
      options: ["La fórmula tiene un error", "La columna es demasiado angosta para mostrar el valor", "La celda está protegida", "El archivo está dañado"], answer: 1 },

    // Nivel 2
    { id: "q6", level: 2, topic: "referencias",
      text: "Copias la fórmula =A1*$B$1 de C1 a C2. ¿Cuál es la fórmula resultante en C2?",
      options: ["=A1*$B$1", "=A2*$B$2", "=A2*$B$1", "=A2*B2"], answer: 2 },
    { id: "q7", level: 2, topic: "busqueda",
      text: "En BUSCARV(valor; tabla; 3; FALSO), ¿qué indica FALSO?",
      options: ["Que busque de derecha a izquierda", "Que la coincidencia debe ser exacta", "Que ignore mayúsculas", "Que devuelva FALSO si no encuentra"], answer: 1 },
    { id: "q8", level: 2, topic: "logicas",
      text: "¿Qué devuelve =SI(Y(5>3; 2>4); \"Sí\"; \"No\")?",
      options: ["Sí", "No", "#¡VALOR!", "FALSO"], answer: 1 },
    { id: "q9", level: 2, topic: "datos",
      text: "¿Qué herramienta usarías para que una celda solo acepte valores de una lista desplegable?",
      options: ["Formato condicional", "Validación de datos", "Filtro avanzado", "Proteger hoja"], answer: 1 },
    { id: "q10", level: 2, topic: "condicionales",
      text: "¿Qué fórmula suma la columna C solo cuando la columna A dice \"Norte\"?",
      options: ["=SUMA(A:A;\"Norte\";C:C)", "=SUMAR.SI(A:A;\"Norte\";C:C)", "=CONTAR.SI(A:A;\"Norte\")", "=SI(A:A=\"Norte\";SUMA(C:C))"], answer: 1 },

    // Nivel 3
    { id: "q11", level: 3, topic: "dinamicas",
      text: "Agregaste filas nuevas a los datos de origen de una tabla dinámica. ¿Qué debes hacer para verlas?",
      options: ["Nada, se actualiza sola siempre", "Actualizar la tabla dinámica (y ampliar el origen si no es una Tabla)", "Volver a crear la tabla dinámica desde cero", "Guardar y cerrar el archivo"], answer: 1 },
    { id: "q12", level: 3, topic: "texto-fechas",
      text: "Excel guarda internamente las fechas como…",
      options: ["Texto con formato dd/mm/aaaa", "Números de serie (días desde 1900)", "Objetos de fecha especiales no numéricos", "Fracciones de año"], answer: 1 },
    { id: "q13", level: 3, topic: "busqueda",
      text: "¿Cuál es una ventaja de INDICE + COINCIDIR (o BUSCARX) frente a BUSCARV?",
      options: ["Es más corta de escribir", "Puede devolver valores de columnas a la izquierda de la columna buscada", "No necesita rangos", "Funciona solo con números"], answer: 1 },
    { id: "q14", level: 3, topic: "dinamicas",
      text: "En una tabla dinámica, ¿dónde colocas un campo para obtener una columna por cada región?",
      options: ["Filtros", "Filas", "Columnas", "Valores"], answer: 2 },
    { id: "q15", level: 3, topic: "texto-fechas",
      text: "¿Qué devuelve =EXTRAE(\"FAC-2026-0045\"; 5; 4)?",
      options: ["FAC-", "2026", "0045", "-202"], answer: 1 },

    // Nivel 4
    { id: "q16", level: 4, topic: "automatizacion",
      text: "Recibes cada mes 12 archivos CSV con la misma estructura y debes unirlos y limpiarlos. ¿Qué herramienta es la más adecuada?",
      options: ["Copiar y pegar en una hoja", "Power Query (Obtener datos desde carpeta)", "Una tabla dinámica", "Formato condicional"], answer: 1 },
    { id: "q17", level: 4, topic: "matriciales",
      text: "En Excel 365, la fórmula =UNICOS(A2:A100) escrita en una sola celda…",
      options: ["Devuelve solo el primer valor único", "Derrama (spill) la lista de valores únicos en las celdas de abajo", "Da error si no se confirma con Ctrl+Shift+Enter", "Elimina los duplicados de A2:A100"], answer: 1 },
    { id: "q18", level: 4, topic: "automatizacion",
      text: "¿En qué formato debes guardar un libro que contiene macros VBA?",
      options: [".xlsx", ".xlsm", ".csv", ".xltx"], answer: 1 },
    { id: "q19", level: 4, topic: "matriciales",
      text: "¿Para qué sirve la función LET?",
      options: ["Para bloquear celdas", "Para asignar nombres a cálculos intermedios dentro de una fórmula", "Para crear listas desplegables", "Para unir textos"], answer: 1 },
    { id: "q20", level: 4, topic: "automatizacion",
      text: "En Power Pivot, ¿qué permite relacionar una tabla de Ventas con una de Productos sin usar BUSCARV?",
      options: ["Una macro", "Una relación en el modelo de datos", "Un gráfico dinámico", "La validación de datos"], answer: 1 },
  ];

  // ---------------------------------------------------------------------------
  // Parte 2: ejercicios de fórmulas sobre una hoja de datos.
  // ---------------------------------------------------------------------------
  const d = (y, m, dd) => (Date.UTC(y, m - 1, dd) - Date.UTC(1899, 11, 30)) / 86400000;

  // Hoja "Datos" (fila 1 = encabezados). Las fechas se guardan como número de serie.
  const SHEET = {
    columns: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
    // Formatos de visualización por columna o por celda.
    format: { A: "date", F: "money", N2: "percent" },
    rows: [
      ["Fecha", "Vendedor", "Región", "Código", "Cantidad", "Precio", "", "", "Código", "Producto", "Categoría", "", "Parámetro", "Valor"],
      [d(2026, 1, 5), "Ana", "Norte", "P01", 10, 25, "", "", "P01", "Cable HDMI", "Accesorios", "", "Impuesto", 0.16],
      [d(2026, 1, 12), "Luis", "Sur", "P02", 5, 40, "", "", "P02", "Mouse", "Accesorios", "", "Meta unidades", 100],
      [d(2026, 1, 20), "María", "Centro", "P03", 8, 15, "", "", "P03", "Libreta", "Papelería", "", "", ""],
      [d(2026, 2, 3), "Ana", "Sur", "P04", 12, 30, "", "", "P04", "Audífonos", "Audio", "", "", ""],
      [d(2026, 2, 14), "Carlos", "Norte", "P02", 7, 40, "", "", "P05", "Monitor", "Pantallas", "", "", ""],
      [d(2026, 2, 21), "Luis", "Centro", "P05", 3, 120, "", "", "", "", "", "", "", ""],
      [d(2026, 3, 2), "María", "Norte", "P01", 15, 25, "", "", "", "", "", "", "", ""],
      [d(2026, 3, 9), "Carlos", "Sur", "P03", 20, 15, "", "", "", "", "", "", "", ""],
      [d(2026, 3, 18), "Ana", "Centro", "P05", 2, 120, "", "", "", "", "", "", "", ""],
      [d(2026, 3, 25), "Luis", "Norte", "P04", 9, 30, "", "", "", "", "", "", "", ""],
      [d(2026, 4, 4), "María", "Sur", "P02", 6, 40, "", "", "", "", "", "", "", ""],
      [d(2026, 4, 15), "Carlos", "Centro", "P01", 11, 25, "", "", "", "", "", "", "", ""],
    ],
  };

  /*
   * Cada tarea:
   *  - cell: celda donde el estudiante "escribe" la fórmula.
   *  - fillTo: si existe, la fórmula se copia hacia abajo hasta esa fila
   *    (se evalúan referencias relativas/absolutas, como al arrastrar en Excel).
   *  - ref: fórmula de referencia (en inglés, separador ",") para calcular la respuesta.
   *  - solution: solución sugerida en español para el informe.
   *  - display: formato del resultado ("date", "money", "percent").
   */
  const FORMULA_TASKS = [
    // Nivel 1
    { id: "f1", level: 1, topic: "basicas", cell: "P2",
      text: "Calcula el <b>total de unidades vendidas</b> (columna Cantidad).",
      ref: "=SUM(E2:E13)", solution: "=SUMA(E2:E13)" },
    { id: "f2", level: 1, topic: "basicas", cell: "P2",
      text: "Calcula el <b>precio promedio</b> de las ventas (columna Precio).",
      ref: "=AVERAGE(F2:F13)", solution: "=PROMEDIO(F2:F13)", display: "money" },
    { id: "f3", level: 1, topic: "basicas", cell: "G2", fillTo: 13,
      text: "En <b>G2</b> escribe la fórmula del <b>importe</b> de la venta (Cantidad × Precio). Tu fórmula se copiará automáticamente hasta G13.",
      ref: "=E2*F2", solution: "=E2*F2", display: "money" },
    { id: "f4", level: 1, topic: "basicas", cell: "P2",
      text: "¿Cuál fue la <b>cantidad más alta</b> vendida en una sola venta?",
      ref: "=MAX(E2:E13)", solution: "=MAX(E2:E13)" },

    // Nivel 2
    { id: "f5", level: 2, topic: "referencias", cell: "G2", fillTo: 13,
      text: "En <b>G2</b> calcula el <b>importe con impuesto</b>: Cantidad × Precio × (1 + Impuesto). El impuesto está en la celda <b>N2</b>. La fórmula se copiará hasta G13, así que debe seguir funcionando en todas las filas.",
      ref: "=E2*F2*(1+$N$2)", solution: "=E2*F2*(1+$N$2)", display: "money" },
    { id: "f6", level: 2, topic: "condicionales", cell: "P2",
      text: "¿Cuántas <b>unidades vendió Ana</b> en total?",
      ref: "=SUMIF(B2:B13,\"Ana\",E2:E13)", solution: "=SUMAR.SI(B2:B13;\"Ana\";E2:E13)" },
    { id: "f7", level: 2, topic: "logicas", cell: "G2", fillTo: 13,
      text: "En <b>G2</b> muestra <b>\"Alta\"</b> si la Cantidad es 10 o más, y <b>\"Baja\"</b> en caso contrario. Se copiará hasta G13.",
      ref: "=IF(E2>=10,\"Alta\",\"Baja\")", solution: "=SI(E2>=10;\"Alta\";\"Baja\")" },
    { id: "f8", level: 2, topic: "busqueda", cell: "G2", fillTo: 13,
      text: "En <b>G2</b> trae el <b>nombre del producto</b> según el Código de la columna D, usando la tabla de productos (I1:K6). Se copiará hasta G13.",
      ref: "=VLOOKUP(D2,$I$2:$K$6,2,FALSE)", solution: "=BUSCARV(D2;$I$2:$K$6;2;FALSO)  ó  =BUSCARX(D2;$I$2:$I$6;$J$2:$J$6)" },
    { id: "f9", level: 2, topic: "condicionales", cell: "P2",
      text: "¿Cuántas ventas de la región <b>Norte</b> tuvieron una Cantidad de <b>10 o más</b>?",
      ref: "=COUNTIFS(C2:C13,\"Norte\",E2:E13,\">=10\")", solution: "=CONTAR.SI.CONJUNTO(C2:C13;\"Norte\";E2:E13;\">=10\")" },

    // Nivel 3
    { id: "f10", level: 3, topic: "texto-fechas", cell: "P2",
      text: "¿Cuántas <b>unidades se vendieron en febrero de 2026</b>? (usa las fechas de la columna A)",
      ref: "=SUMIFS(E2:E13,A2:A13,\">=\"&DATE(2026,2,1),A2:A13,\"<\"&DATE(2026,3,1))",
      solution: "=SUMAR.SI.CONJUNTO(E2:E13;A2:A13;\">=\"&FECHA(2026;2;1);A2:A13;\"<\"&FECHA(2026;3;1))" },
    { id: "f11", level: 3, topic: "texto-fechas", cell: "G2", fillTo: 13,
      text: "En <b>G2</b> crea un código con el <b>vendedor en MAYÚSCULAS</b>, un guion y la <b>primera letra de la región</b>. Ejemplo para la fila 2: <code>ANA-N</code>. Se copiará hasta G13.",
      ref: "=UPPER(B2)&\"-\"&LEFT(C2,1)", solution: "=MAYUSC(B2)&\"-\"&IZQUIERDA(C2;1)" },
    { id: "f12", level: 3, topic: "busqueda", cell: "P2",
      text: "¿Cuál es la <b>fecha de la última venta de María</b>?",
      ref: "=MAXIFS(A2:A13,B2:B13,\"María\")", solution: "=MAX.SI.CONJUNTO(A2:A13;B2:B13;\"María\")", display: "date" },
    { id: "f13", level: 3, topic: "matriciales", cell: "P2",
      text: "Calcula el <b>ingreso total</b> (suma de Cantidad × Precio de todas las ventas) en una sola celda, <b>sin usar columnas auxiliares</b>.",
      ref: "=SUMPRODUCT(E2:E13,F2:F13)", solution: "=SUMAPRODUCTO(E2:E13;F2:F13)", display: "money" },

    // Nivel 4
    { id: "f14", level: 4, topic: "matriciales", cell: "P2",
      text: "¿Cuántos <b>vendedores distintos</b> hay en la tabla? Calcúlalo con una fórmula.",
      ref: "=COUNTA(UNIQUE(B2:B13))", solution: "=CONTARA(UNICOS(B2:B13))" },
    { id: "f15", level: 4, topic: "matriciales", cell: "P2",
      text: "Calcula el <b>ingreso</b> (Cantidad × Precio) de la región <b>Sur</b> en el mes de <b>marzo</b>, en una sola fórmula.",
      ref: "=SUMPRODUCT((C2:C13=\"Sur\")*(MONTH(A2:A13)=3)*E2:E13*F2:F13)",
      solution: "=SUMAPRODUCTO((C2:C13=\"Sur\")*(MES(A2:A13)=3)*E2:E13*F2:F13)", display: "money" },
    { id: "f16", level: 4, topic: "matriciales", cell: "P2",
      text: "¿Cuántas <b>unidades</b> se vendieron de productos de la categoría <b>Accesorios</b>? La categoría está en la tabla de productos, no en la de ventas.",
      ref: "=SUMPRODUCT(SUMIF(D2:D13,FILTER(I2:I6,K2:K6=\"Accesorios\"),E2:E13))",
      solution: "=SUMAPRODUCTO(SUMAR.SI(D2:D13;FILTRAR(I2:I6;K2:K6=\"Accesorios\");E2:E13))  ó  =SUMA(E2:E13*(INDICE(K2:K6;COINCIDIR(D2:D13;I2:I6;0))=\"Accesorios\"))" },
  ];

  window.CONTENT = { LEVELS, TOPICS, QUESTIONS, SHEET, FORMULA_TASKS };
})();
