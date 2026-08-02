import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".venv",
  ".idea",
  ".vscode",
]);

const TARGET_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".md",
  ".txt",
  ".yml",
  ".yaml",
  ".env",
  ".example",
]);

const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

function shouldProcessFile(filePath) {
  const base = path.basename(filePath);
  if (base === "package-lock.json") return false;
  if (base.endsWith(".d.ts")) return false;
  const ext = path.extname(filePath);
  if (TARGET_EXTENSIONS.has(ext)) return true;
  if (base === ".gitignore") return true;
  if (base === "tsconfig.json") return true;
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      if (SKIP_DIRS.has(entry.name)) continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walk(full));
      continue;
    }
    if (entry.isFile() && shouldProcessFile(full)) {
      files.push(full);
    }
  }
  return files;
}

function isPreservedComment(text) {
  const t = text.trim();
  if (t.startsWith("///")) return true;
  if (t.startsWith("//#")) return true;
  if (t.includes("@ts-ignore") || t.includes("@ts-expect-error")) return true;
  if (t.includes("eslint-")) return true;
  if (t.startsWith("/*!")) return true;
  if (/\b(copyright|@license|license|mit|apache|gpl|bsd)\b/i.test(t)) return true;
  return false;
}

function stripJsTsComments(input) {
  if (input.length === 0) return input;

  let out = "";
  let i = 0;

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let templateBraceDepth = 0;

  if (input.startsWith("#!")) {
    const nl = input.indexOf("\n");
    if (nl === -1) return input;
    out += input.slice(0, nl + 1);
    i = nl + 1;
  }

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (inSingle) {
      out += ch;
      if (ch === "\\" && i + 1 < input.length) {
        out += input[i + 1];
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i += 1;
      continue;
    }

    if (inDouble) {
      out += ch;
      if (ch === "\\" && i + 1 < input.length) {
        out += input[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') inDouble = false;
      i += 1;
      continue;
    }

    if (inTemplate) {
      out += ch;
      if (ch === "\\" && i + 1 < input.length) {
        out += input[i + 1];
        i += 2;
        continue;
      }
      if (ch === "`" && templateBraceDepth === 0) {
        inTemplate = false;
        i += 1;
        continue;
      }
      if (ch === "$" && next === "{") {
        out += next;
        templateBraceDepth += 1;
        i += 2;
        continue;
      }
      if (ch === "{" && templateBraceDepth > 0) {
        templateBraceDepth += 1;
        i += 1;
        continue;
      }
      if (ch === "}" && templateBraceDepth > 0) {
        templateBraceDepth -= 1;
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      const start = i;
      let end = input.indexOf("\n", i + 2);
      if (end === -1) end = input.length;
      const comment = input.slice(start, end);

      if (isPreservedComment(comment)) {
        out += comment;
      } else {
        out += "";
      }

      if (end < input.length) out += "\n";
      i = end + 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      const start = i;
      let end = input.indexOf("*/", i + 2);
      if (end === -1) end = input.length - 2;
      const comment = input.slice(start, end + 2);

      if (isPreservedComment(comment)) {
        out += comment;
      } else {
        const newlines = comment.match(/\n/g)?.length ?? 0;
        out += "\n".repeat(newlines);
      }

      i = end + 2;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "`") {
      inTemplate = true;
      out += ch;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function stripCssComments(input) {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];
    if (ch === "/" && next === "*") {
      const start = i;
      let end = input.indexOf("*/", i + 2);
      if (end === -1) end = input.length - 2;
      const comment = input.slice(start, end + 2);
      const newlines = comment.match(/\n/g)?.length ?? 0;
      out += "\n".repeat(newlines);
      i = end + 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function stripHtmlComments(input) {
  let out = "";
  let i = 0;
  while (i < input.length) {
    if (input.startsWith("<!--", i)) {
      const start = i;
      let end = input.indexOf("-->", i + 4);
      if (end === -1) end = input.length - 3;
      const comment = input.slice(start, end + 3);
      const newlines = comment.match(/\n/g)?.length ?? 0;
      out += "\n".repeat(newlines);
      i = end + 3;
      continue;
    }
    out += input[i];
    i += 1;
  }
  return out;
}

function stripJsxCommentExpressions(input) {
  return input.replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => {
    const newlines = m.match(/\n/g)?.length ?? 0;
    return "\n".repeat(newlines);
  });
}

function processFile(filePath) {
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  const original = fs.readFileSync(filePath, "utf8");

  let stripped = original;

  if (CODE_EXTENSIONS.has(ext)) {
    stripped = stripJsTsComments(original);
    if (ext === ".jsx" || ext === ".tsx") {
      stripped = stripJsxCommentExpressions(stripped);
    }
  } else if (ext === ".css") {
    stripped = stripCssComments(original);
  } else if (ext === ".html") {
    stripped = stripHtmlComments(original);
  } else if (base === "tsconfig.json") {
    stripped = stripJsTsComments(original);
  }

  if (stripped !== original) {
    fs.writeFileSync(filePath, stripped, "utf8");
    return true;
  }
  return false;
}

const files = walk(repoRoot);
let changed = 0;
for (const f of files) {
  try {
    if (processFile(f)) changed += 1;
  } catch (e) {
    console.error(`Failed processing ${f}:`, e);
    process.exitCode = 1;
    break;
  }
}

console.log(`Processed ${files.length} files. Updated ${changed} files.`);
