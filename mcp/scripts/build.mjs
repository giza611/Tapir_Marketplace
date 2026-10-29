import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as esbuild from 'esbuild'

/*
 * One bundle, because the server imports TypeScript from outside its own
 * package — ../lib/schema.ts and ../lib/github.ts, which belong to the site.
 * Sharing those files is deliberate (see ../README.md), and bundling is what
 * makes it publishable: the tarball carries no reference to a parent
 * directory that will not exist on anybody else's machine.
 */

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const outfile = resolve(pkgRoot, 'dist/index.js')

rmSync(resolve(pkgRoot, 'dist'), { recursive: true, force: true })
mkdirSync(resolve(pkgRoot, 'dist'), { recursive: true })

await esbuild.build({
  entryPoints: [resolve(pkgRoot, 'src/index.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  /*
   * Runtime dependencies stay external, which also settles the two-Zod
   * problem: ../lib and src/ resolve different copies on disk here, but both
   * leave the bundle as a bare `import 'zod'` and so share one instance from
   * this package's own dependency once installed. (tsconfig.json's `paths`
   * does the same for type checking.) Aliasing it instead would inline Zod,
   * which is three quarters of a megabyte and a second copy nobody needs.
   */
  packages: 'external',
  /*
   * `packages: 'external'` is not enough for Zod on its own: esbuild honours
   * tsconfig.json's `paths`, which rewrites `zod` to a path inside
   * ../node_modules and so stops looking like a package import. Naming it
   * here is matched before resolution, which keeps the import bare.
   */
  external: ['zod'],
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
})
