/* =====================================================================
   RESULTADOS — lê os dados salvos, roda o motor e desenha o parecer.
   ===================================================================== */
(function () {
  "use strict";
  var CHAVE_ARMAZENAMENTO = "homologacao_dados";

  var VEREDITO = {
    conforme:    { selo: "CONFORME",     classe: "conforme",    h: "Conforme na triagem",         p: "Todos os parâmetros avaliados estão dentro das faixas de referência." },
    ressalvas:   { selo: "RESSALVAS",    classe: "ressalvas",   h: "Conforme com ressalvas",      p: "Há pontos de atenção que pedem avaliação do especialista antes de homologar." },
    naoConforme: { selo: "NÃO CONFORME", classe: "naoConforme", h: "Não conforme na triagem",     p: "Pelo menos um parâmetro crítico está fora da faixa de referência." }
  };

  var CHIP = {
    ok:   { classe: "chip--ok",            txt: "Dentro" },
    na:   { classe: "chip--na",            txt: "n/d" },
    foraC:{ classe: "chip--fora--critico", txt: "Fora" },
    foraO:{ classe: "chip--fora--observacao", txt: "Atenção" }
  };
  function chipDe(it) {
    if (it.status === "ok") return CHIP.ok;
    if (it.status === "na") return CHIP.na;
    return it.severidade === "critico" ? CHIP.foraC : CHIP.foraO;
  }

  function fmt(n) {  // formata número com vírgula decimal (pt-BR)
    if (typeof n === "number") return n.toLocaleString("pt-BR");
    return n;
  }

  function barraHTML(b, status) {
    if (!b) return "";
    var dir = status === "fora" ? "fora" : "ok";
    var right = 100 - b.faixaFim;
    return '' +
      '<div class="barra barra--' + dir + '">' +
        '<div class="barra__trilho">' +
          '<div class="barra__zona" style="left:' + b.faixaIni + '%; right:' + right + '%"></div>' +
        '</div>' +
        '<div class="barra__marcador" style="left:' + b.posicao + '%"></div>' +
        '<span class="barra__lim" style="left:' + b.faixaIni + '%">' + fmt(b.rotuloMin) + '</span>' +
        '<span class="barra__lim" style="left:' + b.faixaFim + '%">' + fmt(b.rotuloMax) + '</span>' +
      '</div>';
  }

  function itemHTML(it) {
    var c = chipDe(it);
    var unidade = it.unidade ? ' <span class="u">' + it.unidade + '</span>' : "";
    var fonte = it.fonte ? '<p class="resultado__fonte">Referência: ' + it.fonte + '</p>' : "";
    return '' +
      '<div class="resultado">' +
        '<div class="resultado__topo">' +
          '<span class="resultado__rotulo">' + it.rotulo + '</span>' +
          '<span class="resultado__valor">' + it.valor + unidade + '</span>' +
          '<span class="chip ' + c.classe + '">' + c.txt + '</span>' +
        '</div>' +
        barraHTML(it.barra, it.status) +
        '<p class="resultado__parecer">' + it.parecer + '</p>' +
        fonte +
      '</div>';
  }

  function secaoHTML(s) {
    return '' +
      '<section class="card">' +
        '<div class="card__cabeca"><h2>' + s.titulo + '</h2><p class="legenda">' + s.subtitulo + '</p></div>' +
        '<div class="card__corpo">' + s.itens.map(itemHTML).join("") + '</div>' +
      '</section>';
  }

  function identificacaoHTML(id) {
    var partes = [];
    if (id.amostra)    partes.push("<strong>" + id.amostra + "</strong>");
    if (id.fornecedor) partes.push("Fornecedor: " + id.fornecedor);
    if (id.laudo)      partes.push("Laudo: " + id.laudo);
    if (id.data)       partes.push("Data: " + id.data);
    if (!partes.length) return "";
    return '<p class="sub" style="margin:-6px 0 18px">' + partes.join(" · ") + "</p>";
  }

  function veredictoHTML(r) {
    var V = VEREDITO[r.veredito];
    var n = r.resumo;
    return '' +
      identificacaoHTML(r.identificacao || {}) +
      '<div class="veredito veredito--' + V.classe + '">' +
        '<span class="veredito__selo">' + V.selo + '</span>' +
        '<div class="veredito__txt"><h2>' + V.h + '</h2><p>' + V.p + '</p></div>' +
        '<div class="veredito__num">' +
          '<div><b>' + n.ok + '</b><span>Dentro</span></div>' +
          '<div><b>' + n.observacoes + '</b><span>Atenção</span></div>' +
          '<div><b>' + n.criticos + '</b><span>Fora</span></div>' +
        '</div>' +
      '</div>';
  }

  function vazioHTML() {
    return '' +
      '<div class="vazio card">' +
        '<img src="assets/rumo/rumo-logo-azul.png" alt="Rumo">' +
        '<h2>Nenhum laudo para analisar</h2>' +
        '<p>Volte à etapa de parâmetros, lance os valores do relatório e clique em “Analisar laudo”. O parecer aparece aqui.</p>' +
        '<a class="btn btn--primario" href="index.html">Ir para os parâmetros →</a>' +
      '</div>';
  }

  function render() {
    var dados = null;
    try { dados = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO)); } catch (e) {}
    var saida = document.getElementById("saida");

    if (!dados) { saida.innerHTML = vazioHTML(); return; }

    var r = window.ANALISE.analisar(dados, window.LIMITES);
    if (r.veredito === "semDados") { saida.innerHTML = vazioHTML(); return; }

    var html = veredictoHTML(r) + r.secoes.map(secaoHTML).join("");
    html += '' +
      '<div class="acoes">' +
        '<a class="btn btn--secundario" href="index.html">← Voltar e editar</a>' +
        '<button type="button" class="btn btn--fantasma" onclick="window.print()">Imprimir / salvar PDF</button>' +
      '</div>';
    saida.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", render);
})();
