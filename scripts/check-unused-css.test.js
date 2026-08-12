import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

const scriptPath = path.resolve("scripts/check-unused-css.js")

test("check-unused-css reports maybe-used CSS module classes", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "unused-css-"))

  try {
    fs.mkdirSync(path.join(rootDir, "src"), { recursive: true })
    fs.writeFileSync(
      path.join(rootDir, "src", "Button.module.css"),
      `.button { color: red; }
.secondary { color: blue; }
.dynamic { color: green; }
`,
    )
    fs.writeFileSync(
      path.join(rootDir, "src", "Component.tsx"),
      `import styles from "./Button.module.css"

export function Component(dynamicName: string) {
  return <div className={styles.button}>{styles[dynamicName]}</div>
}
`,
    )

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: rootDir,
      encoding: "utf8",
    })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /\.dynamic" maybe used \(dynamic\)/)
    assert.match(result.stdout, /\.secondary" maybe used \(dynamic\)/)
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true })
  }
})

test("check-unused-css reports definitely unused CSS module classes", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "unused-css-"))

  try {
    fs.mkdirSync(path.join(rootDir, "src"), { recursive: true })
    fs.writeFileSync(
      path.join(rootDir, "src", "Button.module.css"),
      `.used { color: red; }
.unused { color: blue; }
.unused .usedNested { color: blue; }
.alsoUnused { color: green; }
.used .unusedNested { color: yellow; }
`,
    )
    fs.writeFileSync(
      path.join(rootDir, "src", "Component.tsx"),
      `import styles from "./Button.module.css"

export function Component() {
  return <div className={\`\${styles.used} \${styles.usedNested}\`}>Hello</div>
}
`,
    )

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: rootDir,
      encoding: "utf8",
    })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /\.unused" is not used/)
    assert.match(result.stdout, /\.alsoUnused" is not used/)
    assert.match(result.stdout, /\.unusedNested" is not used/)
    assert.doesNotMatch(result.stdout, /\.used" is not used/)
    assert.doesNotMatch(result.stdout, /\.usedNested" is not used/)
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true })
  }
})
