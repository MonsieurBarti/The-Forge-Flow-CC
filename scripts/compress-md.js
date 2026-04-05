#!/usr/bin/env node
/**
 * Markdown Compression Utility
 * Converts standard markdown to compressed formal notation
 * 
 * Symbols:
 * ∀ (for all) - replaces "for each", "every", "all"
 * ∃ (exists) - replaces "there exists", "some", "at least one"
 * ∈ (member) - replaces "in", "is part of", "belongs to"
 * ∧ (and) - replaces "and", "&", "plus"
 * ∨ (or) - replaces "or", "|", "either"
 * ¬ (not) - replaces "not", "no", "without"
 * -> (then/implication) - replaces "if...then", "implies"
 * ∅ (empty) - replaces "none", "empty", "null"
 * ⊆ (subset) - replaces "subset of", "contained in"
 * ∪ (union) - replaces "union", "combined with"
 * ∩ (intersection) - replaces "intersection", "shared with"
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';

const PATTERNS = [
  // Lists with conditions
  { regex: /for each|for every|forall/gi, symbol: '∀' },
  { regex: /there exists|exists|some /gi, symbol: '∃' },
  { regex: /\bin\b|\bis part of\b|\bbelongs to\b/gi, symbol: '∈' },
  { regex: /\band\b/g, symbol: '∧' },
  { regex: /\bor\b/g, symbol: '∨' },
  { regex: /\bnot\b|\bno\b/g, symbol: '¬' },
  { regex: /if\s+(.+?)\s+then/gi, symbol: '$1 ->' },
  { regex: /implies/gi, symbol: '->' },
  { regex: /empty|null|none/gi, symbol: '∅' },
  { regex: /subset of|contained in/gi, symbol: '⊆' },
  { regex: /union|combined with/gi, symbol: '∪' },
  { regex: /intersection|shared with/gi, symbol: '∩' },
  { regex: /such that/gi, symbol: ':' },
  { regex: /equivalent to|if and only if/gi, symbol: '↔' },
];

// Sections to protect from conversion (frontmatter, code blocks)
const PROTECTED_SECTIONS = [
  /^---[\s\S]*?^---/m,  // YAML frontmatter
  /```[\s\S]*?```/g,     // Code blocks
  /`[^`]+`/g,            // Inline code
  /<[^>]+>/g,           // XML/HTML tags
];

function findMarkdownFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      findMarkdownFiles(path, files);
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      files.push(path);
    }
  }
  return files;
}

function compressContent(content) {
  // Protect sections
  const protectedBlocks = [];
  let protectedContent = content;
  
  PROTECTED_SECTIONS.forEach((regex, idx) => {
    protectedContent = protectedContent.replace(regex, (match) => {
      protectedBlocks.push(match);
      return `§§PROTECTED_${protectedBlocks.length - 1}§§`;
    });
  });
  
  // Apply compression patterns
  let compressed = protectedContent;
  PATTERNS.forEach(({ regex, symbol }) => {
    if (symbol.includes('$1')) {
      compressed = compressed.replace(regex, symbol);
    } else {
      compressed = compressed.replace(regex, symbol);
    }
  });
  
  // Restore protected sections
  protectedBlocks.forEach((block, idx) => {
    compressed = compressed.replace(`§§PROTECTED_${idx}§§`, block);
  });
  
  return compressed;
}

function processFile(filepath) {
  try {
    const content = readFileSync(filepath, 'utf8');
    const compressed = compressContent(content);
    writeFileSync(filepath, compressed, 'utf8');
    console.log(`✓ Compressed: ${filepath}`);
    return true;
  } catch (err) {
    console.error(`✗ Failed: ${filepath} - ${err.message}`);
    return false;
  }
}

// Main execution
const targetDir = process.argv[2] || '.';
const files = findMarkdownFiles(targetDir);

console.log(`Found ${files.length} markdown files to compress...\n`);

let success = 0;
let failed = 0;

for (const file of files) {
  if (processFile(file)) {
    success++;
  } else {
    failed++;
  }
}

console.log(`\nComplete: ${success} compressed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
