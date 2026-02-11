#!/usr/bin/env node

/**
 * Beyondr Scripture Data Loader
 *
 * Loads the 59 founding scripture verses from the TypeScript data file
 * into the remote Supabase database.
 *
 * Usage:
 *   node scripts/load-scripture-data.mjs
 *   or: pnpm tsx scripts/load-scripture-data.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────
// Environment Configuration
// ─────────────────────────────────────────────────────────

function loadEnvFromCredentials() {
  const credPath = join(process.env.HOME, '.config/api-keys/credentials');
  try {
    const content = readFileSync(credPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('#') || !line.includes('=')) continue;
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  } catch (error) {
    console.error('❌ Failed to load credentials from ~/.config/api-keys/credentials');
    throw error;
  }
}

loadEnvFromCredentials();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────
// Data Loading (Dynamic Import via tsx)
// ─────────────────────────────────────────────────────────

async function loadScriptureData() {
  // We'll use tsx to import the TypeScript file directly
  // Since this script is run via tsx, we can import .ts files
  const dataPath = join(__dirname, '../beyondr-mockup/src/data/scripture-database.ts');

  try {
    const module = await import(dataPath);
    return module.chapters;
  } catch (error) {
    console.error('❌ Failed to import scripture data:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────
// Supabase REST API Helpers
// ─────────────────────────────────────────────────────────

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${error}`);
  }

  // For DELETE, there might be no content
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

async function deleteExistingData() {
  console.log('🗑️  Clearing existing data...');

  // Delete in reverse order of foreign key dependencies
  await supabaseRequest('related_quotes?chunk_id=not.is.null', 'DELETE');
  console.log('   ✓ Deleted related_quotes');

  await supabaseRequest('scripture_chunks?id=not.is.null', 'DELETE');
  console.log('   ✓ Deleted scripture_chunks');

  await supabaseRequest('scriptures?id=not.is.null', 'DELETE');
  console.log('   ✓ Deleted scriptures');
}

async function insertScriptures(chapters) {
  console.log('\n📖 Inserting scriptures (chapters)...');

  const scriptures = chapters.map(ch => ({
    id: ch.id,
    title_ko: ch.title_ko,
    title_en: ch.title_en,
    theme: ch.theme,
    intro_ko: ch.intro_ko,
    intro_en: ch.intro_en,
    sort_order: ch.id,
  }));

  const result = await supabaseRequest('scriptures', 'POST', scriptures);
  console.log(`   ✓ Inserted ${result.length} chapters`);
  return result;
}

async function insertScriptureChunks(chapters) {
  console.log('\n📝 Inserting scripture_chunks (verses)...');

  const chunks = [];
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      chunks.push({
        id: verse.id,
        scripture_id: chapter.id,
        chapter: verse.chapter,
        verse: verse.verse,
        text_ko: verse.text_ko,
        text_en: verse.text_en,
        traditions: verse.traditions,
        traditions_en: verse.traditions_en,
        theme: verse.theme,
        reflection_ko: verse.reflection_ko,
        reflection_en: verse.reflection_en,
        origin_type: 'founding',
        version: 1,
        is_archived: false,
      });
    }
  }

  const result = await supabaseRequest('scripture_chunks', 'POST', chunks);
  console.log(`   ✓ Inserted ${result.length} verses`);
  return result;
}

async function insertRelatedQuotes(chapters) {
  console.log('\n💬 Inserting related_quotes...');

  const quotes = [];
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      for (const quote of verse.relatedQuotes || []) {
        quotes.push({
          chunk_id: verse.id,
          source: quote.source,
          author: quote.author || null,
          text: quote.text,
          tradition: quote.tradition || null,
        });
      }
    }
  }

  const result = await supabaseRequest('related_quotes', 'POST', quotes);
  console.log(`   ✓ Inserted ${result.length} related quotes`);
  return result;
}

// ─────────────────────────────────────────────────────────
// Main Execution
// ─────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  Beyondr Scripture Data Loader                    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  try {
    // Load data from TypeScript file
    console.log('📂 Loading scripture data...');
    const chapters = await loadScriptureData();
    console.log(`   ✓ Loaded ${chapters.length} chapters`);

    // Count total verses
    const totalVerses = chapters.reduce((sum, ch) => sum + ch.verses.length, 0);
    const totalQuotes = chapters.reduce((sum, ch) =>
      sum + ch.verses.reduce((vSum, v) => vSum + (v.relatedQuotes?.length || 0), 0), 0
    );

    console.log(`   ✓ Total verses: ${totalVerses}`);
    console.log(`   ✓ Total related quotes: ${totalQuotes}`);

    // Delete existing data
    await deleteExistingData();

    // Insert data
    await insertScriptures(chapters);
    await insertScriptureChunks(chapters);
    await insertRelatedQuotes(chapters);

    console.log('\n✅ Data loading completed successfully!\n');
    console.log('Summary:');
    console.log(`  • ${chapters.length} chapters`);
    console.log(`  • ${totalVerses} verses`);
    console.log(`  • ${totalQuotes} related quotes`);

  } catch (error) {
    console.error('\n❌ Error during data loading:');
    console.error(error);
    process.exit(1);
  }
}

main();
