#!/usr/bin/env node
/**
 * Markdown Compression Script - Symbolic Level
 * 
 * Implements the ultra-compress skill's symbolic compression level.
 * Creates .original.md backups before compression.
 * 
 * Levels applied (inherited): lite → standard → ultra → symbolic
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

// ============================================
// PROTECTED ZONES - Must remain byte-identical
// ============================================

const PROTECTED_PATTERNS = [
  { pattern: /^---[\s\S]*?^---/gm, name: 'frontmatter' },        // YAML frontmatter
  { pattern: /```[\s\S]*?```/g, name: 'code-fence' },            // Fenced code blocks
  { pattern: /`[^`\n]+`/g, name: 'inline-code' },                // Inline code
  { pattern: /https?:\/\/[^\s\)\]\>"']+/g, name: 'url' },        // URLs
  { pattern: /(?:^|\s)\/[\w\/.-]+(?:\s|$)/g, name: 'file-path' }, // Unix file paths
  { pattern: /(?:^|\s)[A-Z]:\\[\w\\.-]+(?:\s|$)/g, name: 'win-path' }, // Windows paths
  { pattern: /\$[A-Z_]+/g, name: 'argument' },                   // $ARGUMENTS
  { pattern: /\b\d+\.\d+\.\d+\b/g, name: 'version' },            // Semantic versions
  { pattern: /\b\d{4}-\d{2}-\d{2}\b/g, name: 'date' },           // ISO dates
  { pattern: /^#{1,6}\s.+$/gm, name: 'heading' },                // Headings (structure)
];

// ============================================
// COMPRESSION LEVELS
// ============================================

const TRANSFORMATIONS = [
  // --- LITE: Remove filler, hedging, pleasantries ---
  { level: 'lite', pattern: /\b(?:just|really|basically|actually|simply|essentially|generally)\b[,\s]*/gi, replacement: '' },
  { level: 'lite', pattern: /\b(?:might be worth|could consider|you might want|you may want)\b[^.]*\.?/gi, replacement: '' },
  { level: 'lite', pattern: /\b(?:sure,?\s*|certainly,?\s*|of course,?\s*|happy to\s*|I'd recommend\s*)/gi, replacement: '' },
  
  // --- STANDARD: Remove articles, connectives, use fragments ---
  { level: 'standard', pattern: /\b(?:a|an|the)\b\s+/gi, replacement: '' },
  { level: 'standard', pattern: /\b(?:however|furthermore|additionally|moreover|therefore|thus)\b[,:]?\s*/gi, replacement: '' },
  { level: 'standard', pattern: /\bin order to\b/gi, replacement: 'to' },
  { level: 'standard', pattern: /\bprior to\b/gi, replacement: 'before' },
  { level: 'standard', pattern: /\bthe reason is because\b/gi, replacement: 'because' },
  { level: 'standard', pattern: /\butilize\b/g, replacement: 'use' },
  { level: 'standard', pattern: /\bmake sure to\b/gi, replacement: 'ensure' },
  
  // --- ULTRA: Abbreviations ---
  { level: 'ultra', pattern: /\bdatabase\b/gi, replacement: 'DB' },
  { level: 'ultra', pattern: /\bauthentication\b/gi, replacement: 'auth' },
  { level: 'ultra', pattern: /\bconfiguration\b/gi, replacement: 'config' },
  { level: 'ultra', pattern: /\brequest\b/gi, replacement: 'req' },
  { level: 'ultra', pattern: /\bresponse\b/gi, replacement: 'res' },
  { level: 'ultra', pattern: /\bfunction\b/gi, replacement: 'fn' },
  { level: 'ultra', pattern: /\bimplementation\b/gi, replacement: 'impl' },
  { level: 'ultra', pattern: /\benvironment\b/gi, replacement: 'env' },
  { level: 'ultra', pattern: /\berror\b/gi, replacement: 'err' },
  { level: 'ultra', pattern: /\bparameter\b/gi, replacement: 'param' },
  { level: 'ultra', pattern: /\bargument\b/gi, replacement: 'arg' },
  { level: 'ultra', pattern: /\breturn value\b/gi, replacement: 'retval' },
  { level: 'ultra', pattern: /\bapplication\b/gi, replacement: 'app' },
  { level: 'ultra', pattern: /\bdevelopment\b/gi, replacement: 'dev' },
  { level: 'ultra', pattern: /\bproduction\b/gi, replacement: 'prod' },
  { level: 'ultra', pattern: /\bdocumentation\b/gi, replacement: 'docs' },
  { level: 'ultra', pattern: /\buser interface\b/gi, replacement: 'UI' },
  { level: 'ultra', pattern: /\bapplication programming interface\b/gi, replacement: 'API' },
  
  // --- SYMBOLIC: Math/logic notation ---
  { level: 'symbolic', pattern: /\bfor each\b|\bfor every\b|\bfor all\b/gi, replacement: '∀' },
  { level: 'symbolic', pattern: /\bthere exists\b|\bthere is\b|\bexists\b/gi, replacement: '∃' },
  { level: 'symbolic', pattern: /\bsuch that\b/gi, replacement: ':' },
  { level: 'symbolic', pattern: /\bif and only if\b/gi, replacement: '↔' },
  { level: 'symbolic', pattern: /\bequivalent to\b/gi, replacement: '↔' },
  { level: 'symbolic', pattern: /\bsubset of\b|\bcontained in\b/gi, replacement: '⊆' },
  { level: 'symbolic', pattern: /\bmember of\b|\belement of\b/gi, replacement: '∈' },
  { level: 'symbolic', pattern: /\bempty\b|\bnothing\b/gi, replacement: '∅' },
  { level: 'symbolic', pattern: /\bunion of\b|\bcombined with\b/gi, replacement: '∪' },
  { level: 'symbolic', pattern: /\bintersection of\b|\bscenario\b/gi, replacement: '∩' },
  { level: 'symbolic', pattern: /\bwant to\b|\bwish to\b/gi, replacement: '→' },
  { level: 'symbolic', pattern: /\bleads to\b|\bresults in\b/gi, replacement: '→' },
];

// ============================================
// COMPRESSION LOGIC
// ============================================

function protectContent(content) {
  const tokens = [];
  let masked = content;
  
  for (const { pattern, name } of PROTECTED_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      const id = tokens.length;
      tokens.push({ id, content: match, name });
      return `<<PROTECTED_${id}>>`;
    });
  }
  
  return { masked, tokens };
}

