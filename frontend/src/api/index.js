/**
 * 统一的 HTTP 请求封装与后端接口定义。
 * 所有接口遵循 { code, message, data } 响应格式，code === 0 表示成功。
 */
const TOKEN_KEY = 'token'

/** 读取令牌（与 AuthContext 保持一致：优先 sessionStorage，其次 localStorage）。 */
function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

/** 清除所有存储中的令牌。 */
function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

/**
 * 发起请求的核心函数：自动携带 JWT 令牌、序列化 JSON、统一错误处理。
 * @param {string} path 接口路径（自动拼接 /api 前缀）
 * @param {object} options { method, body, auth }
 */
async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* 非 JSON 响应 */
  }

  if (res.status === 401 && token) {
    // 会话已过期：清除令牌并跳转登录页，避免页面在无感知下反复报错
    clearToken()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  if (!res.ok || !data || data.code !== 0) {
    const err = new Error((data && data.message) || `请求失败 (${res.status})`)
    err.status = res.status
    err.code = data && data.code
    throw err
  }
  return data
}

/**
 * 将对象转换为查询字符串，忽略空值，数组会展开为多个同名参数。
 */
function buildQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, v))
    } else {
      search.append(key, value)
    }
  })
  const s = search.toString()
  return s ? `?${s}` : ''
}

// ── 认证接口 ──────────────────────────────────────────
export const authApi = {
  register: (username, password, email) =>
    request('/auth/register', { method: 'POST', body: { username, password, email }, auth: false }),
  login: (username, password, captchaId, captchaCode) =>
    request('/auth/login', { method: 'POST', body: { username, password, captchaId, captchaCode }, auth: false }),
  forgotPassword: (username, email, newPassword) =>
    request('/auth/forgot-password', { method: 'POST', body: { username, email, newPassword }, auth: false }),
  me: () => request('/auth/me'),
  updateMe: (patch) => request('/auth/me', { method: 'PATCH', body: patch }),
}

// ── 验证码 ────────────────────────────────────────────
export const captchaApi = {
  get: () => request('/captcha', { auth: false }),
}

// ── 图片接口 ──────────────────────────────────────────
export const imageApi = {
  list: (params) => request(`/images${buildQuery(params)}`),
  popular: (page = 0, size = 20) => request(`/images/popular${buildQuery({ page, size })}`),
  get: (id) => request(`/images/${id}`),
  related: (id, limit = 8) => request(`/images/${id}/related${buildQuery({ limit })}`),
  ranking: (period, page = 0, size = 20) =>
    request(`/images/ranking${buildQuery({ period, page, size })}`),
  suggestions: (q) => request(`/images/suggestions${buildQuery({ q })}`),
  tags: (limit = 24) => request(`/images/tags${buildQuery({ limit })}`),
  my: (page = 0, size = 20) => request(`/images/my${buildQuery({ page, size })}`),
  myFavorites: (page = 0, size = 20) => request(`/images/my/favorites${buildQuery({ page, size })}`),
  myLikes: (page = 0, size = 20) => request(`/images/my/likes${buildQuery({ page, size })}`),
  feed: (page = 0, size = 20) => request(`/images/feed${buildQuery({ page, size })}`),
  batch: (ids) => request('/images/batch', { method: 'POST', body: { ids } }),
  create: (payload) => request('/images', { method: 'POST', body: payload }),
  updateMeta: (id, payload) => request(`/images/${id}`, { method: 'PATCH', body: payload }),
  updateTags: (id, tags) => request(`/images/${id}/tags`, { method: 'PUT', body: { tags } }),
  like: (id) => request(`/images/${id}/like`, { method: 'POST' }),
  favorite: (id) => request(`/images/${id}/favorite`, { method: 'POST' }),
  checkFavorite: (id) => request(`/images/${id}/favorite/check`),
  remove: (id) => request(`/images/${id}`, { method: 'DELETE' }),
  downloadUrl: (id) => `/api/images/${id}/download`,
  pending: (page = 0, size = 20) => request(`/images/admin/pending${buildQuery({ page, size })}`),
  approve: (id) => request(`/images/${id}/approve`, { method: 'POST' }),
  reject: (id) => request(`/images/${id}/reject`, { method: 'POST' }),
}

// ── 评论接口 ──────────────────────────────────────────
export const commentApi = {
  list: (imageId, page = 0, size = 20) =>
    request(`/comments${buildQuery({ imageId, page, size })}`),
  create: (imageId, content) => request('/comments', { method: 'POST', body: { imageId, content } }),
  remove: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
}

// ── 收藏夹接口 ────────────────────────────────────────
export const boardApi = {
  list: () => request('/boards'),
  create: (name, description) => request('/boards', { method: 'POST', body: { name, description } }),
  detail: (id) => request(`/boards/${id}`),
  addImage: (id, imageId) => request(`/boards/${id}/images`, { method: 'POST', body: { imageId } }),
  removeImage: (id, imageId) => request(`/boards/${id}/images/${imageId}`, { method: 'DELETE' }),
  remove: (id) => request(`/boards/${id}`, { method: 'DELETE' }),
}

// ── 关注接口 ──────────────────────────────────────────
export const followApi = {
  follow: (userId) => request(`/follows/${userId}`, { method: 'POST' }),
  unfollow: (userId) => request(`/follows/${userId}`, { method: 'DELETE' }),
  status: (userId) => request(`/follows/${userId}/status`),
  following: () => request('/follows/following'),
  followers: () => request('/follows/followers'),
}

// ── 用户接口 ──────────────────────────────────────────
export const userApi = {
  findByUsername: (username) => request(`/users/${encodeURIComponent(username)}`),
  resetPassword: (username, newPassword) =>
    request(`/users/${encodeURIComponent(username)}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    }),
}

// ── 举报接口 ──────────────────────────────────────────
export const reportApi = {
  create: (imageId, reason) => request('/reports', { method: 'POST', body: { imageId, reason } }),
  list: (page = 0, size = 20) => request(`/reports${buildQuery({ page, size })}`),
  resolve: (id) => request(`/reports/${id}/resolve`, { method: 'POST' }),
}

/**
 * 上传文件：通过后端代理直传 OSS，返回 objectKey。
 * @param {File} file 待上传的文件
 */
export async function uploadFile(file) {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/oss/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }
  if (!res.ok || !data || data.code !== 0) {
    throw new Error((data && data.message) || `上传失败 (${res.status})`)
  }
  return data.data.objectKey
}

/**
 * 下载图片：带鉴权触发后端下载量统计，并以附件形式保存到本地。
 * @param {number} id 图片 ID
 * @param {string} filename 保存的文件名
 */
export async function downloadImage(id, filename) {
  const token = getToken()
  const res = await fetch(`/api/images/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    let msg = `下载失败 (${res.status})`
    try {
      const d = await res.json()
      msg = d.message || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}