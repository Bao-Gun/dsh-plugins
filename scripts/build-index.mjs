#!/usr/bin/env node
// 生成 site/index.json —— 一个索引，装全部插件（format 1）。
//
// 每个插件从自己的仓库里读事实：package.json 给 name/version/engines.dsh，
// git 给 commit 和提交时间。这个仓库只负责「清单 + 展示文案 + 图标 + 托管」。
//
// 所以发一版插件的顺序是：插件仓库里 build → 提交（含 lib/*.js）→ push，
// 然后这个索引用 workflow_dispatch 或者等每天的定时任务重新扫一遍。
// 索引里永远不会出现一个「产物还没提交」的 commit —— 那种提交会被 skip 掉。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, INDEX, PLUGINS } from './plugins.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const run = (cwd, ...args) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    // 匿名 clone：不许弹凭据、不许走 git 凭据助手，失败的私有仓库要立刻失败。
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '' },
  }).trim()

const clone = (repo, ref, dest) => {
  const args = ['-c', 'credential.helper=', 'clone', '--quiet', '--depth', '1', '--single-branch']
  if (ref) args.push('--branch', ref)
  run(root, ...args, repo, dest)
}

const skipped = []
const plugins = []

for (const plugin of PLUGINS) {
  const versions = []
  for (const ref of plugin.refs ?? [plugin.ref ?? null]) {
    const work = mkdtempSync(join(tmpdir(), 'dsh-index-'))
    try {
      clone(plugin.repo, ref, work)
      const pkg = JSON.parse(readFileSync(join(work, 'package.json'), 'utf8'))
      if (pkg.name !== plugin.name) {
        skipped.push(plugin.name + ': 仓库 package.json 里的 name 是 ' + pkg.name + '，清单写的是 ' + plugin.name)
        continue
      }
      const patch = pkg.dsh?.bundle?.patch
      if (!patch || !existsSync(join(work, patch))) {
        skipped.push(plugin.name + ' (' + (ref ?? 'default') + '): 没有 dsh.bundle.patch，装不上')
        continue
      }
      versions.push({
        version: pkg.version,
        publishTimestamp: Number(run(work, 'log', '-1', '--format=%ct')),
        engines: { dsh: pkg.engines?.dsh },
        source: {
          type: 'git',
          url: plugin.repo,
          commit: run(work, 'rev-parse', 'HEAD').toLowerCase(),
          ...(plugin.path ? { path: plugin.path } : {}),
        },
      })
    } catch (error) {
      const detail = String(error.stderr || error.message).trim().split('\n')[0]
      skipped.push(plugin.name + ' (' + (ref ?? 'default') + '): 取不到 —— ' + detail)
    } finally {
      rmSync(work, { recursive: true, force: true })
    }
  }

  const unique = [...new Map(versions.map((v) => [v.version, v])).values()]
  if (unique.length === 0) continue

  if (!existsSync(join(root, 'site', plugin.icon))) {
    skipped.push(plugin.name + ': 图标 ' + plugin.icon + ' 不在 site/ 下，先放进去')
    continue
  }

  plugins.push({
    name: plugin.name,
    title: plugin.title,
    ...(plugin.description ? { description: plugin.description } : {}),
    icon: plugin.icon,
    ...(plugin.author ? { author: plugin.author } : {}),
    homepage: plugin.homepage ?? plugin.repo.replace(/\.git$/, ''),
    repository: { url: plugin.repo.replace(/\.git$/, '') },
    metadata: { category: plugin.category, keywords: plugin.keywords ?? [] },
    versions: unique,
  })
}

if (plugins.length === 0) {
  console.error('没有任何插件进得了索引：')
  for (const line of skipped) console.error('  - ' + line)
  process.exit(1)
}

plugins.sort((a, b) => a.name.localeCompare(b.name))

const index = {
  format: 1,
  title: INDEX.title,
  description: INDEX.description,
  metadata: { categories: CATEGORIES, labels: {}, sortKeys: {} },
  plugins,
}

mkdirSync(join(root, 'site'), { recursive: true })
const target = join(root, 'site/index.json')
writeFileSync(target, JSON.stringify(index, undefined, 2) + '\n')

console.log('索引: ' + target + '（' + plugins.length + ' 个插件）')
for (const plugin of plugins) {
  for (const v of plugin.versions) {
    console.log('  ' + plugin.name + '@' + v.version + '  git+' + v.source.url + '#' + v.source.commit.slice(0, 7))
  }
}
if (skipped.length > 0) {
  console.log('跳过:')
  for (const line of skipped) console.log('  - ' + line)
}
