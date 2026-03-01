#!/usr/bin/env node
// Build maps.json from mapnametable.txt
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const mapFile = path.join(dataDir, "zrenderer-resources", "data", "mapnametable.txt");
const outFile = path.join(dataDir, "database", "maps.json");

const buf = fs.readFileSync(mapFile);
const text = buf.toString("latin1");
const lines = text.split(/\r?\n/).filter((l) => l.includes("#"));

// Fix common broken Portuguese words (0x3F = ? replacing accented chars)
const fixes = {
  "Pir?ide": "Pirâmide", "Calabou?": "Calabouço", "Valqu?ias": "Valquírias",
  "Pal?io": "Palácio", "Pal?cio": "Palácio", "Pal?cios": "Palácios",
  "Drag?o": "Dragão", "Drag?": "Dragão",
  "Prisi?": "Prisão", "Pris?": "Prisão",
  "Masmor?a": "Masmorra", "Glast?eim": "Glastheim",
  "Niffl?eim": "Nifflheim", "Nibelhe?m": "Nibelheim",
  "Cavern?": "Caverna", "Montanh?": "Montanha", "Florest?": "Floresta",
  "Continua??o": "Continuação", "Pra?a": "Praça", "Pra?": "Praça",
  "Miss?o": "Missão", "Miss?": "Missão",
  "Dimens?o": "Dimensão", "Cora??o": "Coração",
  "Terr?vel": "Terrível", "Bisl?nia": "Bislânia",
  "Al?ia": "Aldeia", "?gua": "Água", "?ltimo": "Último",
  "?rvore": "Árvore", "ra?a": "raça", "For?a": "Força",
  "Ref?gio": "Refúgio", "Territ?rio": "Território", "Min?rio": "Minério",
  "Rumo ? ": "Rumo à ", "Plan?cie": "Planície", "Plan?ie": "Planície",
  "Plan?ies": "Planícies",
  "Vulc?o": "Vulcão", "Vulc?": "Vulcão",
  "Oc?ano": "Oceano", "Inst?ncia": "Instância",
  "Mem?ria": "Memória", "Hist?ria": "História",
  "Sil?ncio": "Silêncio", "Laborat?rio": "Laboratório", "Laborat?io": "Laboratório",
  "F?brica": "Fábrica", "F?rica": "Fábrica",
  "Litor?ea": "Litorânea", "P?tano": "Pântano",
  "Subterr?eo": "Subterrâneo", "Subterr?ea": "Subterrânea", "Subterr?eos": "Subterrâneos",
  "Cemit?io": "Cemitério", "Cemit?rio": "Cemitério",
  "Monast?io": "Monastério", "Monast?rio": "Monastério",
  "Escrit?io": "Escritório", "Escrit?rio": "Escritório",
  "Santu?io": "Santuário", "Santu?rio": "Santuário",
  "Mercen?ios": "Mercenários", "Mercen?rios": "Mercenários",
  "Ca?dores": "Caçadores", "(Ca?dores)": "(Caçadores)",
  "Rel?io": "Relógio", "Rel?gio": "Relógio",
  "Dep?ito": "Depósito", "Dep?sito": "Depósito",
  "Alian?": "Aliança", "Destru?a": "Destruição",
  "Para?o": "Paraíso", "Fam?ias": "Famílias",
  "Fant?tico": "Fantástico", "Her?": "Heróica",
  "L?rimas": "Lágrimas", "Leil?": "Leilão",
  "Mans?": "Mansão", "Per?etros": "Perímetros",
  "Portu?ia": "Portuária", "Rob?": "Robô",
  "Ru?as": "Ruínas", "Sal?": "Salão",
  "Sandu?he": "Sanduíche", "Vis?": "Visão",
  "solit?io": "solitário", "a?": "ação",
  "S?ios": "Sábios", "(S?ios)": "(Sábios)",
  "Templ?ios": "Templários", "(Templ?ios)": "(Templários)",
  "Mosc?ia": "Moscóvia",
  "C?culo": "Círculo", "C?ica": "Cósmica", "C?ion": "Canyon",
  "Dem?io": "Demônio", "Est?io": "Estádio",
  "N?el": "Nível", "?N?el": "Nível", "T?el": "Túnel",
  "Bifr?t": "Bifröst", "B?sola": "Bússola",
  "Cl?": "Clã", "Manh?": "Manhã", "(Manh?": "(Manhã",
  "S?": "São",
  "?andar": "° andar", "?Andar": "° Andar", "?calabou?": "° calabouço",
  "?Área": "° Área",
  "Espl?didos,": "Esplêndidos,",
};

const townPrefixes = [
  "prontera", "geffen", "payon", "morocc", "alberta", "aldebaran",
  "comodo", "amatsu", "gonryun", "louyang", "ayothaya", "umbala",
  "niflheim", "hugel", "lighthalzen", "rachel", "veins", "brasilis",
  "dewata", "malangdo", "malaya", "eclage", "mora", "lasagna",
  "midcamp", "izlude", "jawaii", "nameless_n", "moscovia", "manuk",
  "splendide", "dicastes", "bat_room",
];

const maps = [];

for (const line of lines) {
  const parts = line.split("#");
  if (parts.length < 2) continue;
  const file = parts[0].trim();
  let name = parts[1].trim();
  if (!file || !name) continue;

  const mapId = file.replace(/\.rsw$/, "");

  // Apply fixes
  for (const [broken, fixed] of Object.entries(fixes)) {
    while (name.includes(broken)) {
      name = name.replace(broken, fixed);
    }
  }

  // Categorize
  let type = "other";
  if (
    mapId.includes("_dun") ||
    mapId.includes("abbey") ||
    mapId.includes("tha_t") ||
    mapId.includes("treasure") ||
    mapId.includes("_tower") ||
    mapId.match(/\d{2}$/) && name.toLowerCase().includes("andar")
  ) {
    type = "dungeon";
  } else if (mapId.includes("_fild") || mapId.includes("_field")) {
    type = "field";
  } else if (
    mapId.includes("_cas") ||
    mapId.includes("_gld") ||
    mapId.startsWith("gld_")
  ) {
    type = "guild";
  } else if (
    townPrefixes.some(
      (t) =>
        mapId === t ||
        (mapId.startsWith(t) &&
          !mapId.includes("fild") &&
          !mapId.includes("dun") &&
          !mapId.includes("_in"))
    )
  ) {
    type = "town";
  }

  maps.push({ mapId, name, type });
}

// Deduplicate by mapId
const seen = new Set();
const unique = maps.filter((m) => {
  if (seen.has(m.mapId)) return false;
  seen.add(m.mapId);
  return true;
});

fs.writeFileSync(outFile, JSON.stringify(unique, null, 2));
console.log(`Written ${unique.length} maps to ${outFile}`);
console.log("Types:", {
  town: unique.filter((m) => m.type === "town").length,
  field: unique.filter((m) => m.type === "field").length,
  dungeon: unique.filter((m) => m.type === "dungeon").length,
  guild: unique.filter((m) => m.type === "guild").length,
  other: unique.filter((m) => m.type === "other").length,
});
