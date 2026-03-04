// Test the ACTUAL parseScriptBonuses from the updated ro-stats module
// We can't import TypeScript directly, so let's re-implement the fixed parser

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
      } else { tokens.push("-"); i++; }
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
      const op = tokens[pos++]; const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (pos < tokens.length && (tokens[pos] === "*" || tokens[pos] === "/")) {
      const op = tokens[pos++]; const right = parseFactor();
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
        return safeEvalCondition(condition) ? body : "";
      }
    );
  }
  return result;
}

// NEW: Line-by-line variable resolution (the fix!)
function parseScriptBonuses(script, refineLevel, baseLevel, baseStats) {
  if (!script) return {};
  const bonus = {};

  let processed = script
    .replace(/BaseLevel/g, String(baseLevel))
    .replace(/getrefine\(\)/g, String(refineLevel))
    .replace(/readparam\(bStr\)/g, String(baseStats.str))
    .replace(/readparam\(bAgi\)/g, String(baseStats.agi))
    .replace(/readparam\(bVit\)/g, String(baseStats.vit))
    .replace(/readparam\(bInt\)/g, String(baseStats.int))
    .replace(/readparam\(bDex\)/g, String(baseStats.dex))
    .replace(/readparam\(bLuk\)/g, String(baseStats.luk))
    .replace(/getskilllv\([^)]*\)/g, "10");

  // LINE-BY-LINE variable resolution
  const vars = {};
  const lines = processed.split("\n");
  const resolvedLines = [];

  for (let line of lines) {
    // Substitute all known variables into this line
    for (const [name, val] of Object.entries(vars)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      line = line.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
    }

    const assignMatch = line.match(/(\.\@\w+)\s*=\s*([^;+=]+);/);
    if (assignMatch) {
      vars[assignMatch[1]] = safeEvalExpr(assignMatch[2]);
    }
    const addMatch = line.match(/(\.\@\w+)\s*\+=\s*([^;]+);/);
    if (addMatch) {
      vars[addMatch[1]] = (vars[addMatch[1]] || 0) + safeEvalExpr(addMatch[2]);
    }

    resolvedLines.push(line);
  }

  processed = resolvedLines.join("\n");
  for (const [name, val] of Object.entries(vars)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
  }

  // Evaluate if/else
  processed = evaluateIfBlocks(processed);

  // Second pass after if evaluation
  const vars2 = {};
  const lines2 = processed.split("\n");
  const resolvedLines2 = [];
  for (let line of lines2) {
    for (const [name, val] of Object.entries(vars2)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      line = line.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
    }
    const assignMatch = line.match(/(\.\@\w+)\s*=\s*([^;+=]+);/);
    if (assignMatch) vars2[assignMatch[1]] = safeEvalExpr(assignMatch[2]);
    const addMatch = line.match(/(\.\@\w+)\s*\+=\s*([^;]+);/);
    if (addMatch) vars2[addMatch[1]] = (vars2[addMatch[1]] || 0) + safeEvalExpr(addMatch[2]);
    resolvedLines2.push(line);
  }
  processed = resolvedLines2.join("\n");
  for (const [name, val] of Object.entries(vars2)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(escaped + "(?!\\w)", "g"), String(val));
  }

  // Parse bonuses
  const BONUS_MAP = {
    bBaseAtk: "atk", bMatk: "matk", bAtkRate: "atkRate", bMatkRate: "matkRate",
    bShortAtkRate: "shortAtkRate", bLongAtkRate: "longAtkRate", bAspdRate: "aspdRate",
    bStr: "str", bAgi: "agi", bVit: "vit", bInt: "int", bDex: "dex", bLuk: "luk",
    bVariableCastrate: "variableCastrate", bFixedCastrate: "fixedCastrate",
    bDelayrate: "delayrate", bCritAtkRate: "critAtkRate",
    bMaxHP: "maxHp", bMaxSP: "maxSp",
  };

  const bonusRegex = /\bbonus\s+(b\w+)\s*(?:,\s*([^;,]+))?\s*;/g;
  let match;
  while ((match = bonusRegex.exec(processed)) !== null) {
    const bonusName = match[1];
    const value = match[2] ? safeEvalExpr(match[2]) : 1;
    if (isNaN(value)) continue;
    const key = BONUS_MAP[bonusName];
    if (key) bonus[key] = (bonus[key] || 0) + value;
  }

  return bonus;
}

