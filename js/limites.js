/* =====================================================================
   LIMITES E FAIXAS DE REFERÊNCIA — Homologação de materiais ferrosos
   ---------------------------------------------------------------------
   ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR para calibrar a análise.

   ⚠️  IMPORTANTE: os valores abaixo são FAIXAS GERAIS DA METALURGIA DO
   AÇOS-CARBONO E FERROS FUNDIDOS, não a especificação de um grau específico da peça.
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
    material: "Ombreira / chumbador (shoulder) metálico — aço ou ferro fundido",
    contexto: "Elemento de fixação ou componente metálico aplicado na via permanente e em dormente de concreto.",
    natureza: "Faixas de REFERÊNCIA para triagem de aços-carbono e ferros fundidos — ajuste ao grau/norma/desenho da peça.",
    atualizadoEm: "2026-06-29"
  },

  material: {
    opcoes: [
      "Não definido",
      "Aço carbono / baixa liga",
      "Ferro fundido nodular",
      "Ferro fundido vermicular",
      "Ferro fundido lamelar",
      "Ferro fundido branco / coquilhado"
    ],
    limiteAcoFerroFundido: 2.11,
    papel:"Carbono acima de aproximadamente 2,11% indica ferro fundido, não aço comum. Nessa condição, interpretar também grafita, matriz, Mg, Si e carbono equivalente."
  },

  /* ---------------------------------------------------------------
     1) ANÁLISE QUÍMICA  (% em massa)
     C* e S* = via combustão | P e S = impurezas críticas
     Si, Mn, Cr, Ni, Mo, V, Ti, Cu, Al, Mg e Fe = liga/residual/base
     --------------------------------------------------------------- */
  quimica: [
    { chave:"C", rotulo:"Carbono (C*) — via combustão", unidade:"%", tipo:"liga",
      min:0.30, max:0.60, severidade:"critico",
      papel:"Principal controlador metalúrgico. Em aço, aumenta dureza/resistência e reduz soldabilidade. Acima de aproximadamente 2,11% C, o material entra na faixa de ferro fundido.",
      fonte:"C* medido por via combustão. Para aço médio carbono use 0,30–0,60%; para ferro fundido use a seção específica de ferros fundidos." },

    { chave:"Si", rotulo:"Silício (Si)", unidade:"%", tipo:"liga",
      min:0.10, max:0.60, severidade:"observacao",
      papel:"Em aço atua como desoxidante. Em ferro fundido, é grafitizante e ajuda a formar grafita, reduzindo a tendência à cementita branca.",
      fonte:"Aços-carbono: ~0,10–0,60%. Ferros fundidos: frequentemente ~1,0–3,5%. Ajustar ao grau/norma." },

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
      papel:"Em aço costuma ser muito baixo. Em ferro fundido nodular/vermicular é elemento de tratamento: modifica a grafita lamelar para nodular ou vermicular.",
      fonte:"Campo opcional/processo. Em nodular, Mg residual típico fica em centésimos de %. Ajustar à especificação." },

    { chave:"Fe", rotulo:"Ferro (Fe)", unidade:"%", tipo:"informativo",
      opcional:true, severidade:"observacao",
      papel:"Elemento majoritário do aço. Normalmente aparece como balanço da composição química e não como critério isolado de aprovação.",
      fonte:"Campo informativo: interpretar como balanço/base ferrosa do material." }
  ],

  /* ---------------------------------------------------------------
     2) METALOGRAFIA / MICROGRAFIA ÓPTICA
     A microestrutura ESPERADA é deduzida do teor de carbono e do tipo de material.
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
      { valor:"Ferro fundido nodular — grafita esferoidal", classe:"fundido", alerta:null },
      { valor:"Ferro fundido vermicular — grafita compactada", classe:"fundido", alerta:null },
      { valor:"Ferro fundido lamelar — grafita em flocos", classe:"fundido", alerta:null },
      { valor:"Ferro fundido branco — cementita/ledeburita", classe:"fundido", alerta:{ nivel:"observacao",
          texto:"Ferro fundido branco/coquilhado apresenta carbonetos/cementita livres e alta dureza, porém baixa tenacidade. Confirmar se essa condição é especificada." } },
      { valor:"Ferro fundido maleável",        classe:"fundido", alerta:null },
      { valor:"Não avaliada",                 classe:"na",    alerta:null }
    ],

    grao: { rotulo:"Tamanho de grão (ASTM E112)", unidade:"nº ASTM",
      min:5, severidade:"observacao",
      papel:"Quanto MAIOR o número ASTM, mais FINO o grão e melhores tenacidade e resistência. Número baixo = grão grosseiro.",
      fonte:"Convenção ASTM E112 (número de grão inversamente proporcional ao tamanho)." },

    inclusoes: { rotulo:"Severidade de inclusões (ASTM E45)", unidade:"índice 0–5",
      max:2.0, severidade:"observacao",
      papel:"Inclusões não-metálicas (sulfetos/óxidos) atuam como concentradores de tensão. Quanto menor o índice, mais limpo o material.",
      fonte:"Avaliação de inclusões conforme ASTM E45 (índice de severidade)." },

    descarbonetacao: { rotulo:"Descarbonetação (profundidade)", unidade:"mm",
      max:0.20, opcional:true, severidade:"observacao",
      papel:"Camada superficial empobrecida em carbono reduz dureza e resistência à fadiga na superfície da peça.",
      fonte:"Controle usual de profundidade de descarbonetação em peças tratadas (boa prática)." }
  },

  /* ---------------------------------------------------------------
     3) FERRO FUNDIDO — grafita, matriz e propriedades
     Estas faixas são gerais. Sempre prevalece a especificação/desenho.
     --------------------------------------------------------------- */
  ferroFundido: {
    carbono: { rotulo:"Carbono para ferro fundido", unidade:"%", min:2.50, max:4.30, severidade:"observacao",
      papel:"Faixa típica de C para ferros fundidos. C alto não significa erro se o componente for fundido.",
      fonte:"Referência geral de ferros fundidos; ajustar conforme grau ASTM/ISO/desenho." },
    silicio: { rotulo:"Silício para ferro fundido", unidade:"%", min:1.00, max:3.50, severidade:"observacao",
      papel:"Silício é grafitizante: favorece grafita e reduz tendência a ferro fundido branco/cementita.",
      fonte:"Faixa geral de Si em ferros fundidos; ajustar ao grau." },
    manganes: { rotulo:"Manganês para ferro fundido", unidade:"%", max:1.20, severidade:"observacao",
      papel:"Mn estabiliza carbonetos e deve ser controlado; excesso pode aumentar dureza e reduzir usinabilidade/tenacidade.",
      fonte:"Referência geral; ajustar ao grau." },
    fosforo: { rotulo:"Fósforo para ferro fundido", unidade:"%", limite:0.10, severidade:"observacao",
      papel:"P aumenta fluidez, mas pode formar steadita frágil. Em peça estrutural, manter baixo.",
      fonte:"Teto genérico para triagem; ajustar ao componente." },
    enxofre: { rotulo:"Enxofre para ferro fundido", unidade:"%", limite:0.03, severidade:"observacao",
      papel:"S consome Mg e prejudica nodularização. Para nodular/vermicular, deve ser baixo antes do tratamento.",
      fonte:"Triagem conservadora para ferro fundido tratado com Mg; ajustar ao processo." },
    magnesio: { rotulo:"Magnésio residual", unidade:"%", min:0.015, max:0.080, severidade:"observacao",
      papel:"Mg residual é decisivo para formar grafita nodular ou vermicular. Baixo demais perde nodularidade; alto demais pode gerar defeitos/rechupes/carbonetos.",
      fonte:"Faixa genérica de Mg residual em ferros fundidos nodulares/vermicular; calibrar pelo fornecedor." },
    nodularidade: { chave:"NOD", rotulo:"Nodularidade", unidade:"%", min:80, opcional:true, severidade:"critico",
      papel:"Percentual de grafita em forma esferoidal. Alta nodularidade aumenta ductilidade, resistência e impacto.",
      fonte:"Referência comum para ferro fundido nodular; ajustar ao grau especificado." },
    nodulos: { chave:"NODULOS", rotulo:"Contagem de nódulos", unidade:"nod/mm²", min:100, opcional:true, severidade:"observacao",
      papel:"Nódulos numerosos e bem distribuídos ajudam a evitar carbonetos, segregação e variação de propriedades.",
      fonte:"Valor de triagem; depende da espessura da peça e método metalográfico." },
    ferrita: { chave:"FERRITA", rotulo:"Matriz ferrítica", unidade:"%", min:0, max:100, opcional:true, severidade:"observacao",
      papel:"Matriz ferrítica favorece ductilidade, alongamento, impacto e usinabilidade, com menor dureza/resistência.",
      fonte:"Campo informativo de metalografia quantitativa." },
    perlita: { chave:"PERLITA", rotulo:"Matriz perlítica", unidade:"%", min:0, max:100, opcional:true, severidade:"observacao",
      papel:"Matriz perlítica aumenta resistência, dureza e desgaste, mas reduz ductilidade e impacto.",
      fonte:"Campo informativo de metalografia quantitativa." },
    cementita: { chave:"CEMENTITA", rotulo:"Cementita/carbonetos livres", unidade:"%", max:2.0, opcional:true, severidade:"critico",
      papel:"Carbonetos livres elevam dureza e fragilidade. Em nodular/vermicular estrutural, presença relevante geralmente é indesejável.",
      fonte:"Teto genérico de triagem; ajustar à especificação." },
    carbonoEquivalente: { chave:"CE", rotulo:"Carbono equivalente — CE", unidade:"%", min:3.60, max:4.80, opcional:true, severidade:"observacao",
      papel:"CE = C + Si/3 + P/3. Indica tendência de solidificação/grafitização e risco de coquilhamento/cementita.",
      fonte:"Fórmula prática de fundição; calibrar por espessura da peça e processo." },
    tiposGrafita: ["Não avaliada", "Nodular / esferoidal", "Vermicular / compactada", "Lamelar / flocos", "Mista", "Sem grafita livre / branco"],
    matrizes: ["Não avaliada", "Ferrítica", "Perlítica", "Ferrítica + Perlítica", "Bainítica / ausferrítica", "Martensítica", "Com carbonetos/cementita"]
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
