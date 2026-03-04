# ABRAhub Studio — Arquitetura de Campanhas

## Convenção de Nomenclatura

### Padrão
```
[Plataforma]_[Objetivo]_[Funil]_[Audiência]_[Data]
```

### Exemplos
```
META_CONV_TOF_InteresseIA_2026Q1
META_CONV_MOF_Retargeting7d_2026Q1
META_CONV_BOF_PaginaVendas_2026Q1
GADS_SEARCH_Brand_ABRAhub_2026Q1
GADS_SEARCH_NonBrand_CursoIA_2026Q1
```

### Legenda
| Sigla | Significado |
|-------|-----------|
| META | Meta Ads (Instagram/Facebook) |
| GADS | Google Ads |
| CONV | Conversão |
| SEARCH | Search (Pesquisa) |
| TOF | Top of Funnel (Topo) |
| MOF | Middle of Funnel (Meio) |
| BOF | Bottom of Funnel (Fundo) |

---

## Meta Ads — Estrutura Completa

```
ABRAhub Studio (Business Manager)
│
├── 📊 Pixel: ABRAhub_Pixel
│   ├── PageView (todas as páginas)
│   ├── ViewContent (página de vendas)
│   ├── Lead (formulário/e-mail capturado)
│   ├── InitiateCheckout (início do checkout)
│   └── Purchase (compra confirmada)
│
├── 🎯 CAMPANHA 1: META_CONV_TOF_Prospecting_2026Q1
│   │   Objetivo: Conversões (Purchase ou Lead)
│   │   Budget: R$1.200/mês (~R$40/dia)
│   │   Bidding: Lowest Cost (início) → Cost Cap (após learning)
│   │
│   ├── Ad Set 1: Interesse_IA_Tech
│   │   │   Público: 18-40, Brasil
│   │   │   Interesses: Inteligência Artificial, Machine Learning,
│   │   │              Midjourney, ChatGPT, Criação de Conteúdo,
│   │   │              Marketing Digital, Adobe, Canva
│   │   │   Exclusão: Compradores existentes
│   │   │   Placement: Advantage+ (automático)
│   │   │
│   │   ├── Ad 1: Reel — "IA mudou tudo" (hook forte, 15s)
│   │   ├── Ad 2: Reel — Demo de ferramenta IA (30s)
│   │   ├── Ad 3: Reel — Antes/depois com IA (15s)
│   │   └── Ad 4: Imagem — Estatística impactante + CTA
│   │
│   ├── Ad Set 2: Lookalike_1pct_Engajados
│   │   │   Público: Lookalike 1% dos engajados no IG
│   │   │   Tamanho estimado: 1.5-2M pessoas
│   │   │   Exclusão: Compradores existentes
│   │   │
│   │   ├── Ad 1: Reel — Depoimento de aluno (30s)
│   │   ├── Ad 2: Reel — "Como criar [X] com IA em 5 min" (15s)
│   │   └── Ad 3: Carrossel — 5 resultados de alunos
│   │
│   └── Ad Set 3: Lookalike_1pct_Compradores
│       │   Público: Lookalike 1% dos compradores (quando tiver dados)
│       │   ⚠️ ATIVAR apenas após ter 100+ compradores no pixel
│       │
│       ├── Ad 1: Reel — Melhor criativo (winner do TOF)
│       └── Ad 2: Reel — Variação do winner
│
├── 🎯 CAMPANHA 2: META_CONV_MOF_Retargeting_2026Q1
│   │   Objetivo: Conversões (Purchase)
│   │   Budget: R$1.200/mês (~R$40/dia)
│   │   Bidding: Lowest Cost
│   │
│   ├── Ad Set 1: Retarget_VideoViewers_50pct
│   │   │   Público: Quem assistiu >50% dos vídeos (7-30 dias)
│   │   │   Exclusão: Compradores
│   │   │
│   │   ├── Ad 1: Carrossel — Depoimentos + oferta
│   │   ├── Ad 2: Reel — "O que você recebe na ABRAhub" (tour)
│   │   └── Ad 3: Imagem — Oferta direta com prazo
│   │
│   └── Ad Set 2: Retarget_IG_Engajados
│       │   Público: Interagiu com perfil IG (30 dias)
│       │   Exclusão: Compradores
│       │
│       ├── Ad 1: Reel — FAQ "Pra quem é a ABRAhub?"
│       └── Ad 2: Carrossel — Módulos do curso + resultados
│
├── 🎯 CAMPANHA 3: META_CONV_BOF_HotAudience_2026Q1
│   │   Objetivo: Conversões (Purchase)
│   │   Budget: R$1.600/mês (~R$53/dia)
│   │   Bidding: Lowest Cost → Bid Cap (se CPA estabilizar)
│   │
│   ├── Ad Set 1: Retarget_PaginaVendas_7d
│   │   │   Público: Visitou página de vendas nos últimos 7 dias
│   │   │   Exclusão: Compradores
│   │   │
│   │   ├── Ad 1: Reel — Urgência "Últimas vagas" + timer
│   │   ├── Ad 2: Imagem — Depoimento forte + "Garanta sua vaga"
│   │   └── Ad 3: Reel — Objeção quebrada (preço, tempo, dificuldade)
│   │
│   ├── Ad Set 2: Retarget_Checkout_Abandonado
│   │   │   Público: Iniciou checkout mas não comprou (14 dias)
│   │   │   ⚠️ Público pequeno no início — monitorar frequência
│   │   │
│   │   ├── Ad 1: Imagem — "Você esqueceu algo" + cupom 10%
│   │   └── Ad 2: Reel — Depoimento rápido + CTA urgente
│   │
│   └── Ad Set 3: Custom_ListaEmail
│       │   Público: Lista de e-mails (leads que não compraram)
│       │   Upload: CSV via Audiences
│       │
│       ├── Ad 1: Reel — Oferta exclusiva para lista
│       └── Ad 2: Imagem — Bônus especial + prazo
│
└── 🧪 CAMPANHA 4: META_CONV_ASC_Testing_2026Q1 (Advantage+)
    │   Objetivo: Sales (Advantage+ Shopping)
    │   Budget: R$0 inicialmente → R$500-1000 após ter dados
    │   ⚠️ ATIVAR apenas após Campanha 1-3 terem 50+ conversões
    │
    ├── Creative 1: Winner do TOF
    ├── Creative 2: Winner do MOF
    ├── Creative 3: Winner do BOF
    ├── Creative 4: Novo criativo teste
    └── Creative 5: Novo criativo teste
```

