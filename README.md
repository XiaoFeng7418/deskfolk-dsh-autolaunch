# deskfolk-dsh-autolaunch

启动 DeepSeek Harness 时，如果 [Deskfolk](https://github.com/DeriitoMe/Deskfolk) 桌宠没有在运行，就把它拉起来。

Deskfolk 官方只提供「随 Codex 启动」和「随 Claude Code 启动」两个入口：这两个功能都不是 Deskfolk 自己实现的，而是各自的接入脚本（`plugins/deskfolk-claude-code/hook.mjs`、`plugins/deskfolk-codex-launcher`）在会话开始时调用 `launchPet`。DeepSeek Harness 没有对应的脚本，所以即使 Deskfolk 设置里勾了「随 DeepSeek Harness 启动」，也没有东西去执行它——这个插件就是补这个空缺的。

它 **不修改 Deskfolk**：不写它的文件、不打它的补丁，只读 `%APPDATA%\liquid-glass-pet\` 下的 `preferences.json` / `launch.json` / `bridge.json`，与官方 Claude Code 集成的做法一致。

## 安装

前置：Deskfolk 已安装并至少启动过一次；Deskfolk 的 DSH 接入插件 `deskfolk-deepseek-harness` 也已装好（它负责把会话事件推给桌宠）。

```powershell
# 1. 克隆到任意位置
git clone https://github.com/XiaoFeng7418/deskfolk-dsh-autolaunch.git C:\tools\deskfolk-dsh-autolaunch

# 2. 用「Harness 自带的 dsh」装进对应的 profile
& "D:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add file:C:\tools\deskfolk-dsh-autolaunch
```

不想 clone 也可以直接装 git 地址（pnpm 会拉一份快照，之后更新代码需要重装一次）：

```powershell
& "D:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add https://github.com/XiaoFeng7418/deskfolk-dsh-autolaunch.git
```

要点：

- **必须用 Harness 资源目录里的 `dsh.cmd`**，不能用 npm 全局安装的 `dsh`。后者会拒绝操作桌面版 profile：
  `error: profile "desktop" is managed exclusively by the Electron application`。
- `--profile` 换成你自己的 profile 名。桌面版通常是 `desktop`；命令行版可能是别的名字（`dsh` 的 profile 目录在 `~/.dsh/profiles/`）。
- 装完重启 Harness。插件的启动逻辑在 Host 起来 1.5 秒后执行。

## 它怎么决定要不要拉起

```text
Host 启动
  └─ 1.5s 后检查 %APPDATA%\liquid-glass-pet
       ├─ preferences.startWithDeepSeekHarness === false → 不动
       ├─ preferences.followAgent === "codex"            → 不动（只跟随 Codex）
       ├─ launch.json / 默认安装路径里没有 Deskfolk.exe   → 不动
       ├─ bridge.json 的端口已经有进程在监听             → 已在运行，不动
       ├─ 30 秒内别的 Host 刚启动过（dsh-launch.lock）   → 不动（多开不重复拉起）
       └─ explorer.exe "…\Deskfolk.exe"                  → 拉起，父进程是桌面
```

通过 `explorer.exe` 启动有两个好处：桌宠的父进程是桌面而不是 Harness，Harness 退出不会把它带走；多开 Harness 也不会拉起一堆桌宠。

任何失败都只写一条 debug 日志，不影响 Harness 启动。

## 关掉它

临时关闭（不用卸载）：编辑 `%APPDATA%\liquid-glass-pet\preferences.json`

```json
"startWithDeepSeekHarness": false
```

或者把 Deskfolk 的跟随对象设为「仅 Codex」。注意 Deskfolk 自己保存设置时会重写这个文件，可能把这个键丢掉，那就回到默认开启。

彻底卸载：

```powershell
& "D:\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop remove deskfolk-dsh-autolaunch
```

然后重启 Harness。

## 自测

不启动真实桌宠、不碰真实 profile：

```powershell
node --test test.mjs
```

## 兼容性

- Node.js >= 22（Harness 内置的运行时满足）
- 只读文件，不写 Deskfolk 的任何数据
- 找不到 Deskfolk 时静默退出，不会报错窗口

## License

MIT
