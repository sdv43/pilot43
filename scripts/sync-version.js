#!/usr/bin/env node
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const packageJsonPath = path.join(rootDir, "package.json")
const viteConfigPath = path.join(rootDir, "vite.config.ts")

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
const version = packageJson.version

if (!version) {
  console.error("No version found in package.json")
  process.exit(1)
}

let viteConfig = fs.readFileSync(viteConfigPath, "utf8")
const versionPattern = /version:\s*["'][^"']+["']/
const replacement = `version: "${version}"`

if (!versionPattern.test(viteConfig)) {
  console.error("Could not find a manifest version entry in vite.config.ts")
  process.exit(1)
}

viteConfig = viteConfig.replace(versionPattern, replacement)
fs.writeFileSync(viteConfigPath, viteConfig)

console.log(`Updated vite.config.ts version to ${version}`)
