# ABRAhub Studio — Roadmap de Implementação

## Landing Page
**URL**: `abrahub.com/comunidade`

## Preços
- **Mensal**: R$89/mês
- **Anual**: R$1.080/ano (normal) / R$534/ano (50% off lançamento)

---

## Fase 1 — Fundação (Semanas 1-2)

### Semana 1: Setup Técnico

| Dia | Tarefa | Responsável | Status |
|-----|--------|-------------|--------|
| D1 | Criar Business Manager no Meta (se não tiver) | Owner | [ ] |
| D1 | Criar conta Google Ads (se não tiver) | Owner | [ ] |
| D1 | Verificar domínio `abrahub.com` no Business Manager | Owner | [ ] |
| D2 | Instalar Meta Pixel em `abrahub.com` | Dev/Owner | [ ] |
| D2 | Instalar Google Tag (gtag.js) em `abrahub.com` | Dev/Owner | [ ] |
| D2 | Configurar GA4 e linkar com Google Ads | Owner | [ ] |
| D3 | Configurar eventos: ViewContent, InitiateCheckout, Purchase | Dev/Owner | [ ] |
| D3 | Configurar Meta CAPI (via plataforma de checkout) | Owner | [ ] |
| D3 | Configurar Enhanced Conversions no Google Ads | Owner | [ ] |
| D4 | Testar fluxo completo com Pixel Helper e Tag Assistant | Owner | [ ] |
| D4 | Verificar EMQ > 6.0 no Events Manager | Owner | [ ] |
| D5 | Configurar eventos priorizados (Aggregated Event Measurement) | Owner | [ ] |
| D5 | Criar audiências Custom: engajados IG, video viewers | Owner | [ ] |

**Entregável**: Tracking 100% funcional e verificado.

### Semana 2: Estrutura de Campanhas + Criativos

| Dia | Tarefa | Responsável | Status |
|-----|--------|-------------|--------|
| D6 | Selecionar 3-5 vídeos do Instagram para reutilizar como ads | Owner | [ ] |
| D6 | Editar vídeos: adicionar hook nos primeiros 3s + CTA no final | Owner/Editor | [ ] |
| D7 | Criar 2-3 imagens estáticas (oferta, prova social, dado) | Owner/Designer | [ ] |
| D7 | Criar 1 carrossel (5 slides) com resultados de alunos | Owner/Designer | [ ] |
| D8 | Criar estrutura de campanhas no Meta Ads Manager | Owner | [ ] |
| D8 | Configurar audiências (interesses, exclusões) | Owner | [ ] |
| D9 | Criar campanhas no Google Ads (Brand + Non-Brand) | Owner | [ ] |
| D9 | Escrever RSAs (15 headlines + 4 descriptions) | Owner | [ ] |
| D9 | Configurar negative keywords no Google | Owner | [ ] |
| D10 | Configurar UTMs em todos os ads | Owner | [ ] |
| D10 | Revisar tudo antes de lançar | Owner | [ ] |

**Entregável**: Campanhas prontas para lançar, criativos subidos.

---

## Fase 2 — Lançamento (Semanas 3-4)

### Semana 3: Go Live

| Dia | Tarefa | Responsável | Status |
|-----|--------|-------------|--------|
| D11 | **LANÇAR** Campanha Meta TOF (Prospecting) | Owner | [ ] |
| D11 | **LANÇAR** Campanha Google Brand | Owner | [ ] |
| D11 | Verificar se conversões estão sendo registradas | Owner | [ ] |
| D12 | **LANÇAR** Campanha Meta MOF (Retargeting warm) | Owner | [ ] |
| D12 | **LANÇAR** Campanha Google Non-Brand High Intent | Owner | [ ] |
| D13 | Monitorar CPM, CTR, CPC — anotar baselines | Owner | [ ] |
| D14 | **LANÇAR** Campanha Meta BOF (Hot audience) | Owner | [ ] |
| D14 | **LANÇAR** Campanha Google Non-Brand Discovery | Owner | [ ] |
| D15 | Revisar termos de pesquisa Google — adicionar negativos | Owner | [ ] |

**Importante**:
- Lançar campanhas escalonadamente (não tudo no mesmo dia)
- NÃO fazer mudanças nos primeiros 3-5 dias de cada campanha
- Monitorar diariamente mas não intervir até ter dados

### Semana 4: Monitoramento Inicial

| Dia | Tarefa | Frequência | Status |
|-----|--------|-----------|--------|
| D16-20 | Verificar delivery e gastos diários | Diário | [ ] |
| D16-20 | Anotar CPM, CTR, CPC, CPA de cada ad set | Diário | [ ] |
| D18 | Primeira análise de termos de pesquisa Google | Pontual | [ ] |
| D20 | **Revisão Semana 1**: Algum ad set com CPA > 3x? | Pontual | [ ] |

**Regra**: Nenhuma campanha é pausada antes de gastar pelo menos 2x o CPA target (R$200+).

---

## Fase 3 — Otimização (Semanas 5-8)

### Semana 5-6: Primeiras Otimizações

| Tarefa | Critério | Ação |
|--------|---------|------|
| Pausar ad sets com CPA > 3x target | CPA > R$300 após R$200+ gastos | Pausar ad set |
| Escalar ad sets com CPA < target | CPA < R$100 por 5+ dias | +20% budget |
| Trocar criativos com fadiga | CTR caiu >30% do pico | Substituir por novos criativos |
| Negativar termos ruim no Google | Termos irrelevantes gastando | Adicionar como negativos |
| Testar novo hook no melhor criativo | Winner identificado | Criar variação com hook diferente |

### Semana 7-8: Iteração

