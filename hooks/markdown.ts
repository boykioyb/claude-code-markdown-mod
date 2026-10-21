export type Segment = { kind: 'md'; text: string } | { kind: 'mermaid'; code: string }

const FENCE_OPEN = /^\s{0,3}(`{3,}|~{3,})\s*([\w-]*)/

// Splits markdown into prose and mermaid blocks; other fenced blocks stay prose.
export const parse = (source: string): Segment[] => {
  const out: Segment[] = []
  let prose: string[] = []
  let fence: { mark: string; isMermaid: boolean; body: string[] } | null = null
  const flushProse = () => {
    if (prose.join('').trim()) out.push({ kind: 'md', text: prose.join('\n') })
    prose = []
  }
  for (const line of source.split('\n')) {
    if (fence) {
      const isClose = line.trim().startsWith(fence.mark) && line.trim().replace(/[`~]/g, '') === ''
      if (isClose && fence.isMermaid) {
        out.push({ kind: 'mermaid', code: fence.body.join('\n') })
        fence = null
      } else if (isClose) {
        prose.push(line)
        fence = null
      } else if (fence.isMermaid) {
        fence.body.push(line)
      } else {
        prose.push(line)
      }
      continue
    }
    const open = line.match(FENCE_OPEN)
    if (open) {
      const isMermaid = open[2] === 'mermaid'
      fence = { mark: open[1] ?? '```', isMermaid, body: [] }
      if (isMermaid) flushProse()
      else prose.push(line)
      continue
    }
    prose.push(line)
  }
  if (fence?.isMermaid) prose.push('```mermaid', ...fence.body)
  flushProse()
  return out
}

export type Section = { heading?: { level: number; title: string }; text: string }

const HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/

// Splits prose at its ATX headings so each heading can carry its own scroll target; fenced code is never split
// (a `# comment` in bash is no heading).
export const splitSections = (text: string): Section[] => {
  const sections: Section[] = []
  let current: Section = { text: '' }
  const lines: string[] = []
  let fenceMark: string | null = null
  const close = () => {
    current.text = lines.join('\n')
    if (current.heading || current.text.trim()) sections.push(current)
    lines.length = 0
  }
  for (const line of text.split('\n')) {
    if (fenceMark) {
      if (line.trim().startsWith(fenceMark) && line.trim().replace(/[`~]/g, '') === '') fenceMark = null
      lines.push(line)
      continue
    }
    const fence = line.match(FENCE_OPEN)
    if (fence) {
      fenceMark = fence[1] ?? '```'
      lines.push(line)
      continue
    }
    const heading = line.match(HEADING)
    if (heading?.[1] && heading[2]) {
      close()
      current = { heading: { level: heading[1].length, title: heading[2] }, text: '' }
    }
    lines.push(line)
  }
  close()
  return sections
}
