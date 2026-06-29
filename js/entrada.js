/* =====================================================================
   ENTRADA — monta o formulário a partir de LIMITES, lê os valores,
   salva no navegador e leva para a página de resultados.
   ===================================================================== */
(function () {
  "use strict";
  var L = window.LIMITES;
  var CHAVE_ARMAZENAMENTO = "homologacao_dados";
  var CHAVE_HISTORICO = "homologacao_historico";

  function passo(unidade) {
    switch (unidade) {
      case "%": return "0.001";
      case "índice 0–5": return "0.1";
      case "mm": return "0.01";
      default: return "1";
    }
  }
  function ajudaNumerica(spec) {
    if (spec.tipo === "informativo") return spec.papel;
    if (spec.limite != null) return "Impureza — máx. " + spec.limite + " " + spec.unidade;
    if (spec.min != null && spec.max != null) return "Ref.: " + spec.min + "–" + spec.max + " " + spec.unidade;
    if (spec.min != null) return "Mín. ref.: " + spec.min + " " + spec.unidade;
    if (spec.max != null) return "Máx. ref.: " + spec.max + " " + spec.unidade;
    return "";
  }
  function esc(s) { return String(s).replace(/"/g, "&quot;"); }

  // bloco de campo numérico
  function campoNum(id, spec) {
    var tag = spec.tipo === "impureza" ? ' <span class="tag-impureza">impureza</span>' : "";
    return '' +
      '<div class="campo">' +
        '<label for="' + id + '">' + spec.rotulo + tag + '</label>' +
        '<div class="campo__entrada">' +
          '<input type="number" inputmode="decimal" step="' + passo(spec.unidade) + '" id="' + id + '" ' +
            'placeholder="—" aria-describedby="' + id + '_a">' +
          '<span class="unidade">' + spec.unidade + '</span>' +
        '</div>' +
        '<span class="ajuda" id="' + id + '_a">' + ajudaNumerica(spec) + '</span>' +
      '</div>';
  }

  function campoSelect(id, rotulo, opcoes, ajuda) {
    return '' +
      '<div class="campo">' +
        '<label for="' + id + '">' + rotulo + '</label>' +
        '<div class="campo__entrada"><select id="' + id + '">' +
          (opcoes || []).map(function (o) { return '<option value="' + esc(o) + '">' + o + '</option>'; }).join("") +
        '</select></div>' +
        '<span class="ajuda">' + (ajuda || "") + '</span>' +
      '</div>';
  }

  function cartao(num, titulo, legenda, corpoHTML) {
    return '' +
      '<section class="card">' +
        '<div class="card__cabeca">' +
          '<span class="card__num">' + num + '</span>' +
          '<h2>' + titulo + '</h2>' +
          '<p class="legenda">' + legenda + '</p>' +
        '</div>' +
        '<div class="card__corpo"><div class="grade">' + corpoHTML + '</div></div>' +
      '</section>';
  }

  function montarFormulario() {
    var html = "";

    // 1) Química
    html += cartao(1, "Análise química", "Composição em % de massa",
      L.quimica.map(function (s) { return campoNum("q_" + s.chave, s); }).join(""));

    // 2) Metalografia
    var micro = L.microestrutura;
    var opcoes = micro.opcoes.map(function (o) {
      return '<option value="' + esc(o.valor) + '">' + o.valor + '</option>';
    }).join("");
    var corpoMicro = '' +
      '<div class="campo">' +
        '<label for="m_observada">Microestrutura observada</label>' +
        '<div class="campo__entrada"><select id="m_observada">' + opcoes + '</select></div>' +
        '<span class="ajuda">Comparada com a esperada pelo teor de C.</span>' +
      '</div>' +
      campoNum("m_grao", micro.grao) +
      campoNum("m_inclusoes", micro.inclusoes) +
      campoNum("m_descarbonetacao", micro.descarbonetacao);
    html += cartao(2, "Metalografia / micrografia óptica", "Microestrutura, tamanho de grão e limpeza", corpoMicro);

    // 3) Ferro fundido
    var ff = L.ferroFundido || {};
    var corpoFF = '' +
      campoSelect("f_tipo_grafita", "Tipo de grafita observado", ff.tiposGrafita || ["Não avaliada"], "Obrigatório para diferenciar nodular, vermicular, lamelar e branco.") +
      campoSelect("f_matriz", "Matriz predominante", ff.matrizes || ["Não avaliada"], "A matriz controla dureza, resistência, ductilidade e impacto.") +
      campoNum("f_NOD", ff.nodularidade) +
      campoNum("f_NODULOS", ff.nodulos) +
      campoNum("f_FERRITA", ff.ferrita) +
      campoNum("f_PERLITA", ff.perlita) +
      campoNum("f_CEMENTITA", ff.cementita) +
      campoNum("f_CE", ff.carbonoEquivalente);
    html += cartao(3, "Ferro fundido", "Grafita, nodularidade, matriz e carbono equivalente", corpoFF);

    // 4) Dureza
    html += cartao(4, "Dureza", "Brinell (a resistência é estimada a partir dela)",
      campoNum("d_hb", L.dureza));

    // 5) Tração
    html += cartao(5, "Ensaio de tração", "Resistência e ductilidade",
      L.tracao.map(function (s) { return campoNum("t_" + s.chave, s); }).join(""));

    // 6) Impacto
    html += cartao(6, "Ensaio de impacto", "Tenacidade (Charpy)",
      L.impacto.map(function (s) { return campoNum("i_" + s.chave, s); }).join(""));

    document.getElementById("secoes-analise").innerHTML = html;
  }

  // ---- ler / preencher --------------------------------------------
  function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function set(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = val; }

  function coletar() {
    var d = { identificacao: {}, quimica: {}, microestrutura: {}, ferroFundido: {}, dureza: {}, tracao: {}, impacto: {} };
    d.identificacao = {
      amostra: v("id_amostra"), fornecedor: v("id_fornecedor"),
      laudo: v("id_laudo"), data: v("id_data"), material: v("id_material")
    };
    L.quimica.forEach(function (s) { d.quimica[s.chave] = v("q_" + s.chave); });
    d.microestrutura = {
      observada: v("m_observada"), grao: v("m_grao"),
      inclusoes: v("m_inclusoes"), descarbonetacao: v("m_descarbonetacao")
    };
    d.ferroFundido = {
      tipoGrafita: v("f_tipo_grafita"), matriz: v("f_matriz"),
      NOD: v("f_NOD"), NODULOS: v("f_NODULOS"),
      FERRITA: v("f_FERRITA"), PERLITA: v("f_PERLITA"),
      CEMENTITA: v("f_CEMENTITA"), CE: v("f_CE")
    };
    d.dureza = { hb: v("d_hb") };
    L.tracao.forEach(function (s) { d.tracao[s.chave] = v("t_" + s.chave); });
    L.impacto.forEach(function (s) { d.impacto[s.chave] = v("i_" + s.chave); });
    return d;
  }


  function salvarNoHistorico(dados) {
    var historico = [];
    try { historico = JSON.parse(localStorage.getItem(CHAVE_HISTORICO)) || []; } catch (e) { historico = []; }
    if (!Array.isArray(historico)) historico = [];

    var assinaturaAtual = JSON.stringify(dados || {});
    var ultimo = historico.length ? historico[historico.length - 1] : null;
    var assinaturaUltimo = ultimo ? JSON.stringify(ultimo.dados || ultimo) : null;

    // Evita duplicar o mesmo laudo quando o usuário clica mais de uma vez sem alterar nada.
    if (assinaturaAtual !== assinaturaUltimo) {
      historico.push({
        id: "laudo_" + Date.now(),
        criadoEm: new Date().toISOString(),
        dados: dados
      });
    } else if (ultimo && !ultimo.criadoEm) {
      ultimo.criadoEm = new Date().toISOString();
    }

    // Mantém o navegador leve mesmo com muitos testes.
    if (historico.length > 80) historico = historico.slice(historico.length - 80);
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  }

  function preencher(d) {
    if (!d) return;
    var i = d.identificacao || {};
    set("id_amostra", i.amostra); set("id_fornecedor", i.fornecedor);
    set("id_laudo", i.laudo); set("id_data", i.data); set("id_material", i.material);
    Object.keys(d.quimica || {}).forEach(function (k) { set("q_" + k, d.quimica[k]); });
    var m = d.microestrutura || {};
    set("m_observada", m.observada); set("m_grao", m.grao);
    set("m_inclusoes", m.inclusoes); set("m_descarbonetacao", m.descarbonetacao);
    var ff = d.ferroFundido || {};
    set("f_tipo_grafita", ff.tipoGrafita); set("f_matriz", ff.matriz);
    set("f_NOD", ff.NOD); set("f_NODULOS", ff.NODULOS);
    set("f_FERRITA", ff.FERRITA); set("f_PERLITA", ff.PERLITA);
    set("f_CEMENTITA", ff.CEMENTITA); set("f_CE", ff.CE);
    set("d_hb", (d.dureza || {}).hb);
    Object.keys(d.tracao || {}).forEach(function (k) { set("t_" + k, d.tracao[k]); });
    Object.keys(d.impacto || {}).forEach(function (k) { set("i_" + k, d.impacto[k]); });
  }

  var EXEMPLO = {
    identificacao: { amostra: "Ombreira fundida — lote exemplo", fornecedor: "Fundição exemplo", laudo: "LAB-2026-0098", data: "", material: "Ferro fundido nodular" },
    quimica: { C: "3.55", Si: "2.35", Mn: "0.38", P: "0.030", S: "0.014", Cr: "0.06", Ni: "0.03", Mo: "0.001", V: "", Ti: "0.012", Cu: "0.05", Al: "0.006", Mg: "0.040", Fe: "93.6" },
    microestrutura: { observada: "Ferro fundido nodular — grafita esferoidal", grao: "", inclusoes: "1.0", descarbonetacao: "" },
    ferroFundido: { tipoGrafita: "Nodular / esferoidal", matriz: "Ferrítica + Perlítica", NOD: "86", NODULOS: "180", FERRITA: "55", PERLITA: "45", CEMENTITA: "0.5", CE: "" },
    dureza: { hb: "190" },
    tracao: { LE: "360", LR: "650", AL: "15", RA: "" },
    impacto: { CV: "32", TEMP: "20" }
  };

  // ---- eventos -----------------------------------------------------
  function ligarEventos() {
    document.getElementById("btn-analisar").addEventListener("click", function () {
      var dados = coletar();
      try {
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
        salvarNoHistorico(dados);
      }
      catch (e) { /* navegação ainda funciona via sessão na própria página */ }
      window.location.href = "resultados.html";
    });
    document.getElementById("btn-exemplo").addEventListener("click", function () { preencher(EXEMPLO); });
    document.getElementById("btn-limpar").addEventListener("click", function () {
      document.querySelectorAll("#secoes-analise input, #secoes-analise select, .card input").forEach(function (el) {
        if (el.tagName === "SELECT") el.selectedIndex = 0; else el.value = "";
      });
    });
  }

  // ---- início ------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    montarFormulario();
    var salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO)); } catch (e) {}
    if (salvo) preencher(salvo);
    ligarEventos();
  });
})();
