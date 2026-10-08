/*
 * Flujo de la aplicación: bienvenida → teoría → fórmulas → archivo → resultados.
 * El progreso se guarda en el navegador para no perderlo al recargar.
 */
(function () {
  const cfg = window.APP_CONFIG;
  const { LEVELS, QUESTIONS, SHEET, FORMULA_TASKS } = window.CONTENT;
  const STORE_KEY = "excelLevelTest.v1";
  const app = document.getElementById("app");

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const fresh = () => ({
    step: "welcome", student: {}, startedAt: null, finishedAt: null,
    qIndex: 0, fIndex: 0, optionOrder: {}, mc: {}, formulas: {},
    fileCode: null, fileResult: null, fileSkipped: false, submitted: false,
  });
  let state = load() || fresh();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ }
  }
  function go(step) {
    state.step = step; save(); render(); window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel) => app.querySelector(sel);

  function formatValue(v, fmt) {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "number") {
      if (fmt === "date") {
        const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
        return dt.toLocaleDateString("es", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
      }
      if (fmt === "percent") return (v * 100).toLocaleString("es") + " %";
      if (fmt === "money") return v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return v.toLocaleString("es", { maximumFractionDigits: 4 });
    }
    if (typeof v === "boolean") return v ? "VERDADERO" : "FALSO";
    return String(v);
  }
  function formatResult(r, fmt) {
    if (!r) return "";
    return r.ok ? formatValue(r.value, fmt) : r.error;
  }

  // Dentro de claude.ai las páginas no pueden usar confirm(), print() ni descargas directas.
  const inClaude = !!(window.claude && typeof window.claude.use === "function");

  // Confirmación en dos clics (sustituye a confirm(), que no funciona en todos los entornos).
  function confirmClick(btn, question, action) {
    btn.addEventListener("click", () => {
      const reset = () => { if (btn.dataset.armed) { btn.textContent = btn.dataset.armed; delete btn.dataset.armed; } };
      if (btn.dataset.armed) { reset(); action(); return; }
      btn.dataset.armed = btn.textContent;
      btn.textContent = question + " Pulsa otra vez para confirmar";
      setTimeout(reset, 5000);
    });
  }

  async function saveFile(blob, filename) {
    if (inClaude) {
      const downloads = await window.claude.use("downloads");
      if (downloads) {
        try { await downloads.save({ filename, data: blob }); return; }
        catch (e) { if (e && e.code === "declined") return; throw new Error(e && e.message ? e.message : "descarga no disponible"); }
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setProgress() {
    const wrap = document.getElementById("progressWrap");
    const total = QUESTIONS.length + FORMULA_TASKS.length + 1;
    let done = 0, label = "";
    if (state.step === "theory") { done = state.qIndex; label = "Parte 1 de 3 · Conocimientos"; }
    else if (state.step === "formulas") { done = QUESTIONS.length + state.fIndex; label = "Parte 2 de 3 · Fórmulas"; }
    else if (state.step === "file") { done = QUESTIONS.length + FORMULA_TASKS.length; label = "Parte 3 de 3 · Práctica con archivo"; }
    else { wrap.hidden = true; return; }
    wrap.hidden = false;
    document.getElementById("progressLabel").textContent = label;
    document.getElementById("progressBar").style.width = Math.round((done / total) * 100) + "%";
  }

  // ---------------------------------------------------------------------------
  // Pantallas
  // ---------------------------------------------------------------------------
  function render() {
    setProgress();
    ({ welcome: renderWelcome, intro2: renderIntroFormulas, theory: renderTheory, formulas: renderFormula, file: renderFile, results: renderResults }[state.step] || renderWelcome)();
  }

  function renderWelcome() {
    const s = state.student;
    app.innerHTML = `
      <section class="hero">
        <h1>¿Cuál es tu nivel real de Excel?</h1>
        <p class="lead">Este test diagnóstico te da una <b>nota de 0 a 100</b>, te ubica en un <b>nivel</b> y genera una <b>ruta de aprendizaje personalizada</b> para tu curso.</p>
        <div class="parts">
          <div class="part"><span class="part-num">1</span><div><b>Conocimientos</b><br><span class="muted">${QUESTIONS.length} preguntas de opción múltiple</span></div></div>
          <div class="part"><span class="part-num">2</span><div><b>Fórmulas en vivo</b><br><span class="muted">${FORMULA_TASKS.length} ejercicios: escribes la fórmula como en Excel</span></div></div>
          <div class="part"><span class="part-num">3</span><div><b>Práctica con archivo</b><br><span class="muted">Descargas un Excel, lo resuelves y lo subes</span></div></div>
        </div>
        <p class="muted small">Duración aproximada: 45–60 minutos. Tu avance se guarda en este navegador. Si no sabes una respuesta, elige «No lo sé»: adivinar hace que tu ruta sea menos precisa.</p>
      </section>
      <form class="card form" id="startForm">
        <h2>Tus datos</h2>
        <div class="grid2">
          <label>Nombre completo *<input name="name" required autocomplete="name" value="${esc(s.name)}"></label>
          <label>Correo electrónico *<input name="email" type="email" required autocomplete="email" value="${esc(s.email)}"></label>
          <label>Teléfono / WhatsApp<input name="phone" autocomplete="tel" value="${esc(s.phone)}"></label>
          <label>¿Para qué necesitas Excel?
            <select name="goal">
              ${["Trabajo / oficina", "Finanzas y contabilidad", "Análisis de datos", "Estudios", "Emprendimiento", "Otro"].map((o) => `<option ${s.goal === o ? "selected" : ""}>${o}</option>`).join("")}
            </select>
          </label>
          <label>¿Cómo calificarías tu nivel hoy?
            <select name="selfLevel">
              ${["Nunca lo he usado", ...LEVELS.map((l) => l.name)].map((o) => `<option ${s.selfLevel === o ? "selected" : ""}>${o}</option>`).join("")}
            </select>
          </label>
          <label>Versión de Excel que usas
            <select name="version">
              ${["Microsoft 365", "Excel 2021 / 2019", "Excel 2016 o anterior", "Google Sheets", "LibreOffice", "No sé"].map((o) => `<option ${s.version === o ? "selected" : ""}>${o}</option>`).join("")}
            </select>
          </label>
        </div>
        <button class="btn primary big" type="submit">Comenzar test</button>
      </form>`;
    const form = $("#startForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      state = fresh();
      state.student = Object.fromEntries(fd.entries());
      state.startedAt = new Date().toISOString();
      QUESTIONS.forEach((q) => (state.optionOrder[q.id] = shuffle(q.options.map((_, i) => i))));
      go("theory");
    });
  }

  function renderTheory() {
    const i = state.qIndex;
    if (i >= QUESTIONS.length) return go("intro2");
    const q = QUESTIONS[i];
    const order = state.optionOrder[q.id] || q.options.map((_, k) => k);
    const chosen = state.mc[q.id];
    app.innerHTML = `
      <section class="card question">
        <div class="q-meta">Pregunta ${i + 1} de ${QUESTIONS.length}</div>
        <h2 class="q-text">${q.text}</h2>
        <div class="options" role="radiogroup">
          ${order.map((k) => `<label class="option ${chosen === k ? "selected" : ""}"><input type="radio" name="opt" value="${k}" ${chosen === k ? "checked" : ""}><span>${esc(q.options[k])}</span></label>`).join("")}
          <label class="option idk ${chosen === -1 ? "selected" : ""}"><input type="radio" name="opt" value="-1" ${chosen === -1 ? "checked" : ""}><span>No lo sé</span></label>
        </div>
        <div class="nav">
          <button class="btn ghost" id="prev" ${i === 0 ? "disabled" : ""}>← Anterior</button>
          <button class="btn primary" id="next" ${chosen === undefined ? "disabled" : ""}>${i === QUESTIONS.length - 1 ? "Ir a fórmulas →" : "Siguiente →"}</button>
        </div>
      </section>`;
    app.querySelectorAll("input[name=opt]").forEach((inp) => inp.addEventListener("change", () => {
      state.mc[q.id] = Number(inp.value); save();
      app.querySelectorAll(".option").forEach((o) => o.classList.toggle("selected", o.contains(inp)));
      $("#next").disabled = false;
    }));
    $("#prev").onclick = () => { state.qIndex = Math.max(0, i - 1); go("theory"); };
    $("#next").onclick = () => { state.qIndex = i + 1; go("theory"); };
  }

  function renderIntroFormulas() {
    app.innerHTML = `
      <section class="card">
        <h2>Parte 2 · Fórmulas en vivo</h2>
        <p>Verás una hoja de cálculo con datos de ventas y una tabla de productos. En cada ejercicio escribe la fórmula <b>como la escribirías en Excel</b>.</p>
        <ul class="tips">
          <li>Puedes escribir en <b>español</b> (<code>=SUMA(E2:E13)</code>, separador <code>;</code>) o en <b>inglés</b> (<code>=SUM(E2:E13)</code>, separador <code>,</code>).</li>
          <li>Pulsa <b>Probar</b> para ver el resultado en la hoja antes de continuar. Puedes probar todas las veces que quieras.</li>
          <li>Algunas fórmulas se copiarán hacia abajo automáticamente: cuida las referencias (<code>$</code>).</li>
          <li>Se evalúa el resultado: cualquier fórmula correcta vale. Escribir el número a mano no cuenta.</li>
        </ul>
        <div class="nav"><span></span><button class="btn primary" id="go">Empezar ejercicios →</button></div>
      </section>`;
    $("#go").onclick = () => go("formulas");
  }

  function gridHtml(task, preview) {
    const cols = SHEET.columns;
    const target = FormulaEngine.parseAddress(task.cell);
    const targetCol = cols[target.col];
    const lastRow = task.fillTo || target.row + 1;
    const fmtFor = (col, row) => SHEET.format[col + row] || SHEET.format[col];
    let html = `<div class="sheet-wrap"><table class="sheet"><thead><tr><th class="corner"></th>${cols.map((c) => `<th class="${c === targetCol ? "hl" : ""}">${c}</th>`).join("")}</tr></thead><tbody>`;
    SHEET.rows.forEach((row, r) => {
      const rowNum = r + 1;
      html += `<tr><th class="${rowNum >= target.row + 1 && rowNum <= lastRow ? "hl" : ""}">${rowNum}</th>`;
      cols.forEach((c, ci) => {
        let v = row[ci];
        const isTarget = ci === target.col && rowNum >= target.row + 1 && rowNum <= lastRow;
        let shown = r === 0 ? esc(v) : esc(formatValue(v, fmtFor(c, rowNum)));
        let cls = r === 0 && v ? "head" : typeof v === "number" ? "num" : "";
        if (isTarget) {
          cls += " target";
          const res = preview && preview[rowNum - target.row - 1];
          shown = res ? `<span class="${res.ok ? "" : "err"}">${esc(formatResult(res, task.display))}</span>` : (rowNum === target.row + 1 ? "?" : "");
        }
        html += `<td class="${cls}">${shown}</td>`;
      });
      html += "</tr>";
    });
    return html + `</tbody></table></div><div class="muted small">Desliza la hoja hacia la derecha para ver todas las columnas (hasta la ${cols[cols.length - 1]}).</div>`;
  }

  function renderFormula() {
    const i = state.fIndex;
    if (i >= FORMULA_TASKS.length) return go("file");
    const t = FORMULA_TASKS[i];
    const saved = state.formulas[t.id];
    app.innerHTML = `
      <section class="card">
        <div class="q-meta">Ejercicio ${i + 1} de ${FORMULA_TASKS.length}</div>
        <h2 class="q-text">${t.text}</h2>
        <div id="grid">${gridHtml(t, null)}</div>
        <div class="formula-bar">
          <span class="cell-name">${t.cell}</span>
          <span class="fx">fx</span>
          <input id="formula" class="mono" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="=" value="${esc(saved || "")}" aria-label="Fórmula para la celda ${t.cell}">
          <button class="btn" id="try">Probar</button>
        </div>
        <div id="feedback" class="feedback muted small">${t.fillTo ? `La fórmula se escribe en ${t.cell} y se copia hasta ${t.cell.replace(/\d+/, t.fillTo)}.` : `Resultado en la celda ${t.cell}.`}</div>
        <div class="nav">
          <button class="btn ghost" id="prev">← Anterior</button>
          <div class="nav-right">
            <button class="btn ghost" id="skip">No lo sé</button>
            <button class="btn primary" id="next">${i === FORMULA_TASKS.length - 1 ? "Ir a la práctica →" : "Guardar y seguir →"}</button>
          </div>
        </div>
      </section>`;
    const input = $("#formula");
    const tryIt = () => {
      const f = input.value.trim();
      if (!f) return;
      const { results, parseError } = FormulaEngine.evaluate(SHEET.rows, f, t.cell, t.fillTo);
      $("#grid").innerHTML = gridHtml(t, results);
      const fb = $("#feedback");
      if (parseError) {
        fb.className = "feedback warn small";
        fb.textContent = "Excel no entendería esta fórmula: revisa paréntesis, comillas y separadores (; o ,).";
      } else if (!results[0].ok) {
        fb.className = "feedback warn small";
        fb.textContent = `La fórmula devuelve el error ${results[0].error}. (El simulador admite la gran mayoría de funciones de Excel; si usas una muy reciente y da error, prueba otro enfoque.)`;
      } else {
        fb.className = "feedback small";
        fb.textContent = `Resultado en ${t.cell}: ${formatResult(results[0], t.display)}`;
      }
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); tryIt(); } });
    $("#try").onclick = tryIt;
    if (saved) tryIt();
    input.focus();
    const store = (val) => { state.formulas[t.id] = val; state.fIndex = i + 1; go("formulas"); };
    $("#prev").onclick = () => {
      if (input.value.trim()) state.formulas[t.id] = input.value.trim();
      if (i === 0) { state.qIndex = QUESTIONS.length - 1; go("theory"); } else { state.fIndex = i - 1; go("formulas"); }
    };
    $("#skip").onclick = () => store(null);
    $("#next").onclick = () => {
      const v = input.value.trim();
      if (!v) { input.focus(); $("#feedback").className = "feedback warn small"; $("#feedback").textContent = "Escribe una fórmula o pulsa «No lo sé»."; return; }
      store(v);
    };
  }

  function renderFile() {
    if (!state.fileCode) { state.fileCode = FileTask.newCode(); save(); }
    const r = state.fileResult;
    app.innerHTML = `
      <section class="card">
        <h2>Parte 3 · Práctica con archivo</h2>
        <p>Ahora trabajarás en Excel de verdad. El archivo tiene datos <b>únicos para ti</b> (código <b class="mono">${esc(state.fileCode)}</b>).</p>
        <ol class="steps">
          <li><button class="btn primary" id="download">⬇ Descargar práctica (.xlsx)</button></li>
          <li>Ábrelo en Excel (escritorio o web) y sigue la hoja <b>Instrucciones</b>. Rellena las celdas amarillas.</li>
          <li>Guarda como <b>.xlsx</b> y súbelo aquí:
            <label class="drop" id="drop">
              <input type="file" id="upload" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
              <span id="dropText">${r ? "✔ Archivo recibido. Puedes subir una versión nueva si quieres." : "Arrastra tu archivo aquí o haz clic para elegirlo"}</span>
            </label>
          </li>
        </ol>
        <div id="fileMsg" class="feedback small">${r ? fileSummary(r) : ""}</div>
        <div class="nav">
          <button class="btn ghost" id="prev">← Anterior</button>
          <div class="nav-right">
            ${r ? "" : `<button class="btn ghost" id="skip">Omitir esta parte</button>`}
            <button class="btn primary" id="finish" ${r ? "" : "disabled"}>Ver mis resultados →</button>
          </div>
        </div>
        <p class="muted small">¿No tienes Excel? Puedes abrir el archivo gratis en Excel para la web (office.com) o en Google Sheets y descargarlo como .xlsx. Si omites esta parte, sus puntos cuentan como cero.</p>
      </section>`;
    $("#download").onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true; btn.textContent = "Generando…";
      try {
        const blob = await FileTask.generate(state.fileCode, state.student.name);
        await saveFile(blob, `practica-excel-${state.fileCode}.xlsx`);
      } catch (err) {
        const msg = $("#fileMsg");
        if (msg) { msg.className = "feedback warn small"; msg.textContent = "No se pudo descargar el archivo: " + err.message; }
      }
      btn.disabled = false; btn.textContent = "⬇ Descargar práctica (.xlsx)";
    };
    const handle = async (file) => {
      if (!file) return;
      const msg = $("#fileMsg");
      msg.className = "feedback small"; msg.textContent = "Revisando tu archivo…";
      try {
        const res = await FileTask.grade(await file.arrayBuffer(), state.fileCode);
        res.fileName = file.name;
        state.fileResult = res; state.fileSkipped = false; save();
        renderFile();
      } catch (err) {
        msg.className = "feedback warn small"; msg.textContent = err.message;
      }
    };
    $("#upload").addEventListener("change", (e) => handle(e.target.files[0]));
    const drop = $("#drop");
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => handle(e.dataTransfer.files[0]));
    $("#prev").onclick = () => { state.fIndex = FORMULA_TASKS.length - 1; go("formulas"); };
    if ($("#skip")) confirmClick($("#skip"), "Esta parte contará como cero.", () => { state.fileSkipped = true; finish(); });
    $("#finish").onclick = finish;
  }

  function fileSummary(r) {
    const found = r.checks.filter((c) => c.score > 0).length;
    let s = `Archivo «${esc(r.fileName || "")}» procesado: se detectaron ${found} de ${r.checks.length} elementos resueltos.`;
    if (r.codeMismatch) s += ` <span class="warn">Atención: el archivo tiene el código ${esc(r.code)}, distinto al tuyo.</span>`;
    return s;
  }

  // ---------------------------------------------------------------------------
  // Corrección y resultados
  // ---------------------------------------------------------------------------
  function gradeAll() {
    const items = [];
    QUESTIONS.forEach((q) => {
      const a = state.mc[q.id];
      items.push({ id: q.id, part: "teoria", level: q.level, topic: q.topic, score: a === q.answer ? 1 : 0,
        label: q.text, given: a === undefined || a === -1 ? "No lo sé" : q.options[a], correct: q.options[q.answer] });
    });
    FORMULA_TASKS.forEach((t) => {
      const f = state.formulas[t.id];
      const expected = FormulaEngine.evaluate(SHEET.rows, t.ref, t.cell, t.fillTo).results;
      let score = 0, note = "";
      if (f) {
        const got = FormulaEngine.evaluate(SHEET.rows, f, t.cell, t.fillTo).results;
        const matches = expected.map((e, k) => FormulaEngine.valuesMatch(got[k] || { ok: false }, e));
        if (!FormulaEngine.hasCellReference(f)) note = "La fórmula no usa referencias a celdas.";
        else if (matches.every(Boolean)) score = 1;
        else if (t.fillTo && matches[0]) note = "La primera fila es correcta, pero al copiar la fórmula hacia abajo falla (¿faltan $?).";
      }
      items.push({ id: t.id, part: "formulas", level: t.level, topic: t.topic, score,
        label: t.text.replace(/<[^>]+>/g, ""), given: f || "No lo sé", correct: t.solution, note });
    });
    const r = state.fileResult;
    if (r) r.checks.forEach((c) => items.push({ ...c, part: "archivo" }));
    else if (state.fileSkipped) {
      // Mismos ítems con puntaje cero para que la práctica pese igual.
      FileTask.CHECK_DEFS.forEach((c) => items.push({ ...c, part: "archivo", score: 0, note: "Parte omitida." }));
    }
    return items;
  }

  function finish() {
    state.finishedAt = state.finishedAt || new Date().toISOString();
    save();
    go("results");
    submit();
  }

  function buildReport() {
    const items = gradeAll();
    const res = Scoring.compute(items);
    return { items, res };
  }

  async function submit() {
    if (!cfg.resultsEndpoint || state.submitted) return;
    const { items, res } = buildReport();
    const payload = {
      fecha: state.finishedAt, nombre: state.student.name, correo: state.student.email,
      telefono: state.student.phone || "", objetivo: state.student.goal, autoevaluacion: state.student.selfLevel,
      version: state.student.version, nota: res.score, nivel: res.levelLabel,
      basico: res.levelPct[0].pct, intermedio: res.levelPct[1].pct, avanzado: res.levelPct[2].pct, experto: res.levelPct[3].pct,
      teoria: res.parts.teoria ?? "", formulas: res.parts.formulas ?? "", archivo: res.parts.archivo ?? "",
      ruta: res.path.map((t) => `${t.name} (${t.status})`).join(" | "),
      horas: res.pathHours, minutos: minutesTaken(), codigoArchivo: state.fileResult ? state.fileResult.code : "omitido",
      detalle: JSON.stringify(items.map((i) => ({ id: i.id, s: i.score, r: i.part === "formulas" ? i.given : undefined }))),
    };
    try {
      await fetch(cfg.resultsEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      state.submitted = true; save();
      const el = document.getElementById("sentStatus");
      if (el) el.textContent = "✔ Tus resultados se enviaron a tu instructor.";
    } catch (e) {
      const el = document.getElementById("sentStatus");
      if (el) el.textContent = "No se pudieron enviar los resultados automáticamente. Usa los botones de abajo para compartirlos.";
    }
  }

  function minutesTaken() {
    if (!state.startedAt || !state.finishedAt) return "";
    return Math.round((new Date(state.finishedAt) - new Date(state.startedAt)) / 60000);
  }

  const STATUS = {
    dominado: { label: "Dominado", cls: "ok" },
    reforzar: { label: "Reforzar", cls: "mid" },
    aprender: { label: "Por aprender", cls: "bad" },
    "sin evaluar": { label: "Sin evaluar", cls: "" },
  };

  function renderResults() {
    const { items, res } = buildReport();
    const s = state.student;
    const shareText = `Resultado test de Excel — ${s.name}\nNota: ${res.score}/100\nNivel: ${res.levelLabel}\n` +
      res.levelPct.map((l) => `${l.name}: ${l.pct}%`).join(" · ") +
      `\nRuta sugerida: ${res.path.map((t) => t.name).join(", ") || "—"}`;
    const mail = cfg.contactEmail ? `mailto:${cfg.contactEmail}?subject=${encodeURIComponent("Resultado test de Excel - " + s.name)}&body=${encodeURIComponent(shareText)}` : "";
    const wa = cfg.whatsappNumber ? `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(shareText)}` : "";
    const ring = 2 * Math.PI * 52;
    const partName = { teoria: "Conocimientos", formulas: "Fórmulas", archivo: "Práctica con archivo" };

    app.innerHTML = `
      <section class="card result-hero">
        <div class="score-ring" role="img" aria-label="Nota ${res.score} de 100">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${(res.score / 100) * ring} ${ring}"/></svg>
          <div class="score-num">${res.score}<small>/100</small></div>
        </div>
        <div>
          <div class="muted small">${esc(s.name)} · ${new Date(state.finishedAt).toLocaleDateString("es")}</div>
          <h1 class="level-title">Nivel: ${esc(res.levelLabel)}</h1>
          <p>${res.reached ? esc(LEVELS[res.reached - 1].desc) : "Estás empezando: la ruta parte desde los fundamentos."}</p>
          <p id="sentStatus" class="muted small">${cfg.resultsEndpoint ? (state.submitted ? "✔ Tus resultados se enviaron a tu instructor." : "Enviando resultados…") : ""}</p>
        </div>
      </section>

      <section class="card">
        <h2>Desempeño por nivel</h2>
        <div class="bars">
          ${res.levelPct.map((l) => `
            <div class="bar-row">
              <span class="bar-name">${l.name}</span>
              <div class="bar"><div class="bar-fill ${l.pct >= cfg.levelPassThreshold ? "pass" : ""}" style="width:${l.pct}%"></div><div class="bar-mark" style="left:${cfg.levelPassThreshold}%" title="Mínimo para aprobar"></div></div>
              <span class="bar-val">${l.pct}%</span>
            </div>`).join("")}
        </div>
        <div class="chips">
          ${Object.entries(res.parts).map(([k, v]) => `<span class="chip">${partName[k] || k}: <b>${v}%</b></span>`).join("")}
          ${state.fileSkipped ? `<span class="chip warn">Práctica omitida</span>` : ""}
          ${minutesTaken() !== "" ? `<span class="chip">Tiempo: ${minutesTaken()} min</span>` : ""}
        </div>
      </section>

      <section class="card">
        <h2>Tu ruta de aprendizaje</h2>
        ${res.path.length ? `
          <p class="muted">Orden recomendado · aprox. <b>${res.pathHours} horas</b> de formación.</p>
          <ol class="path">
            ${res.path.map((t) => `
              <li>
                <div class="path-head"><b>${esc(t.name)}</b> <span class="tag ${STATUS[t.status].cls}">${STATUS[t.status].label}</span> <span class="tag">${LEVELS[t.level - 1].name}</span></div>
                <div class="muted small">${esc(t.content)}</div>
              </li>`).join("")}
          </ol>` : `<p>¡Excelente! Dominas todos los temas evaluados. Tu siguiente paso es la especialización (dashboards, Power BI, VBA avanzado).</p>`}
        <h3>Mapa de temas</h3>
        <div class="topics">
          ${res.topics.map((t) => `<div class="topic"><span>${esc(t.name)}</span><span class="tag ${STATUS[t.status].cls}">${t.pct === null ? "—" : t.pct + "%"}</span></div>`).join("")}
        </div>
      </section>

      ${cfg.showReview ? reviewHtml(items) : ""}

      <section class="card actions no-print">
        ${inClaude ? "" : `<button class="btn primary" id="print">🖨 Guardar como PDF</button>`}
        ${mail ? `<a class="btn" href="${mail}">✉ Enviar por correo</a>` : ""}
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        <button class="btn" id="copy">Copiar resumen</button>
        <button class="btn ghost" id="again">Hacer el test otra vez</button>
      </section>`;

    if ($("#print")) $("#print").onclick = () => window.print();
    $("#copy").onclick = async (e) => {
      try { await navigator.clipboard.writeText(shareText); e.currentTarget.textContent = "✔ Copiado"; }
      catch (err) {
        const ta = document.createElement("textarea");
        ta.value = shareText; ta.rows = 6; ta.className = "copy-box"; ta.readOnly = true;
        e.currentTarget.closest(".actions").after(ta); ta.focus(); ta.select();
      }
    };
    confirmClick($("#again"), "Se borrarán tus resultados.", () => { state = fresh(); save(); render(); });
    if (cfg.resultsEndpoint && !state.submitted) submit();
  }

  function reviewHtml(items) {
    const parts = [["teoria", "Conocimientos"], ["formulas", "Fórmulas"], ["archivo", "Práctica con archivo"]];
    const icon = (s) => (s >= 1 ? `<span class="tag ok">✔</span>` : s > 0 ? `<span class="tag mid">½</span>` : `<span class="tag bad">✘</span>`);
    return `<section class="card">
      <h2>Revisión detallada</h2>
      ${parts.map(([k, name]) => {
        const list = items.filter((i) => i.part === k);
        if (!list.length) return "";
        return `<details ${k === "formulas" ? "open" : ""}><summary>${name} (${list.filter((i) => i.score >= 1).length}/${list.length})</summary>
          <ul class="review">${list.map((i) => `
            <li>${icon(i.score)} <span class="tag">${LEVELS[i.level - 1].short}</span> ${esc(i.label)}
              ${k === "formulas" ? `<div class="small">Tu respuesta: <code>${esc(i.given)}</code>${i.score < 1 ? ` · Sugerida: <code>${esc(i.correct)}</code>` : ""}</div>` : ""}
              ${k === "teoria" && i.score < 1 ? `<div class="small">Tu respuesta: ${esc(i.given)} · Correcta: <b>${esc(i.correct)}</b></div>` : ""}
              ${i.note ? `<div class="small muted">${esc(i.note)}</div>` : ""}
            </li>`).join("")}</ul></details>`;
      }).join("")}
    </section>`;
  }

  // ---------------------------------------------------------------------------
  // Inicio
  // ---------------------------------------------------------------------------
  confirmClick(document.getElementById("restartBtn"), "¿Borrar el avance?", () => { state = fresh(); save(); render(); });
  document.getElementById("academyName").textContent = cfg.academyName;
  document.getElementById("footerText").textContent = `${cfg.academyName}${cfg.instructorName ? " · " + cfg.instructorName : ""}`;
  document.title = `Test de Nivel Excel · ${cfg.academyName}`;
  if (!window.HyperFormula || !window.ExcelJS || !window.JSZip) {
    app.innerHTML = `<div class="card warn">No se pudieron cargar las librerías necesarias. Revisa tu conexión a internet y recarga la página.</div>`;
    return;
  }
  render();
})();
