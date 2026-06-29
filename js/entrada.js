/* =====================================================================
   ENTRADA — monta o formulário a partir de LIMITES, lê os valores,
   salva no navegador e leva para a página de resultados.
   ===================================================================== */
(function () {
  "use strict";
  var L = window.LIMITES;
  var CHAVE_ARMAZENAMENTO = "homologacao_dados";

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

    // 3) Dureza
    html += cartao(3, "Dureza", "Brinell (a resistência é estimada a partir dela)",
      campoNum("d_hb", L.dureza));

    // 4) Tração
    html += cartao(4, "Ensaio de tração", "Resistência e ductilidade",
      L.tracao.map(function (s) { return campoNum("t_" + s.chave, s); }).join(""));

    // 5) Impacto
    html += cartao(5, "Ensaio de impacto", "Tenacidade (Charpy)",
      L.impacto.map(function (s) { return campoNum("i_" + s.chave, s); }).join(""));

    document.getElementById("secoes-analise").innerHTML = html;
  }

  // ---- ler / preencher --------------------------------------------
  function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function set(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = val; }

  function coletar() {
    var d = { identificacao: {}, quimica: {}, microestrutura: {}, dureza: {}, tracao: {}, impacto: {} };
    d.identificacao = {
      amostra: v("id_amostra"), fornecedor: v("id_fornecedor"),
      laudo: v("id_laudo"), data: v("id_data")
    };
    L.quimica.forEach(function (s) { d.quimica[s.chave] = v("q_" + s.chave); });
    d.microestrutura = {
      observada: v("m_observada"), grao: v("m_grao"),
      inclusoes: v("m_inclusoes"), descarbonetacao: v("m_descarbonetacao")
    };
    d.dureza = { hb: v("d_hb") };
    L.tracao.forEach(function (s) { d.tracao[s.chave] = v("t_" + s.chave); });
    L.impacto.forEach(function (s) { d.impacto[s.chave] = v("i_" + s.chave); });
    return d;
  }

  function preencher(d) {
    if (!d) return;
    var i = d.identificacao || {};
    set("id_amostra", i.amostra); set("id_fornecedor", i.fornecedor);
    set("id_laudo", i.laudo); set("id_data", i.data);
    Object.keys(d.quimica || {}).forEach(function (k) { set("q_" + k, d.quimica[k]); });
    var m = d.microestrutura || {};
    set("m_observada", m.observada); set("m_grao", m.grao);
    set("m_inclusoes", m.inclusoes); set("m_descarbonetacao", m.descarbonetacao);
    set("d_hb", (d.dureza || {}).hb);
    Object.keys(d.tracao || {}).forEach(function (k) { set("t_" + k, d.tracao[k]); });
    Object.keys(d.impacto || {}).forEach(function (k) { set("i_" + k, d.impacto[k]); });
  }

  var EXEMPLO = {
    identificacao: { amostra: "Ombreira mod. exemplo — lote 2451", fornecedor: "Fornecedor exemplo", laudo: "LAB-2026-0098", data: "" },
    quimica: { C: "0.45", Si: "0.25", Mn: "0.85", P: "0.022", S: "0.030", Cr: "0.12", Ni: "0.08", Mo: "", V: "", Ti: "", Cu: "0.10", Al: "0.025", Mg: "", Fe: "98.9" },
    microestrutura: { observada: "Ferrita + Perlita", grao: "7", inclusoes: "1.2", descarbonetacao: "0.05" },
    dureza: { hb: "185" },
    tracao: { LE: "320", LR: "650", AL: "18", RA: "38" },
    impacto: { CV: "42", TEMP: "20" }
  };

  // ---- eventos -----------------------------------------------------
  function ligarEventos() {
    document.getElementById("btn-analisar").addEventListener("click", function () {
      var dados = coletar();
      try { localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados)); }
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