| Tarefa | Frequência |
|--------|-----------|
| Produzir 3-4 novos criativos (Prioridade 2 do Creative Brief) | Pontual |
| Subir novos criativos nos ad sets existentes | Pontual |
| Considerar Advantage+ Shopping Campaign (se 50+ conversões) | Avaliação |
| Expandir audiências: Lookalike 1% de compradores (se 100+ purchases) | Avaliação |
| Report mensal completo de performance | Pontual |

---

## Fase 4 — Escala (Semanas 9-12)

### Semana 9-10: Escalar Winners

| Tarefa | Critério | Ação |
|--------|---------|------|
| Aumentar budget das campanhas vencedoras | ROAS > 2.5x sustentado | +20% a cada 5 dias |
| Criar Advantage+ Shopping Campaign | 50+ conversões no pixel | Nova campanha com 5+ criativos winners |
| Ativar Broad match no Google | 30+ conversões Google | Testar com Target CPA |
| Produzir criativos Prioridade 3 | Escala em andamento | Novos formatos e pilares |

### Semana 11-12: Avaliação e Planejamento

| Tarefa | Entregável |
|--------|-----------|
| Report completo de 3 meses | Performance por campanha, ad set, criativo |
| Análise de LTV real vs. estimado | Dados de retenção dos assinantes |
| Decisão: adicionar TikTok Ads? | Se budget pode subir para R$7.5K+ |
| Decisão: aumentar budget total? | Baseado em ROAS e capacidade de entrega |
| Planejamento Q2 | Novos objetivos, orçamento, criativos |

---

## Calendário Resumido

```
SEMANA 1  ████████ Setup técnico (pixels, tags, tracking)
SEMANA 2  ████████ Criativos + estrutura de campanhas
SEMANA 3  ██████── Lançamento escalonado (Meta → Google)
SEMANA 4  ████──── Monitoramento diário, baseline de métricas
SEMANA 5  ██████── Primeiras otimizações (kill/scale)
SEMANA 6  ██████── Novos criativos, testes de audiência
SEMANA 7  ████████ Iteração baseada em dados
SEMANA 8  ████████ Report mensal, planejamento mês 3
SEMANA 9  ██████── Escalar winners, ASC, Broad match
SEMANA 10 ██████── Novos criativos P3, expansão
SEMANA 11 ████████ Report trimestral
SEMANA 12 ████████ Decisões estratégicas Q2
```

---

## Checkpoints de Decisão

### Checkpoint 1: Fim da Semana 4 (1 mês)

| Pergunta | Se SIM | Se NÃO |
|----------|--------|--------|
| Pixel/Tag registrando conversões? | Continuar | PARAR — corrigir tracking antes de gastar mais |
| CPA < R$200? | Bom — otimizar para baixar | Revisar criativos e audiências |
| Pelo menos 1 ad set com CPA < R$100? | Ótimo — escalar | Testar novos criativos urgente |
| CTR Meta > 1.0%? | Bom | Hooks fracos — refazer criativos |
| CTR Google > 3.0%? | Bom | Ad copy fraca — reescrever RSAs |

### Checkpoint 2: Fim da Semana 8 (2 meses)

| Pergunta | Se SIM | Se NÃO |
|----------|--------|--------|
| ROAS > 1.5x? | Escalar com confiança | Problema no funil — revisar LP e oferta |
| 50+ conversões no pixel? | Lançar ASC | Continuar otimizando manualmente |
| Winners claros identificados? | Escalar + variar | Mais testes A/B necessários |
| Budget sendo gasto 100%? | Campanhas saudáveis | Audiência pequena ou lance baixo — expandir |

### Checkpoint 3: Fim da Semana 12 (3 meses)

| Pergunta | Se SIM | Se NÃO |
|----------|--------|--------|
| ROAS > 2.5x? | Aumentar budget 50-100% | Manter e otimizar mais |
| CPA < R$100 sustentado? | Adicionar TikTok/YouTube | Focar em melhorar Meta/Google |
| Receita de ads > R$15K/mês? | Considerar agência ou freelancer | Manter in-house |
| Churn dos assinantes < 15%/mês? | LTV sustenta CPA | Problema no produto — focar em retenção |

---

## Ferramentas Recomendadas

| Ferramenta | Uso | Custo |
|-----------|-----|-------|
| **Meta Business Suite** | Gerenciar anúncios Meta | Grátis |
| **Google Ads** | Gerenciar anúncios Google | Grátis (paga pelo clique) |
| **Meta Pixel Helper** (Chrome) | Verificar pixel | Grátis |
| **Google Tag Assistant** (Chrome) | Verificar tags Google | Grátis |
| **Canva Pro** | Criar imagens e carrosséis | ~R$35/mês |
| **CapCut** | Editar vídeos para Reels | Grátis |
| **Google Analytics 4** | Análise de tráfego | Grátis |
| **Google Sheets** | Reports e tracking manual | Grátis |

---

## Contatos e Recursos

### Se precisar de ajuda profissional

| Necessidade | Opção | Custo Estimado |
|-----------|-------|---------------|
| Gestão de tráfego completa | Gestor de tráfego freelancer | R$1.500-3.000/mês |
| Edição de vídeo para ads | Editor freelancer | R$500-1.500/mês |
| Design de criativos | Designer no Fiverr/99Freelas | R$300-800/mês |
| Consultoria estratégica | Consultor de tráfego pago | R$500-2.000/sessão |

### Recursos de aprendizado
- Meta Blueprint (gratuito) — certificação oficial Meta Ads
- Google Skillshop (gratuito) — certificação oficial Google Ads
- Comunidades BR: Sobral de Tráfego, Tráfego para Negócios Locais
