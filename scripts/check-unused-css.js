#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = process.cwd()

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "playwright-report",
  "public",
  "test-results",
])

function shouldIgnore(relPath) {
  for (const seg of relPath.split(path.sep)) {
    if (IGNORE_DIRS.has(seg)) return true
    if (seg.startsWith(".")) return true
  }
  return false
}

function walkSync(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name.startsWith(".")) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue
      walkSync(full, cb)
    } else {
      cb(full)
    }
  }
}

const cssModules = new Map() // absPath -> { content, classes: Map(name->line), compositions: [{ownerClass, composedClass, sourceModule}] }
const sourceFiles = []

// Collect files
walkSync(root, (file) => {
  const rel = path.relative(root, file)
  if (shouldIgnore(rel)) return
  if (file.endsWith(".module.css")) {
    try {
      const content = fs.readFileSync(file, "utf8")
      cssModules.set(file, { content, classes: new Map(), compositions: [] })
    } catch (e) {
      // ignore
    }
  } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
    sourceFiles.push(file)
  }
})

function indexToLine(content, index) {
  return content.slice(0, index).split("\n").length
}

function resolveCssImport(importerFile, importStr) {
  // Basic resolution: relative, absolute, or @/ -> src/
  if (
    importStr.startsWith("./") ||
    importStr.startsWith("../") ||
    importStr.startsWith("/")
  ) {
    return path.resolve(path.dirname(importerFile), importStr)
  }
  if (importStr.startsWith("@/")) {
    return path.resolve(root, importStr.replace(/^@\//, "src/"))
  }
  return path.resolve(root, importStr)
}

// Parse CSS modules for classes and composes
for (const [file, data] of cssModules.entries()) {
  const content = data.content
  // class tokens — require the dot to be not preceded by an identifier/quote/slash
  // this reduces false matches inside strings like "shared.module.css"
  const classRegex = /(^|[^A-Za-z0-9_"'\/\-])\.([A-Za-z0-9_-]+)\b/gm
  let m
  while ((m = classRegex.exec(content)) !== null) {
    const name = m[2]
    // compute index of the dot within the whole match (prefix length may be 0 or 1)
    const dotIndex = m.index + (m[1] ? m[1].length : 0)
    if (!data.classes.has(name)) {
      data.classes.set(name, indexToLine(content, dotIndex))
    }
  }
  // block-level composes detection
  const blockRegex = /\.([A-Za-z0-9_-]+)[^{]*\{([^}]*)\}/gms
  let b
  while ((b = blockRegex.exec(content)) !== null) {
    const owner = b[1]
    const body = b[2]
    const compRegex =
      /composes\s*:\s*([A-Za-z0-9_-]+)(?:\s+from\s+['"](.+?\.module\.css)['"])?/g
    let c
    while ((c = compRegex.exec(body)) !== null) {
      const composed = c[1]
      const from = c[2] ? resolveCssImport(file, c[2]) : null
      data.compositions.push({
        ownerClass: owner,
        composedClass: composed,
        sourceModule: from || file,
      })
    }
  }
}

// Collect imports and scan usage
const importRe1 =
  /import\s+([A-Za-z0-9_$]+)\s+from\s+['"](.+?\.module\.css)['"]/g
const importRe2 =
  /import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+['"](.+?\.module\.css)['"]/g
const requireRe =
  /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*require\(['"](.+?\.module\.css)['"]\)/g

const imports = [] // { importer, alias, module }
for (const file of sourceFiles) {
  let content
  try {
    content = fs.readFileSync(file, "utf8")
  } catch (e) {
    continue
  }
  let m
  const addImport = (alias, src) => {
    let resolved = resolveCssImport(file, src)
    // try several fallback forms
    if (
      !resolved.endsWith(".module.css") &&
      fs.existsSync(resolved + ".module.css")
    )
      resolved = resolved + ".module.css"
    if (!fs.existsSync(resolved)) return
    imports.push({ importer: file, alias, module: resolved })
  }
  while ((m = importRe1.exec(content)) !== null) addImport(m[1], m[2])
  while ((m = importRe2.exec(content)) !== null) addImport(m[1], m[2])
  while ((m = requireRe.exec(content)) !== null) addImport(m[1], m[2])
}

// Map to store used classes per module
const usageByModule = new Map() // module -> Set(class)
const maybeUsedByModule = new Map() // module -> boolean indicating dynamic access

for (const imp of imports) {
  const { importer, alias, module: modulePath } = imp
  if (!fs.existsSync(modulePath)) continue
  if (!cssModules.has(modulePath)) {
    // ensure module entry exists
    cssModules.set(modulePath, {
      content: fs.readFileSync(modulePath, "utf8"),
      classes: new Map(),
      compositions: [],
    })
  }
  if (!usageByModule.has(modulePath)) usageByModule.set(modulePath, new Set())
  if (!maybeUsedByModule.has(modulePath))
    maybeUsedByModule.set(modulePath, false)

  let content
  try {
    content = fs.readFileSync(importer, "utf8")
  } catch (e) {
    continue
  }
  // dot usage
  const dotRegex = new RegExp(`\\b${alias}\.([A-Za-z0-9_-]+)\\b`, "g")
  let um
  while ((um = dotRegex.exec(content)) !== null) {
    usageByModule.get(modulePath).add(um[1])
  }
  // bracket literal usage
  const bracketRegex = new RegExp(
    `${alias}\\[\\s*['\"]([A-Za-z0-9_-]+)['\"]\\s*\\]`,
    "g",
  )
  while ((um = bracketRegex.exec(content)) !== null) {
    usageByModule.get(modulePath).add(um[1])
  }
  // dynamic bracket usage (non-literal inside brackets)
  const dynamicRegex = new RegExp(`${alias}\\[([^'\"]+)\\]`, "g")
  while ((um = dynamicRegex.exec(content)) !== null) {
    const inside = um[1].trim()
    if (!/^['\"]/.test(inside)) {
      maybeUsedByModule.set(modulePath, true)
      break
    }
  }
}

// propagate compositions: if owner class is used, mark composed class in source module as used
let changed = true
while (changed) {
  changed = false
  for (const [modulePath, data] of cssModules.entries()) {
    const usedSet = usageByModule.get(modulePath) || new Set()
    for (const comp of data.compositions || []) {
      if (usedSet.has(comp.ownerClass)) {
        const target = comp.sourceModule || modulePath
        if (!usageByModule.has(target)) usageByModule.set(target, new Set())
        if (!usageByModule.get(target).has(comp.composedClass)) {
          usageByModule.get(target).add(comp.composedClass)
          changed = true
        }
      }
    }
  }
}

// Ensure cssModules classes map is populated for any modules discovered via imports but not initially scanned
for (const [file, data] of cssModules.entries()) {
  if (data.classes.size === 0) {
    // re-parse classes if empty (use the same safer regex)
    const content = data.content
    const classRegex = /(^|[^A-Za-z0-9_"'\/\-])\.([A-Za-z0-9_-]+)\b/gm
    let m
    while ((m = classRegex.exec(content)) !== null) {
      const name = m[2]
      const dotIndex = m.index + (m[1] ? m[1].length : 0)
      if (!data.classes.has(name))
        data.classes.set(name, indexToLine(content, dotIndex))
    }
  }
}

// Collect unused classes
const unused = []
const maybeUsed = []
for (const [modulePath, data] of cssModules.entries()) {
  const defined = Array.from(data.classes.keys())
  const usedSet = usageByModule.get(modulePath) || new Set()
  const maybeFlag = maybeUsedByModule.get(modulePath) || false
  for (const name of defined) {
    if (!usedSet.has(name)) {
      const line = data.classes.get(name) || 1
      if (maybeFlag) maybeUsed.push({ modulePath, name, line })
      else unused.push({ modulePath, name, line })
    }
  }
}

// Sort results
unused.sort((a, b) => {
  const pa = path.relative(root, a.modulePath).replace(/\\\\/g, "/")
  const pb = path.relative(root, b.modulePath).replace(/\\\\/g, "/")
  if (pa === pb) return a.name.localeCompare(b.name)
  return pa.localeCompare(pb)
})
maybeUsed.sort((a, b) => {
  const pa = path.relative(root, a.modulePath).replace(/\\\\/g, "/")
  const pb = path.relative(root, b.modulePath).replace(/\\\\/g, "/")
  if (pa === pb) return a.name.localeCompare(b.name)
  return pa.localeCompare(pb)
})

// Print unused in requested format
for (const u of unused) {
  const rel = path.relative(root, u.modulePath).replace(/\\\\/g, "/")
  console.log(`".${u.name}" is not used `)
  console.log(`${rel}:${u.line}\n`)
}

if (maybeUsed.length > 0) {
  console.log("--- maybe used (dynamic access) ---")
  for (const m of maybeUsed) {
    const rel = path.relative(root, m.modulePath).replace(/\\\\/g, "/")
    console.log(`".${m.name}" maybe used (dynamic) `)
    console.log(`${rel}:${m.line}\n`)
  }
}

if (unused.length === 0 && maybeUsed.length === 0) {
  console.log("No unused CSS module classes found.")
}
