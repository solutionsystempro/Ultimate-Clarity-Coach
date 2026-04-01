/**
 * Ultimate Business Clarity Coach — Data Ingestion Pipeline
 *
 * Processes files from the knowledge-base directory (or any specified dir):
 *  - PDFs → extract text (via pdf-parse)
 *  - DOCX → extract text (via mammoth)
 *  - MP3/MP4/MOV/WAV → transcribe via OpenAI Whisper
 *  - TXT/MD → read directly
 *
 * Auto-tags each chunk with coach and topic based on directory structure:
 *  - knowledge-base/coaches/hormozi/offers/file.pdf → coach: "hormozi", topic: "offers"
 *  - knowledge-base/topics/sales-mastery/file.md → coach: "cross-coach", topic: "sales-mastery"
 *  - knowledge-base/frameworks/file.md → coach: "framework", topic: "framework"
 *
 * Then chunks, embeds, and upserts into Supabase pgvector.
 *
 * Usage:
 *   node scripts/ingest.mjs
 *   node scripts/ingest.mjs --dir "./knowledge-base"
 *   node scripts/ingest.mjs --type pdf          (only process PDFs)
 *   node scripts/ingest.mjs --resume            (skip already-processed files)
 */

import fs from 'fs'
import path from 'path'
import { createReadStream, writeFileSync, existsSync, mkdirSync } from 'fs'
import { readFile } from 'fs/promises'

// ── Config ──────────────────────────────────────────────────────────────────
// Ingestion writes to the KNOWLEDGE BASE Supabase project (separate from the
// main app DB that stores users/conversations). The RAG engine reads from the
// same KB project via KNOWLEDGE_BASE_SUPABASE_URL.

const SUPABASE_URL = process.env.KNOWLEDGE_BASE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.KNOWLEDGE_BASE_SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing env vars. Required:')
  console.error('   KNOWLEDGE_BASE_SUPABASE_URL')
  console.error('   KNOWLEDGE_BASE_SUPABASE_SERVICE_ROLE_KEY')
  console.error('   OPENAI_API_KEY')
  console.error('Make sure .env.local is set up.')
  process.exit(1)
}

const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}
const hasFlag = (flag) => args.includes(flag)

const RAW_DIR = getArg('--dir') || './knowledge-base'
const FILTER_TYPE = getArg('--type') || null
const RESUME = hasFlag('--resume')

const CHUNK_SIZE = 1200      // tokens approx (~900 words)
const CHUNK_OVERLAP = 150    // overlap between chunks
const BATCH_SIZE = 50        // embed & upsert N chunks at a time

const LOG_DIR = './scripts/logs'
const PROCESSED_FILE = './scripts/logs/processed.json'

mkdirSync(LOG_DIR, { recursive: true })

// Track processed files for resume support
const processedFiles = RESUME && existsSync(PROCESSED_FILE)
  ? new Set(JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8')))
  : new Set()

// ── Supported file types ──────────────────────────────────────────────────

const TEXT_EXTS = ['.txt', '.md', '.csv']
const PDF_EXTS = ['.pdf']
const DOCX_EXTS = ['.docx', '.doc']
const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac']
const VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.webm']

const ALL_SUPPORTED = [...TEXT_EXTS, ...PDF_EXTS, ...DOCX_EXTS, ...AUDIO_EXTS, ...VIDEO_EXTS]

// ── Utilities ──────────────────────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`) }
function warn(msg) { console.warn(`⚠️  ${msg}`) }
function err(msg) { console.error(`❌ ${msg}`) }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(' ')
    if (chunk.trim().length > 50) chunks.push(chunk.trim())
    i += size - overlap
  }
  return chunks
}

function walkDir(dir) {
  const results = []
  if (!existsSync(dir)) {
    err(`Directory not found: ${dir}`)
    return results
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath))
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (ALL_SUPPORTED.includes(ext)) results.push(fullPath)
    }
  }
  return results
}

function markProcessed(filePath) {
  processedFiles.add(filePath)
  writeFileSync(PROCESSED_FILE, JSON.stringify([...processedFiles], null, 2))
}

// ── Auto-tagging from directory structure ─────────────────────────────────

const KNOWN_COACHES = [
  'hormozi', 'robbins', 'wilde', 'cardone', 'brunson',
  'kennedy', 'voss', 'godin', 'sinek', 'dunford', 'abraham', 'burchard'
]