// ============ TESTS ============

console.log("===== TEST 1: GABIRU STR=130 (>= 120) =====");
const gabiruScript = `.@str = readparam(bStr);
.@bonus = 3*(.@str/10);
if (.@str>=120) {
.@bonus += 40;
}
bonus bBaseAtk,.@bonus;
bonus bAspdRate,(.@str/10);`;

const r1 = parseScriptBonuses(gabiruScript, 0, 200, { str: 130, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("Result:", JSON.stringify(r1));
console.log("Expected: atk=79 (3*13=39 + 40), aspdRate=13");
console.log(r1.atk === 79 ? "PASS" : "FAIL: atk=" + r1.atk);

console.log("\n===== TEST 2: GABIRU STR=119 (< 120) =====");
const r2 = parseScriptBonuses(gabiruScript, 0, 200, { str: 119, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("Result:", JSON.stringify(r2));
console.log("Expected: atk=35 (3*11=33... wait floor(119/10)=11, 3*11=33), aspdRate=11");
console.log(r2.atk === 33 ? "PASS" : "FAIL: atk=" + r2.atk);

console.log("\n===== TEST 3: GABIRU STR=120 (exactly 120) =====");
const r3 = parseScriptBonuses(gabiruScript, 0, 200, { str: 120, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("Result:", JSON.stringify(r3));
console.log("Expected: atk=76 (3*12=36 + 40), aspdRate=12");
console.log(r3.atk === 76 ? "PASS" : "FAIL: atk=" + r3.atk);

console.log("\n===== TEST 4: Complex multi-var (BaseLv dep) =====");
const multiVarScript = `.@a = BaseLevel/35;
.@b = 2*.@a;
if (BaseLevel>=175) {
.@a = .@a*2;
.@b = .@b*2;
}
bonus bShortAtkRate,.@a;
bonus bLongAtkRate,.@b;`;
const r4 = parseScriptBonuses(multiVarScript, 0, 200, { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 });
console.log("Result:", JSON.stringify(r4));
console.log("Expected: .@a=5, .@b=10; after if (200>=175): .@a=10, .@b=20");
console.log(r4.shortAtkRate === 10 ? "PASS shortAtkRate" : "FAIL: shortAtkRate=" + r4.shortAtkRate);
console.log(r4.longAtkRate === 20 ? "PASS longAtkRate" : "FAIL: longAtkRate=" + r4.longAtkRate);

console.log("\n===== TEST 5: Refine-dependent bonuses =====");
const refineScript = `.@r = getrefine();
bonus bBaseAtk,20*(.@r/2);
if (.@r>=7) {
bonus bVariableCastrate,-15;
}
if (.@r>=9) {
bonus bShortAtkRate,10;
}`;
const r5 = parseScriptBonuses(refineScript, 12, 200, { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 });
console.log("Result:", JSON.stringify(r5));
console.log("Expected: atk=120, variableCastrate=-15, shortAtkRate=10");
console.log(r5.atk === 120 ? "PASS atk" : "FAIL: atk=" + r5.atk);
console.log(r5.variableCastrate === -15 ? "PASS vcast" : "FAIL: vcast=" + r5.variableCastrate);

console.log("\n===== TEST 6: Simple bonus (Mascara Azulada) =====");
const r6 = parseScriptBonuses("bonus bShortAtkRate,5;", 0, 200, {});
console.log("Result:", JSON.stringify(r6));
console.log(r6.shortAtkRate === 5 ? "PASS" : "FAIL");

console.log("\n===== TEST 7: Nested if with var reassign =====");
const nestedScript = `.@r = getrefine();
.@bonus = 10;
if (.@r>=7) {
.@bonus += 5;
if (.@r>=9) {
.@bonus += 10;
}
}
bonus bBaseAtk,.@bonus;`;
const r7 = parseScriptBonuses(nestedScript, 10, 200, {});
console.log("Result:", JSON.stringify(r7));
console.log("Expected: atk=25 (10 + 5 + 10)");
console.log(r7.atk === 25 ? "PASS" : "FAIL: atk=" + r7.atk);
