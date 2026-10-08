/*
 * Cálculo de nota, nivel y ruta de aprendizaje.
 * Recibe una lista de ítems { id, part, level, topic, score (0..1) }.
 */
(function () {
  function compute(items) {
    const cfg = window.APP_CONFIG;
    const { LEVELS, TOPICS } = window.CONTENT;
    const pts = (lvl) => cfg.pointsPerLevel[lvl] || 1;

    let earned = 0, possible = 0;
    const byLevel = {}, byTopic = {}, byPart = {};
    const add = (map, key, e, p) => {
      map[key] = map[key] || { earned: 0, possible: 0 };
      map[key].earned += e; map[key].possible += p;
    };
    items.forEach((it) => {
      const p = pts(it.level), e = p * it.score;
      earned += e; possible += p;
      add(byLevel, it.level, e, p);
      add(byTopic, it.topic, e, p);
      add(byPart, it.part, e, p);
    });
    const pct = (o) => (o && o.possible ? Math.round((o.earned / o.possible) * 100) : null);

    const levelPct = LEVELS.map((l) => ({ ...l, pct: pct(byLevel[l.id]) ?? 0 }));
    // Nivel alcanzado = último nivel aprobado de forma consecutiva.
    let reached = 0;
    for (const l of levelPct) {
      if (l.pct >= cfg.levelPassThreshold) reached = l.id; else break;
    }
    const next = levelPct.find((l) => l.id === reached + 1);
    const levelName = reached === 0 ? "Inicial" : LEVELS[reached - 1].name;
    let levelLabel = levelName;
    if (next && next.pct >= cfg.levelPassThreshold - 20) levelLabel += ` (avanzando hacia ${next.name})`;

    const topics = TOPICS.map((t) => {
      const p = pct(byTopic[t.id]);
      let status = "sin evaluar";
      if (p !== null) status = p >= cfg.topicMastered ? "dominado" : p >= cfg.topicReinforce ? "reforzar" : "aprender";
      return { ...t, pct: p, status };
    });

    // Ruta: temas no dominados, por nivel; primero los de "reforzar" del nivel actual.
    const path = topics
      .filter((t) => t.status === "reforzar" || t.status === "aprender")
      .sort((a, b) => a.level - b.level || (a.status === "reforzar" ? -1 : 1) - (b.status === "reforzar" ? -1 : 1));
    // Horas estimadas: un tema a reforzar toma la mitad que uno nuevo.
    const pathHours = path.reduce((s, t) => s + (t.status === "reforzar" ? Math.ceil(t.hours / 2) : t.hours), 0);

    return {
      score: possible ? Math.round((earned / possible) * 100) : 0,
      earned: Math.round(earned * 10) / 10,
      possible,
      reached, levelName, levelLabel, levelPct,
      parts: Object.fromEntries(Object.entries(byPart).map(([k, v]) => [k, pct(v)])),
      topics, path, pathHours,
    };
  }

  window.Scoring = { compute };
})();
