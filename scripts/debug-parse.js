// Debug script to trace parseScriptBonuses behavior

// Inline a simplified version of the parser to trace each step
function safeEvalExpr(expr) {
  if (!expr) return 0;
  const cleaned = expr.replace(/\s+/g, "").trim();
  if (!cleaned) return 0;
  const simple = parseInt(cleaned);
  if (String(simple) === cleaned) return simple;

  const tokens = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch === "(" || ch === ")" || ch === "*" || ch === "/" || ch === "+") {
      tokens.push(ch); i++;
    } else if (ch === "-") {
      if (i === 0 || "(*/-+".includes(cleaned[i - 1])) {
        let numStr = "-"; i++;
        while (i < cleaned.length && /\d/.test(cleaned[i])) { numStr += cleaned[i]; i++; }
        tokens.push(parseInt(numStr));
      } else {
        tokens.push("-"); i++;
      }
    } else if (/\d/.test(ch)) {
      let numStr = "";
      while (i < cleaned.length && /\d/.test(cleaned[i])) { numStr += cleaned[i]; i++; }
      tokens.push(parseInt(numStr));
    } else { i++; }
  }

  let pos = 0;
  function parseExpression() {
    let left = parseTerm();
    while (pos < tokens.length && (tokens[pos] === "+" || tokens[pos] === "-")) {
      const op = tokens[pos++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (pos < tokens.length && (tokens[pos] === "*" || tokens[pos] === "/")) {
      const op = tokens[pos++];
      const right = parseFactor();
      left = op === "*" ? left * right : (right !== 0 ? Math.floor(left / right) : 0);
    }
    return left;
  }
  function parseFactor() {
    if (tokens[pos] === "(") { pos++; const val = parseExpression(); pos++; return val; }
    return (tokens[pos++]) || 0;
  }
  try { return Math.floor(parseExpression()); } catch { return 0; }
}

function safeEvalCondition(condition) {
  const m = condition.match(/^\s*([^><=!]+)\s*(>=|<=|>|<|==|!=)\s*([^><=!]+)\s*$/);
  if (!m) return false;
  const left = safeEvalExpr(m[1]);
  const op = m[2];
  const right = safeEvalExpr(m[3]);
  switch (op) {
    case ">=": return left >= right;
    case "<=": return left <= right;
    case ">": return left > right;
    case "<": return left < right;
    case "==": return left === right;
    case "!=": return left !== right;
    default: return false;
  }
}

function evaluateIfBlocks(code) {
  let result = code;
  let changed = true;
  let safety = 20;
  while (changed && safety-- > 0) {
    changed = false;
    result = result.replace(
      /if\s*\(\s*([^()]+?)\s*\)\s*\{([^{}]*)\}/g,
      (_match, condition, body) => {
        changed = true;
        const evalResult = safeEvalCondition(condition);
        console.log(`  if (${condition}) => ${evalResult}`);
        return evalResult ? body : "";
      }
    );
  }
  return result;
}

const BONUS_MAP = {
  bBaseAtk: "atk", bMatk: "matk", bAtkRate: "atkRate", bMatkRate: "matkRate",
  bShortAtkRate: "shortAtkRate", bLongAtkRate: "longAtkRate", bAspdRate: "aspdRate",
  bStr: "str", bAgi: "agi", bVit: "vit", bInt: "int", bDex: "dex", bLuk: "luk",
  bCritAtkRate: "critAtkRate", bMaxHP: "maxHp", bMaxSP: "maxSp",
  bHit: "hit", bFlee: "flee", bCritical: "crit", bAspd: "aspd",
  bDef: "def", bMdef: "mdef", bPAtk: "patk", bSMatk: "smatk",
};

function parseScriptBonuses(script, refineLevel, baseLevel, baseStats) {
  if (!script) return {};
  const bonus = {};
  const pStr = String(baseStats?.str ?? 130);

  // Step 1
  let processed = script
    .replace(/BaseLevel/g, String(baseLevel))
    .replace(/JobLevel/g, "70")
    .replace(/getrefine\(\)/g, String(refineLevel))
    .replace(/readparam\(bStr\)/g, pStr)
    .replace(/readparam\(bAgi\)/g, String(baseStats?.agi ?? 130))
    .replace(/readparam\(bVit\)/g, String(baseStats?.vit ?? 130))
    .replace(/readparam\(bInt\)/g, String(baseStats?.int ?? 130))
    .replace(/readparam\(bDex\)/g, String(baseStats?.dex ?? 130))
    .replace(/readparam\(bLuk\)/g, String(baseStats?.luk ?? 130))
    .replace(/getskilllv\([^)]*\)/g, "10")
    .replace(/max\((\d+),(\d+)\)/g, (_m, a, b) => String(Math.max(Number(a), Number(b))));
  console.log("Step 1:", processed);

  // Step 2
  const vars = {};
  const varInitRegex = /(\.\@\w+)\s*=\s*([^;+=]+);/g;
  let m;
  while ((m = varInitRegex.exec(processed)) !== null) {
    vars[m[1]] = safeEvalExpr(m[2]);
    console.log(`  Var ${m[1]} = ${m[2]} => ${vars[m[1]]}`);
  }

  // Step 3
  for (const [name, val] of Object.entries(vars)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
  }
  console.log("Step 3:", processed);

  // Step 4: if/else
  processed = evaluateIfBlocks(processed);
  console.log("Step 4:", processed);

  // Step 5: re-parse vars
  const vars2 = {};
  const reInitRegex = /(\.\@\w+)\s*=\s*([^;+=]+);/g;
  while ((m = reInitRegex.exec(processed)) !== null) {
    vars2[m[1]] = safeEvalExpr(m[2]);
  }
  const addRegex = /(\.\@\w+)\s*\+=\s*([^;]+);/g;
  while ((m = addRegex.exec(processed)) !== null) {
    vars2[m[1]] = (vars2[m[1]] || 0) + safeEvalExpr(m[2]);
    console.log(`  Var2 ${m[1]} += ${m[2]} => ${vars2[m[1]]}`);
  }
  for (const [name, val] of Object.entries(vars2)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
  }
  console.log("Step 5:", processed);

  // Step 7: Parse bonus
  const bonusRegex = /\bbonus\s+(b\w+)\s*(?:,\s*([^;,]+))?\s*;/g;
  let match;
  while ((match = bonusRegex.exec(processed)) !== null) {
    const bonusName = match[1];
    const value = match[2] ? safeEvalExpr(match[2]) : 1;
    const key = BONUS_MAP[bonusName];
    console.log(`  bonus ${bonusName}, ${match[2]} => value=${value}, key=${key}`);
    if (key) {
      bonus[key] = (bonus[key] || 0) + value;
    }
  }

  return bonus;
}

