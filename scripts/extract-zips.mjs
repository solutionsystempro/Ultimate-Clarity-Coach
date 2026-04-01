/**
 * Extract all Hormozi zip files to the target directory.
 *
 * Usage:
 *   node scripts/extract-zips.mjs
 *   node scripts/extract-zips.mjs --out "C:\Users\ensan\Dev\Hormozi-Raw"
 */

import { execSync, spawn } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}

const DOWNLOADS_DIR = 'C:\\Users\\ensan\\Downloads'
const OUT_DIR = getArg('--out') || 'C:\\Users\\ensan\\Dev\\Hormozi-Raw'

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`) }

function formatSize(bytes) {
  const gb = bytes / 1024 / 1024 / 1024
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = bytes / 1024 / 1024
  return `${mb.toFixed(0)} MB`
}

function findZipFiles() {
  const files = readdirSync(DOWNLOADS_DIR)
    .filter(f => f.toLowerCase().includes('hormozi') && f.endsWith('.zip'))
    .map(f => path.join(DOWNLOADS_DIR, f))
    .sort()

  return files
}

async function extractZip(zipPath, outDir) {
  return new Promise((resolve, reject) => {
    log(`Extracting: ${path.basename(zipPath)}`)

    // Use PowerShell's Expand-Archive for native Windows zip support
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${outDir}" -Force`,
    ], { stdio: 'inherit' })

    ps.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Exit code ${code}`))
    })
  })
}

async function main() {
  console.log('\n📦 Hormozi Assets — Zip Extractor')
  console.log('='.repeat(50))

  const zips = findZipFiles()

  if (zips.length === 0) {
    console.log('❌ No Hormozi zip files found in Downloads folder.')
    process.exit(1)
  }

  let totalSize = 0
  console.log(`\nFound ${zips.length} zip file(s):`)
  for (const zip of zips) {
    const size = statSync(zip).size
    totalSize += size
    console.log(`  ${path.basename(zip)} (${formatSize(size)})`)
  }
  console.log(`\nTotal: ${formatSize(totalSize)}`)
  console.log(`Output: ${OUT_DIR}\n`)

  // Create output directory
  mkdirSync(OUT_DIR, { recursive: true })
  log(`Output directory ready: ${OUT_DIR}`)

  let success = 0
  let failed = 0

  for (let i = 0; i < zips.length; i++) {
    const zip = zips[i]
    console.log(`\n[${i + 1}/${zips.length}] ${path.basename(zip)}`)
    try {
      await extractZip(zip, OUT_DIR)
      log(`✓ Done`)
      success++
    } catch (e) {
      console.error(`❌ Failed: ${e.message}`)
      failed++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Extraction complete!`)
  console.log(`   Success: ${success} | Failed: ${failed}`)
  console.log(`   Output: ${OUT_DIR}`)

  // Show what's in the output
  try {
    const entries = readdirSync(OUT_DIR)
    console.log(`\n📁 Contents of ${OUT_DIR} (${entries.length} items):`)
    entries.slice(0, 20).forEach(e => {
      try {
        const s = statSync(path.join(OUT_DIR, e))
        console.log(`   ${s.isDirectory() ? '📁' : '📄'} ${e}`)
      } catch {}
    })
    if (entries.length > 20) console.log(`   ... and ${entries.length - 20} more`)
  } catch {}

  console.log('\n▶ Next step: node scripts/ingest.mjs --resume')
  console.log('='.repeat(50) + '\n')
}

main().catch(e => {
  console.error('❌', e.message)
  process.exit(1)
})
