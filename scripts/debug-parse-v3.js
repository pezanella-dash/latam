// Test the NEW single-pass interpreter approach for parseScriptBonuses

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

const BONUS_MAP = {
  bBaseAtk: "atk", bMatk: "matk", bAtkRate: "atkRate", bMatkRate: "matkRate",
  bShortAtkRate: "shortAtkRate", bLongAtkRate: "longAtkRate", bAspdRate: "aspdRate",
  bStr: "str", bAgi: "agi", bVit: "vit", bInt: "int", bDex: "dex", bLuk: "luk",
  bVariableCastrate: "variableCastrate", bFixedCastrate: "fixedCastrate",
  bDelayrate: "delayrate", bCritAtkRate: "critAtkRate",
  bMaxHP: "maxHp", bMaxSP: "maxSp",
};

// ============ NEW SINGLE-PASS INTERPRETER ============
function parseScriptBonuses(script, refineLevel, baseLevel, baseStats) {
  if (!script) return {};
  const bonus = {};

  let processed = script
    .replace(/BaseLevel/g, String(baseLevel))
    .replace(/getrefine\(\)/g, String(refineLevel))
    .replace(/readparam\(bStr\)/g, String(baseStats.str || 0))
    .replace(/readparam\(bAgi\)/g, String(baseStats.agi || 0))
    .replace(/readparam\(bVit\)/g, String(baseStats.vit || 0))
    .replace(/readparam\(bInt\)/g, String(baseStats.int || 0))
    .replace(/readparam\(bDex\)/g, String(baseStats.dex || 0))
    .replace(/readparam\(bLuk\)/g, String(baseStats.luk || 0))
    .replace(/getskilllv\([^)]*\)/g, "10");

  // Tokenize
  const rawStmts = [];
  for (const rawLine of processed.split("\n")) {
    let rem = rawLine;
    while (rem.length > 0) {
      const idx = rem.search(/[{};]/);
      if (idx === -1) {
        const t = rem.trim();
        if (t) rawStmts.push(t);
        break;
      }
      const before = rem.substring(0, idx).trim();
      if (before) rawStmts.push(before);
      const ch = rem[idx];
      if (ch !== ";") rawStmts.push(ch);
      rem = rem.substring(idx + 1);
    }
  }

  // Merge "}" + "else" / "else if" into single tokens
  const tokens = [];
  for (let i = 0; i < rawStmts.length; i++) {
    if (rawStmts[i] === "}" && i + 1 < rawStmts.length) {
      const next = rawStmts[i + 1].trim();
      if (next === "else" || /^else\s+if\s*\(/.test(next)) {
        tokens.push("} " + next);
        i++;
        continue;
      }
    }
    tokens.push(rawStmts[i]);
  }

  // Interpreter state
  const vars = {};
  const ifStack = [];
  const outputLines = [];

  function isActive() {
    return ifStack.length === 0 || ifStack[ifStack.length - 1].active;
  }

  function subVars(text) {
    let result = text;
    for (const [name, val] of Object.entries(vars)) {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(esc + "(?!\\w)", "g"), String(val));
    }
    result = result.replace(/min\(([^,()]+),([^,()]+)\)/g, (_, a, b) =>
      String(Math.min(safeEvalExpr(a), safeEvalExpr(b))));
    result = result.replace(/max\(([^,()]+),([^,()]+)\)/g, (_, a, b) =>
      String(Math.max(safeEvalExpr(a), safeEvalExpr(b))));
    return result;
  }

  for (const token of tokens) {
    if (token === "{") continue;
    if (token === "}") { if (ifStack.length > 0) ifStack.pop(); continue; }

    // } else
    if (token === "} else") {
      if (ifStack.length > 0) {
        const frame = ifStack[ifStack.length - 1];
        if (frame.branchTaken) { frame.active = false; }
        else { frame.active = frame.parentActive; frame.branchTaken = true; }
      }
      continue;
    }

    // } else if (cond)
    const elseIfMatch = token.match(/^\}\s*else\s+if\s*\((.+)\)$/);
    if (elseIfMatch) {
      if (ifStack.length > 0) {
        const frame = ifStack[ifStack.length - 1];
        if (frame.branchTaken || !frame.parentActive) { frame.active = false; }
        else {
          const result = safeEvalCondition(subVars(elseIfMatch[1]));
          frame.active = result;
          if (result) frame.branchTaken = true;
        }
      }
      continue;
    }

    // if (cond)
    const ifMatch = token.match(/^if\s*\((.+)\)$/);
    if (ifMatch) {
      const parentActive = isActive();
      if (!parentActive) {
        ifStack.push({ active: false, branchTaken: false, parentActive: false });
      } else {
        const result = safeEvalCondition(subVars(ifMatch[1]));
        ifStack.push({ active: result, branchTaken: result, parentActive: true });
      }
      continue;
    }

    if (!isActive()) continue;

    // Variable assignment
    const varOpMatch = token.match(/^(\.\@\w+)\s*(\+=|-=|=)\s*(.+)$/);
    if (varOpMatch) {
      const varName = varOpMatch[1];
      const op = varOpMatch[2];
      const rhs = subVars(varOpMatch[3]);
      const value = safeEvalExpr(rhs);
      if (op === "+=") vars[varName] = (vars[varName] || 0) + value;
      else if (op === "-=") vars[varName] = (vars[varName] || 0) - value;
      else vars[varName] = value;
      continue;
    }

    outputLines.push(subVars(token) + ";");
  }

  processed = outputLines.join("\n");
  for (const [name, val] of Object.entries(vars)) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    processed = processed.replace(new RegExp(esc + "(?!\\w)", "g"), String(val));
  }

  // Parse bonuses
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
let passed = 0, failed = 0;
function check(name, actual, expected) {
  if (actual === expected) { console.log(`  PASS: ${name} = ${actual}`); passed++; }
  else { console.log(`  FAIL: ${name} = ${actual} (expected ${expected})`); failed++; }
}

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
check("atk", r1.atk, 79);  // 3*13=39 + 40 = 79
check("aspdRate", r1.aspdRate, 13);

