/*
 * Parte 2: práctica en Excel con un solo archivo.
 *  - generate(): crea un .xlsx con una hoja por ejercicio (Ej01…Ej16) y un caso
 *    práctico (Ventas / Respuestas), con datos únicos según un código.
 *  - grade(): lee el .xlsx que sube el estudiante y lo corrige automáticamente.
 *
 * El código se guarda dentro del archivo, así que las respuestas esperadas se
 * recalculan a partir de él al corregir.
 */
(function () {
  const VENDEDORES = ["Ana", "Luis", "María", "Carlos", "Sofía", "Jorge"];
  const REGIONES = ["Norte", "Sur", "Centro", "Oriente"];
  const PRODUCTOS = [
    ["Laptop", 850], ["Monitor", 220], ["Impresora", 180],
    ["Teclado", 35], ["Mouse", 20], ["Audífonos", 60],
  ];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio"];
  const N_ROWS = 40;
  const FIRST = 2, LAST = FIRST + N_ROWS - 1; // filas de datos en la hoja Ventas

  // --- Generador pseudoaleatorio reproducible ------------------------------
  function hashCode(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function newCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  const serial = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;

  // --- Datos y respuestas esperadas a partir del código -------------------
  function buildCase(code) {
    const rnd = mulberry32(hashCode(String(code).toUpperCase()));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const rows = [];
    for (let i = 0; i < N_ROWS; i++) {
      const month = 1 + Math.floor(rnd() * 6);
      const day = 1 + Math.floor(rnd() * 28);
      const [prod, base] = pick(PRODUCTOS);
      const price = Math.round(base * (0.9 + rnd() * 0.2));
      const qty = 1 + Math.floor(rnd() * (base > 500 ? 5 : 20));
      rows.push({ fecha: serial(2026, month, day), month, vendedor: pick(VENDEDORES), region: pick(REGIONES), producto: prod, cantidad: qty, precio: price });
    }
    rows.sort((a, b) => a.fecha - b.fecha);
    rows.forEach((r) => (r.importe = r.cantidad * r.precio));

    const threshold = 1000;
    const askVendor = pick(VENDEDORES);
    const askMonth = 1 + Math.floor(rnd() * 6);

    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    const byProduct = {};
    rows.forEach((r) => (byProduct[r.producto] = (byProduct[r.producto] || 0) + r.cantidad));
    const maxQty = Math.max(...Object.values(byProduct));
    const topProducts = Object.keys(byProduct).filter((p) => byProduct[p] === maxQty);

    return {
      code, rows, threshold, askVendor, askMonth,
      expected: {
        totalUnits: sum(rows.map((r) => r.cantidad)),
        totalAmount: sum(rows.map((r) => r.importe)),
        count: rows.length,
        byRegion: REGIONES.map((reg) => sum(rows.filter((r) => r.region === reg).map((r) => r.cantidad))),
        vendorMonth: rows.filter((r) => r.vendedor === askVendor && r.month === askMonth).length,
        topProducts,
        uniqueVendors: [...new Set(rows.map((r) => r.vendedor))].sort((a, b) => a.localeCompare(b, "es")),
      },
    };
  }

  // --- Datos de los ejercicios (misma estructura que CONTENT.SHEET) --------
  // Cantidades, precios, días e impuesto cambian según el código; vendedores,
  // regiones, códigos y meses se mantienen para que todas las preguntas tengan sentido.
  const sheetCache = {};
  function exerciseSheet(code) {
    const key = String(code || "").toUpperCase();
    if (sheetCache[key]) return sheetCache[key];
    const base = window.CONTENT.SHEET;
    if (!key) return base;
    const rnd = mulberry32(hashCode(key + "-ejercicios"));
    const prices = {};
    base.rows.slice(1, 6).forEach((r) => {
      if (r[8]) prices[r[8]] = Math.max(5, Math.round((({ P01: 25, P02: 40, P03: 15, P04: 30, P05: 120 })[r[8]] || 30) * (0.8 + rnd() * 0.4)));
    });
    const taxes = [0.12, 0.15, 0.16, 0.18, 0.19];
    // Días aleatorios, ordenados dentro de cada mes para que la tabla siga cronológica.
    const monthOf = (v) => new Date(Date.UTC(1899, 11, 30) + v * 86400000).getUTCMonth() + 1;
    const days = {};
    base.rows.slice(1).forEach((r) => (days[monthOf(r[0])] = days[monthOf(r[0])] || []).push(1 + Math.floor(rnd() * 28)));
    Object.values(days).forEach((list) => list.sort((x, y) => x - y));
    const rows = base.rows.map((r, i) => {
      const row = r.slice();
      if (i === 0) return row;
      const m = monthOf(r[0]);
      row[0] = serial(2026, m, days[m].shift());
      row[4] = 1 + Math.floor(rnd() * 20);
      row[5] = prices[r[3]];
      if (i === 1) row[13] = taxes[Math.floor(rnd() * taxes.length)];
      return row;
    });
    // Las fechas siguen en orden dentro de cada mes.
    return (sheetCache[key] = { ...base, rows });
  }

  const EX_ANSWER = "D20"; // celda de respuesta en las hojas de una sola respuesta
  const exName = (i) => "Ej" + String(i + 1).padStart(2, "0");
  const plain = (html) => html.replace(/<[^>]+>/g, "");
  function excelText(t) {
    let txt = plain(t.text).replace(/\s*(Tu fórmula|La fórmula)?\s*[Ss]e copiará[^.]*\./g, "").trim();
    if (t.fillTo) txt += ` Escribe la fórmula en ${t.cell} y cópiala (arrástrala) hasta ${t.cell.replace(/\d+/, t.fillTo)}: las celdas amarillas.`;
    else txt += ` Escribe tu fórmula en la celda amarilla ${EX_ANSWER}.`;
    return txt;
  }

  // Elementos que se revisan en el archivo (nivel y tema para la nota).
  const CHECK_DEFS = [
    { id: "x-importe", level: 1, topic: "basicas", label: "Columna Importe (Cantidad × Precio)" },
    { id: "x-unidades", level: 1, topic: "basicas", label: "Total de unidades" },
    { id: "x-total", level: 1, topic: "basicas", label: "Importe total" },
    { id: "x-conteo", level: 1, topic: "basicas", label: "Número de ventas" },
    { id: "x-clasif", level: 2, topic: "logicas", label: "Columna Clasificación con SI" },
    { id: "x-region", level: 2, topic: "condicionales", label: "Unidades por región (SUMAR.SI)" },
    { id: "x-formatocond", level: 2, topic: "datos", label: "Formato condicional en Ventas" },
    { id: "x-grafico", level: 2, topic: "dinamicas", label: "Gráfico insertado" },
    { id: "x-vendmes", level: 3, topic: "texto-fechas", label: "Ventas de un vendedor en un mes (criterios con fechas)" },
    { id: "x-top", level: 3, topic: "dinamicas", label: "Producto con más unidades" },
    { id: "x-dinamica", level: 3, topic: "dinamicas", label: "Tabla dinámica creada" },
    { id: "x-unicos", level: 4, topic: "matriciales", label: "Lista única ordenada con matrices dinámicas" },
  ];

  // Celdas de respuesta en la hoja "Respuestas".
  const ANSWERS = {
    totalUnits: "C4", totalAmount: "C5", count: "C6",
    byRegion: ["C9", "C10", "C11", "C12"],
    vendorMonth: "C15", topProduct: "C18", uniqueList: "C21",
  };

  // --- Generación del archivo con ExcelJS ---------------------------------
  async function generate(code, studentName) {
    const c = buildCase(code);
    const wb = new ExcelJS.Workbook();
    wb.creator = (window.APP_CONFIG && APP_CONFIG.academyName) || "Test Excel";
    const yellow = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2B3" } };
    const head = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6F43" } };
    const headFont = { bold: true, color: { argb: "FFFFFFFF" } };

    // Instrucciones
    const ins = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: "FF1F6F43" } } });
    ins.getColumn(1).width = 4; ins.getColumn(2).width = 110;
    const lines = [
      ["Práctica de Excel — código " + code, { bold: true, size: 16 }],
      ["Estudiante: " + (studentName || ""), { italic: true }],
      [""],
      ["Trabaja SOLO en este archivo y súbelo de nuevo a la plataforma en formato .xlsx.", { bold: true }],
      ["Usa fórmulas: el sistema revisa el resultado y que la celda contenga una fórmula (no el número escrito a mano)."],
      ["No cambies los nombres de las hojas ni muevas las tablas."],
      [""],
      ["Ejercicios (hojas Ej01 a Ej" + String(window.CONTENT.FORMULA_TASKS.length).padStart(2, "0") + ")", { bold: true }],
      ["Cada hoja tiene la tabla de ventas, la tabla de productos y los parámetros. Debajo está la pregunta y la celda amarilla donde va tu fórmula."],
      ["Van de más fácil a más difícil. Si no sabes uno, déjalo en blanco y sigue."],
      ["Consejo: mientras escribes una referencia, pulsa F4 para fijarla con $ (por ejemplo $N$2) antes de arrastrar la fórmula."],
      [""],
      ["Caso práctico: hoja «Ventas»", { bold: true }],
      ["1. En la columna G (Importe) calcula Cantidad × Precio para todas las filas."],
      ["2. En la columna H (Clasificación) escribe \"Alta\" si el Importe es mayor o igual a " + c.threshold + " y \"Baja\" en caso contrario (con fórmula)."],
      ["3. Aplica un formato condicional a la columna G (Importe) de la hoja Ventas (cualquier regla)."],
      [""],
      ["Caso práctico: hoja «Respuestas» (celdas amarillas)", { bold: true }],
      ["4. Completa los totales generales, las unidades por región y la pregunta sobre el vendedor."],
      ["5. Indica el producto con más unidades vendidas (puedes usar una tabla dinámica o fórmulas)."],
      ["6. Nivel experto: en C21 escribe UNA fórmula que devuelva la lista de vendedores sin repetir, ordenada alfabéticamente (se desborda hacia abajo)."],
      [""],
      ["Extras (suman puntos)", { bold: true }],
      ["7. Crea una tabla dinámica en una hoja nueva que resuma el Importe por Región."],
      ["8. Inserta un gráfico (de cualquier tipo) con las unidades o importes por región."],
      [""],
      ["Si no tienes Excel de escritorio, puedes usar Excel en la web (office.com); guarda y descarga como .xlsx."],
    ];
    lines.forEach(([t, font], i) => {
      const cell = ins.getCell(i + 1, 2);
      cell.value = t;
      if (font) cell.font = font;
      cell.alignment = { wrapText: true, vertical: "top" };
    });

    // Ejercicios: una hoja por pregunta
    const ex = exerciseSheet(code);
    const LEVEL_NAMES = ["", "Básico", "Intermedio", "Avanzado", "Experto"];
    const border = { style: "thin", color: { argb: "FFB7C7BC" } };
    const box = { top: border, left: border, bottom: border, right: border };
    window.CONTENT.FORMULA_TASKS.forEach((t, i) => {
      const sh = wb.addWorksheet(exName(i), { properties: { tabColor: { argb: "FFFFD966" } } });
      const widths = { A: 12, B: 11, C: 10, D: 14, E: 10, F: 10, G: 14, H: 3, I: 9, J: 13, K: 12, L: 3, M: 15, N: 9 };
      Object.entries(widths).forEach(([c, w]) => (sh.getColumn(c).width = w));
      ex.rows.forEach((row, r) => {
        row.forEach((v, ci) => {
          if (v === "" || v === null || v === undefined) return;
          const col = ex.columns[ci];
          const cell = sh.getCell(col + (r + 1));
          if (r > 0 && col === "A" && typeof v === "number") {
            cell.value = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
            cell.numFmt = "dd/mm/yyyy";
          } else cell.value = v;
          if (r === 0) { cell.fill = head; cell.font = headFont; }
          else if (col === "F") cell.numFmt = "#,##0.00";
          else if (col + (r + 1) === "N2") cell.numFmt = "0%";
        });
      });
      const answerCells = t.fillTo
        ? Array.from({ length: t.fillTo - 1 }, (_, k) => t.cell.replace(/\d+/, String(k + 2)))
        : [EX_ANSWER];
      if (t.fillTo) {
        const h = sh.getCell(t.cell.replace(/\d+/, "1"));
        h.value = "Respuesta"; h.fill = head; h.font = headFont;
      }
      answerCells.forEach((a) => { const c = sh.getCell(a); c.fill = yellow; c.border = box; if (t.display === "date") c.numFmt = "dd/mm/yyyy"; });

      const title = sh.getCell("A15");
      title.value = `Ejercicio ${i + 1} de ${window.CONTENT.FORMULA_TASKS.length} · Nivel ${LEVEL_NAMES[t.level]}`;
      title.font = { bold: true, size: 13, color: { argb: "FF1F6F43" } };
      sh.mergeCells("A16:N18");
      const q = sh.getCell("A16");
      q.value = excelText(t);
      q.font = { size: 12 };
      q.alignment = { wrapText: true, vertical: "top" };
      q.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F1E8" } };
      q.border = box;
      [16, 17, 18].forEach((r) => (sh.getRow(r).height = 22));
      sh.mergeCells("A20:C20");
      const lab = sh.getCell("A20");
      lab.value = t.fillTo ? `Respuesta: columna ${t.cell.replace(/\d+/, "")} (celdas amarillas) ↑` : "Tu respuesta (fórmula) →";
      lab.font = { bold: true };
      lab.alignment = { horizontal: t.fillTo ? "left" : "right" };
      sh.views = [{ activeCell: t.fillTo ? t.cell : EX_ANSWER }];
    });

    // Ventas
    const ws = wb.addWorksheet("Ventas", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "Fecha", key: "fecha", width: 12 },
      { header: "Vendedor", key: "vendedor", width: 12 },
      { header: "Región", key: "region", width: 11 },
      { header: "Producto", key: "producto", width: 13 },
      { header: "Cantidad", key: "cantidad", width: 10 },
      { header: "Precio", key: "precio", width: 10 },
      { header: "Importe", key: "importe", width: 12 },
      { header: "Clasificación", key: "clasif", width: 14 },
    ];
    c.rows.forEach((r) => {
      const row = ws.addRow({
        fecha: new Date(Date.UTC(1899, 11, 30) + r.fecha * 86400000),
        vendedor: r.vendedor, region: r.region, producto: r.producto, cantidad: r.cantidad, precio: r.precio,
      });
      row.getCell(1).numFmt = "dd/mm/yyyy";
      row.getCell(6).numFmt = "#,##0";
      row.getCell(7).fill = yellow;
      row.getCell(8).fill = yellow;
    });
    ws.getRow(1).eachCell((cell) => { cell.fill = head; cell.font = headFont; });

    // Respuestas
    const rs = wb.addWorksheet("Respuestas");
    rs.getColumn(2).width = 58; rs.getColumn(3).width = 18;
    const put = (addr, val, opts) => {
      const cell = rs.getCell(addr);
      cell.value = val;
      if (opts && opts.bold) cell.font = { bold: true };
      if (opts && opts.fill) cell.fill = yellow;
    };
    put("B2", "Respuestas — usa fórmulas que apunten a la hoja Ventas", { bold: true });
    put("B4", "Total de unidades vendidas"); put("C4", null, { fill: true });
    put("B5", "Importe total vendido"); put("C5", null, { fill: true });
    put("B6", "Número de ventas (filas de datos)"); put("C6", null, { fill: true });
    put("B8", "Unidades vendidas por región", { bold: true });
    REGIONES.forEach((reg, i) => { put("B" + (9 + i), reg); put("C" + (9 + i), null, { fill: true }); });
    put("B14", "Pregunta", { bold: true });
    put("B15", `¿Cuántas ventas hizo ${c.askVendor} en ${MESES[c.askMonth - 1]} de 2026?`); put("C15", null, { fill: true });
    put("B17", "Análisis", { bold: true });
    put("B18", "Producto con más unidades vendidas (escribe el nombre)"); put("C18", null, { fill: true });
    put("B20", "Nivel experto", { bold: true });
    put("B21", "Vendedores únicos ordenados A→Z (una sola fórmula en C21)"); put("C21", null, { fill: true });

    // Hoja oculta de control
    const ctl = wb.addWorksheet("_control", { state: "veryHidden" });
    ctl.getCell("A1").value = "codigo"; ctl.getCell("B1").value = code;
    ctl.getCell("A2").value = "estudiante"; ctl.getCell("B2").value = studentName || "";
    ctl.getCell("A3").value = "generado"; ctl.getCell("B3").value = new Date().toISOString();

    wb.views = [{ activeTab: 0 }];
    const buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  // --- Lector mínimo de .xlsx (JSZip + DOMParser) --------------------------
  // Se lee el XML directamente para obtener valores calculados y fórmulas tal
  // como las guardó Excel / Excel web / Google Sheets / LibreOffice.
  async function readXlsx(arrayBuffer) {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const parse = async (path) => {
      const f = zip.file(path);
      return f ? new DOMParser().parseFromString(await f.async("string"), "application/xml") : null;
    };
    const byTag = (node, tag) => Array.from(node.getElementsByTagNameNS("*", tag));

    const shared = [];
    const sst = await parse("xl/sharedStrings.xml");
    if (sst) byTag(sst, "si").forEach((si) => shared.push(byTag(si, "t").map((t) => t.textContent).join("")));

    const wbXml = await parse("xl/workbook.xml");
    const rels = await parse("xl/_rels/workbook.xml.rels");
    const relMap = {};
    byTag(rels, "Relationship").forEach((r) => (relMap[r.getAttribute("Id")] = r.getAttribute("Target")));
    const sheets = {};
    for (const s of byTag(wbXml, "sheet")) {
      const rid = s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || s.getAttribute("r:id");
      let target = relMap[rid] || "";
      target = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
      const xmlText = zip.file(target) ? await zip.file(target).async("string") : "";
      const doc = new DOMParser().parseFromString(xmlText, "application/xml");
      const cells = {};
      byTag(doc, "c").forEach((c) => {
        const t = c.getAttribute("t");
        const v = byTag(c, "v")[0];
        const f = byTag(c, "f")[0];
        let value = v ? v.textContent : null;
        if (t === "s" && value !== null) value = shared[Number(value)];
        else if (t === "inlineStr") value = byTag(c, "t").map((x) => x.textContent).join("");
        else if (t === "b") value = value === "1";
        else if (t === "e") value = { error: value };
        else if (t !== "str" && value !== null && value !== "") value = Number(value);
        cells[c.getAttribute("r")] = { value, formula: f ? (f.textContent || (f.getAttribute("t") === "shared" ? "(shared)" : "")) : null, hasFormula: !!f };
      });
      sheets[s.getAttribute("name")] = { cells, xml: xmlText };
    }
    const files = Object.keys(zip.files);
    return {
      sheets,
      hasPivot: files.some((p) => /^xl\/pivotTables\/.+\.xml$/i.test(p)),
      hasChart: files.some((p) => /^xl\/charts\/(chart|chartEx)\d*\.xml$/i.test(p)),
    };
  }

  // --- Corrección -----------------------------------------------------------
  const num = (v) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", ".")));
  const near = (a, b) => Number.isFinite(num(a)) && Math.abs(num(a) - b) < 0.01;
  const norm = (s) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  async function grade(arrayBuffer, expectedCode) {
    let book;
    try {
      book = await readXlsx(arrayBuffer);
    } catch (e) {
      throw new Error("No se pudo leer el archivo. Asegúrate de subir un libro de Excel (.xlsx).");
    }
    const ctl = book.sheets["_control"];
    const code = ctl && ctl.cells.B1 ? String(ctl.cells.B1.value) : expectedCode;
    if (!code) throw new Error("El archivo no contiene el código de la práctica. Descarga la práctica desde esta plataforma.");
    const ventas = book.sheets["Ventas"];
    const resp = book.sheets["Respuestas"];
    const exercises = gradeExercises(book, code);
    const hasExercises = Object.keys(exercises).length > 0;
    if (!hasExercises && (!ventas || !resp)) throw new Error("No se encontraron las hojas de la práctica (Ej01…, Ventas, Respuestas). No cambies sus nombres.");

    const base = { code, studentInFile: ctl && ctl.cells.B2 ? String(ctl.cells.B2.value || "") : "", codeMismatch: !!expectedCode && code !== expectedCode, exercises };
    if (!ventas || !resp) {
      return { ...base, caseFound: false, checks: CHECK_DEFS.map((d) => ({ ...d, score: 0, note: "No se encontró el caso práctico en el archivo." })) };
    }

    const c = buildCase(code);
    const E = c.expected;
    const cell = (sheet, addr) => sheet.cells[addr] || { value: null, hasFormula: false };
    const checks = [];
    const push = (id, score, note) => checks.push({ ...CHECK_DEFS.find((d) => d.id === id), score, note: note || "" });
    // score: 0..1; con valor correcto pero escrito a mano se otorga la mitad.
    const valueCheck = (id, addr, ok) => {
      const k = cell(resp, addr);
      const score = ok(k.value) ? (k.hasFormula ? 1 : 0.5) : 0;
      push(id, score, score === 0.5 ? "Valor correcto, pero escrito a mano (sin fórmula)." : "");
    };

    // Columna G: Importe
    let gOk = 0, gFormula = 0, hOk = 0, hFormula = 0;
    for (let r = FIRST; r <= LAST; r++) {
      const g = cell(ventas, "G" + r), h = cell(ventas, "H" + r);
      const qty = num(cell(ventas, "E" + r).value), price = num(cell(ventas, "F" + r).value);
      const imp = qty * price;
      if (near(g.value, imp)) { gOk++; if (g.hasFormula) gFormula++; }
      const expH = imp >= c.threshold ? "alta" : "baja";
      if (norm(h.value) === expH) { hOk++; if (h.hasFormula) hFormula++; }
    }
    const colScore = (ok, f) => (ok === N_ROWS ? (f === N_ROWS ? 1 : 0.5) : ok >= N_ROWS * 0.8 ? 0.5 : 0);
    push("x-importe", colScore(gOk, gFormula), `${gOk}/${N_ROWS} filas correctas, ${gFormula} con fórmula.`);
    valueCheck("x-unidades", ANSWERS.totalUnits, (v) => near(v, E.totalUnits));
    valueCheck("x-total", ANSWERS.totalAmount, (v) => near(v, E.totalAmount));
    valueCheck("x-conteo", ANSWERS.count, (v) => near(v, E.count));

    push("x-clasif", colScore(hOk, hFormula), `${hOk}/${N_ROWS} filas correctas, ${hFormula} con fórmula.`);
    let regOk = 0, regFormula = 0;
    ANSWERS.byRegion.forEach((addr, i) => {
      const k = cell(resp, addr);
      if (near(k.value, E.byRegion[i])) { regOk++; if (k.hasFormula) regFormula++; }
    });
    push("x-region", (regOk + regFormula) / 8, `${regOk}/4 regiones correctas, ${regFormula} con fórmula.`);
    const hasCF = /conditionalFormatting/i.test(ventas.xml);
    push("x-formatocond", hasCF ? 1 : 0);
    push("x-grafico", book.hasChart ? 1 : 0);

    valueCheck("x-vendmes", ANSWERS.vendorMonth, (v) => near(v, E.vendorMonth));
    const top = cell(resp, ANSWERS.topProduct);
    push("x-top", E.topProducts.map(norm).includes(norm(top.value)) ? 1 : 0);
    push("x-dinamica", book.hasPivot ? 1 : 0);

    // Lista de vendedores únicos desbordada desde C21
    const start = FormulaEngine.parseAddress(ANSWERS.uniqueList);
    const got = [];
    for (let i = 0; i < E.uniqueVendors.length; i++) got.push(norm(cell(resp, "C" + (start.row + 1 + i)).value));
    const listOk = got.join("|") === E.uniqueVendors.map(norm).join("|");
    const fC21 = cell(resp, ANSWERS.uniqueList);
    const usesFormula = fC21.hasFormula && /UNIQUE|UNICOS|SORT|ORDENAR/i.test(fC21.formula || "");
    push("x-unicos", listOk ? (usesFormula ? 1 : 0.5) : 0, listOk && !usesFormula ? "Lista correcta, pero no se detectó UNICOS/ORDENAR." : "");

    return { ...base, caseFound: true, checks };
  }

  // Corrige las hojas Ej01…: compara los valores que calculó Excel con los esperados.
  function gradeExercises(book, code) {
    const rows = exerciseSheet(code).rows;
    const out = {};
    const toResult = (k) => (k.value && typeof k.value === "object" && k.value.error
      ? { ok: false, error: k.value.error }
      : { ok: true, value: k.value === null ? "" : k.value });
    const cleanFormula = (f) => "=" + String(f || "").replace(/_xlfn\.|_xlws\.|_xlpm\./g, "");
    window.CONTENT.FORMULA_TASKS.forEach((t, i) => {
      const sh = book.sheets[exName(i)];
      if (!sh) return;
      const addrs = t.fillTo
        ? Array.from({ length: t.fillTo - 1 }, (_, k) => t.cell.replace(/\d+/, String(k + 2)))
        : [EX_ANSWER];
      const cells = addrs.map((a) => sh.cells[a] || { value: null, hasFormula: false });
      const answered = cells.some((k) => k.hasFormula || (k.value !== null && k.value !== ""));
      if (!answered) { out[t.id] = { answered: false }; return; }
      const expected = FormulaEngine.evaluate(rows, t.ref, t.cell, t.fillTo).results;
      const matches = expected.map((e, k) => FormulaEngine.valuesMatch(toResult(cells[k]), e));
      const allFormula = cells.every((k) => k.hasFormula);
      let score = 0, note = "";
      if (matches.every(Boolean)) {
        if (allFormula) score = 1;
        else note = "El resultado es correcto, pero se escribió a mano: se pedía una fórmula.";
      } else if (t.fillTo && matches[0]) {
        note = "La primera fila es correcta, pero al copiar la fórmula hacia abajo falla (¿faltan $?).";
      }
      const first = cells[0];
      const given = first.hasFormula && first.formula && first.formula !== "(shared)"
        ? cleanFormula(first.formula)
        : (first.value === null ? "(vacío)" : String(first.value && first.value.error ? first.value.error : first.value));
      out[t.id] = { answered: true, score, note, given };
    });
    return out;
  }

  window.FileTask = { newCode, generate, grade, buildCase, readXlsx, exerciseSheet, ANSWERS, CHECK_DEFS };
})();