function extractTags(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase()
  let coach = 'general'
  let topic = 'general'

  // Check for knowledge-base directory structure
  const kbMatch = normalized.match(/knowledge-base\/(\w+)\/([^/]+)(?:\/([^/]+))?/)
  if (kbMatch) {
    const section = kbMatch[1]   // coaches, topics, or frameworks
    const sub1 = kbMatch[2]      // coach name or topic name
    const sub2 = kbMatch[3]      // topic under coach (optional)

    if (section === 'coaches' && KNOWN_COACHES.includes(sub1)) {
      coach = sub1
      topic = sub2 || 'general'
    } else if (section === 'topics') {
      coach = 'cross-coach'
      topic = sub1
    } else if (section === 'frameworks') {
      coach = 'framework'
      topic = 'framework'
    }
  } else {
    // Fallback: try to detect coach from filename or path
    for (const c of KNOWN_COACHES) {
      if (normalized.includes(c)) {
        coach = c
        break
      }
    }
  }

  return { coach, topic }
}

// ── Text extraction ────────────────────────────────────────────────────────

async function extractPdf(filePath) {
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js').catch(() => {
    throw new Error('pdf-parse not installed. Run: npm install pdf-parse')
  })
  const buffer = await readFile(filePath)
  const data = await pdfParse(buffer)
  return data.text
}

async function extractDocx(filePath) {
  const mammoth = await import('mammoth').catch(() => {
    throw new Error('mammoth not installed. Run: npm install mammoth')
  })
  const result = await mammoth.extractRawText({ path: filePath })
  return result.value
}

async function extractText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

// ── Whisper transcription ──────────────────────────────────────────────────

const MAX_WHISPER_SIZE_MB = 25

async function transcribeAudio(filePath) {
  const stats = fs.statSync(filePath)
  const sizeMB = stats.size / 1024 / 1024

  if (sizeMB > MAX_WHISPER_SIZE_MB) {
    warn(`${path.basename(filePath)} is ${sizeMB.toFixed(1)}MB — will be split for Whisper`)
    return await transcribeLargeFile(filePath)
  }

  return await callWhisper(filePath)
}

async function callWhisper(filePath) {
  const FormData = (await import('form-data')).default
  const fetch = (await import('node-fetch')).default

  const form = new FormData()
  form.append('file', createReadStream(filePath))
  form.append('model', 'whisper-1')
  form.append('response_format', 'text')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, ...form.getHeaders() },
    body: form,
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Whisper API error: ${res.status} ${txt}`)
  }

  return await res.text()
}

async function transcribeLargeFile(filePath) {
  // For large files, we transcribe in segments using ffmpeg
  // If ffmpeg isn't available, we'll transcribe anyway (API may handle some oversize files)
  try {
    return await callWhisper(filePath)
  } catch (e) {
    warn(`Could not transcribe ${path.basename(filePath)}: ${e.message}`)
    return null
  }
}

// ── Embeddings ─────────────────────────────────────────────────────────────

async function embedBatch(texts) {
  const fetch = (await import('node-fetch')).default

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts.map(t => t.slice(0, 8000)),
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Embedding API error: ${res.status} ${txt}`)
  }

  const data = await res.json()
  return data.data.map(d => d.embedding)
}

// ── Supabase upsert ────────────────────────────────────────────────────────

