/**
 * 自测：不启动真实桌宠、不碰真实 Harness profile。
 * 运行：node --test test.mjs
 */
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'

import { ensurePetRunning } from './launch.mjs'

const EXE = 'D:\\Deskfolk\\Deskfolk.exe'

async function sandbox(preferences = {}, bridge) {
  const dir = await mkdtemp(join(tmpdir(), 'deskfolk-dsh-autolaunch-'))
  await writeFile(join(dir, 'preferences.json'), JSON.stringify(preferences))
  await writeFile(join(dir, 'launch.json'), JSON.stringify({ exe: EXE }))
  if (bridge) await writeFile(join(dir, 'bridge.json'), JSON.stringify(bridge))
  return { dir, env: { PET_USER_DATA: dir, APPDATA: dir, LOCALAPPDATA: dir } }
}

const calls = []
const run = (command, args, options) => { calls.push({ command, args, options }); return { unref() {} } }

test('默认在桌宠没跑时启动一次', async () => {
  const { dir, env } = await sandbox({ followAgent: 'all' }, { port: 51000, token: 'a'.repeat(64) })
  try {
    const outcome = await ensurePetRunning({ env, run, exists: () => true, probe: async () => false })
    assert.equal(outcome, 'launched')
    assert.deepEqual(calls.at(-1).args, [EXE])
    assert.equal(calls.at(-1).options.detached, true)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('桌宠已经在监听时不动手', async () => {
  const { dir, env } = await sandbox({}, { port: 51000, token: 'a'.repeat(64) })
  try {
    assert.equal(await ensurePetRunning({ env, run, exists: () => true, probe: async () => true }), 'running')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('开关关掉时不动手', async () => {
  const { dir, env } = await sandbox({ startWithDeepSeekHarness: false })
  try {
    assert.equal(await ensurePetRunning({ env, run, exists: () => true, probe: async () => false }), 'disabled')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('只跟随 Codex 时不动手', async () => {
  const { dir, env } = await sandbox({ followAgent: 'codex' })
  try {
    assert.equal(await ensurePetRunning({ env, run, exists: () => true, probe: async () => false }), 'disabled')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('找不到 Deskfolk.exe 时不动手', async () => {
  const { dir, env } = await sandbox({})
  try {
    assert.equal(await ensurePetRunning({ env, run, exists: () => false, probe: async () => false }), 'missing')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('30 秒冷却内不重复启动', async () => {
  const { dir, env } = await sandbox({})
  try {
    const first = await ensurePetRunning({ env, run, exists: () => true, probe: async () => false, now: 1_000_000 })
    const second = await ensurePetRunning({ env, run, exists: () => true, probe: async () => false, now: 1_000_000 + 5_000 })
    assert.equal(first, 'launched')
    assert.equal(second, 'recent')
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('冷却过期后可以再次启动', async () => {
  const { dir, env } = await sandbox({})
  try {
    await ensurePetRunning({ env, run, exists: () => true, probe: async () => false, now: 1_000_000 })
    const later = await ensurePetRunning({ env, run, exists: () => true, probe: async () => false, now: 1_000_000 + 31_000 })
    assert.equal(later, 'launched')
  } finally { await rm(dir, { recursive: true, force: true }) }
})
