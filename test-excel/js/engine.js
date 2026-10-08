/*
 * Motor de fórmulas basado en HyperFormula (licencia GPL v3).
 * Acepta fórmulas en español (=SUMA(A1:A3;B1)) o en inglés (=SUM(A1:A3,B1)).
 */
(function () {
  const HF = window.HyperFormula;
  const es = HF.languages && HF.languages.esES;
  if (es) {
    // Nombres de Excel en español que HyperFormula no traduce por defecto.
    Object.assign(es.functions, { FILTER: "FILTRAR", SWITCH: "CAMBIAR" });
    try { HF.registerLanguage("esES", es); } catch (e) { /* ya registrado */ }
  }

  const BASE = { licenseKey: "gpl-v3", useArrayArithmetic: true, language: es ? "esES" : "enGB" };
  // Excel en español usa ";" y coma decimal; en inglés "," y punto decimal.
  const VARIANTS = [
    { functionArgSeparator: ";", decimalSeparator: ",", thousandSeparator: "", arrayColumnSeparator: ";", arrayRowSeparator: "|" },
    { functionArgSeparator: ",", decimalSeparator: ".", thousandSeparator: "", arrayColumnSeparator: ",", arrayRowSeparator: ";" },
  ];

  function colToIndex(col) {
    let n = 0;
    for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }
  function parseAddress(a) {
    const m = /^([A-Z]+)(\d+)$/.exec(a);
    return { col: colToIndex(m[1]), row: Number(m[2]) - 1 };
  }

  function build(rows, variant) {
    return HF.buildFromSheets({ Datos: rows.map((r) => r.map((v) => (v === "" ? null : v))) }, Object.assign({}, BASE, variant));
  }

  function normalizeValue(v) {
    if (v === null || v === undefined) return { ok: true, value: 0 };
    if (typeof v === "object" && v.type !== undefined && v.value !== undefined) {
      return { ok: false, error: v.value, message: v.message || "" };
    }
    return { ok: true, value: v };
  }

  function isParseError(r) {
    return !r.ok && /Parsing error|Lexing error|Unable to parse/i.test(r.message);
  }

  function evaluateWith(rows, variant, formula, cell, fillTo) {
    const hf = build(rows, variant);
    try {
      const addr = parseAddress(cell);
      const at = { sheet: 0, col: addr.col, row: addr.row };
      hf.setCellContents(at, [[formula]]);
      const results = [normalizeValue(hf.getCellValue(at))];
      if (fillTo) {
        hf.copy({ start: at, end: at });
        for (let r = addr.row + 1; r < fillTo; r++) {
          const dest = { sheet: 0, col: addr.col, row: r };
          hf.paste(dest);
          results.push(normalizeValue(hf.getCellValue(dest)));
        }
      }
      return results;
    } finally {
      hf.destroy();
    }
  }

  /**
   * Evalúa una fórmula escrita por el estudiante.
   * Devuelve { results: [{ok, value|error}], parseError: bool }.
   */
  function evaluate(rows, formula, cell, fillTo) {
    formula = String(formula || "").trim();
    if (!formula.startsWith("=")) formula = "=" + formula;
    // Comillas tipográficas pegadas desde Word / móviles.
    formula = formula.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'");
    // HyperFormula solo entiende VERDADERO/FALSO como funciones: VERDADERO() / FALSO().
    formula = formula.split('"').map((part, k) => (k % 2 ? part : part.replace(
      /\b(TRUE|FALSE|VERDADERO|FALSO)\b(?!\s*\()/gi,
      (m) => (/^(TRUE|VERDADERO)$/i.test(m) ? "TRUE()" : "FALSE()")))).join('"');
    const order = formula.includes(";") ? [0, 1] : [1, 0];
    let first = null;
    for (const i of order) {
      let results;
      try {
        results = evaluateWith(rows, VARIANTS[i], formula, cell, fillTo);
      } catch (e) {
        results = [{ ok: false, error: "#ERROR!", message: String(e && e.message) }];
      }
      if (!first) first = results;
      if (!isParseError(results[0])) return { results, parseError: false };
    }
    return { results: first, parseError: true };
  }

  // Comprueba que la fórmula usa referencias a celdas (no un valor escrito a mano).
  function hasCellReference(formula) {
    const noStrings = String(formula).replace(/"[^"]*"/g, "");
    return /\$?[A-Z]{1,3}\$?\d+/i.test(noStrings);
  }

  function valuesMatch(got, expected) {
    if (!got.ok || !expected.ok) return false;
    const a = got.value, b = expected.value;
    if (typeof b === "number") {
      const n = typeof a === "number" ? a : Number(String(a).replace(",", "."));
      return Number.isFinite(n) && Math.abs(n - b) < 0.01;
    }
    if (typeof b === "boolean") return a === b;
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  window.FormulaEngine = { evaluate, hasCellReference, valuesMatch, parseAddress, colToIndex };
})();
