/* =====================================================================
   DASHBOARD — gráficos do laudo atual + histórico salvo no navegador.
   Não usa bibliotecas externas para continuar funcionando no GitHub Pages.
   ===================================================================== */
(function () {
  "use strict";

  var CHAVE_ATUAL = "homologacao_dados";
  var CHAVE_HISTORICO = "homologacao_historico";
  var saida;
  var chartsPendentes = [];

  var VEREDITO = {
    conforme:    { txt:"Conforme", classe:"ok", pontos:3 },
    ressalvas:   { txt:"Com ressalvas", classe:"atencao", pontos:2 },
    naoConforme: { txt:"Não conforme", classe:"erro", pontos:1 },
    semDados:    { txt:"Sem dados", classe:"na", pontos:0 }
  };

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
      amarelo: css("--rumo-amarelo", "#FBD300"),
      laranja: css("--rumo-laranja", "#F78344"),
      erro: css("--rumo-erro", "#D84545"),
      cinza: css("--rumo-cinza-200", "#D7E0E5"),
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
    return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
  }

  function cardKPI(titulo, valor, legenda, classe) {
    return '' +
      '<div class="dash-kpi dash-kpi--' + (classe || "") + '">' +
        '<span>' + titulo + '</span>' +
        '<b>' + valor + '</b>' +
        '<small>' + legenda + '</small>' +
      '</div>';
  }

  function resumoHTML(dados, r, historico) {
    var id = dados.identificacao || {};
    var V = VEREDITO[r.veredito] || VEREDITO.semDados;
    var titulo = id.amostra || "Último laudo analisado";
    var meta = [];
    if (id.fornecedor) meta.push("Fornecedor: " + esc(id.fornecedor));
    if (id.laudo) meta.push("Laudo: " + esc(id.laudo));
    if (id.data) meta.push("Data do ensaio: " + esc(id.data));

    return '' +
      '<section class="dash-hero dash-hero--' + V.classe + '">' +
        '<div>' +
          '<p class="eyebrow">Visão geral</p>' +
          '<h2>' + esc(titulo) + '</h2>' +
          '<p>' + (meta.length ? meta.join(" · ") : "Sem identificação preenchida. O dashboard usa os valores do último relatório salvo.") + '</p>' +
        '</div>' +
        '<div class="dash-selo">' + esc(V.txt) + '</div>' +
      '</section>' +
      '<section class="dash-kpis">' +
        cardKPI("Parâmetros avaliados", r.resumo.avaliados, "Itens com valor informado", "azul") +
        cardKPI("Dentro", r.resumo.ok, "Sem desvio na faixa de referência", "ok") +
        cardKPI("Atenção", r.resumo.observacoes, "Ressalvas técnicas", "atencao") +
        cardKPI("Fora crítico", r.resumo.criticos, "Impactam a homologação", "erro") +
        cardKPI("Histórico", historico.length, "Laudos salvos neste navegador", "azul") +
      '</section>';
  }

  function canvasCard(id, titulo, legenda, corpoExtra) {
    return '' +
      '<section class="chart-card">' +
        '<div class="chart-card__head"><div><h2>' + titulo + '</h2><p>' + legenda + '</p></div></div>' +
        (corpoExtra || '') +
        '<canvas id="' + id + '" class="chart-canvas" role="img" aria-label="' + esc(titulo) + '"></canvas>' +
      '</section>';
  }

  function conclusoesHTML(r) {
    var pontos = [];
    r.secoes.forEach(function (secao) {
      secao.itens.forEach(function (it) {
        if (it.status === "fora") pontos.push({ secao:secao.titulo, item:it.rotulo, sev:it.severidade, parecer:it.parecer });
      });
    });
    if (!pontos.length) {
      return '<div class="dash-insights"><h2>Leitura rápida</h2><p>Não há parâmetros fora da faixa no último laudo. Mesmo assim, confirme se os limites cadastrados representam a norma ou especificação real da peça antes de homologar.</p></div>';
    }
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
        '<button type="button" class="btn btn--fantasma" id="btn-limpar-historico">Limpar histórico do dashboard</button>' +
      '</div>';
  }

  function secaoGraficosHTML(historico) {
    var histLegenda = historico.length > 1
      ? "Tendência dos laudos salvos no navegador."
      : "Aparece como tendência quando houver mais de um laudo salvo.";
    return '' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-status", "Status geral do laudo", "Distribuição entre dentro, atenção e fora crítico.") +
        canvasCard("chart-historico", "Evolução dos pareceres", histLegenda) +
      '</section>' +

      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">1</span><h2>Análise química</h2><p class="legenda">Elementos, impurezas e aderência à faixa</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-quimica", "Mapa de conformidade química", "Cada elemento aparece normalizado contra a faixa/limite cadastrado.") +
        canvasCard("chart-impurezas", "Impurezas críticas — P e S", "Quanto menor o percentual do teto, mais limpo o material.") +
      '</section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-carbono", "Carbono e classe metalúrgica", "Aço baixo/médio/alto carbono ou provável ferro fundido.") +
        canvasCard("chart-quimica-valores", "Teores químicos informados", "Comparação visual dos elementos medidos em % de massa.") +
      '</section>' +

      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">2</span><h2>Ferro fundido</h2><p class="legenda">Grafita, matriz, nodularidade e carbono equivalente</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-ferro-tipo", "Tipo de ferro fundido", "Cruza carbono, grafita observada, Mg e carbono equivalente.") +
        canvasCard("chart-ferro-matriz", "Matriz e controles metalográficos", "Nodularidade, nódulos, ferrita, perlita, cementita e CE normalizados.") +
      '</section>' +

      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">3</span><h2>Metalografia / micrografia</h2><p class="legenda">Microestrutura, grão, inclusões e descarbonetação</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-metalografia", "Critérios metalográficos", "Grão ASTM, inclusões ASTM E45 e descarbonetação superficial.") +
        canvasCard("chart-microstatus", "Coerência da microestrutura", "Compara a microestrutura observada com o esperado pelo teor de carbono.") +
      '</section>' +

      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">4</span><h2>Dureza</h2><p class="legenda">Brinell e estimativa de resistência</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-dureza", "Dureza Brinell — HB", "Mostra se a dureza caiu abaixo, dentro ou acima da faixa cadastrada.") +
        canvasCard("chart-hb-uts", "Dureza × resistência estimada", "Estimativa UTS ≈ fator cadastrado × HB para checagem cruzada.") +
      '</section>' +

      '<section class="card card--dashboard-titulo"><div class="card__cabeca"><span class="card__num">5</span><h2>Ensaio de tração</h2><p class="legenda">Resistência e ductilidade</p></div></section>' +
      '<section class="dashboard-grid dashboard-grid--dupla">' +
        canvasCard("chart-tracao", "Parâmetros de tração", "LE, LR, alongamento e redução de área normalizados por critério.") +
        canvasCard("chart-tracao-historico", "Tendência mecânica", "Evolução normalizada de HB, LR e Charpy nos laudos salvos.") +
      '</section>' +

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

  function prepararCanvas(canvas, altura) {
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var largura = Math.max(320, canvas.parentElement.clientWidth - 2);
    canvas.style.height = altura + "px";
    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);
    canvas.style.width = largura + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largura, altura);
    ctx.font = "12px Verdana, sans-serif";
    return { ctx:ctx, w:largura, h:altura, c:cores() };
  }

  function semDados(canvas, texto) {
    var p = prepararCanvas(canvas, 210); if (!p) return;
    p.ctx.fillStyle = p.c.texto;
    p.ctx.textAlign = "center";
    p.ctx.fillText(texto || "Sem dados suficientes para este gráfico.", p.w / 2, p.h / 2);
  }

  function drawDonut(canvas, valores) {
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var total = valores.reduce(function (s, v) { return s + v.valor; }, 0);
    if (!total) { semDados(canvas); return; }
    var cx = p.w / 2, cy = 108, r = 72, start = -Math.PI / 2;
    valores.forEach(function (v) {
      var ang = (v.valor / total) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, start, start + ang); ctx.lineWidth = 28; ctx.strokeStyle = v.cor; ctx.stroke();
      start += ang;
    });
    ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "700 26px Verdana, sans-serif"; ctx.fillText(total, cx, cy + 8);
    ctx.font = "12px Verdana, sans-serif"; ctx.fillStyle = c.texto; ctx.fillText("avaliados", cx, cy + 28);
    var x = 24, y = 205;
    valores.forEach(function (v) {
      ctx.fillStyle = v.cor; ctx.fillRect(x, y - 10, 12, 12);
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.fillText(v.label + ": " + v.valor, x + 18, y);
      x += 125;
    });
  }

  function rowsDeSecao(r, id) {
    var secao = r.secoes.filter(function (s) { return s.id === id; })[0];
    if (!secao) return [];
    return secao.itens.filter(function (it) { return it.barra && n(it.valor) !== null; });
  }

  function drawNormalizado(canvas, rows, opts) {
    opts = opts || {};
    if (!rows.length) { semDados(canvas); return; }
    var altura = Math.max(230, 68 + rows.length * 36);
    var p = prepararCanvas(canvas, altura); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = opts.left || 156, right = 58, top = 28, rowH = 34;
    var largura = p.w - left - right;

    ctx.textAlign = "left"; ctx.font = "12px Verdana, sans-serif";
    rows.forEach(function (it, i) {
      var y = top + i * rowH;
      var b = it.barra;
      ctx.fillStyle = c.texto;
      var label = it.rotulo.replace(/\s*—.*$/, "");
      if (label.length > 22) label = label.slice(0, 21) + "…";
      ctx.fillText(label, 14, y + 16);

      ctx.fillStyle = c.cinza; ctx.fillRect(left, y + 5, largura, 10);
      ctx.fillStyle = "rgba(30,159,127,.28)";
      ctx.fillRect(left + largura * b.faixaIni / 100, y + 5, largura * (b.faixaFim - b.faixaIni) / 100, 10);

      var px = left + largura * b.posicao / 100;
      ctx.fillStyle = it.status === "fora" ? c.erro : c.azul;
      ctx.fillRect(px - 2, y, 4, 20);

      ctx.fillStyle = c.texto; ctx.textAlign = "right";
      ctx.fillText(fmt(n(it.valor), 3) + (it.unidade ? " " + it.unidade : ""), p.w - 12, y + 16);
      ctx.textAlign = "left";
    });

    ctx.fillStyle = c.texto; ctx.font = "11px Verdana, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("zona verde = faixa/limite de referência · marcador = valor medido", left, p.h - 14);
  }

  function drawBarValores(canvas, rows, unidade, tituloEixo) {
    rows = rows.filter(function (r) { return n(r.valor) !== null; });
    if (!rows.length) { semDados(canvas); return; }
    var altura = Math.max(230, 70 + rows.length * 28);
    var p = prepararCanvas(canvas, altura); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var valores = rows.map(function (r) { return n(r.valor); });
    var max = Math.max.apply(Math, valores.concat([0.01])) * 1.15;
    var left = 92, right = 56, top = 26, rowH = 27, largura = p.w - left - right;

    ctx.font = "11px Verdana, sans-serif"; ctx.fillStyle = c.texto; ctx.textAlign = "left";
    ctx.fillText(tituloEixo || "valor informado", left, 14);
    rows.forEach(function (r, i) {
      var y = top + i * rowH;
      var val = n(r.valor);
      var label = (r.rotulo || "").replace(/\s*\(.+$/, "").replace(/\s*—.*$/, "");
      if (label.length > 10) label = label.slice(0, 9) + "…";
      ctx.fillStyle = c.texto; ctx.textAlign = "right"; ctx.fillText(label, left - 10, y + 15);
      ctx.fillStyle = c.cinza; ctx.fillRect(left, y + 5, largura, 10);
      ctx.fillStyle = r.status === "fora" ? c.erro : c.azulClaro;
      ctx.fillRect(left, y + 5, largura * val / max, 10);
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.fillText(fmt(val, 3) + (unidade ? " " + unidade : ""), left + largura * val / max + 8, y + 15);
    });
  }

  function drawImpurezas(canvas, dados) {
    var specs = (window.LIMITES.quimica || []).filter(function (s) { return s.tipo === "impureza"; });
    var rows = specs.map(function (s) {
      var val = n((dados.quimica || {})[s.chave]);
      return { label:s.chave, valor:val, limite:s.limite, pct: val === null ? null : (val / s.limite) * 100 };
    }).filter(function (r) { return r.valor !== null; });
    if (!rows.length) { semDados(canvas, "Informe P e S para enxergar as impurezas críticas."); return; }
    var p = prepararCanvas(canvas, 240); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = 68, top = 45, largura = p.w - 112, barH = 26;
    ctx.fillStyle = c.texto; ctx.font = "12px Verdana, sans-serif"; ctx.fillText("% do limite máximo permitido", left, 22);
    rows.forEach(function (r, i) {
      var y = top + i * 68;
      var pctLim = Math.min(140, r.pct || 0);
      ctx.fillStyle = c.texto; ctx.textAlign = "right"; ctx.font = "700 14px Verdana, sans-serif"; ctx.fillText(r.label, left - 16, y + 18);
      ctx.fillStyle = c.cinza; ctx.fillRect(left, y, largura, barH);
      ctx.fillStyle = r.pct > 100 ? c.erro : (r.pct > 75 ? c.amarelo : c.verde);
      ctx.fillRect(left, y, largura * pctLim / 140, barH);
      ctx.strokeStyle = c.erro; ctx.beginPath(); ctx.moveTo(left + largura * 100 / 140, y - 6); ctx.lineTo(left + largura * 100 / 140, y + barH + 6); ctx.stroke();
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.font = "12px Verdana, sans-serif";
      ctx.fillText(fmt(r.valor, 3) + "% de " + fmt(r.limite, 3) + "% máx. (" + Math.round(r.pct) + "%)", left, y + 48);
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
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "700 10px Verdana, sans-serif";
      if (x(z.fim) - x(z.ini) > 54) ctx.fillText(z.txt, (x(z.ini) + x(z.fim)) / 2, y + 22);
    });
    ctx.fillStyle = c.azul; var px = x(val); ctx.fillRect(px - 2, y - 16, 4, 66);
    ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "700 24px Verdana, sans-serif"; ctx.fillText(fmt(val, 3) + "% C", p.w / 2, 42);
    ctx.font = "12px Verdana, sans-serif"; ctx.fillStyle = c.texto;
    var classe = val > 2.11 ? "provável ferro fundido" : (val < .30 ? "aço baixo carbono" : (val <= .60 ? "aço médio carbono" : (val <= 1.40 ? "aço alto carbono" : "aço especial / validar grau")));
    ctx.fillText("Classificação aproximada: " + classe, p.w / 2, 66);
    ctx.textAlign = "left"; ctx.font = "11px Verdana, sans-serif";
    [[.30,"0,30%"],[.60,"0,60%"],[1.40,"1,40%"],[2.11,"2,11%"]].forEach(function (m) { ctx.fillText(m[1], x(m[0]) - 16, y + 58); });
    if (val > 2.11) {
      ctx.fillStyle = c.texto;
      wrapText(ctx, "C acima de 2,11% não deve ser tratado como aço comum. Verificar grafita, matriz, Mg e CE.", 34, 202, p.w - 68, 17);
    }
  }

  function calcCE(dados) {
    var q = dados.quimica || {};
    var c = n(q.C), si = n(q.Si), pval = n(q.P);
    if (c === null || si === null) return null;
    return c + si / 3 + (pval || 0) / 3;
  }

  function drawFerroTipo(canvas, dados, r) {
    var q = dados.quimica || {}, ff = dados.ferroFundido || {}, id = dados.identificacao || {};
    var cval = n(q.C), mg = n(q.Mg), ce = n(ff.CE); if (ce === null) ce = calcCE(dados);
    var ehFerro = /Ferro fundido/i.test(id.material || "") || (cval !== null && cval > 2.11) || (ff.tipoGrafita && ff.tipoGrafita !== "Não avaliada");
    if (!ehFerro) { semDados(canvas, "Use este gráfico quando o laudo for de ferro fundido ou C > 2,11%."); return; }
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, cor = p.c;
    var tipo = ff.tipoGrafita || "Não avaliada";
    var matriz = ff.matriz || "Não avaliada";
    ctx.fillStyle = cor.azul; ctx.textAlign = "center"; ctx.font = "700 18px Verdana, sans-serif";
    ctx.fillText(id.material || (cval > 2.11 ? "Provável ferro fundido" : "Material não definido"), p.w/2, 34);
    ctx.fillStyle = cval !== null && cval > 2.11 ? cor.verde : cor.amarelo;
    ctx.beginPath(); ctx.arc(p.w/2, 88, 36, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "700 16px Verdana, sans-serif"; ctx.fillText(cval !== null ? fmt(cval,2)+"% C" : "C —", p.w/2, 94);
    ctx.fillStyle = cor.texto; ctx.font = "12px Verdana, sans-serif";
    ctx.fillText("Grafita: " + tipo, p.w/2, 142);
    ctx.fillText("Matriz: " + matriz, p.w/2, 164);
    ctx.fillText("Mg: " + (mg !== null ? fmt(mg,3)+"%" : "—") + " · CE: " + (ce !== null ? fmt(ce,2)+"%" : "—"), p.w/2, 186);
    wrapText(ctx, "Leitura correta: a forma da grafita define o tipo; a matriz define o equilíbrio entre resistência, dureza, ductilidade e impacto.", 32, 216, p.w - 64, 16);
  }

  function drawMicroStatus(canvas, r, dados) {
    var secao = r.secoes.filter(function (s) { return s.id === "metalografia"; })[0];
    var item = secao && secao.itens[0];
    var p = prepararCanvas(canvas, 230); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var statusCor = !item || item.status === "na" ? c.cinza : (item.status === "fora" ? c.erro : c.verde);
    ctx.fillStyle = statusCor;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(34, 45, p.w - 68, 58, 16) : ctx.fillRect(34, 45, p.w - 68, 58);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "700 20px Verdana, sans-serif";
    ctx.fillText(item ? (item.status === "fora" ? "Divergente / atenção" : (item.status === "na" ? "Não avaliada" : "Compatível")) : "Sem dados", p.w / 2, 82);
    ctx.fillStyle = c.azul; ctx.font = "700 15px Verdana, sans-serif"; ctx.fillText("Observada: " + ((dados.microestrutura || {}).observada || "—"), p.w / 2, 136);
    ctx.fillStyle = c.texto; ctx.font = "12px Verdana, sans-serif";
    wrapText(ctx, item ? item.parecer : "Sem informação de microestrutura.", 36, 164, p.w - 72, 17);
  }

  function drawGauge(canvas, valor, min, max, unidade, subtitulo) {
    if (valor === null) { semDados(canvas); return; }
    var p = prepararCanvas(canvas, 250); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var cx = p.w / 2, cy = 162, r = 88;
    var domMin = Math.max(0, min * 0.55), domMax = max * 1.35;
    function ang(v) {
      var t = (Math.max(domMin, Math.min(domMax, v)) - domMin) / (domMax - domMin);
      return Math.PI + t * Math.PI;
    }
    ctx.lineWidth = 22; ctx.lineCap = "round";
    ctx.strokeStyle = c.cinza; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = c.verde; ctx.beginPath(); ctx.arc(cx, cy, r, ang(min), ang(max)); ctx.stroke();
    var a = ang(valor);
    ctx.strokeStyle = (valor < min || valor > max) ? c.erro : c.azul;
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8)); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.azul; ctx.textAlign = "center"; ctx.font = "700 28px Verdana, sans-serif"; ctx.fillText(fmt(valor, 1) + " " + unidade, cx, 72);
    ctx.font = "12px Verdana, sans-serif"; ctx.fillStyle = c.texto; ctx.fillText(subtitulo || ("Faixa: " + min + "–" + max + " " + unidade), cx, 94);
    ctx.textAlign = "left"; ctx.font = "11px Verdana, sans-serif"; ctx.fillText(fmt(min, 0), cx - r - 10, cy + 30);
    ctx.textAlign = "right"; ctx.fillText(fmt(max, 0), cx + r + 10, cy + 30);
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
    drawBarValores(canvas, rows, "MPa", "Comparação aproximada de resistência");
  }

  function drawImpactoTemp(canvas, dados) {
    var cv = n((dados.impacto || {}).CV), temp = n((dados.impacto || {}).TEMP);
    if (cv === null && temp === null) { semDados(canvas); return; }
    var rows = [];
    if (cv !== null) rows.push({ rotulo:"Energia Charpy", valor:cv, status:"ok" });
    if (temp !== null) rows.push({ rotulo:"Temperatura", valor:Math.max(0, temp + 50), status:"ok" });
    drawBarValores(canvas, rows, "", "Charpy em J; temperatura deslocada em +50 apenas para visualização");
  }

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
    var left = 42, right = 18, top = 22, bottom = 48, w = p.w - left - right, h = p.h - top - bottom;
    ctx.strokeStyle = c.cinza; ctx.lineWidth = 1;
    [0,1,2,3].forEach(function (v) {
      var y = top + h - (v / 3) * h;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke();
      ctx.fillStyle = c.texto; ctx.textAlign = "right"; ctx.font = "11px Verdana, sans-serif"; ctx.fillText(v === 3 ? "OK" : (v === 2 ? "R" : (v === 1 ? "NC" : "—")), left - 8, y + 4);
    });
    ctx.strokeStyle = c.azul; ctx.lineWidth = 3; ctx.beginPath();
    dados.forEach(function (d, i) {
      var x = left + (dados.length === 1 ? 0 : i * w / (dados.length - 1));
      var y = top + h - (d.pontos / 3) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    dados.forEach(function (d, i) {
      var x = left + i * w / (dados.length - 1);
      var y = top + h - (d.pontos / 3) * h;
      ctx.fillStyle = d.veredito === "naoConforme" ? c.erro : (d.veredito === "ressalvas" ? c.amarelo : c.verde);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawHistoricoMecanico(canvas, historico) {
    var dados = valoresHistoricos(historico).filter(function (d) { return d.HB !== null || d.LR !== null || d.CV !== null; });
    if (dados.length < 2) { semDados(canvas, "Com dois ou mais laudos, este gráfico mostra tendência mecânica."); return; }
    var series = [
      { key:"HB", label:"HB", cor:cores().azul },
      { key:"LR", label:"LR", cor:cores().verde },
      { key:"CV", label:"Charpy", cor:cores().laranja }
    ];
    drawMultiNormalizado(canvas, dados, series);
  }

  function drawMultiNormalizado(canvas, dados, series) {
    var p = prepararCanvas(canvas, 260); if (!p) return;
    var ctx = p.ctx, c = p.c;
    var left = 42, right = 20, top = 26, bottom = 58, w = p.w - left - right, h = p.h - top - bottom;
    ctx.strokeStyle = c.cinza; ctx.lineWidth = 1;
    [0,25,50,75,100].forEach(function (v) {
      var y = top + h - (v / 100) * h;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke();
      ctx.fillStyle = c.texto; ctx.textAlign = "right"; ctx.font = "11px Verdana, sans-serif"; ctx.fillText(v + "%", left - 8, y + 4);
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
    });
    var x = left;
    series.forEach(function (s) {
      ctx.fillStyle = s.cor; ctx.fillRect(x, p.h - 30, 12, 12);
      ctx.fillStyle = c.texto; ctx.textAlign = "left"; ctx.font = "11px Verdana, sans-serif"; ctx.fillText(s.label + " normalizado", x + 16, p.h - 20);
      x += 118;
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = String(text || "").split(" "), line = "";
    for (var nWord = 0; nWord < words.length; nWord++) {
      var testLine = line + words[nWord] + " ";
      var metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && nWord > 0) {
        ctx.fillText(line, x, y); line = words[nWord] + " "; y += lineHeight;
      } else line = testLine;
    }
    ctx.fillText(line, x, y);
  }

  function renderCharts(dados, r, historico) {
    chartsPendentes = [];
    drawDonut(document.getElementById("chart-status"), [
      { label:"Dentro", valor:r.resumo.ok, cor:cores().verde },
      { label:"Atenção", valor:r.resumo.observacoes, cor:cores().amarelo },
      { label:"Fora", valor:r.resumo.criticos, cor:cores().erro }
    ]);
    drawHistorico(document.getElementById("chart-historico"), historico);

    drawNormalizado(document.getElementById("chart-quimica"), rowsDeSecao(r, "quimica"), { left:170 });
    drawImpurezas(document.getElementById("chart-impurezas"), dados);
    drawCarbono(document.getElementById("chart-carbono"), dados);
    drawBarValores(document.getElementById("chart-quimica-valores"), rowsDeSecao(r, "quimica"), "%", "teor em % de massa");

    drawFerroTipo(document.getElementById("chart-ferro-tipo"), dados, r);
    drawNormalizado(document.getElementById("chart-ferro-matriz"), rowsDeSecao(r, "ferrofundido"), { left:190 });

    drawNormalizado(document.getElementById("chart-metalografia"), rowsDeSecao(r, "metalografia"), { left:180 });
    drawMicroStatus(document.getElementById("chart-microstatus"), r, dados);

    drawGauge(document.getElementById("chart-dureza"), n((dados.dureza || {}).hb), window.LIMITES.dureza.min, window.LIMITES.dureza.max, "HB", "Faixa de dureza cadastrada");
    drawHbUts(document.getElementById("chart-hb-uts"), dados);

    drawNormalizado(document.getElementById("chart-tracao"), rowsDeSecao(r, "tracao"), { left:180 });
    drawHistoricoMecanico(document.getElementById("chart-tracao-historico"), historico);

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

    saida.innerHTML = resumoHTML(atual, r, historico) + conclusoesHTML(r) + secaoGraficosHTML(historico) + controlesHTML();
    renderCharts(atual, r, historico);

    var btnLimpar = document.getElementById("btn-limpar-historico");
    if (btnLimpar) btnLimpar.addEventListener("click", function () {
      if (confirm("Limpar o histórico de laudos salvo neste navegador? O laudo atual será mantido.")) {
        localStorage.removeItem(CHAVE_HISTORICO);
        garantirAtualNoHistorico(atual);
        render();
      }
    });
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 180);
  });
  document.addEventListener("DOMContentLoaded", render);
})();
