/* =====================================================================
   MOTOR DE ANÁLISE
   Recebe os dados digitados + as faixas de LIMITES e devolve, para cada
   parâmetro, o status (dentro / abaixo / acima / alto), um parecer em
   texto e os dados da barra de faixa. Não mexe na tela — só calcula.
   ===================================================================== */

window.ANALISE = (function () {

  "use strict";

  // ---- utilidades ----------------------------------------------------
  function ehNumero(v) {
    return v !== "" && v !== null && v !== undefined && !isNaN(parseFloat(v));
  }
  function num(v) { return parseFloat(v); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function pct(x, lo, hi) {
    if (hi === lo) return 50;
    return clamp(((x - lo) / (hi - lo)) * 100, 0, 100);
  }

  function materialSelecionado(d) {
    return ((d.identificacao || {}).material || "Não definido").trim();
  }
  function materialEhFerroFundido(material) {
    return /Ferro fundido/i.test(material || "");
  }
  function materialEhAco(material) {
    return /Aço/i.test(material || "");
  }
  function carbonoIndicaFerroFundido(c, L) {
    var lim = ((L || {}).material || {}).limiteAcoFerroFundido || 2.11;
    return ehNumero(c) && num(c) > lim;
  }
  function carbonoEquivalente(d) {
    var q = (d || {}).quimica || {};
    var c = ehNumero(q.C) ? num(q.C) : null;
    var si = ehNumero(q.Si) ? num(q.Si) : null;
    var p = ehNumero(q.P) ? num(q.P) : 0;
    if (c === null || si === null) return null;
    return c + (si / 3) + (p / 3);
  }
  function grafitaEsperada(material) {
    if (/nodular/i.test(material || "")) return "Nodular / esferoidal";
    if (/vermicular/i.test(material || "")) return "Vermicular / compactada";
    if (/lamelar/i.test(material || "")) return "Lamelar / flocos";
    if (/branco|coquilhado/i.test(material || "")) return "Sem grafita livre / branco";
    return null;
  }

  // Monta os dados da barra visual (posição do valor e zona aceitável, em %)
  function montarBarra(v, spec) {
    var min = spec.min, max = spec.max, limite = spec.limite;
    var domMin, domMax, faixaIni, faixaFim;

    if (min != null && max != null) {            // faixa fechada
      var folga = (max - min) * 0.6 || max * 0.3 || 1;
      domMin = Math.max(0, min - folga);
      domMax = max + folga;
      faixaIni = pct(min, domMin, domMax);
      faixaFim = pct(max, domMin, domMax);
    } else if (limite != null) {                 // teto de impureza (0..limite)
      domMin = 0; domMax = limite * 1.6 || 1;
      faixaIni = 0;
      faixaFim = pct(limite, domMin, domMax);
    } else if (max != null) {                    // só teto
      domMin = 0; domMax = max * 1.6 || 1;
      faixaIni = 0;
      faixaFim = pct(max, domMin, domMax);
    } else if (min != null) {                     // só piso
      domMin = 0; domMax = min * 2 || 1;
      faixaIni = pct(min, domMin, domMax);
      faixaFim = 100;
    } else {
      return null;
    }
    return {
      posicao: pct(v, domMin, domMax),
      faixaIni: faixaIni,
      faixaFim: faixaFim,
      rotuloMin: (min != null ? min : 0),
      rotuloMax: (max != null ? max : (limite != null ? limite : domMax))
    };
  }

  // Avalia um parâmetro numérico genérico contra sua spec
  function avaliarNumerico(valor, spec) {
    if (!ehNumero(valor)) {
      return { status: "na", classe: "na", texto: "Não informado.", severidade: null, barra: null };
    }
    var v = num(valor), status = "ok", texto = "Dentro da faixa de referência.";

    if (spec.limite != null) {                   // impureza
      if (v > spec.limite) { status = "fora"; texto = "Acima do teto de impureza (" + spec.limite + " " + (spec.unidade||"") + "). " + (spec.papel||""); }
      else { texto = "Dentro do limite de impureza. Quanto menor, mais limpo o material."; }
    } else if (spec.min != null && spec.max != null) {
      if (v < spec.min) { status = "fora"; texto = "Abaixo da faixa (" + spec.min + "–" + spec.max + " " + (spec.unidade||"") + ")."; }
      else if (v > spec.max) { status = "fora"; texto = "Acima da faixa (" + spec.min + "–" + spec.max + " " + (spec.unidade||"") + ")."; }
    } else if (spec.min != null) {
      if (v < spec.min) { status = "fora"; texto = "Abaixo do mínimo de referência (" + spec.min + " " + (spec.unidade||"") + ")."; }
    } else if (spec.max != null) {
      if (v > spec.max) { status = "fora"; texto = "Acima do máximo de referência (" + spec.max + " " + (spec.unidade||"") + ")."; }
    }

    return {
      status: status,
      classe: status === "fora" ? "fora" : "ok",
      texto: texto,
      severidade: status === "fora" ? (spec.severidade || "observacao") : null,
      barra: montarBarra(v, spec)
    };
  }

  function classeCarbono(c, material) {
    if (c > 2.11) {
      if (materialEhAco(material)) return "carbono acima do limite típico de aço; resultado compatível com ferro fundido ou erro de identificação da amostra";
      return "faixa de ferro fundido (acima de ~2,11% C). Interpretar grafita, matriz, Mg e CE, não como aço comum";
    }
    if (c < 0.30) return "aço baixo carbono (mais dúctil/soldável, menor dureza)";
    if (c <= 0.60) return "aço médio carbono (equilíbrio resistência × ductilidade)";
    if (c <= 1.40) return "aço alto carbono (mais duro e resistente, mais frágil/difícil de soldar)";
    return "aço de carbono muito alto / condição especial; exige especificação do grau";
  }
  // microestrutura esperada a partir do teor de carbono
  function microEsperada(c, micro) {
    if (c > 2.11) return { classe: "fundido", nome: "grafita livre em matriz ferrítica/perlítica/bainítica, conforme tipo de ferro fundido" };
    var b = micro.bandaEutetoide;
    if (c < b[0]) return { classe: "hipo",  nome: "Ferrita + Perlita" };
    if (c <= b[1]) return { classe: "eut",   nome: "Perlita (~100%)" };
    return { classe: "hiper", nome: "Perlita + rede de cementita" };
  }

  function specQuimicaAjustada(spec, d, L) {
    var material = materialSelecionado(d);
    var q = d.quimica || {};
    var c = ehNumero(q.C) ? num(q.C) : null;
    var usarFerroFundido = materialEhFerroFundido(material) || (c !== null && carbonoIndicaFerroFundido(c, L) && !materialEhAco(material));
    if (!usarFerroFundido || !L.ferroFundido) return spec;
    var ff = L.ferroFundido;
    if (spec.chave === "C") return Object.assign({}, spec, ff.carbono, { chave:"C", rotulo:"Carbono (C*) — via combustão" });
    if (spec.chave === "Si") return Object.assign({}, spec, ff.silicio, { chave:"Si", rotulo:"Silício (Si)" });
    if (spec.chave === "Mn") return Object.assign({}, spec, ff.manganes, { chave:"Mn", rotulo:"Manganês (Mn)" });
    if (spec.chave === "P") return Object.assign({}, spec, ff.fosforo, { chave:"P", rotulo:"Fósforo (P)" });
    if (spec.chave === "S") return Object.assign({}, spec, ff.enxofre, { chave:"S", rotulo:"Enxofre (S*) — via combustão" });
    if (spec.chave === "Mg") return Object.assign({}, spec, ff.magnesio, { chave:"Mg", rotulo:"Magnésio residual (Mg)", opcional:true });
    return spec;
  }

  // ---- análise principal --------------------------------------------
  function analisar(d, L) {
    d = d || {}; 
    var secoes = [];
    var criticos = 0, observacoes = 0, ok = 0;

    function contabilizar(r) {
      if (r.status === "ok") ok++;
      else if (r.status === "fora") {
        if (r.severidade === "critico") criticos++; else observacoes++;
      }
    }
    function montarItem(spec, valor, r, parecer) {
      return {
        rotulo: spec.rotulo, valor: (ehNumero(valor) ? valor : "—"),
        unidade: spec.unidade || "", status: r.status, classe: r.classe,
        severidade: r.severidade, barra: r.barra, parecer: parecer || r.texto,
        fonte: spec.fonte || ""
      };
    }

    // 1) QUÍMICA -------------------------------------------------------
    var itensQ = [];
    (L.quimica || []).forEach(function (specOriginal) {
      var valor = (d.quimica || {})[specOriginal.chave];
      var spec = specQuimicaAjustada(specOriginal, d, L);
      if (spec.opcional && !ehNumero(valor)) return;       // residual em branco: pula
      var r = avaliarNumerico(valor, spec);
      var parecer = r.texto;
      if (spec.chave === "C" && ehNumero(valor)) {
        var mat = materialSelecionado(d);
        if (carbonoIndicaFerroFundido(valor, L) && materialEhAco(mat)) {
          r.status = "fora"; r.classe = "fora"; r.severidade = "critico";
          parecer = "Carbono acima de ~2,11% C não é compatível com aço comum. Verificar se a peça é ferro fundido ou se houve erro de identificação/unidade. ";
        } else if (carbonoIndicaFerroFundido(valor, L) && !materialEhFerroFundido(mat)) {
          r.status = r.status === "fora" ? r.status : "fora"; r.classe = "fora"; r.severidade = "observacao";
          parecer = "Carbono em faixa de ferro fundido. Não tratar como aço de 0,70–2,00% C; confirmar tipo de material e avaliar grafita/matriz. ";
        }
        parecer += " Classificação: " + classeCarbono(num(valor), mat) + ".";
      }
      contabilizar(r);
      itensQ.push(montarItem(spec, valor, r, parecer));
    });
    secoes.push({ id:"quimica", titulo:"Análise química", subtitulo:"Composição (% em massa)", itens: itensQ });


    // 2) METALOGRAFIA / MICROGRAFIA -----------------------------------
    var micro = L.microestrutura, m = d.microestrutura || {};
    var itensM = [];
    var cInformado = ehNumero((d.quimica||{}).C) ? num(d.quimica.C) : null;
    var material = materialSelecionado(d);

    // 2a) microestrutura observada x esperada
    var obsNome = m.observada || "Não avaliada";
    var obsSpec = (micro.opcoes || []).filter(function(o){return o.valor===obsNome;})[0] || {alerta:null, classe:"na"};
    var statusM = "ok", classeM = "ok", sevM = null, parecerM;

    if (obsNome === "Não avaliada" || !m.observada) {
      statusM = "na"; classeM = "na"; parecerM = "Microestrutura não avaliada.";
    } else if (obsSpec.alerta) {
      statusM = "fora"; classeM = "fora"; sevM = obsSpec.alerta.nivel; parecerM = obsSpec.alerta.texto;
    } else if (cInformado != null) {
      var esp = microEsperada(cInformado, micro);
      if (esp.classe === obsSpec.classe) {
        parecerM = "Compatível com o esperado para " + cInformado + "% C: " + esp.nome + ".";
      } else {
        statusM = "fora"; classeM = "fora"; sevM = "observacao";
        if (esp.classe === "fundido") parecerM = "Carbono em faixa de ferro fundido. A micrografia deve declarar grafita nodular, vermicular, lamelar, branca ou matriz equivalente. Observado: " + obsNome + ".";
        else parecerM = "Diverge do esperado para " + cInformado + "% C (esperado: " + esp.nome + "). Verificar tratamento térmico/medição.";
      }
    } else {
      parecerM = "Microestrutura registrada. Informe o teor de C para comparar com o esperado.";
    }
    if (statusM === "fora") { sevM === "critico" ? criticos++ : observacoes++; } else if (statusM === "ok") { ok++; }
    itensM.push({ rotulo:"Microestrutura observada", valor: m.observada || "—", unidade:"",
      status:statusM, classe:classeM, severidade:sevM, barra:null, parecer:parecerM,
      fonte: micro.fonteEutetoide });

    // 2b) grão, inclusões, descarbonetação (numéricos)
    [["grao", micro.grao], ["inclusoes", micro.inclusoes], ["descarbonetacao", micro.descarbonetacao]]
      .forEach(function (par) {
        var campo = par[0], spec = par[1];
        var valor = m[campo];
        if (spec.opcional && !ehNumero(valor)) return;
        var r = avaliarNumerico(valor, spec);
        contabilizar(r);
        var parecer = r.status === "ok" ? (spec.papel || r.texto) : r.texto + " " + (spec.papel||"");
        itensM.push({ rotulo: spec.rotulo, valor: (ehNumero(valor)?valor:"—"), unidade: spec.unidade||"",
          status:r.status, classe:r.classe, severidade:r.severidade, barra:r.barra, parecer:parecer, fonte:spec.fonte });
      });
    secoes.push({ id:"metalografia", titulo:"Metalografia / micrografia óptica", subtitulo:"Microestrutura, grão e limpeza", itens: itensM });

    // 3) FERRO FUNDIDO -------------------------------------------------
    var ffL = L.ferroFundido || {}, ffD = d.ferroFundido || {};
    var itensF = [];
    var temDadoFundido = materialEhFerroFundido(material) || (cInformado != null && carbonoIndicaFerroFundido(cInformado, L)) ||
      [ffD.tipoGrafita, ffD.matriz, ffD.NOD, ffD.NODULOS, ffD.FERRITA, ffD.PERLITA, ffD.CEMENTITA, ffD.CE].some(function (v) { return v && v !== "Não avaliada"; });

    if (temDadoFundido) {
      var tipo = ffD.tipoGrafita || "Não avaliada";
      var espGrafita = grafitaEsperada(material);
      var rTipo = { status:"na", classe:"na", severidade:null, barra:null };
      var pTipo = "Tipo de grafita não informado. Para ferro fundido, a morfologia da grafita é uma informação central do laudo.";
      if (tipo && tipo !== "Não avaliada") {
        rTipo = { status:"ok", classe:"ok", severidade:null, barra:null };
        pTipo = "Grafita declarada como " + tipo + ". ";
        if (espGrafita && tipo !== espGrafita) {
          rTipo = { status:"fora", classe:"fora", severidade:"critico", barra:null };
          pTipo += "Diverge do tipo de material selecionado (esperado: " + espGrafita + ").";
        } else if (espGrafita) pTipo += "Coerente com o tipo de ferro fundido selecionado.";
        else pTipo += "Use esta informação junto com matriz, nodularidade, Mg e propriedades mecânicas.";
      }
      if (rTipo.status === "fora") { criticos++; } else if (rTipo.status === "ok") { ok++; }
      itensF.push({ rotulo:"Tipo de grafita", valor:tipo || "—", unidade:"", status:rTipo.status, classe:rTipo.classe, severidade:rTipo.severidade, barra:null, parecer:pTipo, fonte:"Metalografia de ferros fundidos: forma da grafita controla propriedades." });

      var matriz = ffD.matriz || "Não avaliada";
      var pMatriz = matriz === "Não avaliada" ? "Matriz não informada. Diferenciar ferrítica, perlítica, ferrítico-perlítica, ausferrítica ou com carbonetos." : "Matriz " + matriz + ". Ferrita favorece ductilidade/impacto; perlita favorece dureza, resistência e desgaste.";
      itensF.push({ rotulo:"Matriz predominante", valor:matriz, unidade:"", status:matriz === "Não avaliada" ? "na" : "ok", classe:matriz === "Não avaliada" ? "na" : "ok", severidade:null, barra:null, parecer:pMatriz, fonte:"Metalografia quantitativa/qualitativa." });
      if (matriz !== "Não avaliada") ok++;

      var ceInformado = ehNumero(ffD.CE) ? num(ffD.CE) : carbonoEquivalente(d);
      var campos = [
        ["NOD", ffL.nodularidade], ["NODULOS", ffL.nodulos], ["FERRITA", ffL.ferrita],
        ["PERLITA", ffL.perlita], ["CEMENTITA", ffL.cementita]
      ];
      campos.forEach(function (par) {
        var campo = par[0], spec = par[1], valor = ffD[campo];
        if (!spec || (spec.opcional && !ehNumero(valor))) return;
        var r = avaliarNumerico(valor, spec);
        // Nodularidade só reprova de fato quando o material selecionado for nodular.
        if (campo === "NOD" && !/nodular/i.test(material)) {
          r.status = "na"; r.classe = "na"; r.severidade = null;
        }
        contabilizar(r);
        var parecer = r.status === "ok" ? (spec.papel || r.texto) : (r.status === "na" ? spec.papel : r.texto + " " + (spec.papel || ""));
        itensF.push({ rotulo:spec.rotulo, valor:(ehNumero(valor)?valor:"—"), unidade:spec.unidade||"", status:r.status, classe:r.classe, severidade:r.severidade, barra:r.barra, parecer:parecer, fonte:spec.fonte });
      });

      if (ceInformado != null) {
        var rCe = avaliarNumerico(ceInformado, ffL.carbonoEquivalente);
        contabilizar(rCe);
        itensF.push({ rotulo:ffL.carbonoEquivalente.rotulo, valor:Math.round(ceInformado * 1000) / 1000, unidade:"%", status:rCe.status, classe:rCe.classe, severidade:rCe.severidade, barra:rCe.barra,
          parecer:(ehNumero(ffD.CE) ? "CE informado no laudo. " : "CE calculado automaticamente por C + Si/3 + P/3. ") + (rCe.status === "ok" ? ffL.carbonoEquivalente.papel : rCe.texto + " " + ffL.carbonoEquivalente.papel), fonte:ffL.carbonoEquivalente.fonte });
      }

      var ferr = ehNumero(ffD.FERRITA) ? num(ffD.FERRITA) : null;
      var perl = ehNumero(ffD.PERLITA) ? num(ffD.PERLITA) : null;
      if (ferr != null && perl != null) {
        var soma = ferr + perl;
        if (Math.abs(soma - 100) > 15) {
          observacoes++;
          itensF.push({ rotulo:"Coerência da matriz", valor:Math.round(soma) + "%", unidade:"", status:"fora", classe:"fora", severidade:"observacao", barra:null,
            parecer:"Ferrita + perlita somam " + Math.round(soma) + "%. Verificar se existem bainita, martensita, carbonetos ou erro de lançamento.", fonte:"Conferência interna do sistema." });
        }
      }
      secoes.push({ id:"ferrofundido", titulo:"Ferro fundido", subtitulo:"Grafita, matriz, nodularidade e carbono equivalente", itens:itensF });
    }

    // 4) DUREZA --------------------------------------------------------
    var sd = L.dureza, hb = (d.dureza||{}).hb;
    var itensD = [];
    var rd = avaliarNumerico(hb, sd);
    contabilizar(rd);
    var parecerD = rd.status === "ok" ? sd.papel : rd.texto;
    var utsEstimado = null;
    if (ehNumero(hb)) {
      utsEstimado = Math.round(num(hb) * sd.fatorTracao);
      parecerD += " Resistência estimada pela dureza: ~" + utsEstimado + " MPa (UTS ≈ " + sd.fatorTracao + " × HB).";
    }
    itensD.push({ rotulo: sd.rotulo, valor:(ehNumero(hb)?hb:"—"), unidade: sd.unidade,
      status:rd.status, classe:rd.classe, severidade:rd.severidade, barra:rd.barra, parecer:parecerD, fonte:sd.fonte });
    secoes.push({ id:"dureza", titulo:"Dureza", subtitulo:"Brinell e estimativa de resistência", itens: itensD });

    // 5) TRAÇÃO --------------------------------------------------------
    var itensT = [];
    var lrMedido = null;
    (L.tracao || []).forEach(function (spec) {
      var valor = (d.tracao||{})[spec.chave];
      if (spec.opcional && !ehNumero(valor)) return;
      var r = avaliarNumerico(valor, spec);
      contabilizar(r);
      var parecer = r.status === "ok" ? (spec.papel||r.texto) : r.texto;
      // conferência cruzada resistência x dureza
      if (spec.cruzaComDureza && ehNumero(valor) && utsEstimado != null) {
        lrMedido = num(valor);
        var desvio = Math.abs(lrMedido - utsEstimado) / utsEstimado;
        if (desvio > 0.15) {
          parecer += " ⚠ Inconsistência: difere ~" + Math.round(desvio*100) + "% da estimativa pela dureza (~" + utsEstimado + " MPa). Reconferir dureza/tração.";
          if (r.status === "ok") { r.status = "fora"; r.classe = "fora"; r.severidade = "observacao"; observacoes++; ok--; }
        } else {
          parecer += " Coerente com a dureza (~" + utsEstimado + " MPa).";
        }
      }
      itensT.push({ rotulo:spec.rotulo, valor:(ehNumero(valor)?valor:"—"), unidade:spec.unidade,
        status:r.status, classe:r.classe, severidade:r.severidade, barra:r.barra, parecer:parecer, fonte:spec.fonte });
    });
    if (itensT.length) secoes.push({ id:"tracao", titulo:"Ensaio de tração", subtitulo:"Resistência e ductilidade", itens: itensT });

    // 6) IMPACTO -------------------------------------------------------
    var itensI = [];
    (L.impacto || []).forEach(function (spec) {
      var valor = (d.impacto||{})[spec.chave];
      if (spec.opcional && !ehNumero(valor)) return;
      if (spec.tipo === "informativo") {
        itensI.push({ rotulo:spec.rotulo, valor:(ehNumero(valor)?valor:"—"), unidade:spec.unidade,
          status:"na", classe:"na", severidade:null, barra:null, parecer:spec.papel, fonte:spec.fonte });
        return;
      }
      var r = avaliarNumerico(valor, spec);
      contabilizar(r);
      var parecer = r.status === "ok" ? (spec.papel||r.texto) : r.texto;
      itensI.push({ rotulo:spec.rotulo, valor:(ehNumero(valor)?valor:"—"), unidade:spec.unidade,
        status:r.status, classe:r.classe, severidade:r.severidade, barra:r.barra, parecer:parecer, fonte:spec.fonte });
    });
    if (itensI.length) secoes.push({ id:"impacto", titulo:"Ensaio de impacto", subtitulo:"Tenacidade (Charpy)", itens: itensI });

    // ---- veredito ----------------------------------------------------
    var avaliados = ok + criticos + observacoes;
    var veredito;
    if (avaliados === 0) veredito = "semDados";
    else if (criticos > 0) veredito = "naoConforme";
    else if (observacoes > 0) veredito = "ressalvas";
    else veredito = "conforme";

    return {
      veredito: veredito,
      resumo: { avaliados: avaliados, ok: ok, observacoes: observacoes, criticos: criticos },
      secoes: secoes,
      identificacao: d.identificacao || {}
    };
  }

  return { analisar: analisar };
})();
