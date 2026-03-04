# ABRAhub Studio — Setup de Tracking e Conversões

## Landing Page
**URL**: `abrahub.com/comunidade`

---

## Visão Geral do Tracking

```
Visitante → abrahub.com/comunidade
    │
    ├── Meta Pixel (client-side) → PageView, ViewContent
    ├── Google Tag (gtag.js) → page_view
    └── UTM Parameters → Analytics
    │
    ├── Clica "Garantir minha vaga"
    │   ├── Meta Pixel → InitiateCheckout
    │   └── Google Tag → begin_checkout
    │
    ├── Checkout (Hotmart/Kiwify/plataforma de pagamento)
    │   ├── Meta Pixel → Purchase (via postback ou thank-you page)
    │   └── Google Tag → purchase (via postback ou thank-you page)
    │
    └── Thank You Page
        ├── Meta Pixel → Purchase (value, currency)
        ├── Google Tag → conversion (value, currency)
        └── Meta CAPI → Purchase (server-side, backup)
```

---

## 1. Meta Pixel Setup

### Passo a Passo

#### 1.1 Criar o Pixel
- [ ] Acessar **Meta Business Suite** → Events Manager
- [ ] Criar novo Pixel: "ABRAhub_Pixel"
- [ ] Anotar o **Pixel ID** (número de 15-16 dígitos)

#### 1.2 Instalar o Pixel no Site
- [ ] Adicionar o código base do Pixel no `<head>` de `abrahub.com`

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'SEU_PIXEL_ID_AQUI');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=SEU_PIXEL_ID_AQUI&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
```

#### 1.3 Configurar Eventos de Conversão

| Evento | Quando Disparar | Parâmetros |
|--------|----------------|------------|
| `PageView` | Toda página (automático) | — |
| `ViewContent` | Página de vendas carregada | `content_name: "Comunidade ABRAhub"` |
| `Lead` | E-mail capturado (se tiver formulário) | `content_name: "Lead Comunidade"` |
| `InitiateCheckout` | Clique em "Garantir minha vaga" | `value: 89, currency: "BRL"` |
| `Purchase` | Thank-you page / postback | `value: VALOR, currency: "BRL"` |

```javascript
// ViewContent — Na página abrahub.com/comunidade
fbq('track', 'ViewContent', {
  content_name: 'Comunidade ABRAhub',
  content_category: 'Infoproduto',
  value: 89.00,
  currency: 'BRL'
});

// InitiateCheckout — No clique do botão "Garantir minha vaga"
fbq('track', 'InitiateCheckout', {
  content_name: 'Comunidade ABRAhub',
  value: 89.00,
  currency: 'BRL',
  num_items: 1
});

// Purchase — Na thank-you page (após pagamento confirmado)
fbq('track', 'Purchase', {
  content_name: 'Comunidade ABRAhub',
  value: VALOR_PAGO,  // dinâmico: 89 ou 534 ou 1080
  currency: 'BRL',
  content_type: 'product'
});
```

#### 1.4 Verificar o Pixel
- [ ] Instalar extensão **Meta Pixel Helper** no Chrome
- [ ] Acessar `abrahub.com/comunidade` e verificar se PageView e ViewContent disparam
- [ ] Testar o fluxo de checkout até Purchase
- [ ] No Events Manager, verificar se os eventos aparecem em "Test Events"

#### 1.5 Meta CAPI (Conversions API) — Server-Side

**Por que**: O Pixel sozinho perde ~20-30% dos eventos por ad blockers e iOS privacy. CAPI envia os mesmos eventos pelo servidor.

**Como implementar (depende da plataforma de checkout):**

| Plataforma | Integração CAPI |
|-----------|----------------|
| **Hotmart** | Nativa — ativar nas configurações do produto → Integrações → Meta |
| **Kiwify** | Nativa — Configurações → Pixels → adicionar Pixel ID + Access Token |
| **Eduzz** | Nativa — Funil → Integrações → Facebook Pixel |
| **Custom** | Implementar via API: `graph.facebook.com/v18.0/{pixel_id}/events` |

- [ ] Gerar **Access Token** no Events Manager → Settings → Generate Access Token
- [ ] Configurar CAPI na plataforma de checkout
- [ ] Verificar **Event Match Quality (EMQ)** no Events Manager → deve ser > 6.0
- [ ] Ativar **deduplicação** (enviar `event_id` igual no Pixel e CAPI)

---

## 2. Google Ads Conversion Tracking

### Passo a Passo

#### 2.1 Criar Tag de Conversão
- [ ] Google Ads → Tools & Settings → Conversions → New Conversion Action
- [ ] Tipo: "Website"
- [ ] Nome: "ABRAhub Purchase"
- [ ] Valor: "Use different values for each conversion" (valor dinâmico)
- [ ] Contagem: "Every" (cada compra conta)
- [ ] Anotar **Conversion ID** e **Conversion Label**

#### 2.2 Instalar Google Tag (gtag.js)

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-XXXXXXXXX');
</script>
```

