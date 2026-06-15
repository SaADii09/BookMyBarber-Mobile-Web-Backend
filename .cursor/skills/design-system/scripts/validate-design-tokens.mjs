#!/usr/bin/env node
/**
 * Scans UI source for disallowed hex colors.
 * Allowlist: docs/design-system/tokens.ts COLORS values
 * Always flags: DEPRECATED_COLORS
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

const TOKENS_PATH = path.join(repoRoot, 'docs/design-system/tokens.ts');
const DEFAULT_DIRS = [
  path.join(repoRoot, 'BookMyBarber-admin/src'),
  path.join(repoRoot, 'BookMyBarber-App/src/app/_layout.tsx'),
  path.join(repoRoot, 'BookMyBarber-App/src/components/ui'),
];

const IGNORE_FILE = path.join(repoRoot, 'docs/design-system/validate-ignore.txt');

const CSS_ALLOWLIST_FILES = [
  path.join(repoRoot, 'BookMyBarber-App/src/global.css'),
  path.join(repoRoot, 'BookMyBarber-admin/src/index.css'),
  path.join(repoRoot, 'BookMyBarber-App/src/constants/theme.ts'),
  path.join(repoRoot, 'BookMyBarber-App/src/constants/design-tokens.ts'),
  path.join(repoRoot, 'BookMyBarber-admin/src/constants/design-tokens.ts'),
  TOKENS_PATH,
];

const HEX_RE = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g;

function normalizeHex(hex) {
  const h = hex.toLowerCase();
  if (h.length === 4) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h.slice(0, 7);
}

function loadTokens() {
  const src = fs.readFileSync(TOKENS_PATH, 'utf8');
  const allowed = new Set();
  const deprecated = new Set();

  for (const m of src.matchAll(/#[0-9A-Fa-f]{6}/gi)) {
    allowed.add(normalizeHex(m[0]));
  }

  const depBlock = src.match(/DEPRECATED_COLORS\s*=\s*\[([\s\S]*?)\]/);
  if (depBlock) {
    for (const m of depBlock[1].matchAll(/#[0-9A-Fa-f]{3,8}/gi)) {
      deprecated.add(normalizeHex(m[0]));
    }
  }

  return { allowed, deprecated };
}

function loadIgnoreGlobs() {
  if (!fs.existsSync(IGNORE_FILE)) return [];
  return fs
    .readFileSync(IGNORE_FILE, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function matchIgnore(relPosix, globs) {
  for (const g of globs) {
    const pattern = g.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
    if (new RegExp(`^${pattern}$`).test(relPosix)) return true;
  }
  return false;
}

function walk(dir, files = [], ignoreGlobs = []) {
  if (!fs.existsSync(dir)) return files;
  if (fs.statSync(dir).isFile()) {
    const rel = path.relative(repoRoot, dir).replace(/\\/g, '/');
    if (!matchIgnore(rel, ignoreGlobs)) files.push(dir);
    return files;
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walk(full, files, ignoreGlobs);
    } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
      const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
      if (!matchIgnore(rel, ignoreGlobs)) files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function isAllowlistedFile(file) {
  return CSS_ALLOWLIST_FILES.some((f) => path.resolve(f) === path.resolve(file));
}

function scanFile(file, { allowed, deprecated }) {
  if (isAllowlistedFile(file)) return [];

  const content = fs.readFileSync(file, 'utf8');
  const issues = [];
  let match;

  const re = new RegExp(HEX_RE.source, 'g');
  while ((match = re.exec(content)) !== null) {
    const raw = match[0];
    const hex = normalizeHex(raw);
    const line = content.slice(0, match.index).split('\n').length;

    if (deprecated.has(hex)) {
      issues.push({ file, line, hex, reason: 'deprecated color' });
    } else if (!allowed.has(hex)) {
      issues.push({ file, line, hex, reason: 'not in design token allowlist' });
    }
  }

  return issues;
}

function main() {
  const { allowed, deprecated } = loadTokens();
  const ignoreGlobs = loadIgnoreGlobs();
  const dirs = process.argv.length > 2
    ? process.argv.slice(2).map((p) => path.resolve(repoRoot, p))
    : DEFAULT_DIRS;

  const files = dirs.flatMap((d) => walk(d, [], ignoreGlobs));
  const allIssues = [];

  for (const file of files) {
    allIssues.push(...scanFile(file, { allowed, deprecated }));
  }

  if (allIssues.length === 0) {
    console.log(`OK — ${files.length} files scanned, no disallowed hex colors.`);
    process.exit(0);
  }

  console.error(`Design token validation failed (${allIssues.length} issue(s)):\n`);
  for (const i of allIssues) {
    console.error(`  ${rel(i.file)}:${i.line}  ${i.hex}  (${i.reason})`);
  }
  console.error('\nSee docs/design-system/elegant-terracotta.md and use semantic Tailwind classes.');
  process.exit(1);
}

main();
