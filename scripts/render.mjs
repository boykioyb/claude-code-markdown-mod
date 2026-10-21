// Renders Mermaid definitions to SVG for the md-mermaid-pane mod.
// stdin: JSON array of definition strings. stdout: JSON array of { svg } | { error }.
// One browser launch for the whole batch; a broken diagram fails alone.
// Env: MERMAID_DEPS_DIR — where /md-view-setup installed @mermaid-js/mermaid-cli;
//      CHROME_PATH — a Chrome/Chromium/Edge binary, else the first one found below.
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const deps = process.env.MERMAID_DEPS_DIR
if (!deps || !existsSync(join(deps, 'node_modules', '@mermaid-js', 'mermaid-cli'))) {
  process.stderr.write('mermaid-cli is not installed: run /md-view-setup\n')
  process.exit(3)
}

const BROWSERS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
}
const chrome = process.env.CHROME_PATH || (BROWSERS[process.platform] ?? []).find(p => existsSync(p))
if (!chrome) {
  process.stderr.write('no Chrome, Chromium or Edge found: set the chromePath option\n')
  process.exit(4)
}

const require = createRequire(join(deps, 'package.json'))
const puppeteer = require('puppeteer')
const { renderMermaid } = await import(
  pathToFileURL(join(deps, 'node_modules', '@mermaid-js', 'mermaid-cli', 'src', 'index.js')).href
)

const MERMAID_CONFIG = { theme: 'default', htmlLabels: false, flowchart: { htmlLabels: false } }

const readStdin = async () => {
  let text = ''
  for await (const chunk of process.stdin) text += chunk
  return text
}

// width="100%" lets the pane stretch a small diagram; pin it to the drawing's own width instead.
const pinWidth = svg => {
  const viewBox = svg.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/)
  if (!viewBox) return svg
  return svg.replace(
    /<svg([^>]*?) width="100%"/,
    `<svg$1 width="${Math.ceil(Number(viewBox[1]))}" height="${Math.ceil(Number(viewBox[2]))}"`,
  )
}

const definitions = JSON.parse(await readStdin())
const browser = await puppeteer.launch({ executablePath: chrome, headless: true })
const results = []
try {
  for (const definition of definitions) {
    try {
      const { data } = await renderMermaid(browser, definition, 'svg', {
        mermaidConfig: MERMAID_CONFIG,
        fontEmbed: false,
      })
      results.push({ svg: pinWidth(new TextDecoder().decode(data)) })
    } catch (error) {
      results.push({ error: String(error?.message ?? error).split('\n').slice(0, 4).join('\n') })
    }
  }
} finally {
  await browser.close()
}
process.stdout.write(JSON.stringify(results))