#### 2.3 Evento de Conversão (Purchase)

```html
<!-- Na thank-you page -->
<script>
  gtag('event', 'conversion', {
    'send_to': 'AW-XXXXXXXXX/YYYYYYYY',
    'value': VALOR_PAGO,
    'currency': 'BRL',
    'transaction_id': 'ORDER_ID_UNICO'
  });
</script>
```

#### 2.4 Enhanced Conversions
- [ ] Google Ads → Tools → Conversions → Settings → Enhanced Conversions → Turn ON
- [ ] Configurar para enviar dados hasheados (email, phone) com a conversão
- [ ] Isso melhora a atribuição em ~5-15%

```javascript
gtag('set', 'user_data', {
  'email': 'email_do_comprador@hashado',
  'phone_number': '+55XXXXXXXXX'
});
```

#### 2.5 Verificar
- [ ] Google Ads → Tools → Conversions → verificar status "Recording conversions"
- [ ] Usar **Google Tag Assistant** para validar disparo da tag
- [ ] Testar conversão (pode levar 24-48h para aparecer)

---

## 3. UTM Parameters

### Padrão de UTMs

```
?utm_source={plataforma}&utm_medium={tipo}&utm_campaign={campanha}&utm_content={ad_set}&utm_term={ad}
```

### Templates

#### Meta Ads
```
URL: abrahub.com/comunidade?utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}
```
*Use os dynamic parameters da Meta: `{{campaign.name}}`, `{{adset.name}}`, `{{ad.name}}`*

#### Google Ads
```
URL: abrahub.com/comunidade?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}
```
*Use os ValueTrack parameters do Google: `{campaignid}`, `{adgroupid}`, `{keyword}`*

---

## 4. Google Analytics 4 (GA4)

### Setup Básico
- [ ] Criar propriedade GA4 para abrahub.com
- [ ] Instalar tag GA4 (pode ser pelo mesmo gtag.js)
- [ ] Configurar eventos de conversão: `purchase`, `begin_checkout`, `generate_lead`
- [ ] Linkar GA4 com Google Ads (para audiências e atribuição)

```javascript
// Junto com o gtag do Google Ads
gtag('config', 'G-XXXXXXXXXX');  // ID do GA4
```

---

## 5. Checklist de Verificação Pré-Lançamento

### Meta Pixel
- [ ] Pixel instalado em todas as páginas do site
- [ ] PageView disparando em toda visita
- [ ] ViewContent disparando na página de vendas
- [ ] InitiateCheckout disparando no clique de compra
- [ ] Purchase disparando na thank-you page com valor correto
- [ ] CAPI configurada e deduplicando com Pixel
- [ ] EMQ (Event Match Quality) > 6.0
- [ ] Domínio verificado no Business Manager
- [ ] Eventos priorizados (Aggregated Event Measurement): Purchase > InitiateCheckout > ViewContent
- [ ] Pixel Helper mostrando verde (sem erros)

### Google Ads
- [ ] Google Tag instalado em todas as páginas
- [ ] Conversão "Purchase" criada e ativa
- [ ] Enhanced Conversions ativado
- [ ] Tag Assistant validando sem erros
- [ ] Conversão aparecendo como "Recording" no Google Ads

### UTMs e Analytics
- [ ] UTMs configurados em todos os ads
- [ ] GA4 recebendo tráfego e eventos
- [ ] GA4 linkado ao Google Ads
- [ ] Testar fluxo completo: click → LP → checkout → purchase → conversão registrada

---

## 6. Troubleshooting Comum

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Pixel não dispara | Código não instalado ou erro JS | Verificar com Pixel Helper; checar console do navegador |
| Purchase não registra | Thank-you page sem código ou redirect | Configurar postback pela plataforma de pagamento |
| Valores de conversão zerados | `value` não passado ou passado como string | Garantir que value é número e currency é "BRL" |
| EMQ baixo (<4.0) | Poucos dados do usuário no CAPI | Enviar email e phone hasheados junto com eventos |
| Conversões duplicadas | Pixel + CAPI sem deduplicação | Usar `event_id` igual em ambos |
| Conversões no Google Ads atrasadas | Normal | Google pode levar 24-72h para reportar conversões |

---

## Plataformas de Checkout com Integração Nativa

Se a ABRAhub usa uma dessas plataformas, o tracking de Purchase pode ser configurado diretamente nelas (sem código manual):

| Plataforma | Meta Pixel | Meta CAPI | Google Ads | Facilidade |
|-----------|-----------|-----------|------------|-----------|
| Hotmart | Nativo | Nativo | Nativo | Fácil |
| Kiwify | Nativo | Nativo | Nativo | Fácil |
| Eduzz | Nativo | Parcial | Nativo | Médio |
| Stripe | Via Zapier/custom | Custom | Via Zapier/custom | Difícil |
| WooCommerce | Plugin | Plugin | Plugin | Médio |

**Recomendação**: Se usa Hotmart ou Kiwify, ative as integrações nativas primeiro — são mais confiáveis que implementação manual.
