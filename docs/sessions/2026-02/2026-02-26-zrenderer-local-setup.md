# Session Handoff — 2026-02-26 — zrenderer Local Setup

## Status: CONCLUÍDO

O zrenderer local está funcionando e renderizando sprites LATAM-specific (garments 164, 175 etc.) que o VisualRag público não tinha.

## O que foi feito nesta sessão

### 1. Hair Palette Colors (CharacterPreview.tsx)
- Corrigidas as cores hex dos 9 hair palettes para corresponder aos sprites reais renderizados
- Testados headdir 0/1/2 — todos idênticos (limitação do zrenderer, não bug)

### 2. Atributos Panel Redesign (builds/page.tsx)
- Painéis "Atributos" e "Informação" mesclados em tabela única estilo RO
- StatInput com draft string state (campo fica vazio ao clicar, não "0" ou "1")
- Validação de budget de stat points (não permite pontos negativos)
- Botão ">" azul claro para incrementar, desabilitado quando sem pontos
- `statBonuses` adicionado ao DerivedStats em `ro-stats.ts`

### 3. Weapon/Shield no CharacterPreview
- RenderParams agora inclui `weapon` e `shield` (classNum)
- renderParams no builds/page.tsx popula weapon de `right_hand` e shield de `left_hand`

### 4. zrenderer Local — CONCLUÍDO
- **WSL2** habilitado e funcionando após restart do PC
- **Docker Desktop** v29.2.0 rodando com WSL2 backend
- **GRF v3 (Event Horizon)**: O `data.grf` do LATAM usa formato GRF versão 0x300 ("Event Horizon" signature) — formato mais novo que nenhum extrator suportava
- **grf-extractor patchado** (`npm install -g grf-extractor`) com 3 fixes:
  1. Aceitar signature "Event Horizon" e version 0x300 (além de "Master of Magic"/0x200)
  2. Offsets de 8 bytes nas entradas (v3 usa 64-bit offsets) + 4 bytes de padding na tabela
  3. Decodificação de filenames EUC-KR → UTF-8 (nomes Korean dos sprites)
  4. **Bug fix crítico**: `extractor.js` escrevia `buffer` (dados comprimidos) em vez de `buf` (descomprimidos)
- **206.143 arquivos** extraídos do GRF de 3.4 GB (~15 erros em CSVs/TXTs não-críticos)
- **Container zrenderer** rodando em `localhost:11011`
- **Token auto-gerado**: `d92uuwyyl0qtwep58g1kj9aqzjnq2ccr`
- **enableShadow: false** — `ShadowTable.lua` tem bug na linha 796 (`table index is nil`), shadow desabilitado no CharacterPreview
- `.env.local` apontando para `http://localhost:11011`

## Problemas conhecidos

### ShadowTable.lua bug
- O `ShadowTable.lub` compilado (Lua 5.1 bytecode) dá `table index is nil` na linha 796
- Workaround: `enableShadow: false` no CharacterPreview
- Para resolver: baixar ShadowTable.lua de texto (rAthena/Hercules) ou debugar o bytecode

### grf-extractor patches são locais
- Os patches estão em `C:\Users\User\AppData\Roaming\npm\node_modules\grf-extractor\lib\`
- Se reinstalar com `npm install -g grf-extractor`, os patches serão perdidos
- Arquivos patchados: `Loaders/GameFile.js` (v3 header + offsets + EUC-KR), `extractor.js` (buf fix)

### zrenderer.conf requer LF
- O parser D do zrenderer não tolera `\r` (CRLF) nos valores de configuração
- Sempre usar `sed -i 's/\r$//' data/zrenderer.conf` após editar no Windows

## Arquivos modificados

### Projeto LATAM
- `src/components/build/CharacterPreview.tsx` — hair colors, weapon/shield, enableShadow: false
- `src/app/builds/page.tsx` — atributos redesign, stat input, weapon/shield
- `src/lib/ro-stats.ts` — statBonuses
- `.env.local` — zrenderer URL/token apontando para localhost
- `data/zrenderer.conf` — config limpo com LF line endings
- `data/zrenderer-secrets/accesstokens.conf` — auto-gerado pelo zrenderer
- `data/zrenderer-resources/` — 206K arquivos extraídos do GRF (~6+ GB no disco)
- `scripts/extract-grf-resources.sh` — corrigido paths Windows para Docker (não usado, grf-extractor substitui)

### Patches em node_modules (grf-extractor)
- `C:\Users\User\AppData\Roaming\npm\node_modules\grf-extractor\lib\Loaders\GameFile.js`
- `C:\Users\User\AppData\Roaming\npm\node_modules\grf-extractor\lib\extractor.js`

## Como iniciar o zrenderer (para futuras sessões)

```bash
# 1. Abrir Docker Desktop
# 2. No terminal:
cd c:/Users/User/projects/latam
export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
docker compose up -d zrenderer

# 3. Verificar:
docker logs --tail 5 ro_latam_zrenderer
# Deve mostrar "Listening for requests on http://0.0.0.0:11011/"

# 4. Testar:
curl -s -X POST "http://localhost:11011/render?downloadimage" \
  -H "Content-Type: application/json" \
  -H "x-accesstoken: d92uuwyyl0qtwep58g1kj9aqzjnq2ccr" \
  -d '{"job":["0"],"gender":1,"head":1,"headPalette":0,"headdir":0,"headgear":[0,0,0],"garment":0,"weapon":0,"shield":0,"action":0,"canvas":"200x250+100+175","frame":0,"enableShadow":false}' \
  -o /tmp/test.png -w "%{http_code} %{size_download}"
# Deve retornar "200 XXXX" (>400 bytes = sprite real)
```

## .env.local atual (apontando para zrenderer local)
```
ZRENDERER_URL="http://localhost:11011"
ZRENDERER_TOKEN="d92uuwyyl0qtwep58g1kj9aqzjnq2ccr"
```

## Fallback (API pública VisualRag)
```
ZRENDERER_URL="https://visualrag-api.ragnarok.wiki"
ZRENDERER_TOKEN="4fk5dmifsznymnj5gvvonwxyyz6ny389"
```
