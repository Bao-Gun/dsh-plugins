# dsh-plugins

我自己的 DSH 插件索引源。一个索引，装全部插件。

**加索引源**：DSH → 插件 → 发现 → 添加索引源 → 贴

```
https://bao-gun.github.io/dsh-plugins/index.json
```

国内机器（连不上 `bao-gun.github.io` 与 `raw.githubusercontent.com`）贴这一条，它随重扫立刻更新：

```
https://ghproxy.net/https://raw.githubusercontent.com/Bao-Gun/dsh-plugins/main/site/index.json
```

别用 jsDelivr 的 `@main` 当镜像：`cdn.` / `fastly.` / `gcore.` 三个域名共用 `max-age=604800, s-maxage=43200` 缓存，实测发版后即使掉 `purge.jsdelivr.net`，半小时后仍然返回旧内容。要钉死版本就把 `main` 换成 40 位 commit（代价是不再跟新版）。

## 这个仓库是什么

一个静态 JSON 的生成器 + 托管点，不放插件代码。`scripts/plugins.mjs` 是插件清单，
`scripts/build-index.mjs` 照着清单去每个插件仓库的默认分支（或指定的 tag）clone 一份，
读 package.json 和 git，生成 `site/index.json`（format 1），GitHub Pages 负责托管。

所以这里没有任何需要手工维护的版本号：插件发版后，索引下一次重扫就会跟上。

## 加一个插件

1. 在 `scripts/plugins.mjs` 的 `PLUGINS` 里加一条，至少要有 `name`、`repo`、`title`、`icon`。
2. 把图标放到 `site/icons/<name>.svg`（索引里的路径相对索引 URL 解析）。
3. `node scripts/build-index.mjs` 本地跑一遍，看它是列进来了还是被 skip 了。

### 进索引的三个前提

| 前提 | 不满足会怎样 |
|---|---|
| 仓库能匿名 https clone（public） | clone 失败，entry 被跳过 |
| `package.json` 声明 `dsh.bundle.patch`，且该文件在仓库里 | 跳过，装上去会报 not-a-bundle |
| 构建产物（`lib/*.js` 等）已提交进仓库 | 脚本查不出来，但装下来会缺文件 —— git 源安装不跑 `prepare`、不装 devDeps |

### 历史版本

`refs: ['v0.1.0', 'v0.2.0', 'main']` 会把每个 ref 都 clone 一遍，各自读出版本号，
构成同一个插件的多个版本。不写 `refs` 就等于只列默认分支的最新一次提交。

## 发一版插件

在插件自己的仓库里：改版本号 → 构建 → 提交（**含产物**）→ push。
然后来这边 Actions 里手动跑一次 `pages`，或者等每天 03:17 UTC 那次定时。
插件仓库的 push 不会通知这个仓库，这是定时任务的唯一理由。

部署偶发 `Found 0 artifact(s)`（upload 与 deploy 的竞态，日志里是 `No artifacts named "github-pages" were found`）：`gh run rerun <run-id> --failed` 一次即好，别去改 workflow。

## 校验

索引本身能不能被 DSH 接受，用官方校验器验，不要靠肉眼：

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs'
const m = await import('/opt/homebrew/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-plugin-market-index/lib/index.js')
const idx = m.parseMarketIndex(JSON.parse(readFileSync('site/index.json','utf8')), 'https://bao-gun.github.io/dsh-plugins/index.json')
console.log(idx.plugins.map(p => p.name + '@' + p.versions[0].version).join(', '))
"
```

托管侧的硬约束：UTF-8 JSON、200、**不许重定向**、能匿名访问。
