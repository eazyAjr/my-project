import { sql } from './db.js'

async function init() {
  try {
    // 创建 users 表
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nickname VARCHAR(50),
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('Table "users" created or already exists.')

    // 插入默认管理员
    await sql`
      INSERT INTO users (username, password, nickname, role)
      VALUES ('admin', 'admin', '管理员', 'admin')
      ON CONFLICT (username) DO NOTHING
    `
    console.log('Default admin user inserted or already exists.')

    // 验证
    const rows = await sql`SELECT * FROM users`
    console.log('Current users:', rows)
  } catch (err) {
    console.error('Init DB failed:', err.message)
    process.exit(1)
  }
}

init()
