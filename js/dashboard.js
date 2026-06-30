/* =====================================================================
   DASHBOARD v2 — gráficos do laudo atual + histórico salvo no navegador.
   Sem bibliotecas externas (funciona offline / GitHub Pages).
   Novidades desta versão:
     • Scorecard: índice de conformidade (arco), radar de perfil e mapa de seções
     • Tooltips interativos nos gráficos (passar o mouse)
     • Barras arredondadas, grades e legendas mais limpas
     • CEV de soldabilidade (aços) e comparativo atual × histórico
     • Modo de impressão / salvar PDF
   ===================================================================== */
(function () {
  "use strict";

  var CHAVE_ATUAL = "homologacao_dados";
  var CHAVE_HISTORICO = "homologacao_historico";
  var saida;

  var FONTE = '"Cera Pro", Verdana, Geneva, Tahoma, sans-serif';

  var VEREDITO = {
    conforme:    { txt:"Conforme", classe:"ok", pontos:3 },
    ressalvas:   { txt:"Com ressalvas", classe:"atencao", pontos:2 },
    naoConforme: { txt:"Não conforme", classe:"erro", pontos:1 },
    semDados:    { txt:"Sem dados", classe:"na", pontos:0 }
  };

  // Rótulos das seções para o mapa / radar
  var LABEL_SECAO = { quimica:"Análise química", metalografia:"Metalografia", ferrofundido:"Ferro fundido", dureza:"Dureza", tracao:"Tração", impacto:"Impacto" };
  var SUB_SECAO   = { quimica:"Composição e impurezas", metalografia:"Microestrutura e grão", ferrofundido:"Grafita, matriz e CE", dureza:"Brinell", tracao:"Resistência e ductilidade", impacto:"Tenacidade Charpy" };
  var LABEL_RADAR = { quimica:"Química", metalografia:"Metalog.", ferrofundido:"F. fundido", dureza:"Dureza", tracao:"Tração", impacto:"Impacto" };

  // ---- utilidades ----------------------------------------------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function n(v) {
    if (v === "" || v === null || v === undefined) return null;
    var x = parseFloat(String(v).replace(",", "."));
    return isNaN(x) ? null : x;
  }
  function fmt(v, casas) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: casas == null ? 3 : casas });
  }
  function css(nome, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return v || fallback;
  }
  function cores() {
    return {
      azul: css("--rumo-azul", "#003865"),
      azulClaro: css("--rumo-azul-claro", "#32A6E6"),
      verde: css("--rumo-verde", "#1E9F7F"),
      verdeClaro: css("--rumo-verde-claro", "#7FE06C"),
      amarelo: css("--rumo-amarelo", "#FBD300"),
      laranja: css("--rumo-laranja", "#F78344"),
      erro: css("--rumo-erro", "#D84545"),
      cinza: css("--rumo-cinza-200", "#D7E0E5"),
      cinza3: css("--rumo-cinza-300", "#CAD6DD"),
      texto: css("--rumo-texto", "#4D626F"),
      claro: css("--rumo-cinza-50", "#F2F5F6")
    };
  }

  function lerJSON(chave) {
    try { return JSON.parse(localStorage.getItem(chave)); } catch (e) { return null; }
  }
  function lerAtual() { return lerJSON(CHAVE_ATUAL); }
  function lerHistorico() {
    var bruto = lerJSON(CHAVE_HISTORICO) || [];
    if (!Array.isArray(bruto)) return [];
    return bruto.map(function (item, idx) {
      var dados = item && item.dados ? item.dados : item;
      return { id: item.id || ("hist_" + idx), criadoEm: item.criadoEm || "", dados: dados };
    }).filter(function (item) { return item.dados; });
  }
  function salvarHistorico(historico) {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico.slice(-80)));
  }
  function assinatura(dados) { return JSON.stringify(dados || {}); }
  function garantirAtualNoHistorico(atual) {
    if (!atual) return lerHistorico();
    var historico = lerHistorico();
    var sigAtual = assinatura(atual);
    var existe = historico.some(function (h) { return assinatura(h.dados) === sigAtual; });
    if (!existe) {
      historico.push({ id:"laudo_" + Date.now(), criadoEm:new Date().toISOString(), dados:atual });
      salvarHistorico(historico);
    }
    return historico;
  }
  function analisar(dados) {
    return window.ANALISE.analisar(dados, window.LIMITES);
  }

  function dataCurta(iso, fallback) {
    if (!iso) return fallback || "Laudo";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return fallback || "Laudo";
    return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
  }

  function calcCE(dados) {
    var q = dados.quimica || {};
    var c = n(q.C), si = n(q.Si), pval = n(q.P);
    if (c === null || si === null) return null;
    return c + si / 3 + (pval || 0) / 3;
  }
  // Carbono equivalente de soldabilidade (IIW) — apenas aços
  function calcCEV(dados) {
    var q = dados.quimica || {};
    var C = n(q.C); if (C === null) return null;
    function g(k){ return n(q[k]) || 0; }
    return C + g("Mn")/6 + (g("Cr") + g("Mo") + g("V"))/5 + (g("Ni") + g("Cu"))/15;
  }

  // ---- pontuação por seção ------------------------------------------
  function scoreSecao(secao) {
    var okc = 0, obsc = 0, critc = 0;
    (secao.itens || []).forEach(function (it) {
      if (it.status === "ok") okc++;
      else if (it.status === "fora") { if (it.severidade === "critico") critc++; else obsc++; }
    });
    var av = okc + obsc + critc;
    return {
      ok: okc, obs: obsc, crit: critc, av: av,
      score: av ? Math.round(((okc + 0.5 * obsc) / av) * 100) : null,
      status: critc ? "erro" : (obsc ? "atencao" : (av ? "ok" : "na"))
    };
  }
  function indiceConformidade(r) {
    var av = r.resumo.avaliados;
    if (!av) return null;
    return Math.round(((r.resumo.ok + 0.5 * r.resumo.observacoes) / av) * 100);
  }

  // ---- tooltip --------------------------------------------------------
  var TIP = null;
  function tipEl() {
    if (!TIP) { TIP = document.createElement("div"); TIP.className = "dash-tooltip"; TIP.style.display = "none"; document.body.appendChild(TIP); }
    return TIP;
  }
  function onMove(e) {
    var c = e.currentTarget, rect = c.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    var hits = c._hits || [], found = null;
    for (var i = hits.length - 1; i >= 0; i--) {
      var hh = hits[i];
      if (x >= hh.x && x <= hh.x + hh.w && y >= hh.y && y <= hh.y + hh.h) { found = hh; break; }
    }
    var t = tipEl();
    if (found) {
      t.innerHTML = "<b>" + esc(found.title) + "</b>" + (found.lines || []).filter(Boolean).map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("");
      t.style.display = "block";
      var tw = t.offsetWidth, x2 = e.clientX + 14;
      if (x2 + tw > window.innerWidth - 8) x2 = e.clientX - tw - 14;
      t.style.left = Math.max(8, x2) + "px";
      t.style.top = (e.clientY + 16) + "px";
    } else { t.style.display = "none"; }
  }
  function hit(c, x, y, w, h, title, lines) {
    if (c && c._hits) c._hits.push({ x:x, y:y, w:w, h:h, title:title, lines:lines || [] });
  }

  // ---- base de canvas -------------------------------------------------
  function prepararCanvas(canvas, altura) {
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var largura = Math.max(280, canvas.parentElement.clientWidth - 2);
    canvas.style.height = altura + "px";
    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);
    canvas.style.width = largura + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largura, altura);
    ctx.font = "12px " + FONTE;
    canvas._hits = [];
    if (!canvas._tip) {
      canvas._tip = true;
      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mouseleave", function () { tipEl().style.display = "none"; });
    }
    return { ctx:ctx, w:largura, h:altura, c:cores() };
  }
  function semDados(canvas, texto) {
    var p = prepararCanvas(canvas, 210); if (!p) return;
    p.ctx.fillStyle = p.c.texto; p.ctx.textAlign = "center"; p.ctx.font = "12px " + FONTE;
    wrapText(p.ctx, texto || "Sem dados suficientes para este gráfico.", 24, p.h / 2, p.w - 48, 17, "center");
  }
  // caminho de retângulo arredondado
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, h / 2, w / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
    if (align) ctx.textAlign = align;
    var ax = align === "center" ? x + maxWidth / 2 : x;
    var words = String(text || "").split(" "), line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + " ";
      if (ctx.measureText(test).width > maxWidth && i > 0) { ctx.fillText(line, ax, y); line = words[i] + " "; y += lineHeight; }
      else line = test;
    }
    ctx.fillText(line, ax, y);
    return y;
  }

  function rowsDeSecao(r, id) {
    var secao = r.secoes.filter(function (s) { return s.id === id; })[0];
    if (!secao) return [];
    return secao.itens.filter(function (it) { return it.barra && n(it.valor) !== null; });
  }

  // =====================================================================
  //  BLOCOS DE HTML
  // =====================================================================
  function cardKPI(titulo, valor, legenda, classe) {
    return '<div class="dash-kpi dash-kpi--' + (classe || "") + '">' +
      '<span>' + titulo + '</span><b>' + valor + '</b><small>' + legenda + '</small></div>';
  }

  function resumoHTML(dados, r, historico) {
    var id = dados.identificacao || {};
    var V = VEREDITO[r.veredito] || VEREDITO.semDados;
    var titulo = id.amostra || "Último laudo analisado";
    var idx = indiceConformidade(r);
    var meta = [];
    if (id.material) meta.push(esc(id.material));
    if (id.fornecedor) meta.push("Fornecedor: " + esc(id.fornecedor));
    if (id.laudo) meta.push("Laudo: " + esc(id.laudo));
    if (id.data) meta.push("Ensaio: " + esc(id.data));

    return '' +
      '<section class="dash-hero dash-hero--' + V.classe + '">' +
        '<div>' +
          '<p class="eyebrow">Visão geral do laudo</p>' +
          '<h2>' + esc(titulo) + '</h2>' +
          '<p>' + (meta.length ? meta.join(" · ") : "Sem identificação preenchida. O dashboard usa os valores do último relatório salvo.") + '</p>' +
        '</div>' +
        '<div class="dash-hero__dir">' +
          (idx != null ? '<div class="dash-hero__indice"><b>' + idx + '%</b><span>conformidade</span></div>' : '') +
          '<div class="dash-selo">' + esc(V.txt) + '</div>' +
        '</div>' +
      '</section>' +
      '<section class="dash-kpis">' +
        cardKPI("Parâmetros avaliados", r.resumo.avaliados, "Itens com valor informado", "azul") +
        cardKPI("Dentro", r.resumo.ok, "Sem desvio na faixa de referência", "ok") +
        cardKPI("Atenção", r.resumo.observacoes, "Ressalvas técnicas", "atencao") +
        cardKPI("Fora crítico", r.resumo.criticos, "Impactam a homologação", "erro") +
        cardKPI("Histórico", historico.length, "Laudos salvos neste navegador", "azul") +
      '</section>';
  }

  function mapaSecoesHTML(r) {
    var corDot = { ok:"var(--rumo-verde)", atencao:"var(--rumo-amarelo)", erro:"var(--rumo-erro)", na:"var(--rumo-cinza-300)" };
    var linhas = r.secoes.map(function (s) {
      var sc = scoreSecao(s);
      var pct = sc.score == null ? 0 : sc.score;
      var pills = "";
      if (sc.ok) pills += '<span class="mapa-pill pill-ok">' + sc.ok + " ok</span>";
      if (sc.obs) pills += '<span class="mapa-pill pill-at">' + sc.obs + " at</span>";
      if (sc.crit) pills += '<span class="mapa-pill pill-er">' + sc.crit + " fora</span>";
      if (!sc.av) pills = '<span class="mapa-pill pill-na">s/ dado</span>';
      return '<div class="mapa-linha">' +
          '<span class="mapa-dot" style="background:' + corDot[sc.status] + '"></span>' +
          '<span class="mapa-nome">' + esc(LABEL_SECAO[s.id] || s.titulo) + '<small>' + esc(SUB_SECAO[s.id] || s.subtitulo || "") + '</small></span>' +
          '<span class="mapa-mini"><i style="width:' + pct + '%;background:' + corDot[sc.status] + '"></i></span>' +
          '<span class="mapa-contagem">' + pills + '</span>' +
        '</div>';
    }).join("");
    return '<div class="mapa-secoes">' + linhas + '</div>';
  }

  function scorecardHTML(r) {
    return '' +
      '<section class="dash-scorecard">' +
        '<div class="score-card score-card--destaque">' +
          '<div class="score-card__head"><h2>Índice de conformidade</h2><p>Itens sem desvio (ressalvas valem meio) sobre o total avaliado.</p></div>' +
          '<div class="score-card__body"><canvas id="chart-indice" class="chart-canvas" role="img" aria-label="Índice de conformidade"></canvas></div>' +
        '</div>' +
        '<div class="score-card">' +
          '<div class="score-card__head"><h2>Perfil do material</h2><p>Conformidade por dimensão de ensaio (0–100).</p></div>' +
          '<div class="score-card__body"><canvas id="chart-radar" class="chart-canvas" role="img" aria-label="Perfil do material"></canvas></div>' +
        '</div>' +
        '<div class="score-card">' +
          '<div class="score-card__head"><h2>Mapa de seções</h2><p>Status e contagem por bloco do laudo.</p></div>' +
          '<div class="score-card__body">' + mapaSecoesHTML(r) + '</div>' +
        '</div>' +
      '</section>';
  }

  function canvasCard(id, titulo, legenda, legendaChips) {
    return '' +
      '<section class="chart-card">' +
        '<div class="chart-card__head"><div><h2>' + titulo + '</h2><p>' + legenda + '</p></div></div>' +
        (legendaChips || '') +
        '<canvas id="' + id + '" class="chart-canvas" role="img" aria-label="' + esc(titulo) + '"></canvas>' +
      '</section>';
  }
  function legendaChips(itens) {
    return '<div class="chart-legenda">' + itens.map(function (it) {
      return '<span><i style="background:' + it.cor + '"></i>' + esc(it.txt) + '</span>';
    }).join("") + '</div>';
  }

  function conclusoesHTML(r) {
    var pontos = [];
    r.secoes.forEach(function (secao) {
      secao.itens.forEach(function (it) {
        if (it.status === "fora") pontos.push({ item:it.rotulo, sev:it.severidade, parecer:it.parecer });
      });
    });
    if (!pontos.length) {
      return '<div class="dash-insights"><h2>Leitura rápida</h2><p>Não há parâmetros fora da faixa no último laudo. Mesmo assim, confirme se os limites cadastrados representam a norma ou especificação real da peça antes de homologar.</p></div>';
    }
    pontos.sort(function (a, b) { return (a.sev === "critico" ? 0 : 1) - (b.sev === "critico" ? 0 : 1); });
    return '' +
      '<div class="dash-insights"><h2>Leitura rápida dos desvios</h2>' +
        '<ul>' + pontos.slice(0, 6).map(function (p) {
          var tag = p.sev === "critico" ? "Crítico" : "Atenção";
          return '<li><strong>' + esc(tag) + ' · ' + esc(p.item) + ':</strong> ' + esc(p.parecer) + '</li>';
        }).join("") + '</ul>' +
      '</div>';
  }

  function controlesHTML() {
    return '' +
      '<div class="acoes dash-acoes">' +
        '<a class="btn btn--secundario" href="index.html">← Inserir ou editar laudo</a>' +
        '<a class="btn btn--secundario" href="resultados.html">Ver parecer detalhado</a>' +
        '<button type="button" class="btn btn--secundario" id="btn-imprimir">Imprimir / salvar PDF</button>' +
        '<button type="button" class="btn btn--fantasma" id="btn-limpar-historico">Limpar histórico do dashboard</button>' +
      '</div>';
  }

  function secaoGraficosHTML(historico) {
    var c = cores();
    var histLegenda = historico.length > 1
      ? "Tendência dos laudos salvos no navegador."
      : "Aparece como tendência quando houver mais de um laudo salvo.";
    return '' +
      // Tendência geral
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-historico", "Evolução dos pareceres", histLegenda) +
        canvasCard("chart-comparativo", "Comparativo mecânico — atual × histórico", "Dureza, resistência e Charpy do laudo atual frente à média e ao melhor salvos.",
          legendaChips([{cor:c.azul,txt:"Atual"},{cor:c.cinza3,txt:"Média"},{cor:c.verde,txt:"Melhor"}])) +
      '</section>' +

      // 1) Química
      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">1</span><h2>Análise química</h2><p class="legenda">Elementos, impurezas, classe metalúrgica e soldabilidade</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-quimica", "Mapa de conformidade química", "Cada elemento normalizado contra a faixa/limite cadastrado.") +
        canvasCard("chart-impurezas", "Impurezas críticas — P e S", "Quanto menor o percentual do teto, mais limpo o material.") +
      '</section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-carbono", "Carbono e classe metalúrgica", "Aço baixo/médio/alto carbono ou provável ferro fundido.") +
        canvasCard("chart-quimica-valores", "Teores químicos informados", "Comparação visual dos elementos medidos em % de massa.") +
      '</section>' +
      '<section class="dashboard-grid">' +
        canvasCard("chart-cev", "Soldabilidade — carbono equivalente (CEV)", "CEV = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15. Estimativa só para aços; ferro fundido usa o CE de fundição.") +
      '</section>' +

      // 2) Ferro fundido
      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">2</span><h2>Ferro fundido</h2><p class="legenda">Grafita, matriz, nodularidade e carbono equivalente</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-ferro-tipo", "Tipo de ferro fundido", "Cruza carbono, grafita observada, Mg e carbono equivalente.") +
        canvasCard("chart-ferro-matriz", "Matriz e controles metalográficos", "Nodularidade, nódulos, ferrita, perlita, cementita e CE normalizados.") +
      '</section>' +

      // 3) Metalografia
      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">3</span><h2>Metalografia / micrografia</h2><p class="legenda">Microestrutura, grão, inclusões e descarbonetação</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-metalografia", "Critérios metalográficos", "Grão ASTM, inclusões ASTM E45 e descarbonetação superficial.") +
        canvasCard("chart-microstatus", "Coerência da microestrutura", "Compara a microestrutura observada com o esperado pelo teor de carbono.") +
      '</section>' +

      // 4) Dureza
      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">4</span><h2>Dureza</h2><p class="legenda">Brinell e estimativa de resistência</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-dureza", "Dureza Brinell — HB", "Mostra se a dureza caiu abaixo, dentro ou acima da faixa cadastrada.") +
        canvasCard("chart-hb-uts", "Dureza × resistência estimada", "Estimativa UTS ≈ fator cadastrado × HB para checagem cruzada.") +
      '</section>' +

      // 5) Tração
      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">5</span><h2>Ensaio de tração</h2><p class="legenda">Resistência e ductilidade</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-tracao", "Parâmetros de tração", "LE, LR, alongamento e redução de área normalizados por critério.") +
        canvasCard("chart-tracao-historico", "Tendência mecânica", "Evolução normalizada de HB, LR e Charpy nos laudos salvos.") +
      '</section>' +

      // 6) Impacto
      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">6</span><h2>Ensaio de impacto</h2><p class="legenda">Tenacidade Charpy e temperatura</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-impacto", "Energia Charpy", "Tenacidade mínima do material na condição ensaiada.") +
        canvasCard("chart-impacto-temp", "Impacto × temperatura", "Mostra a energia absorvida junto com a temperatura informada no laudo.") +
      '</section>';
  }

  function vazioHTML() {
    return '' +
      '<div class="vazio card">' +
        '<img src="assets/rumo/rumo-logo-azul.png" alt="Rumo">' +
        '<h2>Nenhum dado para montar o dashboard</h2>' +
        '<p>Volte para a página de parâmetros, preencha os valores do relatório laboratorial e clique em “Analisar laudo”. Depois disso o Dashboard será gerado automaticamente.</p>' +
        '<a class="btn btn--primario" href="index.html">Ir para os parâmetros →</a>' +
      '</div>';
  }

  // =====================================================================
  //  GRÁFICOS — SCORECARD
  // =====================================================================
  function drawIndice(canvas, pct, veredito) {
    var p = prepararCanvas(canvas, 218); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var cx = p.w / 2, cy = 122, r = 78, lw = 20;
    var a0 = Math.PI * 0.75, a1 = a0 + Math.PI * 1.5; // arco de 270°
    ctx.lineWidth = lw; ctx.lineCap = "round";
    ctx.strokeStyle = c.cinza; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();

    if (pct == null) {
      ctx.fillStyle = c.texto; ctx.textAlign = "center"; ctx.font = "13px " + FONTE;
      ctx.fillText("Sem parâmetros avaliados", cx, cy);
      return;
    }
    var col = pct >= 85 ? c.verde : (pct >= 60 ? c.amarelo : c.erro);
    var aa = a0 + (a1 - a0) * (pct / 100);
    ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, a0, aa); ctx.stroke();

    ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "800 40px " + FONTE;
    ctx.fillText(pct + "%", cx, cy + 8);
    ctx.font = "12px " + FONTE; ctx.fillStyle = c.texto; ctx.fillText("conformidade", cx, cy + 30);

    // selo de veredito desenhado
    var V = VEREDITO[veredito] || VEREDITO.semDados;
    var corV = V.classe === "ok" ? c.verde : (V.classe === "atencao" ? c.amarelo : (V.classe === "erro" ? c.erro : c.cinza3));
    var txt = V.txt.toUpperCase();
    ctx.font = "800 12px " + FONTE;
    var tw = ctx.measureText(txt).width, padX = 14, bw = tw + padX * 2, bh = 26, bx = cx - bw / 2, by = cy + r - 6;
    ctx.fillStyle = V.classe === "atencao" ? "rgba(251,211,0,.20)" : (V.classe === "ok" ? "rgba(30,159,127,.14)" : (V.classe === "erro" ? "rgba(216,69,69,.13)" : "rgba(0,0,0,.05)"));
    rr(ctx, bx, by, bw, bh, 13); ctx.fill();
    ctx.fillStyle = V.classe === "atencao" ? "#6b5600" : corV; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(txt, cx, by + bh / 2 + 1); ctx.textBaseline = "alphabetic";

    hit(canvas, cx - r - lw, cy - r - lw, (r + lw) * 2, (r + lw) * 2, "Índice de conformidade: " + pct + "%",
      ["Veredito: " + V.txt, "Itens sem desvio ponderados sobre o total avaliado."]);
  }

  function drawRadar(canvas, eixos) {
    eixos = (eixos || []).filter(function (e) { return e.score != null; });
    if (eixos.length < 3) { semDados(canvas, "Informe mais ensaios (química, dureza, tração, impacto…) para traçar o perfil."); return; }
    var p = prepararCanvas(canvas, 218); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var cx = p.w / 2, cy = 116, R = 74, N = eixos.length;
    function pt(i, rad) { var ang = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]; }

    ctx.strokeStyle = c.cinza; ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      ctx.beginPath();
      for (var i = 0; i < N; i++) { var q = pt(i, R * f); if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
      ctx.closePath(); ctx.stroke();
    });
    ctx.fillStyle = c.texto; ctx.font = "11px " + FONTE;
    for (var i = 0; i < N; i++) {
      var q = pt(i, R);
      ctx.strokeStyle = c.cinza; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(q[0], q[1]); ctx.stroke();
      var lp = pt(i, R + 13);
      ctx.textAlign = Math.abs(lp[0] - cx) < 8 ? "center" : (lp[0] > cx ? "left" : "right");
      ctx.fillText(eixos[i].label, lp[0], lp[1] + 3);
    }
    // polígono de dados
    ctx.beginPath();
    for (var j = 0; j < N; j++) { var d = pt(j, R * eixos[j].score / 100); if (j === 0) ctx.moveTo(d[0], d[1]); else ctx.lineTo(d[0], d[1]); }
    ctx.closePath();
    ctx.fillStyle = "rgba(30,159,127,.18)"; ctx.fill();
    ctx.strokeStyle = c.verde; ctx.lineWidth = 2; ctx.stroke();
    for (var k = 0; k < N; k++) {
      var e = pt(k, R * eixos[k].score / 100);
      ctx.fillStyle = c.verde; ctx.beginPath(); ctx.arc(e[0], e[1], 3.5, 0, Math.PI * 2); ctx.fill();
      hit(canvas, e[0] - 10, e[1] - 10, 20, 20, eixos[k].labelFull + ": " + eixos[k].score + "/100", [eixos[k].sub || ""]);
    }
  }

  // =====================================================================
  //  GRÁFICOS — barras / faixas (com tooltips e cantos arredondados)
  // =====================================================================
  function drawNormalizado(canvas, rows, opts) {
    opts = opts || {};
    if (!rows.length) { semDados(canvas, "Sem parâmetros com faixa para exibir aqui."); return; }
    var altura = Math.max(220, 56 + rows.length * 34);
    var p = prepararCanvas(canvas, altura); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = opts.left || 160, right = 64, top = 22, rowH = 32;
    var largura = p.w - left - right;

    ctx.font = "12px " + FONTE;
    rows.forEach(function (it, i) {
      var y = top + i * rowH;
      var b = it.barra;
      var label = it.rotulo.replace(/\s*—.*$/, "").replace(/\s*\(.+$/, "");
      if (label.length > 24) label = label.slice(0, 23) + "…";
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.fillText(label, 12, y + 15);

      ctx.fillStyle = c.cinza; rr(ctx, left, y + 5, largura, 10, 5); ctx.fill();
      ctx.fillStyle = "rgba(30,159,127,.28)";
      var fx = left + largura * b.faixaIni / 100, fw = largura * (b.faixaFim - b.faixaIni) / 100;
      rr(ctx, fx, y + 5, Math.max(2, fw), 10, 5); ctx.fill();

      var px = left + largura * b.posicao / 100;
      ctx.fillStyle = it.status === "fora" ? c.erro : c.azul;
      rr(ctx, px - 2.5, y, 5, 20, 2.5); ctx.fill();

      ctx.fillStyle = c.texto; ctx.textAlign = "right";
      ctx.fillText(fmt(n(it.valor), 3) + (it.unidade ? " " + it.unidade : ""), p.w - 10, y + 15);
      ctx.textAlign = "left";

      hit(canvas, left, y, largura, 22, it.rotulo, [
        "Valor: " + fmt(n(it.valor), 3) + (it.unidade ? " " + it.unidade : ""),
        "Faixa de referência: " + fmt(b.rotuloMin, 3) + " – " + fmt(b.rotuloMax, 3),
        it.status === "fora" ? "Fora da faixa" : "Dentro da faixa"
      ]);
    });

    ctx.fillStyle = c.texto; ctx.font = "11px " + FONTE; ctx.textAlign = "left";
    ctx.fillText("zona verde = faixa de referência · marcador = valor medido", left, p.h - 12);
  }

  function drawBarValores(canvas, rows, unidade, tituloEixo) {
    rows = rows.filter(function (r) { return n(r.valor) !== null; });
    if (!rows.length) { semDados(canvas); return; }
    var altura = Math.max(220, 60 + rows.length * 27);
    var p = prepararCanvas(canvas, altura); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var valores = rows.map(function (r) { return n(r.valor); });
    var max = Math.max.apply(Math, valores.concat([0.01])) * 1.18;
    var left = 96, right = 60, top = 28, rowH = 26, largura = p.w - left - right;

    // grade vertical
    ctx.strokeStyle = c.claro; ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gx = left + largura * g / 4;
      ctx.beginPath(); ctx.moveTo(gx, top - 6); ctx.lineTo(gx, top + rows.length * rowH - 6); ctx.stroke();
    }
    ctx.font = "11px " + FONTE; ctx.fillStyle = c.texto; ctx.textAlign = "left";
    ctx.fillText(tituloEixo || "valor informado", left, 15);

    rows.forEach(function (r, i) {
      var y = top + i * rowH;
      var val = n(r.valor);
      var label = (r.rotulo || "").replace(/\s*\(.+$/, "").replace(/\s*—.*$/, "");
      if (label.length > 11) label = label.slice(0, 10) + "…";
      ctx.fillStyle = c.texto; ctx.textAlign = "right"; ctx.font = "12px " + FONTE; ctx.fillText(label, left - 10, y + 14);
      ctx.fillStyle = c.cinza; rr(ctx, left, y + 4, largura, 11, 5); ctx.fill();
      var bw = Math.max(2, largura * val / max);
      var grad = ctx.createLinearGradient(left, 0, left + bw, 0);
      var base = r.status === "fora" ? c.erro : c.azulClaro;
      grad.addColorStop(0, base); grad.addColorStop(1, r.status === "fora" ? c.erro : c.azul);
      ctx.fillStyle = grad; rr(ctx, left, y + 4, bw, 11, 5); ctx.fill();
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.fillText(fmt(val, 3) + (unidade ? " " + unidade : ""), left + bw + 8, y + 14);
      hit(canvas, left, y, largura, 19, r.rotulo, ["Valor: " + fmt(val, 3) + (unidade ? " " + unidade : "")]);
    });
  }

  function drawImpurezas(canvas, dados) {
    var specs = (window.LIMITES.quimica || []).filter(function (s) { return s.tipo === "impureza"; });
    var rows = specs.map(function (s) {
      var val = n((dados.quimica || {})[s.chave]);
      return { label:s.chave, rotulo:s.rotulo, valor:val, limite:s.limite, pct: val === null ? null : (val / s.limite) * 100 };
    }).filter(function (r) { return r.valor !== null; });
    if (!rows.length) { semDados(canvas, "Informe P e S para enxergar as impurezas críticas."); return; }
    var p = prepararCanvas(canvas, 240); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = 70, top = 46, largura = p.w - 116, barH = 24;
    ctx.fillStyle = c.texto; ctx.font = "12px " + FONTE; ctx.textAlign = "left"; ctx.fillText("% do limite máximo permitido", left, 22);
    rows.forEach(function (r, i) {
      var y = top + i * 70;
      var pctLim = Math.min(140, r.pct || 0);
      ctx.fillStyle = c.azul; ctx.textAlign = "right"; ctx.font = "700 15px " + FONTE; ctx.fillText(r.label, left - 16, y + 17);
      ctx.fillStyle = c.cinza; rr(ctx, left, y, largura, barH, 7); ctx.fill();
      ctx.fillStyle = r.pct > 100 ? c.erro : (r.pct > 75 ? c.amarelo : c.verde);
      rr(ctx, left, y, Math.max(3, largura * pctLim / 140), barH, 7); ctx.fill();
      // linha do limite (100%)
      var lx = left + largura * 100 / 140;
      ctx.strokeStyle = c.erro; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(lx, y - 7); ctx.lineTo(lx, y + barH + 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.erro; ctx.font = "10px " + FONTE; ctx.textAlign = "center"; ctx.fillText("limite", lx, y - 11);
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.font = "12px " + FONTE;
      ctx.fillText(fmt(r.valor, 3) + "% de " + fmt(r.limite, 3) + "% máx. (" + Math.round(r.pct) + "% do teto)", left, y + 47);
      hit(canvas, left, y - 7, largura, barH + 14, r.rotulo, ["Medido: " + fmt(r.valor, 3) + "%", "Teto: " + fmt(r.limite, 3) + "%", Math.round(r.pct) + "% do limite", r.pct > 100 ? "Acima do teto" : "Dentro do teto"]);
    });
  }

  function drawCarbono(canvas, dados) {
    var val = n((dados.quimica || {}).C);
    if (val === null) { semDados(canvas, "Informe o carbono para classificar aço ou ferro fundido."); return; }
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = 32, right = 30, y = 104, largura = p.w - left - right;
    var max = Math.max(4.8, val * 1.12);
    function x(v) { return left + largura * Math.min(max, Math.max(0, v)) / max; }
    var zonas = [
      { ini:0, fim:0.30, cor:c.verde, txt:"aço baixo C" },
      { ini:0.30, fim:0.60, cor:c.azulClaro, txt:"aço médio C" },
      { ini:0.60, fim:1.40, cor:c.laranja, txt:"aço alto C" },
      { ini:1.40, fim:2.11, cor:c.amarelo, txt:"aço especial" },
      { ini:2.11, fim:max, cor:c.erro, txt:"ferro fundido" }
    ];
    zonas.forEach(function (z) {
      ctx.fillStyle = z.cor; ctx.fillRect(x(z.ini), y, Math.max(0, x(z.fim) - x(z.ini)), 34);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "700 10px " + FONTE;
      if (x(z.fim) - x(z.ini) > 54) ctx.fillText(z.txt, (x(z.ini) + x(z.fim)) / 2, y + 22);
      hit(canvas, x(z.ini), y, Math.max(0, x(z.fim) - x(z.ini)), 34, z.txt, ["Faixa de C: " + fmt(z.ini, 2) + " – " + (z.fim === max ? "+" : fmt(z.fim, 2)) + "%"]);
    });
    ctx.fillStyle = c.azul; var px = x(val); ctx.fillRect(px - 2, y - 16, 4, 66);
    ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "700 24px " + FONTE; ctx.fillText(fmt(val, 3) + "% C", p.w / 2, 42);
    ctx.font = "12px " + FONTE; ctx.fillStyle = c.texto;
    var classe = val > 2.11 ? "provável ferro fundido" : (val < .30 ? "aço baixo carbono" : (val <= .60 ? "aço médio carbono" : (val <= 1.40 ? "aço alto carbono" : "aço especial / validar grau")));
    ctx.fillText("Classificação aproximada: " + classe, p.w / 2, 66);
    ctx.textAlign = "left"; ctx.font = "11px " + FONTE;
    [[.30,"0,30"],[.60,"0,60"],[1.40,"1,40"],[2.11,"2,11"]].forEach(function (m) { ctx.fillText(m[1], x(m[0]) - 12, y + 56); });
    if (val > 2.11) {
      ctx.fillStyle = c.texto;
      wrapText(ctx, "C acima de 2,11% não deve ser tratado como aço comum. Verificar grafita, matriz, Mg e CE.", 32, 200, p.w - 64, 17);
    }
  }

  function calcCEdados(dados) { return n((dados.ferroFundido || {}).CE) != null ? n((dados.ferroFundido || {}).CE) : calcCE(dados); }

  function drawFerroTipo(canvas, dados) {
    var q = dados.quimica || {}, ff = dados.ferroFundido || {}, id = dados.identificacao || {};
    var cval = n(q.C), mg = n(q.Mg), ce = calcCEdados(dados);
    var ehFerro = /Ferro fundido/i.test(id.material || "") || (cval !== null && cval > 2.11) || (ff.tipoGrafita && ff.tipoGrafita !== "Não avaliada");
    if (!ehFerro) { semDados(canvas, "Use este gráfico quando o laudo for de ferro fundido ou C > 2,11%."); return; }
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, cor = p.c;
    var tipo = ff.tipoGrafita || "Não avaliada";
    var matriz = ff.matriz || "Não avaliada";
    ctx.fillStyle = cor.azul; ctx.textAlign = "center"; ctx.font = "700 18px " + FONTE;
    ctx.fillText(id.material || (cval > 2.11 ? "Provável ferro fundido" : "Material não definido"), p.w / 2, 34);
    ctx.fillStyle = cval !== null && cval > 2.11 ? cor.verde : cor.amarelo;
    ctx.beginPath(); ctx.arc(p.w / 2, 88, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "700 16px " + FONTE; ctx.fillText(cval !== null ? fmt(cval, 2) + "% C" : "C —", p.w / 2, 94);
    ctx.fillStyle = cor.texto; ctx.font = "12px " + FONTE;
    ctx.fillText("Grafita: " + tipo, p.w / 2, 142);
    ctx.fillText("Matriz: " + matriz, p.w / 2, 164);
    ctx.fillText("Mg: " + (mg !== null ? fmt(mg, 3) + "%" : "—") + " · CE: " + (ce !== null ? fmt(ce, 2) + "%" : "—"), p.w / 2, 186);
    wrapText(ctx, "A forma da grafita define o tipo; a matriz define o equilíbrio entre resistência, dureza, ductilidade e impacto.", 32, 214, p.w - 64, 16, "center");
  }

  function drawMicroStatus(canvas, r, dados) {
    var secao = r.secoes.filter(function (s) { return s.id === "metalografia"; })[0];
    var item = secao && secao.itens[0];
    var p = prepararCanvas(canvas, 230); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var statusCor = !item || item.status === "na" ? c.cinza3 : (item.status === "fora" ? c.erro : c.verde);
    ctx.fillStyle = statusCor;
    if (ctx.roundRect) { rr(ctx, 34, 45, p.w - 68, 58, 16); ctx.fill(); } else ctx.fillRect(34, 45, p.w - 68, 58);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "700 20px " + FONTE;
    ctx.fillText(item ? (item.status === "fora" ? "Divergente / atenção" : (item.status === "na" ? "Não avaliada" : "Compatível")) : "Sem dados", p.w / 2, 82);
    ctx.fillStyle = c.azul; ctx.font = "700 15px " + FONTE; ctx.fillText("Observada: " + ((dados.microestrutura || {}).observada || "—"), p.w / 2, 136);
    ctx.fillStyle = c.texto; ctx.font = "12px " + FONTE;
    wrapText(ctx, item ? item.parecer : "Sem informação de microestrutura.", 36, 164, p.w - 72, 17, "center");
  }

  // =====================================================================
  //  GRÁFICOS — gauges e mecânicos
  // =====================================================================
  function drawGauge(canvas, valor, min, max, unidade, subtitulo) {
    if (valor === null) { semDados(canvas); return; }
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var cx = p.w / 2, cy = 162, r = 88;
    var domMin = Math.max(0, min * 0.55), domMax = max * 1.35;
    function ang(v) { var t = (Math.max(domMin, Math.min(domMax, v)) - domMin) / (domMax - domMin); return Math.PI + t * Math.PI; }
    ctx.lineWidth = 22; ctx.lineCap = "round";
    ctx.strokeStyle = c.cinza; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = c.verde; ctx.beginPath(); ctx.arc(cx, cy, r, ang(min), ang(max)); ctx.stroke();
    var a = ang(valor);
    ctx.strokeStyle = (valor < min || valor > max) ? c.erro : c.azul;
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8)); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "700 28px " + FONTE; ctx.fillText(fmt(valor, 1) + " " + unidade, cx, 74);
    ctx.font = "12px " + FONTE; ctx.fillStyle = c.texto; ctx.fillText(subtitulo || ("Faixa: " + min + "–" + max + " " + unidade), cx, 96);
    ctx.textAlign = "left"; ctx.font = "11px " + FONTE; ctx.fillText(fmt(min, 0), cx - r - 10, cy + 30);
    ctx.textAlign = "right"; ctx.fillText(fmt(max, 0), cx + r + 10, cy + 30);
    hit(canvas, cx - r, 50, r * 2, cy - 20, "Valor: " + fmt(valor, 1) + " " + unidade, ["Faixa verde aceitável: " + min + "–" + max + " " + unidade, (valor < min || valor > max) ? "Fora da faixa" : "Dentro da faixa"]);
  }

  function drawHbUts(canvas, dados) {
    var hb = n((dados.dureza || {}).hb);
    var lr = n((dados.tracao || {}).LR);
    if (hb === null && lr === null) { semDados(canvas); return; }
    var fator = window.LIMITES.dureza.fatorTracao || 3.45;
    var est = hb === null ? null : hb * fator;
    var rows = [];
    if (est !== null) rows.push({ rotulo:"UTS estimado por HB", valor:est, status:"ok" });
    if (lr !== null) rows.push({ rotulo:"LR medido", valor:lr, status: (est !== null && Math.abs(lr - est) / est > .15) ? "fora" : "ok" });
    drawBarValores(canvas, rows, "MPa", "comparação aproximada de resistência (MPa)");
  }

  function drawCEV(canvas, dados) {
    var q = dados.quimica || {}, id = dados.identificacao || {};
    var C = n(q.C);
    var ehFerro = /Ferro fundido/i.test(id.material || "") || (C !== null && C > 2.11);
    var p = prepararCanvas(canvas, 230); if (!p) return;
    var ctx = p.ctx, c = p.c;

    if (ehFerro) {
      var ce = calcCEdados(dados);
      ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "700 17px " + FONTE;
      ctx.fillText("Material não-aço (ferro fundido)", p.w / 2, 50);
      ctx.fillStyle = c.texto; ctx.font = "12.5px " + FONTE;
      wrapText(ctx, "O carbono equivalente de soldabilidade (CEV) é definido para aços. Para ferro fundido, a referência é o CE de fundição (C + Si/3 + P/3).", 30, 84, p.w - 60, 18, "center");
      ctx.fillStyle = c.verde; ctx.textAlign = "center"; ctx.font = "800 26px " + FONTE;
      ctx.fillText(ce != null ? "CE de fundição: " + fmt(ce, 2) + "%" : "CE de fundição: —", p.w / 2, 168);
      return;
    }
    var cev = calcCEV(dados);
    if (cev === null) { semDados(canvas, "Informe ao menos o carbono para estimar o CEV."); return; }
    var left = 40, right = 40, y = 116, W = p.w - left - right;
    var max = Math.max(0.85, cev * 1.18);
    function x(v) { return left + W * Math.min(max, Math.max(0, v)) / max; }
    var zonas = [
      { ini:0, fim:0.40, cor:c.verde, txt:"boa soldabilidade" },
      { ini:0.40, fim:0.60, cor:c.amarelo, txt:"preaquecimento" },
      { ini:0.60, fim:max, cor:c.laranja, txt:"difícil" }
    ];
    zonas.forEach(function (z) {
      ctx.fillStyle = z.cor; ctx.fillRect(x(z.ini), y, Math.max(0, x(z.fim) - x(z.ini)), 30);
      ctx.fillStyle = z.cor === c.amarelo ? "#6b5600" : "#fff"; ctx.textAlign = "center"; ctx.font = "700 10px " + FONTE;
      if (x(z.fim) - x(z.ini) > 70) ctx.fillText(z.txt, (x(z.ini) + x(z.fim)) / 2, y + 19);
      hit(canvas, x(z.ini), y, Math.max(0, x(z.fim) - x(z.ini)), 30, z.txt, ["Faixa de CEV: " + fmt(z.ini, 2) + " – " + (z.fim === max ? "+" : fmt(z.fim, 2))]);
    });
    var px = x(cev);
    ctx.fillStyle = cores().azul; ctx.fillRect(px - 2, y - 14, 4, 58);
    ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "800 26px " + FONTE; ctx.fillText("CEV " + fmt(cev, 2), p.w / 2, 44);
    var faixaTxt = cev <= 0.40 ? "boa soldabilidade" : (cev <= 0.60 ? "controlar preaquecimento e aporte" : "soldabilidade difícil; cuidados maiores");
    ctx.font = "12px " + FONTE; ctx.fillStyle = c.texto; ctx.fillText("Leitura: " + faixaTxt, p.w / 2, 68);
    ctx.textAlign = "left"; ctx.font = "11px " + FONTE; ctx.fillStyle = c.texto;
    [[0.40,"0,40"],[0.60,"0,60"]].forEach(function (m) { ctx.fillText(m[1], x(m[0]) - 10, y + 50); });
    ctx.textAlign = "center"; ctx.fillText("Estimativa de triagem — a soldagem real depende de procedimento, espessura e norma.", p.w / 2, p.h - 12);
  }

  function drawImpactoTemp(canvas, dados) {
    var cv = n((dados.impacto || {}).CV), temp = n((dados.impacto || {}).TEMP);
    if (cv === null && temp === null) { semDados(canvas); return; }
    var p = prepararCanvas(canvas, 230); if (!p) return;
    var ctx = p.ctx, c = p.c;
    ctx.textAlign = "center";
    // dois "mostradores" lado a lado
    function mostrador(cx, titulo, valor, unidade, cor) {
      ctx.fillStyle = c.texto; ctx.font = "12px " + FONTE; ctx.fillText(titulo, cx, 40);
      ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(cx, 110, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "800 22px " + FONTE; ctx.fillText(valor, cx, 110);
      ctx.fillStyle = c.texto; ctx.font = "11px " + FONTE; ctx.fillText(unidade, cx, 174);
    }
    mostrador(p.w * 0.30, "Energia Charpy", cv !== null ? fmt(cv, 0) : "—", "joules (J)", cv !== null ? c.verde : c.cinza3);
    mostrador(p.w * 0.70, "Temperatura", temp !== null ? fmt(temp, 0) + "°" : "—", "°C do ensaio", c.azul);
    ctx.fillStyle = c.texto; ctx.font = "11px " + FONTE; ctx.textAlign = "center";
    wrapText(ctx, "A energia Charpy só é comparável junto da temperatura de ensaio; energia cai com a queda de temperatura.", 28, 206, p.w - 56, 15, "center");
  }

  // =====================================================================
  //  HISTÓRICO / COMPARATIVO
  // =====================================================================
  function valoresHistoricos(historico) {
    return historico.map(function (h, idx) {
      var r = analisar(h.dados);
      return {
        label: dataCurta(h.criadoEm, "L" + (idx + 1)),
        veredito: r.veredito,
        pontos: (VEREDITO[r.veredito] || VEREDITO.semDados).pontos,
        C: n((h.dados.quimica || {}).C),
        HB: n((h.dados.dureza || {}).hb),
        LR: n((h.dados.tracao || {}).LR),
        CV: n((h.dados.impacto || {}).CV)
      };
    });
  }

  function drawHistorico(canvas, historico) {
    var dados = valoresHistoricos(historico);
    if (dados.length < 2) { semDados(canvas, "Analise mais de um laudo para formar tendência."); return; }
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = 44, right = 18, top = 22, bottom = 46, w = p.w - left - right, h = p.h - top - bottom;
    var niveis = [["—", 0], ["NC", 1], ["R", 2], ["OK", 3]];
    ctx.strokeStyle = c.cinza; ctx.lineWidth = 1;
    niveis.forEach(function (nv) {
      var y = top + h - (nv[1] / 3) * h;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke();
      ctx.fillStyle = c.texto; ctx.textAlign = "right"; ctx.font = "11px " + FONTE; ctx.fillText(nv[0], left - 8, y + 4);
    });
    // área sob a linha
    function xi(i) { return left + (dados.length === 1 ? 0 : i * w / (dados.length - 1)); }
    function yi(d) { return top + h - (d.pontos / 3) * h; }
    ctx.beginPath(); ctx.moveTo(xi(0), top + h);
    dados.forEach(function (d, i) { ctx.lineTo(xi(i), yi(d)); });
    ctx.lineTo(xi(dados.length - 1), top + h); ctx.closePath();
    ctx.fillStyle = "rgba(0,56,101,.06)"; ctx.fill();

    ctx.strokeStyle = c.azul; ctx.lineWidth = 3; ctx.beginPath();
    dados.forEach(function (d, i) { var x = xi(i), y = yi(d); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    dados.forEach(function (d, i) {
      var x = xi(i), y = yi(d);
      ctx.fillStyle = d.veredito === "naoConforme" ? c.erro : (d.veredito === "ressalvas" ? c.amarelo : c.verde);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      if (i % Math.ceil(dados.length / 7) === 0 || i === dados.length - 1) {
        ctx.fillStyle = c.texto; ctx.font = "10px " + FONTE; ctx.textAlign = "center"; ctx.fillText(d.label, x, p.h - 16);
      }
      hit(canvas, x - 9, y - 9, 18, 18, "Laudo " + d.label, ["Veredito: " + (VEREDITO[d.veredito] || VEREDITO.semDados).txt]);
    });
  }

  function drawComparativo(canvas, historico) {
    var vals = valoresHistoricos(historico);
    if (vals.length < 2) { semDados(canvas, "Com dois ou mais laudos aparece o comparativo atual × histórico."); return; }
    var atual = vals[vals.length - 1];
    var metrics = [{ k:"HB", label:"Dureza", u:"HB" }, { k:"LR", label:"Resistência", u:"MPa" }, { k:"CV", label:"Charpy", u:"J" }];
    metrics = metrics.filter(function (m) {
      return vals.some(function (v) { return v[m.k] != null; });
    });
    if (!metrics.length) { semDados(canvas, "Informe dureza, resistência ou Charpy para comparar."); return; }
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var top = 24, bottom = 56, baseY = p.h - bottom;
    var gw = p.w / metrics.length;
    var serieCor = [c.azul, c.cinza3, c.verde];
    var serieNome = ["Atual", "Média", "Melhor"];

    metrics.forEach(function (m, gi) {
      var arr = vals.map(function (v) { return v[m.k]; }).filter(function (v) { return v != null; });
      var avg = arr.reduce(function (s, x) { return s + x; }, 0) / arr.length;
      var best = Math.max.apply(Math, arr);
      var serie = [atual[m.k], avg, best];
      var maxLocal = best * 1.18 || 1;
      var cx = gi * gw, innerW = gw * 0.7, x0 = cx + (gw - innerW) / 2;
      var bw = innerW / 3 - 6;
      serie.forEach(function (vv, si) {
        var bx = x0 + si * (innerW / 3);
        if (vv == null) {
          ctx.fillStyle = c.cinza; ctx.font = "10px " + FONTE; ctx.textAlign = "center"; ctx.fillText("—", bx + bw / 2, baseY - 4);
          return;
        }
        var bh = Math.max(3, (baseY - top) * vv / maxLocal);
        ctx.fillStyle = serieCor[si]; rr(ctx, bx, baseY - bh, bw, bh, 4); ctx.fill();
        ctx.fillStyle = c.texto; ctx.font = "10px " + FONTE; ctx.textAlign = "center";
        ctx.fillText(fmt(vv, 0), bx + bw / 2, baseY - bh - 5);
        hit(canvas, bx, baseY - bh, bw, bh, m.label + " — " + serieNome[si], [fmt(vv, 1) + " " + m.u]);
      });
      ctx.fillStyle = c.azul; ctx.font = "700 12px " + FONTE; ctx.textAlign = "center";
      ctx.fillText(m.label + " (" + m.u + ")", cx + gw / 2, p.h - 30);
      if (gi > 0) { ctx.strokeStyle = c.claro; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, baseY); ctx.stroke(); }
    });
    ctx.strokeStyle = c.cinza; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(p.w, baseY); ctx.stroke();
    // legenda
    var lx = 6;
    serieNome.forEach(function (nm, i) {
      ctx.fillStyle = serieCor[i]; rr(ctx, lx, p.h - 14, 11, 11, 3); ctx.fill();
      ctx.fillStyle = c.texto; ctx.font = "11px " + FONTE; ctx.textAlign = "left"; ctx.fillText(nm, lx + 16, p.h - 5);
      lx += 16 + ctx.measureText(nm).width + 18;
    });
  }

  function drawHistoricoMecanico(canvas, historico) {
    var dados = valoresHistoricos(historico).filter(function (d) { return d.HB !== null || d.LR !== null || d.CV !== null; });
    if (dados.length < 2) { semDados(canvas, "Com dois ou mais laudos, este gráfico mostra tendência mecânica."); return; }
    var c = cores();
    var series = [
      { key:"HB", label:"HB", cor:c.azul },
      { key:"LR", label:"LR", cor:c.verde },
      { key:"CV", label:"Charpy", cor:c.laranja }
    ];
    drawMultiNormalizado(canvas, dados, series);
  }

  function drawMultiNormalizado(canvas, dados, series) {
    var p = prepararCanvas(canvas, 260); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = 42, right = 20, top = 26, bottom = 58, w = p.w - left - right, h = p.h - top - bottom;
    ctx.strokeStyle = c.cinza; ctx.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach(function (v) {
      var y = top + h - (v / 100) * h;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke();
      ctx.fillStyle = c.texto; ctx.textAlign = "right"; ctx.font = "11px " + FONTE; ctx.fillText(v + "%", left - 8, y + 4);
    });
    series.forEach(function (s) {
      var vals = dados.map(function (d) { return d[s.key]; }).filter(function (v) { return v !== null; });
      if (vals.length < 2) return;
      var min = Math.min.apply(Math, vals), max = Math.max.apply(Math, vals);
      if (min === max) { min = 0; max = max || 1; }
      ctx.strokeStyle = s.cor; ctx.lineWidth = 3; ctx.beginPath();
      var iniciou = false;
      dados.forEach(function (d, i) {
        if (d[s.key] === null) return;
        var x = left + i * w / (dados.length - 1);
        var y = top + h - ((d[s.key] - min) / (max - min)) * h;
        if (!iniciou) { ctx.moveTo(x, y); iniciou = true; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      dados.forEach(function (d, i) {
        if (d[s.key] === null) return;
        var x = left + i * w / (dados.length - 1);
        var y = top + h - ((d[s.key] - min) / (max - min)) * h;
        ctx.fillStyle = s.cor; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        hit(canvas, x - 8, y - 8, 16, 16, s.label + " · " + d.label, [fmt(d[s.key], 1)]);
      });
    });
    var x = left;
    series.forEach(function (s) {
      ctx.fillStyle = s.cor; rr(ctx, x, p.h - 30, 12, 12, 3); ctx.fill();
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.font = "11px " + FONTE; ctx.fillText(s.label + " normalizado", x + 16, p.h - 20);
      x += 130;
    });
  }

  // =====================================================================
  //  ORQUESTRAÇÃO
  // =====================================================================
  function renderCharts(dados, r, historico) {
    // Scorecard
    drawIndice(document.getElementById("chart-indice"), indiceConformidade(r), r.veredito);
    var eixos = r.secoes.map(function (s) {
      var sc = scoreSecao(s);
      return {
        label: LABEL_RADAR[s.id] || s.id, labelFull: LABEL_SECAO[s.id] || s.titulo, score: sc.score,
        sub: sc.av ? (sc.ok + " ok · " + sc.obs + " atenção · " + sc.crit + " fora") : "sem dado"
      };
    });
    drawRadar(document.getElementById("chart-radar"), eixos);

    // Tendência geral
    drawHistorico(document.getElementById("chart-historico"), historico);
    drawComparativo(document.getElementById("chart-comparativo"), historico);

    // Química
    drawNormalizado(document.getElementById("chart-quimica"), rowsDeSecao(r, "quimica"), { left:172 });
    drawImpurezas(document.getElementById("chart-impurezas"), dados);
    drawCarbono(document.getElementById("chart-carbono"), dados);
    drawBarValores(document.getElementById("chart-quimica-valores"), rowsDeSecao(r, "quimica"), "%", "teor em % de massa");
    drawCEV(document.getElementById("chart-cev"), dados);

    // Ferro fundido
    drawFerroTipo(document.getElementById("chart-ferro-tipo"), dados);
    drawNormalizado(document.getElementById("chart-ferro-matriz"), rowsDeSecao(r, "ferrofundido"), { left:192 });

    // Metalografia
    drawNormalizado(document.getElementById("chart-metalografia"), rowsDeSecao(r, "metalografia"), { left:182 });
    drawMicroStatus(document.getElementById("chart-microstatus"), r, dados);

    // Dureza
    drawGauge(document.getElementById("chart-dureza"), n((dados.dureza || {}).hb), window.LIMITES.dureza.min, window.LIMITES.dureza.max, "HB", "Faixa de dureza cadastrada");
    drawHbUts(document.getElementById("chart-hb-uts"), dados);

    // Tração
    drawNormalizado(document.getElementById("chart-tracao"), rowsDeSecao(r, "tracao"), { left:182 });
    drawHistoricoMecanico(document.getElementById("chart-tracao-historico"), historico);

    // Impacto
    var cvSpec = (window.LIMITES.impacto || []).filter(function (s) { return s.chave === "CV"; })[0] || { min:27, max:100 };
    drawGauge(document.getElementById("chart-impacto"), n((dados.impacto || {}).CV), cvSpec.min || 0, Math.max((cvSpec.min || 0) * 2.3, n((dados.impacto || {}).CV) || 60), "J", "Energia mínima Charpy cadastrada");
    drawImpactoTemp(document.getElementById("chart-impacto-temp"), dados);
  }

  function render() {
    saida = document.getElementById("dashboard-saida");
    var atual = lerAtual();
    if (!atual) { saida.innerHTML = vazioHTML(); return; }
    var r = analisar(atual);
    if (!r || r.veredito === "semDados") { saida.innerHTML = vazioHTML(); return; }
    var historico = garantirAtualNoHistorico(atual);

    saida.innerHTML = resumoHTML(atual, r, historico) + scorecardHTML(r) + conclusoesHTML(r) + secaoGraficosHTML(historico) + controlesHTML();
    renderCharts(atual, r, historico);

    var btnLimpar = document.getElementById("btn-limpar-historico");
    if (btnLimpar) btnLimpar.addEventListener("click", function () {
      if (confirm("Limpar o histórico de laudos salvo neste navegador? O laudo atual será mantido.")) {
        localStorage.removeItem(CHAVE_HISTORICO);
        garantirAtualNoHistorico(atual);
        render();
      }
    });
    var btnImprimir = document.getElementById("btn-imprimir");
    if (btnImprimir) btnImprimir.addEventListener("click", function () { window.print(); });
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 180);
  });
  document.addEventListener("DOMContentLoaded", render);
})();
