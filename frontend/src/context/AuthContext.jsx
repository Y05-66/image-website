/**
 * 全局认证上下文：管理登录状态、令牌存储与用户资料。
 * 令牌默认存入 localStorage，勾选「记住我」时也会写入对应存储。
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'token'

/**
 * 存储令牌：根据是否「记住我」选择 localStorage 或 sessionStorage。
 */
function storeToken(token, remember = true) {
  const store = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  store.setItem(TOKEN_KEY, token)
  other.removeItem(TOKEN_KEY)
}

/** 返回当前令牌所在的存储（优先 sessionStorage）。 */
function currentStore() {
  return sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : localStorage
}

/** 认证 Provider：初始化时校验令牌并加载用户信息。 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((d) => setUser(d.data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(TOKEN_KEY)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  /** 登录并保存令牌。 */
  const login = useCallback(async (username, password, remember = true, captchaId, captchaCode) => {
    const d = await authApi.login(username, password, captchaId, captchaCode)
    storeToken(d.data.token, remember)
    setUser(d.data)
    return d.data
  }, [])

  /** 注册新账号。 */
  const register = useCallback(async (username, password, email) => {
    await authApi.register(username, password, email)
  }, [])

  /** 退出登录并清除本地令牌。 */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  /** 更新个人资料并刷新本地令牌。 */
  const updateUser = useCallback(async (patch) => {
    const d = await authApi.updateMe(patch)
    currentStore().setItem(TOKEN_KEY, d.data.token)
    setUser(d.data)
    return d.data
  }, [])

  const value = { user, loading, login, register, logout, updateUser }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** 获取当前认证上下文的 Hook。 */
export function useAuth() {
  return useContext(AuthContext)
}