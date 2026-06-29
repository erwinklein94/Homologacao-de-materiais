# Analisador de laudos de aço — Homologação de Materiais (Rumo)

Site estático para apoiar a homologação de **ombreiras / chumbadores (shoulders)** metálicos embutidos em dormente de concreto. Você lança os números do laudo do laboratório e o site faz a **triagem técnica** de cada parâmetro (química, metalografia, dureza, tração e impacto), dizendo se está **alto, baixo, ok** ou se há **impureza**, com um parecer e um veredito geral.

> **Importante — é uma triagem.** Os limites usados são faixas de **referência da metalurgia do aço‑carbono**, não a especificação de um grau específico. O resultado é uma análise preliminar e **não substitui** o laudo de homologação nem a norma do material.

---

## Estrutura

```
homologacao-acos-rumo/
├── index.html          Entrada de parâmetros (formulário)
├── dashboard.html      Dashboard com gráficos técnicos por item do relatório
├── resultados.html     Resultados e pareceres
├── guia.html           Guia técnico (metalurgia que embasa a análise)
├── css/
│   └── estilo.css       Identidade visual Rumo + componentes
├── js/
│   ├── limites.js       ← FAIXAS DE REFERÊNCIA (o único arquivo que você edita)
│   ├── analise.js       Motor: classifica valores e monta o parecer
│   ├── entrada.js       Monta o formulário e salva os dados/histórico local
│   ├── dashboard.js     Desenha os gráficos do laudo e do histórico
│   └── resultados.js    Desenha o veredito e as barras de faixa
└── assets/rumo/         Logos oficiais
```

Sem framework e sem etapa de build: é HTML, CSS e JavaScript puro. Roda direto no navegador e no GitHub Pages.

---

## Rodar no seu computador

Basta abrir o `index.html` no navegador. Se preferir um servidor local:

```bash
cd homologacao-acos-rumo
python3 -m http.server 8000
# abra http://localhost:8000
```

---

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e suba **todos os arquivos mantendo a estrutura de pastas** (o `index.html` precisa ficar na raiz do repositório).
2. No repositório, vá em **Settings → Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, selecione `main` e a pasta `/ (root)`; clique em **Save**.
5. Aguarde alguns instantes: o endereço aparece como `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Observações:
- Os dados digitados ficam **apenas no seu navegador** (via `localStorage`), passando da tela de parâmetros para a de resultados e para o dashboard. Nada é enviado para servidor algum.
- Para repositório **privado**, o GitHub Pages exige plano pago/organização. Em repositório **público** funciona no plano gratuito.

---

## Calibrar os limites para o grau da ombreira

Quando você tiver a **especificação do grau exato** (composição química e propriedades exigidas), edite **somente** o arquivo `js/limites.js`. Cada parâmetro tem:

| Campo | Significado |
|---|---|
| `min` / `max` | Faixa aceitável. Abaixo de `min` = "abaixo"; acima de `max` = "acima". |
| `limite` | Teto de impureza (P, S). Acima disso = "alto". |
| `severidade` | `'critico'` reprova a triagem; `'observacao'` vira ressalva. |
| `opcional` | `true` = se o campo ficar em branco, é ignorado. |
| `fonte` | Texto da referência que aparece no parecer. |

Os campos marcados como **PLACEHOLDER** (limite de resistência, escoamento, alongamento e impacto Charpy) são os que mais dependem do grau — troque-os pelos valores da norma assim que possível. Ao salvar o arquivo e recarregar a página, o formulário e a análise já passam a usar os novos valores (o formulário é gerado a partir desse arquivo).

---

## De onde vêm as faixas de referência

As porcentagens e critérios foram reunidos da literatura de metalurgia do aço‑carbono (resumo na aba **Guia técnico**), com base em: Essentra Components e Metal Supermarkets (classificação por carbono); STI/SPFA, ASTM Steel e IspatGuru (impurezas P/S e papel de Mn/Si); ScienceDirect (diagrama Fe–C, ponto eutetóide ≈ 0,77% C e constituintes); ASTM E140 / Machinery's Handbook (relação dureza × resistência, UTS ≈ 3,45 × HB); ASTM E45 (inclusões) e ASTM E112 (tamanho de grão).

---

## Nota

O relatório de laboratório de exemplo não chegou a ser anexado durante a construção. Os nomes e unidades dos campos seguem as cinco análises informadas (química, metalografia, micrografia óptica, dureza, tração e impacto). Quando você anexar um laudo real, é simples ajustar rótulos/unidades em `js/limites.js` para casar exatamente com o seu modelo de laudo.