---

## Google Ads — Estrutura Completa

```
ABRAhub Studio (Google Ads Account)
│
├── 📊 Conversion Tracking
│   ├── Google Tag (gtag.js) em todas as páginas
│   ├── Enhanced Conversions ativado
│   ├── Conversão Principal: Purchase (valor dinâmico)
│   └── Conversões Secundárias: Lead, ViewContent
│
├── 🎯 CAMPANHA 1: GADS_SEARCH_Brand_ABRAhub_2026Q1
│   │   Tipo: Search
│   │   Budget: R$100/mês (~R$3.30/dia)
│   │   Bidding: Manual CPC ou Target Impression Share (top)
│   │   Rede: Search only (sem Display)
│   │
│   └── Ad Group 1: Brand Terms
│       │   Keywords:
│       │   [abrahub] (exact)
│       │   [abrahub studio] (exact)
│       │   "abrahub curso" (phrase)
│       │   "abrahub comunidade ia" (phrase)
│       │
│       ├── RSA 1: "ABRAhub Studio — Comunidade de IA | Crie Mídia..."
│       └── RSA 2: "ABRAhub Studio — Cursos de IA | Entre na Comunidade..."
│       │
│       └── Extensions:
│           ├── Sitelinks: Cursos, Comunidade, Depoimentos, Blog
│           ├── Callouts: Acesso Imediato, Comunidade Ativa, +500 Alunos
│           └── Structured Snippets: Cursos: Midjourney, ChatGPT, Vídeo IA
│
├── 🎯 CAMPANHA 2: GADS_SEARCH_NonBrand_HighIntent_2026Q1
│   │   Tipo: Search
│   │   Budget: R$700/mês (~R$23/dia)
│   │   Bidding: Maximize Conversions (início) → Target CPA (após dados)
│   │   Rede: Search only
│   │
│   ├── Ad Group 1: Curso_IA_Geral
│   │   │   Keywords:
│   │   │   "curso de inteligência artificial" (phrase)
│   │   │   [curso ia online] (exact)
│   │   │   "curso criar conteúdo com ia" (phrase)
│   │   │   "aprender inteligência artificial" (phrase)
│   │   │
│   │   ├── RSA 1: "Curso de IA para Criadores | Crie Mídia Profissional..."
│   │   └── RSA 2: "Aprenda IA na Prática | Comunidade + Cursos..."
│   │
│   ├── Ad Group 2: Curso_Midia_IA
│   │   │   Keywords:
│   │   │   "criar conteúdo com inteligência artificial" (phrase)
│   │   │   [curso midjourney] (exact)
│   │   │   "como fazer vídeo com ia" (phrase)
│   │   │   "editar imagem com ia" (phrase)
│   │   │   "curso ia para marketing" (phrase)
│   │   │
│   │   ├── RSA 1: "Crie Mídia com IA | Do Zero ao Profissional..."
│   │   └── RSA 2: "Midjourney, ChatGPT e Mais | Domine as Ferramentas..."
│   │
│   └── Ad Group 3: Comunidade_IA
│       │   Keywords:
│       │   "comunidade de ia" (phrase)
│       │   "grupo de estudos ia" (phrase)
│       │   "comunidade criadores ia" (phrase)
│       │
│       ├── RSA 1: "Comunidade ABRAhub | Aprenda IA com Outros Criadores..."
│       └── RSA 2: "Entre na Maior Comunidade de IA | Networking + Cursos..."
│
│   │   Negative Keywords (nível de campanha):
│   │   grátis, gratuito, free, download, pdf, torrent,
│   │   emprego, vaga, salário, certificado mec,
│   │   programação, python, machine learning avançado
│
└── 🎯 CAMPANHA 3: GADS_SEARCH_NonBrand_Discovery_2026Q1
    │   Tipo: Search
    │   Budget: R$200/mês (~R$6.60/dia)
    │   Bidding: Maximize Clicks (início) → Maximize Conversions
    │   Rede: Search only
    │   ⚠️ Monitorar termos de pesquisa semanalmente
    │
    └── Ad Group 1: Ferramentas_IA
        │   Keywords:
        │   "como usar chatgpt" (phrase)
        │   "como usar midjourney" (phrase)
        │   "ferramentas de ia para criadores" (phrase)
        │   "ia para criar conteúdo instagram" (phrase)
        │
        ├── RSA 1: "Domine as Ferramentas de IA | Curso Prático + Comunidade..."
        └── RSA 2: "ChatGPT, Midjourney e Mais | Aprenda com Quem Usa na Prática..."
```