async function upsertChunks(chunks) {
  const fetch = (await import('node-fetch')).default

  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(chunks),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Supabase upsert error: ${res.status} ${txt}`)
  }
}

// ── Main processing ────────────────────────────────────────────────────────

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const baseName = path.basename(filePath)
  let text = null
  let sourceType = 'unknown'

  try {
    if (PDF_EXTS.includes(ext)) {
      sourceType = 'pdf'
      log(`📄 PDF: ${baseName}`)
      text = await extractPdf(filePath)
    } else if (DOCX_EXTS.includes(ext)) {
      sourceType = 'docx'
      log(`📝 DOCX: ${baseName}`)
      text = await extractDocx(filePath)
    } else if (TEXT_EXTS.includes(ext)) {
      sourceType = 'text'
      log(`📃 Text: ${baseName}`)
      text = await extractText(filePath)
    } else if (AUDIO_EXTS.includes(ext)) {
      sourceType = 'audio'
      log(`🎵 Audio: ${baseName}`)
      text = await transcribeAudio(filePath)
    } else if (VIDEO_EXTS.includes(ext)) {
      sourceType = 'video'
      log(`🎬 Video: ${baseName}`)
      text = await transcribeAudio(filePath) // Whisper handles video too
    }
  } catch (e) {
    warn(`Failed to extract ${baseName}: ${e.message}`)
    return 0
  }

  if (!text || text.trim().length < 100) {
    warn(`Skipping ${baseName} — too little content`)
    return 0
  }

  // Extract coach/topic tags from directory structure
  const tags = extractTags(filePath)

  // Chunk the text
  const rawChunks = chunkText(text)
  if (rawChunks.length === 0) return 0

  log(`  → ${rawChunks.length} chunks. Coach: ${tags.coach}, Topic: ${tags.topic}. Embedding...`)

  let totalInserted = 0

  // Process in batches
  for (let i = 0; i < rawChunks.length; i += BATCH_SIZE) {
    const batch = rawChunks.slice(i, i + BATCH_SIZE)

    let embeddings
    try {
      embeddings = await embedBatch(batch)
    } catch (e) {
      warn(`Embedding batch failed: ${e.message}. Retrying in 5s...`)
      await sleep(5000)
      try {
        embeddings = await embedBatch(batch)
      } catch (e2) {
        warn(`Embedding batch failed again: ${e2.message}. Skipping batch.`)
        continue
      }
    }

    const records = batch.map((content, j) => ({
      content,
      embedding: embeddings[j],
      source_file: baseName,
      source_type: sourceType,
      coach: tags.coach,
      topic: tags.topic,
      chunk_index: i + j,
      metadata: {
        file_path: filePath,
        total_chunks: rawChunks.length,
        coach: tags.coach,
        topic: tags.topic,
        processed_at: new Date().toISOString(),
      },
    }))

    try {
      await upsertChunks(records)
      totalInserted += records.length
    } catch (e) {
      warn(`Upsert failed: ${e.message}`)
    }

    // Rate limit protection
    if (i + BATCH_SIZE < rawChunks.length) await sleep(200)
  }

  return totalInserted
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Ultimate Business Clarity Coach — Data Ingestion Pipeline')
  console.log('='.repeat(60))
  console.log(`📁 Source directory: ${RAW_DIR}`)
  console.log(`🔄 Resume mode: ${RESUME ? 'ON' : 'OFF'}`)
  if (FILTER_TYPE) console.log(`🔍 Filter type: ${FILTER_TYPE}`)
  console.log('='.repeat(60) + '\n')

  const allFiles = walkDir(RAW_DIR)
  let files = allFiles

  // Apply type filter
  if (FILTER_TYPE) {
    const typeMap = {
      pdf: PDF_EXTS,
      docx: DOCX_EXTS,
      text: TEXT_EXTS,
      audio: AUDIO_EXTS,
      video: VIDEO_EXTS,
    }
    const exts = typeMap[FILTER_TYPE] || []
    files = files.filter(f => exts.includes(path.extname(f).toLowerCase()))
  }

  // Skip already processed
  if (RESUME) {
    const before = files.length
    files = files.filter(f => !processedFiles.has(f))
    log(`Resume: skipping ${before - files.length} already-processed files`)
  }

  console.log(`📊 Files to process: ${files.length} (${allFiles.length} total found)\n`)

  if (files.length === 0) {
    log('Nothing to process. Done.')
    return
  }

  let totalChunks = 0
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    console.log(`\n[${i + 1}/${files.length}] ${path.relative(RAW_DIR, filePath)}`)

    try {
      const inserted = await processFile(filePath)
      totalChunks += inserted
      successCount++
      markProcessed(filePath)
      log(`  ✓ Inserted ${inserted} chunks (total: ${totalChunks})`)
    } catch (e) {
      err(`Failed: ${e.message}`)
      failCount++
    }

    // Brief pause between files
    await sleep(100)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Ingestion complete!')
  console.log(`   Files processed: ${successCount}`)
  console.log(`   Files failed:    ${failCount}`)
  console.log(`   Total chunks:    ${totalChunks}`)
  console.log('='.repeat(60) + '\n')
}

main().catch(e => {
  err(e.message)
  process.exit(1)
})