console.log("\n===== TEST 2: GABIRU STR=119 (< 120) =====");
const r2 = parseScriptBonuses(gabiruScript, 0, 200, { str: 119, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("Result:", JSON.stringify(r2));
check("atk", r2.atk, 33);  // 3*11=33, no +40
check("aspdRate", r2.aspdRate, 11);

console.log("\n===== TEST 3: GABIRU STR=120 (exactly 120) =====");
const r3 = parseScriptBonuses(gabiruScript, 0, 200, { str: 120, agi: 100, vit: 100, int: 100, dex: 100, luk: 1 });
console.log("Result:", JSON.stringify(r3));
check("atk", r3.atk, 76);  // 3*12=36 + 40 = 76
check("aspdRate", r3.aspdRate, 12);

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
check("shortAtkRate", r4.shortAtkRate, 10);  // 5*2=10
check("longAtkRate", r4.longAtkRate, 20);    // 10*2=20

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
check("atk", r5.atk, 120);
check("variableCastrate", r5.variableCastrate, -15);
check("shortAtkRate", r5.shortAtkRate, 10);

console.log("\n===== TEST 6: Simple bonus (Mascara Azulada) =====");
const r6 = parseScriptBonuses("bonus bShortAtkRate,5;", 0, 200, {});
console.log("Result:", JSON.stringify(r6));
check("shortAtkRate", r6.shortAtkRate, 5);

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
check("atk", r7.atk, 25);  // 10 + 5 + 10

console.log("\n===== TEST 8: Nested if, refine too low =====");
const r8 = parseScriptBonuses(nestedScript, 5, 200, {});
console.log("Result:", JSON.stringify(r8));
check("atk", r8.atk, 10);  // only base, no +5 or +10

console.log("\n===== TEST 9: else branch =====");
const elseScript = `.@r = getrefine();
if (.@r>=10) {
bonus bBaseAtk,100;
} else {
bonus bBaseAtk,50;
}`;
const r9a = parseScriptBonuses(elseScript, 12, 200, {});
check("atk (refine 12)", r9a.atk, 100);
const r9b = parseScriptBonuses(elseScript, 5, 200, {});
check("atk (refine 5)", r9b.atk, 50);

console.log("\n===== TEST 10: else if chain =====");
const elseIfScript = `.@r = getrefine();
if (.@r>=12) {
bonus bBaseAtk,100;
} else if (.@r>=9) {
bonus bBaseAtk,70;
} else if (.@r>=7) {
bonus bBaseAtk,40;
} else {
bonus bBaseAtk,10;
}`;
const r10a = parseScriptBonuses(elseIfScript, 15, 200, {});
check("atk (refine 15)", r10a.atk, 100);
const r10b = parseScriptBonuses(elseIfScript, 10, 200, {});
check("atk (refine 10)", r10b.atk, 70);
const r10c = parseScriptBonuses(elseIfScript, 8, 200, {});
check("atk (refine 8)", r10c.atk, 40);
const r10d = parseScriptBonuses(elseIfScript, 3, 200, {});
check("atk (refine 3)", r10d.atk, 10);

console.log("\n===== TEST 11: variable reassign in if + else =====");
const varElseScript = `.@bonus = 5;
if (BaseLevel>=175) {
.@bonus = 20;
} else {
.@bonus = 10;
}
bonus bBaseAtk,.@bonus;`;
const r11a = parseScriptBonuses(varElseScript, 0, 200, {});
check("atk (lv200)", r11a.atk, 20);
const r11b = parseScriptBonuses(varElseScript, 0, 150, {});
check("atk (lv150)", r11b.atk, 10);

console.log(`\n===== RESULTS: ${passed} passed, ${failed} failed =====`);
