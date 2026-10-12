import { expect, test } from 'claude-code/testing'

import { formatEntry, stamp } from './register'

test('紀錄格式包含時間、問題與回答', () => {
  const text = formatEntry({ id: '1', question: 'Why?', answer: 'Because.', at: '2026-10-11 10:00' })
  expect(text).toBe('## 2026-10-11 10:00\n\n**Q:** Why?\n\nBecause.\n\n')
})

test('時間格式固定為 YYYY-MM-DD HH:mm', () => {
  expect(stamp(new Date(2026, 9, 1, 9, 5))).toBe('2026-10-01 09:05')
})

const PANE = {
  component: 'Pane',
  requestId: 'btw',
  props: {
    title: 'btw',
    isFocused: false,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('/btw 寫入紀錄；舊的問答預設收合，點三角形可展開再收合', async ($, on) => {
  const written: string[] = []
  const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
  on('model.fork', (_, e) => ({ value: { isAnswered: true, text: `ANSWER TO ${e.prompt}`, usage } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.root', () => ({ value: 'C:/proj' }))
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 11, 2, 0) }))
  on('fs.read', () => {
    throw new Error('ENOENT')
  })
  on('fs.write', (_, e) => {
    written.push(`${e.path}|${e.text}`)
    return { value: undefined }
  })

  await $.command.run({ command: 'btw', args: 'old?' })
  await $.command.run({ command: 'btw', args: 'new?' })
  expect(written.at(-1)?.replaceAll('\\', '/')).toContain('C:/proj/.claude/btw-history.md|# /btw history')
  expect(written.at(-1)).toContain('ANSWER TO new?')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'btw-plus', surface, ...PANE })
    expect(await ui.find({ text: /ANSWER TO new/ })).toBeDefined()
    expect(await ui.find({ text: /ANSWER TO old/ })).toBeUndefined()
    const old = (await ui.find({ type: 'Button', text: /old\?/ }))?.key ?? ''
    await ui.press({ key: old })
    expect(await ui.find({ text: /ANSWER TO old/ })).toBeDefined()
    await ui.press({ key: old })
    expect(await ui.find({ text: /ANSWER TO old/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('主對話還沒有回應（nothing-to-fork）時，改用 model.complete 回答', async ($, on) => {
  const written: string[] = []
  const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
  on('model.fork', () => ({ value: { isAnswered: false, reason: 'nothing-to-fork' } }))
  on('model.complete', (_, e) => ({ value: { isAnswered: true, text: `PLAIN ${e.prompt}`, usage } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.root', () => ({ value: 'C:/proj' }))
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 11, 2, 0) }))
  on('fs.read', () => {
    throw new Error('ENOENT')
  })
  on('fs.write', (_, e) => {
    written.push(e.text)
    return { value: undefined }
  })

  await $.command.run({ command: 'btw', args: 'why?' })
  expect(written.at(-1)).toContain('PLAIN why?')
})