function unprotectContent(content, tokens) {
  let result = content;
  // Restore in reverse order to handle nested tokens correctly
  for (let i = tokens.length - 1; i >= 0; i--) {
    result = result.replace(`<<PROTECTED_${i}>>`, tokens[i].content);
  }
  return result;
}

function applyCompressions(content, targetLevel) {
  const levels = ['lite', 'standard', 'ultra', 'symbolic'];
  const targetIndex = levels.indexOf(targetLevel);
  const activeLevels = levels.slice(0, targetIndex + 1);
  
  let result = content;
  
  for (const transform of TRANSFORMATIONS) {
    if (activeLevels.includes(transform.level)) {
      result = result.replace(transform.pattern, transform.replacement);
    }
  }
  
  // Clean up extra whitespace (but preserve structure)
  result = result.replace(/[ \t]+/g, ' ');           // Collapse multiple spaces
  result = result.replace(/^ +/gm, '');              // Remove leading spaces
  result = result.replace(/ +$/gm, '');              // Remove trailing spaces
  result = result.replace(/\n{3,}/g, '\n\n');        // Max 2 consecutive newlines
  
  return result;
}

function compressFile(filepath, dryRun = false) {
  try {
    // Skip if already has backup (already processed)
    const backupPath = `${filepath}.original.md`;
    if (existsSync(backupPath)) {
      return { success: true }; // Already processed
    }
    
    // Skip .original.md files (these are backups)
    if (filepath.endsWith('.original.md')) {
      return { success: true };
    }
    
    const content = readFileSync(filepath, 'utf8');
    
    // Protect sensitive content
    const { masked, tokens } = protectContent(content);
    
    // Apply compressions
    const compressed = applyCompressions(masked, 'symbolic');
    
    // Unprotect sensitive content
    const final = unprotectContent(compressed, tokens);
    
    if (dryRun) {
      console.log(`[DRY-RUN] Would compress: ${filepath}`);
      return { success: true };
    }
    
    // Create backup
    writeFileSync(backupPath, content, 'utf8');
    
    // Write compressed content
    writeFileSync(filepath, final, 'utf8');
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================
// FILE DISCOVERY
// ============================================

const TARGET_DIRS = [
  { dir: 'commands/tff', recursive: false, pattern: /\.md$/ },
  { dir: 'workflows', recursive: false, pattern: /\.md$/ },
  { dir: 'skills', recursive: true, pattern: /SKILL\.md$/ },
  { dir: 'references', recursive: false, pattern: /\.md$/ },
  { dir: 'agents', recursive: false, pattern: /\.md$/ },
];

function findFiles(dir, recursive, pattern) {
  const files = [];
  
  function walk(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        if (recursive && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (pattern) {
          if (pattern.test(entry.name)) {
            files.push(fullPath);
          }
        } else if (extname(entry.name) === '.md') {
          files.push(fullPath);
        }
      }
    }
  }
  
  if (existsSync(dir)) {
    walk(dir);
  }
  
  return files;
}

function findTargetFiles() {
  const allFiles = [];
  
  for (const target of TARGET_DIRS) {
    const files = findFiles(target.dir, target.recursive, target.pattern);
    allFiles.push(...files);
  }
  
  return allFiles;
}

// ============================================
// MAIN
// ============================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('=== Markdown Compression Script (Symbolic Level) ===');
console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
console.log('');

const files = findTargetFiles();
console.log(`Found ${files.length} target files`);
console.log('');

let success = 0;
let failed = 0;
const errors = [];

for (const file of files) {
  const result = compressFile(file, dryRun);
  
  if (result.success) {
    success++;
    console.log(`✓ ${file}`);
  } else {
    failed++;
    errors.push({ file, error: result.error || 'Unknown error' });
    console.error(`✗ ${file}: ${result.error}`);
  }
}

console.log('');
console.log('=== Summary ===');
console.log(`Total: ${files.length}`);
console.log(`Success: ${success}`);
console.log(`Failed: ${failed}`);

if (errors.length > 0) {
  console.log('');
  console.log('Errors:');
  for (const { file, error } of errors) {
    console.log(`  - ${file}: ${error}`);
  }
  process.exit(1);
}

process.exit(0);
