#!/usr/bin/env node
// Prompt regression test — guards against the class of bug where a template
// placeholder (e.g. [BOOK_CALL_URL]) ships to users verbatim, or the baked
// knowledge base silently falls out of the system prompt.
//
// Bundles src/lib/rag.ts with esbuild, then executes buildSystemBlocks()
// for every mentor mode and asserts on the real output.
//
// Run: npm test   (pretest hook re-bakes the knowledge base first)

import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = join(root, '.test-build', 'rag.test.cjs')

await build({
  entryPoints: [join(root, 'src', 'lib', 'rag.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: outFile,
  alias: { '@': join(root, 'src') },
  logLevel: 'silent',
})

const MENTORS = ['standard', 'hormozi', 'robbins', 'wilde']
const DEFAULT_URL = 'https://leadgenjay.com/book-ian'
const OVERRIDE_URL = 'https://example.com/custom-booking'

let failures = 0
const check = (name, ok) => {
  console.log(`  ${ok ? '✓' : '✗ FAIL'} ${name}`)
  if (!ok) failures++
}

function loadFresh() {
  delete require.cache[require.resolve(outFile)]
  return require(outFile)
}

// ── Default URL behavior (no env override) ──────────────────────────────
delete process.env.BOOK_CALL_URL
{
  const { buildSystemBlocks } = loadFresh()
  for (const mentor of MENTORS) {
    console.log(`\n${mentor}:`)
    const blocks = buildSystemBlocks(mentor, { business_name: 'Test Co' })
    const full = blocks.map(b => b.text).join('\n')

    check('no [BOOK_CALL_URL] placeholder leaks', !full.includes('[BOOK_CALL_URL]'))
    check('default booking URL substituted', full.includes(DEFAULT_URL))
    check('knowledge base section present', full.includes('📚 KNOWLEDGE BASE'))
    check(
      'at least 5 KB files baked in',
      (full.match(/^===== .+ =====$/gm) || []).length >= 5
    )
    check('KB content is substantial (>20k chars)', full.length > 20_000)
    check('two system blocks', blocks.length === 2)
    check(
      'first block is cached (ephemeral)',
      blocks[0]?.cache_control?.type === 'ephemeral'
    )
    check('dynamic block carries business profile', blocks[1]?.text.includes('Test Co'))
  }
}

// ── Env override behavior ───────────────────────────────────────────────
console.log('\nBOOK_CALL_URL env override:')
process.env.BOOK_CALL_URL = OVERRIDE_URL
{
  const { buildSystemBlocks } = loadFresh()
  const full = buildSystemBlocks('standard').map(b => b.text).join('\n')
  check('custom URL used', full.includes(OVERRIDE_URL))
  check('default URL absent', !full.includes(DEFAULT_URL))
  check('no placeholder leaks', !full.includes('[BOOK_CALL_URL]'))
}
delete process.env.BOOK_CALL_URL

console.log(
  failures === 0
    ? '\n✅ All prompt checks passed.'
    : `\n❌ ${failures} check(s) failed.`
)
process.exit(failures === 0 ? 0 : 1)