// ============ TEST CASES ============

console.log("\n===== TEST 1: GABIRU CARD (STR=130) =====");
const gabiruScript = `.@str = readparam(bStr);
.@bonus = 3*(.@str/10);
if (.@str>=120) {
.@bonus += 40;
}
bonus bBaseAtk,.@bonus;
bonus bAspdRate,(.@str/10);`;
const result1 = parseScriptBonuses(gabiruScript, 0, 200, { str: 130, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("RESULT:", JSON.stringify(result1));
console.log("Expected: atk=79, aspdRate=13");

console.log("\n===== TEST 2: MASCARA AZULADA =====");
const azuladaScript = "bonus bShortAtkRate,5;";
const result2 = parseScriptBonuses(azuladaScript, 0, 200, { str: 130, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("RESULT:", JSON.stringify(result2));
console.log("Expected: shortAtkRate=5");

console.log("\n===== TEST 3: Complex refine conditional =====");
const complexScript = `.@r = getrefine();
bonus bBaseAtk,20*(.@r/2);
if (.@r>=7) {
bonus bVariableCastrate,-15;
}
if (.@r>=9) {
bonus bShortAtkRate,10;
}`;
const result3 = parseScriptBonuses(complexScript, 12, 200, { str: 130, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("RESULT:", JSON.stringify(result3));
console.log("Expected: atk=120, variableCastrate=-15, shortAtkRate=10");

console.log("\n===== TEST 4: Script with bonus2 bAddRace =====");
const raceScript = "bonus2 bAddRace,RC_Demon,10;\nbonus2 bAddRace,RC_Undead,10;";
const result4 = parseScriptBonuses(raceScript, 0, 200, {});
console.log("RESULT:", JSON.stringify(result4));

console.log("\n===== TEST 5: GABIRU with LOW STR (STR=90, no if trigger) =====");
const result5 = parseScriptBonuses(gabiruScript, 0, 200, { str: 90, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("RESULT:", JSON.stringify(result5));
console.log("Expected: atk=27 (3*9=27, no +40), aspdRate=9");

console.log("\n===== TEST 6: Complex multi-var script =====");
const multiVarScript = `.@a = BaseLevel/35;
.@b = 2*.@a;
if (BaseLevel>=175) {
.@a = .@a*2;
.@b = .@b*2;
}
bonus bShortAtkRate,.@a;
bonus bLongAtkRate,.@b;`;
const result6 = parseScriptBonuses(multiVarScript, 0, 200, {});
console.log("RESULT:", JSON.stringify(result6));
console.log("Expected at LV200: a=5, b=10 before if; after: a=10, b=20");
