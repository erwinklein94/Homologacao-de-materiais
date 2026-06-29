# Validação — Brand Book Rumo

Checklist de aderência à identidade visual da Rumo aplicada ao site "Analisador de laudos de aço — Homologação de Materiais". Referência: brand book oficial (brandbook.rumolog.com).

## Paleta institucional

| Token | Hex | Uso no site | Proporção |
|---|---|---|---|
| Azul âncora | `#003865` | Barra superior, rodapé, títulos, marcadores, textos principais, botão primário | Dominante (~60–70%) |
| Azul claro | `#32A6E6` | Foco de campos, links, faixa "eutetóide" no guia | Apoio |
| Verde | `#1E9F7F` | Borda da barra superior, veredito "conforme", chip "dentro", zona aceitável das barras | Apoio |
| Verde claro | `#7FE06C` | Subtítulo da marca na barra superior | Pontual |
| Amarelo | `#FBD300` | Aviso de triagem, veredito "ressalvas", chip "atenção" | Pontual (secundária) |
| Laranja | `#F78344` | Tags de "impureza", faixa "hipereutetóide" no guia | Pontual (secundária) |

- **Azul como cor âncora dominante:** atendido (estrutura, navegação, tipografia e ação principal em azul).
- **Cores secundárias (amarelo/laranja) apenas em destaques pontuais:** atendido (alertas, impurezas, tags de estado).
- **Roxo (cor associada à Raízen) não utilizado:** atendido — ausente do projeto.
- **Erro/negativo** usa vermelho controlado (`#D84545`) apenas para estados de reprovação, sem competir com a paleta institucional.

## Tipografia

- Fonte da marca: **Cera Pro** com fallback **Verdana** — declarada como
  `"Cera Pro", Verdana, Geneva, Tahoma, sans-serif`.
- **Cera Pro não foi embutida** (sem licença de webfont para distribuição). Em máquinas sem a fonte instalada, o fallback **Verdana** assume — que é o fallback oficial do brand book. Atendido.
- Fonte monoespaçada (`ui-monospace`/Consolas) usada **apenas** para valores numéricos e leituras de medição, reforçando o caráter de "instrumento de laboratório". É um recurso de hierarquia, não substitui a fonte institucional.

## Logotipo

- Arquivos oficiais utilizados: `rumo-logo-branco.png` (sobre fundo azul, na barra superior e rodapé) e `rumo-logo-azul.png` (sobre fundo claro, no estado vazio dos resultados).
- **Contraste do logo com o fundo:** branco sobre azul âncora e azul sobre fundo claro — atendido.
- **Largura mínima e área de respiro:** o logo é renderizado com altura de 30 px na barra (largura resultante > 70 px) e com espaçamento livre ao redor; sem distorção (proporção preservada).
- Logo **não** aplicado sobre fundos de baixo contraste nem sobre as cores secundárias.

## Forma e grafismo

- Cantos com **chanfro sutil** (raio de 14 px) em cards, botões e campos — eco do grafismo modular da marca.
- Elemento-assinatura: **cantos chanfrados literais** (clip-path) nos selos numéricos dos cards e no banner de veredito, mais as **barras de faixa** (régua de medição) na tela de resultados — coerentes com o universo de metrologia/laboratório do produto.

## Acessibilidade (piso de qualidade)

- Contraste de texto em conformidade com WCAG AA/AAA nas combinações principais (azul sobre branco; branco sobre azul; texto escuro sobre amarelo no veredito "ressalvas").
- Foco de teclado visível em campos e botões (`:focus` / `:focus-visible`).
- `prefers-reduced-motion` respeitado (transições desativadas).
- Layout responsivo até telas estreitas (~360 px).
- Estilo de impressão (`@media print`) para gerar o parecer em PDF sem a navegação.

## Observação sobre licenças

A fonte **Cera Pro** é proprietária e **não acompanha** este projeto. Para fidelidade tipográfica total em produção, instale a Cera Pro no ambiente/servidor conforme a licença adquirida pela Rumo; do contrário, o fallback Verdana mantém a leitura dentro do padrão da marca.
