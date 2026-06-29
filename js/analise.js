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
      else { texto = "Dentro do limite de impureza. Quanto menor, mais limpo o aço."; }
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

  function classeCarbono(c) {
    if (c < 0.30) return "baixo carbono (mais dúctil/soldável, menor dureza)";
    if (c <= 0.60) return "médio carbono (equilíbrio resistência × ductilidade)";
    return "alto carbono (mais duro e resistente, mais frágil/difícil de soldar)";
  }
  // microestrutura esperada a partir do teor de carbono
  function microEsperada(c, micro) {
    var b = micro.bandaEutetoide;
    if (c < b[0]) return { classe: "hipo",  nome: "Ferrita + Perlita" };
    if (c <= b[1]) return { classe: "eut",   nome: "Perlita (~100%)" };
    return { classe: "hiper", nome: "Perlita + rede de cementita" };
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
    (L.quimica || []).forEach(function (spec) {
      var valor = (d.quimica || {})[spec.chave];
      if (spec.opcional && !ehNumero(valor)) return;       // residual em branco: pula
      var r = avaliarNumerico(valor, spec);
      var parecer = r.texto;
      if (spec.chave === "C" && ehNumero(valor)) {
        parecer += " Classificação: " + classeCarbono(num(valor)) + ".";
      }
      contabilizar(r);
      itensQ.push(montarItem(spec, valor, r, parecer));
    });
    secoes.push({ id:"quimica", titulo:"Análise química", subtitulo:"Composição (% em massa)", itens: itensQ });


    // 2) METALOGRAFIA / MICROGRAFIA -----------------------------------
    var micro = L.microestrutura, m = d.microestrutura || {};
    var itensM = [];
    var cInformado = ehNumero((d.quimica||{}).C) ? num(d.quimica.C) : null;

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
        parecerM = "Diverge do esperado para " + cInformado + "% C (esperado: " + esp.nome + "). Verificar tratamento térmico/medição.";
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

    // 3) DUREZA --------------------------------------------------------
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

    // 4) TRAÇÃO --------------------------------------------------------
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

    // 5) IMPACTO -------------------------------------------------------
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
