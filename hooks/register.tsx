import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { DocPath } from '../types'
import { parse, splitSections } from './markdown'
import type { Segment } from './markdown'
import { viewerHtml } from './viewer'

const PANE = 'md-view'
const POLL_MS = 1500
const SVG_LIMIT = 131072

// The renderer script ships in the mod (scripts/render.mjs); its libraries (mermaid-cli + puppeteer, ~450 MB, no
// bundled browser) are installed once per person by /md-view-setup into ~/.local/share/md-mermaid-pane, and it
// drives the Chrome, Chromium or Edge already on the machine. Binaries come from the plugin's options.
const MERMAID_CLI = '@mermaid-js/mermaid-cli@12.0.0'
let binaries = { node: 'node', npm: 'npm', chrome: '' }
let depsCache: string | null = null

// HOME on macOS / Linux, USERPROFILE on Windows; no shell command is needed to make the folder ($.fs.write and
// npm --prefix create it).
const depsDir = async ($: EngineInterface) => {
  if (depsCache) return depsCache
  const home = (await $.env.get('HOME')) || (await $.env.get('USERPROFILE')) || '.'
  depsCache = `${home.replace(/\\/g, '/')}/.local/share/md-mermaid-pane`
  return depsCache
}

const isWindows = async ($: EngineInterface) => (await $.env.get('OS')) === 'Windows_NT'
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

const pathAtom = atom({ plugin: 'md-mermaid-pane', key: 'path' } as const, null as DocPath)

type Rendered = { svg: string } | { error: string }

// Module state: rebuilt after a reload, which re-reads the file anyway.
const diagrams = new Map<string, Rendered>()
let segments: Segment[] = []
let lastMtime = -1
let lastPath: string | null = null
let status = ''
let isBusy = false
// Per diagram, by content hash: 'fit' lets the pane cap the drawing to its width.
const zooms = new Map<string, number | 'fit'>()
let isTocOpen = true

