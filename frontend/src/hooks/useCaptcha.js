/**
 * 图形验证码 Hook：管理验证码 ID、图片与用户输入。
 */
import { useCallback, useEffect, useState } from 'react'
import { captchaApi } from '../api'

export function useCaptcha() {
  const [captchaId, setCaptchaId] = useState('')
  const [image, setImage] = useState('')
  const [code, setCode] = useState('')

  /** 刷新验证码。 */
  const refresh = useCallback(async () => {
    const d = await captchaApi.get()
    setCaptchaId(d.data.captchaId)
    setImage(d.data.image)
    setCode('')
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { captchaId, image, code, setCode, refresh }
}