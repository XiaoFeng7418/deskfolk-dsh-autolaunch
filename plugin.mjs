/**
 * deskfolk-dsh-autolaunch — Host 半体。
 *
 * 形状必须对齐官方模板：ESM（"type": "module"）+ `export function apply()`。
 * 只导出 CommonJS 形状（没有 apply）的包会被 loader 接受但 fiber 从不实例化，
 * 而且不报错。
 *
 * 启动后延迟一小会儿再检查，让 Host 先完成自己的启动工作；检查失败只是
 * 少了一个便利功能，绝不能影响 Harness 启动。
 */
import { ensurePetRunning } from './launch.mjs'

export const name = 'deskfolk-dsh-autolaunch'

/** Host 启动完成后再看，避免和宿主自己的初始化抢 IO。 */
const START_DELAY_MS = 1_500

export function apply(ctx) {
  const report = outcome => {
    try {
      const logger = ctx?.logger
      if (outcome === 'launched' || outcome === 'running') logger?.info?.(`deskfolk-dsh-autolaunch: ${outcome}`)
      else logger?.debug?.(`deskfolk-dsh-autolaunch: ${outcome}`)
    } catch {
      // 日志不可用时什么都不做。
    }
  }

  const timer = setTimeout(() => {
    ensurePetRunning().then(report, error => report(`failed: ${error?.message ?? error}`))
  }, START_DELAY_MS)
  timer.unref?.()

  try {
    ctx?.effect?.(() => () => clearTimeout(timer), 'deskfolk-dsh-autolaunch')
  } catch {
    // 没有 effect 能力时定时器仍会自己跑完。
  }
}