const hash = (text: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(16)}:${text.length}`
}

const redraw = ($: EngineInterface) => $.ui.invalidate('ui.render')

const renderMissing = async ($: EngineInterface) => {
  const missing = [
    ...new Set(segments.flatMap(s => (s.kind === 'mermaid' && !diagrams.has(hash(s.code)) ? [s.code] : []))),
  ]
  if (missing.length === 0) return
  status = `Đang vẽ ${missing.length} sơ đồ…`
  await redraw($)
  const deps = await depsDir($)
  const ran = await $.process
    .run([binaries.node, `${$.plugin.root}/scripts/render.mjs`], {
      env: { MERMAID_DEPS_DIR: deps, ...(binaries.chrome ? { CHROME_PATH: binaries.chrome } : {}) },
      stdin: JSON.stringify(missing),
      timeoutMs: 180000,
    })
    .catch(error => ({ exitCode: 127, stdout: '', stderr: `không chạy được ${binaries.node}: ${String(error)}` }))
  if (ran.exitCode === 3) {
    status = 'Chưa cài trình vẽ mermaid trên máy này: gõ /md-view-setup (một lần).'
    return
  }
  if (ran.exitCode !== 0) {
    status = `Không chạy được trình vẽ: ${ran.stderr.split('\n').slice(0, 3).join(' ')}`
    return
  }
  const results = JSON.parse(ran.stdout) as Rendered[]
  missing.forEach((code, i) => diagrams.set(hash(code), results[i] ?? { error: 'không có kết quả' }))
  status = ''
}

const refresh = async ($: EngineInterface, isForced = false) => {
  const path = await read($, pathAtom)
  if (!path || isBusy) return
  isBusy = true
  try {
    const stat = await $.fs.stat(path)
    if (stat.kind !== 'file') {
      status = `Không đọc được file: ${path}`
      await redraw($)
      return
    }
    if (!isForced && path === lastPath && stat.mtimeMs === lastMtime) return
    lastPath = path
    lastMtime = stat.mtimeMs
    segments = parse(await $.fs.read(path))
    await redraw($)
    await renderMissing($)
  } catch (error) {
    status = `Lỗi: ${String(error).slice(0, 300)}`
  } finally {
    isBusy = false
  }
  await redraw($)
}

const basename = (path: string) => path.split('/').pop() ?? path

const naturalSize = (svg: string) => {
  const m = svg.match(/<svg[^>]*? width="([\d.]+)" height="([\d.]+)"/)
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null
}

const stepZoom = (current: number | 'fit', natural: number, direction: 1 | -1): number => {
  // From 'fit' start at the nearest step to what the pane showed, assuming ~700px of room.
  const from = current === 'fit' ? Math.min(1, 700 / natural) : current
  const next =
    direction === 1 ? ZOOM_STEPS.find(z => z > from + 0.001) : [...ZOOM_STEPS].reverse().find(z => z < from - 0.001)
  return next ?? from
}

const openFullScreen = async ($: EngineInterface, svg: string, index: number) => {
  const docPath = (await read($, pathAtom)) ?? 'diagram'
  const name = `${basename(docPath)
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w.-]+/g, '_')}-${index + 1}`
  const viewDir = `${await depsDir($)}/view`
  const file = `${viewDir}/${name}.html`
  try {
    await $.fs.write(file, viewerHtml(`${basename(docPath)} — sơ đồ ${index + 1}`, svg))
    // Windows opens a file through `start`; macOS has `open`, Linux desktops `xdg-open`.
    if (await isWindows($)) await $.process.run(['cmd', '/c', 'start', '', file])
    else {
      const opened = await $.process.run(['open', file]).catch(() => null)
      if (!opened || opened.exitCode !== 0) await $.process.run(['xdg-open', file])
    }
  } catch (error) {
    status = `Không mở được toàn màn hình: ${String(error).slice(0, 200)}`
    await redraw($)
  }
}

const openFile = async ($: EngineInterface, raw: string): Promise<string> => {
  const arg = raw.trim().replace(/^['"]|['"]$/g, '')
  if (!arg) {
    const current = await read($, pathAtom)
    if (!current) return 'Cách dùng: /md-view <đường dẫn file .md>'
    await $.ui.open({ id: PANE, title: basename(current) })
    await refresh($, true)
    return `Đang xem ${current}`
  }
  // stat rejects for a path that does not exist
  const stat = await $.fs.stat(arg, { resolve: true }).catch(() => null)
  if (stat?.kind !== 'file' || !stat.realPath) return `Không thấy file: ${arg}`
  const path = stat.realPath
  await update($, pathAtom, () => path)
  await $.ui.open({ id: PANE, title: basename(path) })
  await refresh($, true)
  return `Đang xem ${path}`
}

// One-time install of the renderer's libraries for this person; the browser is the one already installed.
const setup = async ($: EngineInterface): Promise<string> => {
  const deps = await depsDir($)
  // Without a shell, Windows finds npm only by its .cmd name.
  const npm = binaries.npm === 'npm' && (await isWindows($)) ? 'npm.cmd' : binaries.npm
  const ran = await $.process
    .run([npm, 'install', '--prefix', deps, '--no-fund', '--no-audit', MERMAID_CLI], {
      env: { PUPPETEER_SKIP_DOWNLOAD: '1' },
      timeoutMs: 600000,
    })
    .catch(error => ({ exitCode: 127, stdout: '', stderr: String(error) }))
  if (ran.exitCode !== 0) {
    return `Cài trình vẽ lỗi (${npm}): ${ran.stderr.trim().split('\n').slice(-3).join(' ')}`
  }
  diagrams.clear()
  status = ''
  void refresh($, true)
  return `Đã cài ${MERMAID_CLI} vào ${deps}. Mở lại /md-view để vẽ sơ đồ.`
}

export const register: Register = (on, options) => {
  binaries = {
    node: String(options.nodePath ?? 'node').trim() || 'node',
    npm: String(options.npmPath ?? 'npm').trim() || 'npm',
    chrome: String(options.chromePath ?? '').trim(),
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'md-view',
      description: 'Xem file Markdown trong panel, vẽ các khối mermaid thành sơ đồ',
      argumentHint: '<đường dẫn file .md>',
    })
    await $.command.register({
      name: 'md-view-setup',
      description: 'Cài trình vẽ mermaid cho /md-view (chạy một lần trên mỗi máy)',
    })
    $.clock.every(POLL_MS, () => void refresh($))
    const path = await read($, pathAtom)
    if (path) void $.ui.open({ id: PANE, title: basename(path) })

    return next(e)
  })

  // A failure must still answer the command, so the person sees the reason instead of a silent no-op.
  const answered = async (work: () => Promise<string>) => {
    try {
      return { text: await work() }
    } catch (error) {
      return { text: `Lỗi: ${String(error).slice(0, 400)}` }
    }
  }

  on('command.run', { command: 'md-view' }, async ($, e) => answered(() => openFile($, e.args)))

  on('command.run', { command: 'md-view-setup' }, async $ => answered(() => setup($)))

  on('ui.close', { id: PANE }, async ($, e, next) => {
    await update($, pathAtom, () => null)
    segments = []
    lastPath = null

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    if (e.surface === 'terminal') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>Terminal không vẽ được SVG; mở panel này trên Claude Desktop.</Text>
    }
    const { Box, Text, Markdown, Code, Svg, Button } = $.ui.resolve(e)
    const path = await read($, pathAtom)
    if (!path) return <Text dimColor>Gõ /md-view &lt;đường dẫn&gt; để mở một file.</Text>

    // Each heading becomes its own Markdown element so the table of contents can scroll to it.
    const blocks = segments.map((segment, i) =>
      segment.kind === 'md'
        ? {
            kind: 'md' as const,
            sections: splitSections(segment.text).map((part, j) => ({ ...part, anchor: `s${i}-${j}` })),
          }
        : { kind: 'mermaid' as const, code: segment.code, index: i },
    )
    const toc = blocks.flatMap(block =>
      block.kind === 'md'
        ? block.sections.flatMap(part => (part.heading ? [{ ...part.heading, anchor: part.anchor }] : []))
        : [],
    )
    const minLevel = Math.min(...toc.map(entry => entry.level))

    return (
      <Box flexDirection="column" gap={1}>
        <Text dimColor>{path}</Text>
        {status !== '' && <Text color="yellow">{status}</Text>}
        {toc.length > 1 && (
          <Box flexDirection="column">
            <Button
              key="toc-toggle"
              plain
              label={isTocOpen ? '▾ Mục lục' : '▸ Mục lục'}
              onPress={() => {
                isTocOpen = !isTocOpen
                void redraw($)
              }}
            />
            {isTocOpen &&
              toc.map(entry => (
                <Button
                  key={`toc-${entry.anchor}`}
                  plain
                  dimColor
                  label={`${' '.repeat(entry.level - minLevel)}${entry.title}`}
                  onPress={() => void $.ui.scroll({ in: PANE, to: { key: entry.anchor }, block: 'start' })}
                />
              ))}
          </Box>
        )}
        {blocks.flatMap(block =>
          block.kind === 'md'
            ? block.sections.map(part => <Markdown key={part.anchor} text={part.text} />)
            : [renderDiagram(block.code, block.index)],
        )}
      </Box>
    )

    function renderDiagram(code: string, i: number) {
      const done = diagrams.get(hash(code))
      if (done && 'svg' in done && done.svg.length <= SVG_LIMIT) {
        const id = hash(code)
        const zoom = zooms.get(id) ?? 'fit'
        const size = naturalSize(done.svg)
        const setZoom = (next: number | 'fit') => {
          zooms.set(id, next)
          void redraw($)
        }
        return (
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="row" gap={1}>
              <Button key={`d${i}-out`} label="−" onPress={() => size && setZoom(stepZoom(zoom, size.width, -1))} />
              <Button key={`d${i}-in`} label="+" onPress={() => size && setZoom(stepZoom(zoom, size.width, 1))} />
              <Button key={`d${i}-fit`} label="Vừa khung" dimColor={zoom !== 'fit'} onPress={() => setZoom('fit')} />
              <Button key={`d${i}-one`} label="100%" dimColor={zoom !== 1} onPress={() => setZoom(1)} />
              <Button key={`d${i}-full`} label="Toàn màn hình" onPress={() => void openFullScreen($, done.svg, i)} />
              <Text dimColor>{zoom === 'fit' ? 'vừa khung' : `${Math.round(zoom * 100)}%`}</Text>
            </Box>
            <Svg
              source={done.svg}
              alt={`Sơ đồ mermaid ${i + 1}`}
              isInteractive
              width={zoom === 'fit' || !size ? undefined : Math.round(size.width * zoom)}
              height={zoom === 'fit' || !size ? undefined : Math.round(size.height * zoom)}
            />
          </Box>
        )
      }
      const note = !done
        ? 'Đang chờ vẽ…'
        : 'error' in done
          ? `Sơ đồ lỗi: ${done.error}`
          : 'Sơ đồ quá lớn để hiện (quá 128 KB SVG).'
      return (
        <Box flexDirection="column">
          <Text color={done ? 'red' : undefined} dimColor={!done}>
            {note}
          </Text>
          <Code source={code} language="mermaid" />
        </Box>
      )
    }
  })
}
