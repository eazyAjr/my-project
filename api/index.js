import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { sql } from '../server/db.js'

dotenv.config()

const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

app.use(cors())
app.use(express.json())

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
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 获取当前用户信息
app.get('/api/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录' })
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const users = await sql`SELECT username, nickname, role FROM users WHERE id = ${decoded.userId}`
    const user = users[0]
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' })
    }
    res.json({ success: true, userInfo: user })
  } catch (err) {
    res.status(401).json({ success: false, message: '登录已过期，请重新登录' })
  }
})

export default app
