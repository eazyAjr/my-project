import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as XLSX from 'xlsx'
import dotenv from 'dotenv'
import { sql } from './db.js'
import { setupOrderRoutes } from './order-routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
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

// 需要登录的中间件
async function authMiddleware(req, res, next) {
  const result = await verifyToken(req.headers.authorization)
  if (!result.valid) {
    return res.status(401).json({ success: false, message: result.message })
  }
  req.user = result.decoded
  next()
}

// ========== 健康检查 ==========
app.get('/api/health', async (req, res) => {
  try {
    const result = await sql`SELECT NOW()`
    res.json({ status: 'ok', dbTime: result[0].now })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// ========== 登录接口 ==========
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '账号和密码不能为空' })
  }
  try {
    const users = await sql`SELECT * FROM users WHERE username = ${username}`
    const user = users[0]
    if (!user) return res.status(401).json({ success: false, message: '账号或密码错误' })

    let valid = false
    if (user.password.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password)
    } else {
      valid = user.password === password
    }
    if (!valid) return res.status(401).json({ success: false, message: '账号或密码错误' })

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({ success: true, token, userInfo: { username: user.username, nickname: user.nickname, role: user.role } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 获取当前用户信息 ==========
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const users = await sql`SELECT username, nickname, role FROM users WHERE id = ${req.user.userId}`
    const user = users[0]
    if (!user) return res.status(401).json({ success: false, message: '用户不存在' })
    res.json({ success: true, userInfo: user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 退出登录 ==========
app.post('/api/logout', async (req, res) => {
  const result = await verifyToken(req.headers.authorization)
  if (!result.valid) return res.json({ success: true })
  try {
    await sql`INSERT INTO token_blacklist (token, expires_at) VALUES (${result.token}, to_timestamp(${result.decoded.exp})) ON CONFLICT (token) DO NOTHING`
    res.json({ success: true, message: '退出登录成功' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 图书列表 ==========
app.get('/api/books', authMiddleware, async (req, res) => {
  const { title, author, category, page = 1, size = 10 } = req.query
  try {
    const conditions = []
    if (title) conditions.push(sql`title ILIKE ${'%' + title + '%'}`)
    if (author) conditions.push(sql`author ILIKE ${'%' + author + '%'}`)
    if (category) conditions.push(sql`category = ${category}`)

    let booksQuery, countQuery
    if (conditions.length > 0) {
      const where = sql.join(conditions, sql` AND `)
      booksQuery = sql`SELECT * FROM books WHERE ${where} ORDER BY id DESC LIMIT ${Number(size)} OFFSET ${(Number(page) - 1) * Number(size)}`
      countQuery = sql`SELECT COUNT(*) as total FROM books WHERE ${where}`
    } else {
      booksQuery = sql`SELECT * FROM books ORDER BY id DESC LIMIT ${Number(size)} OFFSET ${(Number(page) - 1) * Number(size)}`
      countQuery = sql`SELECT COUNT(*) as total FROM books`
    }

    const books = await booksQuery
    const countResult = await countQuery
    const total = Number(countResult[0].total)

    res.json({
      success: true,
      data: books.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        category: b.category,
        price: Number(b.price),
        stock: b.stock,
        publishDate: b.publish_date,
        description: b.description
      })),
      total,
      page: Number(page),
      size: Number(size)
    })
  } catch (err) {
    console.error('Books list error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 新增图书 ==========
app.post('/api/books', authMiddleware, async (req, res) => {
  const { title, author, isbn, category, price, stock, publishDate, description } = req.body
  if (!title || !author || !category) {
    return res.status(400).json({ success: false, message: '书名、作者和分类为必填项' })
  }
  try {
    const result = await sql`
      INSERT INTO books (title, author, isbn, category, price, stock, publish_date, description)
      VALUES (${title}, ${author}, ${isbn || ''}, ${category}, ${price || 0}, ${stock || 0}, ${publishDate || null}, ${description || ''})
      RETURNING *
    `
    const b = result[0]
    res.json({
      success: true,
      data: { id: b.id, title: b.title, author: b.author, isbn: b.isbn, category: b.category, price: Number(b.price), stock: b.stock, publishDate: b.publish_date, description: b.description }
    })
  } catch (err) {
    console.error('Add book error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 编辑图书 ==========
app.put('/api/books/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  const { title, author, isbn, category, price, stock, publishDate, description } = req.body
  if (!title || !author || !category) {
    return res.status(400).json({ success: false, message: '书名、作者和分类为必填项' })
  }
  try {
    const result = await sql`
      UPDATE books SET
        title = ${title},
        author = ${author},
        isbn = ${isbn || ''},
        category = ${category},
        price = ${price || 0},
        stock = ${stock || 0},
        publish_date = ${publishDate || null},
        description = ${description || ''}
      WHERE id = ${id}
      RETURNING *
    `
    if (result.length === 0) return res.status(404).json({ success: false, message: '图书不存在' })
    const b = result[0]
    res.json({
      success: true,
      data: { id: b.id, title: b.title, author: b.author, isbn: b.isbn, category: b.category, price: Number(b.price), stock: b.stock, publishDate: b.publish_date, description: b.description }
    })
  } catch (err) {
    console.error('Update book error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 删除图书 ==========
app.delete('/api/books/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  try {
    const result = await sql`DELETE FROM books WHERE id = ${id} RETURNING id`
    if (result.length === 0) return res.status(404).json({ success: false, message: '图书不存在' })
    res.json({ success: true, message: '删除成功' })
  } catch (err) {
    console.error('Delete book error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 导出 Excel ==========
app.get('/api/books/export', authMiddleware, async (req, res) => {
  const { title, author, category } = req.query
  try {
    const conditions = []
    if (title) conditions.push(sql`title ILIKE ${'%' + title + '%'}`)
    if (author) conditions.push(sql`author ILIKE ${'%' + author + '%'}`)
    if (category) conditions.push(sql`category = ${category}`)

    let booksQuery
    if (conditions.length > 0) {
      const where = sql.join(conditions, sql` AND `)
      booksQuery = sql`SELECT * FROM books WHERE ${where} ORDER BY id`
    } else {
      booksQuery = sql`SELECT * FROM books ORDER BY id`
    }

    const books = await booksQuery
    const rows = books.map(b => ({
      '书名': b.title,
      '作者': b.author,
      'ISBN': b.isbn,
      '分类': b.category,
      '价格(元)': Number(b.price),
      '库存': b.stock,
      '出版日期': b.publish_date || '',
      '描述': b.description || ''
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '图书列表')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="books.xlsx"; filename*=UTF-8''${encodeURIComponent('图书列表.xlsx')}`)
    res.send(buf)
  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

// ========== 批量导入 ==========
app.post('/api/books/batch', authMiddleware, async (req, res) => {
  const { list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ success: false, message: '导入数据不能为空' })
  }
  try {
    let inserted = 0
    for (const item of list) {
      if (!item.title) continue
      await sql`
        INSERT INTO books (title, author, isbn, category, price, stock, publish_date, description)
        VALUES (${item.title}, ${item.author || ''}, ${item.isbn || ''}, ${item.category || ''}, ${Number(item.price) || 0}, ${Number(item.stock) || 0}, ${item.publishDate || item.publish_date || null}, ${item.description || ''})
      `
      inserted++
    }
    res.json({ success: true, message: `成功导入 ${inserted} 条数据`, count: inserted })
  } catch (err) {
    console.error('Batch import error:', err)
    res.status(500).json({ success: false, message: err.message || '服务器内部错误' })
  }
})

setupOrderRoutes(app, sql, authMiddleware)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
