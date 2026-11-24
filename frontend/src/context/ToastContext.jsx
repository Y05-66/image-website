/**
 * 全局 Toast 轻提示：提供 success / error / info 三种非阻塞消息提示，
 * 自动消退、可点击关闭，用于替代原生 alert，统一反馈风格。
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

/** 自增 ID，用于标识每一条提示。 */
let toastId = 0

/** Toast 全局提供者：管理提示队列并在顶部渲染。 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  /** 关闭指定提示并清理其定时器。 */
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  /** 入队一条提示，并按类型与时长自动消退。 */
  const push = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  // 提供语义化快捷方法，保持引用稳定
  const success = useCallback((m) => push(m, 'success'), [push])
  const error = useCallback((m) => push(m, 'error'), [push])
  const info = useCallback((m) => push(m, 'info'), [push])

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast toast--${t.type}`}
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** 获取 Toast 快捷方法的 Hook。 */
export function useToast() {
  return useContext(ToastContext)
}