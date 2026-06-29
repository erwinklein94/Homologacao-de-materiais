/* =====================================================================
   LIMITES E FAIXAS DE REFERÊNCIA — Homologação de aços (ombreiras)
   ---------------------------------------------------------------------
   ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR para calibrar a análise.

   ⚠️  IMPORTANTE: os valores abaixo são FAIXAS GERAIS DA METALURGIA DO
   AÇO-CARBONO, não a especificação de um grau específico de ombreira.
   Servem como triagem técnica. Quando você tiver a norma/grau exato da
   peça (ex.: composição química e propriedades exigidas), troque os
   números de `min`, `max` e `limite` pelos da especificação.

   Como ler cada parâmetro:
     min        -> valor mínimo aceitável (abaixo disso = "abaixo")
     max        -> valor máximo aceitável (acima disso = "acima")
     limite     -> teto de impureza (acima disso = "alto")
     severidade -> 'critico'    = reprova a triagem se estiver fora
                   'observacao' = vira ressalva (você decide)
     opcional   -> true = se o campo ficar em branco, é ignorado
   ===================================================================== */

window.LIMITES = {

  meta: {
    material: "Ombreira / chumbador (shoulder) metálico — aço",
    contexto: "Elemento de fixação embutido em dormente de concreto.",
    natureza: "Faixas de REFERÊNCIA da metalurgia do aço-carbono — ajuste ao grau/norma da peça.",
    atualizadoEm: "2026-06-29"
  },

  /* ---------------------------------------------------------------
     1) ANÁLISE QUÍMICA  (% em massa)
     C* e S* = via combustão | P e S = impurezas críticas
     Si, Mn, Cr, Ni, Mo, V, Ti, Cu, Al, Mg e Fe = liga/residual/base
     --------------------------------------------------------------- */
  quimica: [
    { chave:"C", rotulo:"Carbono (C*) — via combustão", unidade:"%", tipo:"liga",
      min:0.30, max:0.60, severidade:"critico",
      papel:"Principal endurecedor. Quanto maior o C, maior a dureza e a resistência, e menor a ductilidade, a tenacidade e a soldabilidade.",
      fonte:"C* medido por via combustão. Faixa de referência de médio carbono 0,30–0,60%; ajustar ao grau/norma da peça." },

    { chave:"Si", rotulo:"Silício (Si)", unidade:"%", tipo:"liga",
      min:0.10, max:0.60, severidade:"observacao",
      papel:"Desoxidante; aumenta resistência e dureza. Em excesso pode reduzir tenacidade e alterar resposta ao tratamento térmico.",
      fonte:"Faixa usual de desoxidação ~0,10–0,60% para aços-carbono; ajustar ao grau/norma." },

    { chave:"Mn", rotulo:"Manganês (Mn)", unidade:"%", tipo:"liga",
      min:0.30, max:1.65, severidade:"observacao",
      papel:"Desoxidante e dessulfurante; aumenta resistência e temperabilidade e ajuda a neutralizar o enxofre formando MnS.",
      fonte:"Envelope típico de aços-carbono 0,30–1,65%; ajustar ao grau/norma." },

    { chave:"P", rotulo:"Fósforo (P)", unidade:"%", tipo:"impureza",
      limite:0.040, severidade:"critico",
      papel:"Impureza crítica. Segrega no contorno de grão e pode causar fragilização, queda de tenacidade e trincas.",
      fonte:"Máx. usual 0,03–0,05% em aços-carbono; ajustar ao grau/norma." },

    { chave:"S", rotulo:"Enxofre (S*) — via combustão", unidade:"%", tipo:"impureza",
      limite:0.050, severidade:"critico",
      papel:"Impureza crítica. Relaciona-se a inclusões sulfetadas, fragilidade a quente e redução de soldabilidade.",
      fonte:"S* medido por via combustão. Teto usual de referência 0,05%; ajustar ao grau/norma." },

    { chave:"Cr", rotulo:"Cromo (Cr)", unidade:"%", tipo:"residual",
      max:0.30, opcional:true, severidade:"observacao",
      papel:"Aumenta temperabilidade, resistência ao desgaste e oxidação. Em aço-carbono comum, valor alto pode indicar aço-liga ou mistura de material.",
      fonte:"Residual típico para aço-carbono não ligado; se o grau especificar Cr, cadastrar o limite oficial." },

    { chave:"Ni", rotulo:"Níquel (Ni)", unidade:"%", tipo:"residual",
      max:0.30, opcional:true, severidade:"observacao",
      papel:"Melhora tenacidade e resistência quando especificado. Em aço-carbono comum costuma ser residual.",
      fonte:"Residual típico para aço-carbono não ligado; se o grau especificar Ni, cadastrar o limite oficial." },

    { chave:"Mo", rotulo:"Molibdênio (Mo)", unidade:"%", tipo:"residual",
      max:0.10, opcional:true, severidade:"observacao",
      papel:"Aumenta temperabilidade e resistência ao revenimento. Quando aparece em teor relevante, pode indicar aço baixa liga.",
      fonte:"Campo opcional/residual. Ajustar limite conforme especificação do aço analisado." },

    { chave:"V", rotulo:"Vanádio (V)", unidade:"%", tipo:"residual",
      max:0.05, opcional:true, severidade:"observacao",
      papel:"Microaleante formador de carbonetos; pode refinar grão e aumentar limite de escoamento quando controlado.",
      fonte:"Campo opcional/microaleante. Ajustar limite conforme especificação do aço analisado." },

    { chave:"Ti", rotulo:"Titânio (Ti)", unidade:"%", tipo:"residual",
      max:0.05, opcional:true, severidade:"observacao",
      papel:"Microaleante formador de carbonetos/nitretos; auxilia no controle de grão quando especificado.",
      fonte:"Campo opcional/microaleante. Ajustar limite conforme especificação do aço analisado." },

    { chave:"Cu", rotulo:"Cobre (Cu)", unidade:"%", tipo:"residual",
      max:0.35, opcional:true, severidade:"observacao",
      papel:"Residual ou elemento de liga. Em excesso pode prejudicar trabalho a quente; quando previsto pode ajudar na resistência à corrosão atmosférica.",
      fonte:"Residual típico para aço-carbono não ligado; se o grau especificar Cu, cadastrar o limite oficial." },

    { chave:"Al", rotulo:"Alumínio (Al)", unidade:"%", tipo:"residual",
      max:0.10, opcional:true, severidade:"observacao",
      papel:"Desoxidante forte; pode auxiliar no refino de grão, mas excesso pode aumentar inclusões de alumina.",
      fonte:"Campo opcional/desoxidante. Ajustar limite conforme especificação do aço analisado." },

    { chave:"Mg", rotulo:"Magnésio (Mg)", unidade:"%", tipo:"residual",
      max:0.05, opcional:true, severidade:"observacao",
      papel:"Em aço, normalmente aparece em teores muito baixos; pode estar ligado à modificação de inclusões ou ao processo.",
      fonte:"Campo opcional/processo. Valor incomum pede checagem de método, unidade e especificação." },

    { chave:"Fe", rotulo:"Ferro (Fe)", unidade:"%", tipo:"informativo",
      opcional:true, severidade:"observacao",
      papel:"Elemento majoritário do aço. Normalmente aparece como balanço da composição química e não como critério isolado de aprovação.",
      fonte:"Campo informativo: interpretar como balanço/base ferrosa do material." }
  ],

  /* ---------------------------------------------------------------
     2) METALOGRAFIA / MICROGRAFIA ÓPTICA
     A microestrutura ESPERADA é deduzida do teor de carbono.
     --------------------------------------------------------------- */
  microestrutura: {
    // Limite hipoeutetóide/hipereutetóide e banda do eutetóide (% C)
    eutetoide: 0.77,
    bandaEutetoide: [0.75, 0.85],
    fonteEutetoide: "Composição eutetóide ≈ 0,76–0,77% C; faixa prática 0,75–0,85% (ScienceDirect).",

    // Microestruturas que o laudo pode declarar e como interpretá-las
    opcoes: [
      { valor:"Ferrita + Perlita",            classe:"hipo",  alerta:null },
      { valor:"Perlita (~100%)",              classe:"eut",   alerta:null },
      { valor:"Perlita + Cementita (rede)",   classe:"hiper", alerta:{ nivel:"critico",
          texto:"Rede de cementita no contorno de grão = caminho de fratura frágil. Esperada só em aço hipereutetóide; indesejável em fixação estrutural." } },
      { valor:"Martensita",                   classe:"temp",  alerta:{ nivel:"observacao",
          texto:"Indica têmpera. Confirmar se a peça é fornecida temperada/revenida; martensita não revenida é frágil." } },
      { valor:"Bainita",                      classe:"temp",  alerta:{ nivel:"observacao",
          texto:"Produto de transformação intermediária; verificar se compatível com o tratamento térmico especificado." } },
      { valor:"Esferoidita",                  classe:"esf",   alerta:{ nivel:"observacao",
          texto:"Resultado de recozimento de esferoidização: baixa dureza e boa usinabilidade; confirmar se é o estado desejado." } },
      { valor:"Widmanstätten",                classe:"def",   alerta:{ nivel:"critico",
          texto:"Estrutura de superaquecimento / resfriamento inadequado, com grão grosseiro e baixa tenacidade." } },
      { valor:"Não avaliada",                 classe:"na",    alerta:null }
    ],

    grao: { rotulo:"Tamanho de grão (ASTM E112)", unidade:"nº ASTM",
      min:5, severidade:"observacao",
      papel:"Quanto MAIOR o número ASTM, mais FINO o grão e melhores tenacidade e resistência. Número baixo = grão grosseiro.",
      fonte:"Convenção ASTM E112 (número de grão inversamente proporcional ao tamanho)." },

    inclusoes: { rotulo:"Severidade de inclusões (ASTM E45)", unidade:"índice 0–5",
      max:2.0, severidade:"observacao",
      papel:"Inclusões não-metálicas (sulfetos/óxidos) atuam como concentradores de tensão. Quanto menor o índice, mais limpo o aço.",
      fonte:"Avaliação de inclusões conforme ASTM E45 (índice de severidade)." },

    descarbonetacao: { rotulo:"Descarbonetação (profundidade)", unidade:"mm",
      max:0.20, opcional:true, severidade:"observacao",
      papel:"Camada superficial empobrecida em carbono reduz dureza e resistência à fadiga na superfície da peça.",
      fonte:"Controle usual de profundidade de descarbonetação em peças tratadas (boa prática)." }
  },

  /* ---------------------------------------------------------------
     3) DUREZA  (Brinell, HB)
     --------------------------------------------------------------- */
  dureza: {
    rotulo:"Dureza Brinell", unidade:"HB",
    min:140, max:220, severidade:"observacao",
    fatorTracao:3.45,   // UTS(MPa) ≈ 3,45 × HB para aços-carbono/baixa liga
    papel:"Mede a resistência à deformação localizada. Liga-se ao carbono e ao tratamento térmico.",
    fonte:"Faixa de referência (médio carbono normalizado, ajustar ao grau). Relação UTS≈3,45×HB: ASTM E140 / Machinery's Handbook (±10–15%)."
  },

  /* ---------------------------------------------------------------
     4) ENSAIO DE TRAÇÃO
     --------------------------------------------------------------- */
  tracao: [
    { chave:"LE", rotulo:"Limite de escoamento", unidade:"MPa", tipo:"mecanico",
      min:250, opcional:true, severidade:"critico",
      papel:"Tensão em que a peça começa a deformar permanentemente.",
      fonte:"PLACEHOLDER — definir pelo grau/norma da ombreira." },

    { chave:"LR", rotulo:"Limite de resistência (tração)", unidade:"MPa", tipo:"mecanico",
      min:480, opcional:true, severidade:"critico", cruzaComDureza:true,
      papel:"Tensão máxima suportada antes da ruptura. É comparada com a estimativa pela dureza.",
      fonte:"PLACEHOLDER — definir pelo grau/norma. Conferência cruzada com dureza (UTS≈3,45×HB)." },

    { chave:"AL", rotulo:"Alongamento", unidade:"%", tipo:"mecanico",
      min:12, opcional:true, severidade:"critico",
      papel:"Mede a ductilidade: quanto a peça estica antes de romper.",
      fonte:"PLACEHOLDER — definir pelo grau/norma." },

    { chave:"RA", rotulo:"Redução de área (estricção)", unidade:"%", tipo:"mecanico",
      min:20, opcional:true, severidade:"observacao",
      papel:"Outra medida de ductilidade, pela redução da seção na ruptura.",
      fonte:"PLACEHOLDER — definir pelo grau/norma." }
  ],

  /* ---------------------------------------------------------------
     5) ENSAIO DE IMPACTO  (Charpy)
     --------------------------------------------------------------- */
  impacto: [
    { chave:"CV", rotulo:"Energia absorvida (Charpy)", unidade:"J", tipo:"mecanico",
      min:27, opcional:true, severidade:"critico",
      papel:"Tenacidade: energia absorvida no impacto. Quanto maior, mais resistente à fratura frágil.",
      fonte:"PLACEHOLDER (piso comum de 27 J) — definir pelo grau/norma e temperatura." },

    { chave:"TEMP", rotulo:"Temperatura do ensaio", unidade:"°C", tipo:"informativo",
      opcional:true, severidade:"observacao",
      papel:"Temperatura em que o Charpy foi feito. Registrada para contextualizar a energia (não é aprovada/reprovada isoladamente).",
      fonte:"Campo informativo." }
  ]
};
