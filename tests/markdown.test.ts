import { describe, expect, test } from 'claude-code/testing'

import { parse, splitSections } from '../hooks/markdown'

describe('parse', () => {
  test('splits prose and mermaid blocks in order', () => {
    const out = parse('# Title\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\nAfter')
    expect(out).toEqual([
      { kind: 'md', text: '# Title\n' },
      { kind: 'mermaid', code: 'flowchart LR\n  A --> B' },
      { kind: 'md', text: '\nAfter' },
    ])
  })

  test('keeps other fenced blocks as prose, mermaid text inside them included', () => {
    const out = parse('```md\n```mermaid\nx\n```\n')
    expect(out.every(s => s.kind === 'md')).toBe(true)
  })

  test('an unclosed mermaid fence stays prose', () => {
    const out = parse('```mermaid\nflowchart LR')
    expect(out).toEqual([{ kind: 'md', text: '```mermaid\nflowchart LR' }])
  })
})

describe('splitSections', () => {
  test('starts a section at each heading, keeping the heading line in its text', () => {
    expect(splitSections('Intro\n# Top\nA\n## Luồng gửi\nB')).toEqual([
      { text: 'Intro' },
      { heading: { level: 1, title: 'Top' }, text: '# Top\nA' },
      { heading: { level: 2, title: 'Luồng gửi' }, text: '## Luồng gửi\nB' },
    ])
  })

  test('does not split inside fenced code', () => {
    const sections = splitSections('# Run\n```bash\n# not a heading\n```\n')
    expect(sections.length).toBe(1)
    expect(sections[0]?.heading?.title).toBe('Run')
  })
})
