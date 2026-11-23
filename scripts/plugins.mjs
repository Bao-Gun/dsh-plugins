// 索引里的插件清单 —— 加插件只改这个文件。
//
// 每条只写「从哪拿」和「怎么展示」，版本号、commit、提交时间一律从插件仓库自己读，
// 这里写死就会出现「索引说 0.2.0、装下来还是 0.1.0」那种漂移。
//
// refs 省略时只列默认分支的最新一次提交；要留历史版本就在这里列 tag，例如
//   refs: ['v0.1.0', 'v0.2.0', 'main']
// 每个 ref 都会被 clone 一遍，从它的 package.json 取版本号。
//
// 进索引的三个前提（脚本会逐条检查，不合格就跳过并打印原因）：
//   1. 仓库能匿名 clone（https，public）
//   2. package.json 里声明了 dsh.bundle.patch，且那个文件真的在
//   3. 构建产物（lib/*.js）已经在仓库里 —— git 源安装不会跑构建

export const INDEX = {
  title: { en: 'Bao-Gun DSH plugins', zh: '包棍的 DSH 插件' },
  description: {
    en: 'Self-used DSH plugins, installable straight from this index.',
    zh: '自己用的一组 DSH 插件，从这个索引直接装。',
  },
}

export const CATEGORIES = {
  interface: { title: { en: 'Interface', zh: '界面' } },
}

export const PLUGINS = [
  {
    name: 'dsh-restart',
    repo: 'https://github.com/Bao-Gun/dsh-restart.git',
    refs: ['main'],
    title: { en: 'Restart & Precheck', zh: '重启与预检' },
    description: {
      en: 'A restart button for dsh web that reruns startup checks on a cloned profile before it really restarts.',
      zh: '在 dsh web 侧栏加一颗「重启」按钮：先克隆 profile 试跑一遍，确认这堆插件还起得来，才真重启。',
    },
    icon: 'icons/dsh-restart.svg',
    author: 'Bao-Gun',
    category: 'interface',
    keywords: ['restart', 'precheck', 'reload'],
  },
  // dsh-upgrade 还进不来，两条都要先补：
  //   - 仓库是 private（Pages 与匿名 clone 都不行），要么转 public 要么改走别的分发
  //   - package.json 没声明 dsh.bundle.patch，装上去就是 not-a-bundle
  // {
  //   name: 'dsh-upgrade',
  //   repo: 'https://github.com/Bao-Gun/dsh-upgrade.git',
  //   refs: ['main'],
  //   title: { en: 'Upgrade', zh: '升级' },
  //   description: { en: '...', zh: '...' },
  //   icon: 'icons/dsh-upgrade.svg',
  //   author: 'Bao-Gun',
  //   category: 'interface',
  //   keywords: ['upgrade'],
  // },
]
