import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql } from './_utils/db.js'

const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

app.use(cors())
app.use(express.json())

// 验证 token 并检查黑名单的辅助函数
async function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, message: '未登录' }
  }
  const token = authHeader.slice(7)
  try {
    const blacklisted = await sql`SELECT 1 FROM token_blacklist WHERE token = ${token}`
    if (blacklisted.length > 0) {
      return { valid: false, message: '登录已过期，请重新登录' }
    }
    const decoded = jwt.verify(token, JWT_SECRET)
    return { valid: true, token, decoded }
  } catch {
    return { valid: false, message: '登录已过期，请重新登录' }
  }
}

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`
    res.json({ status: 'ok', dbTime: result[0].now })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// 登录接口
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '账号和密码不能为空' })
  }

  try {
    const users = await sql`SELECT * FROM users WHERE username = ${username}`
    const user = users[0]

    if (!user) {
      return res.status(401).json({ success: false, message: '账号或密码错误' })
    }

    let valid = false
    if (user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password)
    } else {
      valid = user.password === password
    }

    if (!valid) {
      return res.status(401).json({ success: false, message: '账号或密码错误' })
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      userInfo: {
        username: user.username,
        nickname: user.nickname,
        role: user.role
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// 获取当前用户信息（带黑名单校验）
app.get('/api/me', async (req, res) => {
  const result = await verifyToken(req.headers.authorization)
  if (!result.valid) {
    return res.status(401).json({ success: false, message: result.message })
  }

  try {
    const users = await sql`SELECT username, nickname, role FROM users WHERE id = ${result.decoded.userId}`
    const user = users[0]
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' })
    }
    res.json({ success: true, userInfo: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// 退出登录接口：将 token 加入黑名单
app.post('/api/logout', async (req, res) => {
  const result = await verifyToken(req.headers.authorization)
  if (!result.valid) {
    return res.json({ success: true })
  }

  try {
    await sql`
      INSERT INTO token_blacklist (token, expires_at)
      VALUES (${result.token}, to_timestamp(${result.decoded.exp}))
      ON CONFLICT (token) DO NOTHING
    `
    res.json({ success: true, message: '退出登录成功' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// 全局错误处理（必须放在所有路由之后）
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
})

export default app
