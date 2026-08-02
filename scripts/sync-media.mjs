// Copies listing screenshots into public/ so Next.js can serve them.
//
// Screenshots live in listings/<slug>/media/ because that is the folder CI
// allows contributors to write to. Next.js only serves static files from
// public/, so this mirrors them to public/listings/<slug>/media/ before dev
// and build. public/listings/ is gitignored — it is derived, never authored.
//
// Run: node scripts/sync-media.mjs

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const source = path.join(root, 'listings')
const destination = path.join(root, 'public', 'listings')

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

function copyMediaFolder(slug) {
  const mediaDir = path.join(source, slug, 'media')
  if (!fs.existsSync(mediaDir)) return 0

  const targetDir = path.join(destination, slug, 'media')
  fs.mkdirSync(targetDir, { recursive: true })

  let copied = 0
  for (const entry of fs.readdirSync(mediaDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue
    const extension = path.extname(entry.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      console.warn(`  skipped ${slug}/media/${entry.name} — extension not allowed`)
      continue
    }
    fs.copyFileSync(path.join(mediaDir, entry.name), path.join(targetDir, entry.name))
    copied += 1
  }
  return copied
}

function main() {
  if (!fs.existsSync(source)) {
    console.log('sync-media: no listings/ directory yet, nothing to do')
    return
  }

  // Rebuild from scratch so screenshots deleted from a listing also disappear
  // from public/ instead of lingering as orphans.
  fs.rmSync(destination, { recursive: true, force: true })

  const slugs = fs
    .readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)

  let total = 0
  for (const slug of slugs) {
    total += copyMediaFolder(slug)
  }

  console.log(`sync-media: copied ${total} file(s) from ${slugs.length} listing(s)`)
}

main()