---

## Audiências — Resumo

### Meta Ads

| Audiência | Tipo | Tamanho Estimado | Campanha |
|-----------|------|-----------------|----------|
| Interesse IA + Tech | Interest-based | 3-5M | TOF |
| Lookalike 1% Engajados IG | Lookalike | 1.5-2M | TOF |
| Lookalike 1% Compradores | Lookalike | 1.5-2M | TOF (futuro) |
| Video Viewers 50%+ (7-30d) | Custom | 500-5K | MOF |
| IG Profile Engajados (30d) | Custom | 1K-10K | MOF |
| Página de Vendas (7d) | Website Custom | 100-1K | BOF |
| Checkout Abandonado (14d) | Website Custom | 10-100 | BOF |
| Lista de E-mails | Customer List | Variável | BOF |

### Google Ads

| Audiência | Tipo | Campanha |
|-----------|------|----------|
| Termos de marca | Keyword | Brand |
| Alta intenção (curso IA) | Keyword | Non-Brand High Intent |
| Descoberta (ferramentas) | Keyword | Non-Brand Discovery |

---

## Regras de Gestão

### Frequência de Otimização

| Ação | Frequência |
|------|-----------|
| Verificar delivery e gastos | Diária (primeiros 14 dias), depois 3x/semana |
| Analisar termos de pesquisa (Google) | Semanal |
| Pausar ads com CPA > 3x target | Semanal |
| Trocar criativos com fadiga | A cada 2-3 semanas |
| Revisar audiências e exclusões | Quinzenal |
| Report completo de performance | Mensal |
| Revisão estratégica | Trimestral |

### Quando Escalar

- [ ] ROAS > target por 5+ dias consecutivos
- [ ] CPA estável abaixo do target
- [ ] Frequência < 3 no ad set
- [ ] Escalar em incrementos de 20% (nunca dobrar budget de uma vez)

### Quando Pausar

- [ ] CPA > 3x target por 7+ dias
- [ ] CTR < 0.5% (Meta) ou < 2% (Google)
- [ ] Frequência > 5 no ad set (Meta)
- [ ] Relevance Score / Quality Score baixo
