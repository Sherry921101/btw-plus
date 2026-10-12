import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { BtwEntry } from '../types'

const PANE = 'btw'
const history = atom({ plugin: 'btw-plus', key: 'history' } as const, [] as BtwEntry[])
const toggled = atom({ plugin: 'btw-plus', key: 'toggled' } as const, {} as Record<string, boolean>)

// rows 給 inline 版面、columns 給全螢幕 dock；使用者自己拖過的大小會優先
const openPane = ($: EngineInterface) =>
  $.ui.open({ id: PANE, title: 'btw', rows: 40, columns: 120, closeOnEscape: true })

const pad = (n: number) => String(n).padStart(2, '0')
// 固定格式，不依賴系統語系：2026-10-11 14:03
export const stamp = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

export const formatEntry = (entry: BtwEntry) =>
  `## ${entry.at}\n\n**Q:** ${entry.question}\n\n${entry.answer ?? '(no answer)'}\n\n`

const appendLog = async ($: EngineInterface, entry: BtwEntry) => {
  const path = `${await $.session.root()}/.claude/btw-history.md`
  // shortcut: $.fs 沒有 append，整檔讀寫；檔案超過 4 MiB 時讀取會失敗，屆時改成按月分檔
  const old = await $.fs.read(path).catch(() => '# /btw history\n\n')
  await $.fs.write(path, old + formatEntry(entry))
}

export const register: Register = on => {
  // 取代內建 /btw：答案顯示在大 pane，並追加到紀錄檔
  on('command.run', { command: 'btw' }, async ($, e) => {
    const question = e.args.trim()
    await openPane($)
    if (question === '') return {}

    const now = new Date(await $.clock.now())
    const entry: BtwEntry = { id: crypto.randomUUID(), question, answer: null, at: stamp(now) }
    await update($, history, list => [...list, entry].slice(-50))

    const forked = await $.model.fork({ prompt: question })
    // 新 session、/clear 或 resume 後主對話還沒有回應可 fork，改成不帶對話脈絡直接問
    const reply =
      !forked.isAnswered && forked.reason === 'nothing-to-fork'
        ? await $.model.complete({ model: 'sonnet', prompt: question })
        : forked
    const answer = reply.isAnswered ? reply.text : `_No answer (${reply.reason})._`
    const done = { ...entry, answer }
    await update($, history, list => list.map(one => (one.id === entry.id ? done : one)))
    await appendLog($, done).catch(err => $.ui.toast(`btw: could not save history (${err})`))

    // 不回傳 text：跟內建 /btw 一樣，不進主對話的 context
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const list = await read($, history)
    const open = await read($, toggled)
    const rule = '─'.repeat(Math.max(1, e.props.bodyColumns - 2))

    if (list.length === 0) {
      return (
        <Box flexDirection="column" paddingX={1} paddingY={1}>
          <Text>No side questions yet.</Text>
          <Text dimColor>Type /btw &lt;question&gt; to ask without interrupting.</Text>
        </Box>
      )
    }

    // 收合後很省空間，畫最近 20 則；最新的在最下面且預設展開，完整紀錄在 .claude/btw-history.md
    const shown = list.slice(-20)
    const earlier = list.length - shown.length
    const lastId = shown.at(-1)?.id
    return (
      <Box flexDirection="column" paddingX={1}>
        {shown.map((entry, i) => {
          const isOpen = open[entry.id] ?? entry.id === lastId
          const flip = () => update($, toggled, map => ({ ...map, [entry.id]: !isOpen }))
          return (
            <Box key={entry.id} flexDirection="column">
              {i > 0 && isOpen && <Text dimColor>{rule}</Text>}
              <Box justifyContent="space-between" marginTop={i > 0 && isOpen ? 1 : 0}>
                <Button key={`toggle-${entry.id}`} plain onPress={flip}>
                  <Text color="cyan">{isOpen ? '▾ ' : '▸ '}</Text>
                  <Text bold={isOpen} dimColor={!isOpen}>
                    {entry.question}
                  </Text>
                </Button>
                <Text dimColor> {entry.at.slice(-5)}</Text>
              </Box>
              {isOpen && (
                <Box paddingLeft={2} marginTop={1} marginBottom={1}>
                  {entry.answer === null ? (
                    <Text dimColor italic>
                      thinking…
                    </Text>
                  ) : (
                    <Markdown text={entry.answer} />
                  )}
                </Box>
              )}
            </Box>
          )
        })}
        <Text dimColor>
          {earlier > 0 ? `${earlier} earlier · ` : ''}click ▸ to expand · esc to close · saved to .claude/btw-history.md
        </Text>
      </Box>
    )
  })
}
