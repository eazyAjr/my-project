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

    // 创建 token 黑名单表
    await sql`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('Table "token_blacklist" created or already exists.')

    // 创建 books 表
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        isbn VARCHAR(50),
        category VARCHAR(50),
        price NUMERIC(10,2) DEFAULT 0,
        stock INTEGER DEFAULT 0,
        publish_date DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('Table "books" created or already exists.')

    // 插入初始图书数据
    const initialBooks = [
      { t: 'JavaScript高级程序设计', a: 'Nicholas C. Zakas', i: '978-7-115-27579-0', c: '编程技术', p: 99.00, s: 50, d: '2020-05-01', desc: '前端开发经典书籍' },
      { t: 'Vue.js设计与实现', a: '霍春阳', i: '978-7-115-58386-4', c: '编程技术', p: 89.90, s: 35, d: '2022-03-01', desc: '深入理解Vue.js框架原理' },
      { t: '深入理解计算机系统', a: 'Randal E. Bryant', i: '978-7-111-54493-7', c: '计算机科学', p: 139.00, s: 20, d: '2016-11-01', desc: '计算机科学经典教材' },
      { t: '算法导论', a: 'Thomas H. Cormen', i: '978-7-111-40701-0', c: '计算机科学', p: 128.00, s: 15, d: '2013-01-01', desc: '算法领域权威著作' },
      { t: '三体', a: '刘慈欣', i: '978-7-5366-9293-0', c: '科幻小说', p: 68.00, s: 100, d: '2008-01-01', desc: '中国科幻里程碑之作' },
      { t: '活着', a: '余华', i: '978-7-5063-6830-2', c: '文学小说', p: 29.00, s: 80, d: '2012-08-01', desc: '余华代表作' },
      { t: 'CSS权威指南', a: 'Eric A. Meyer', i: '978-7-508-69467-5', c: '编程技术', p: 108.00, s: 25, d: '2019-04-01', desc: 'CSS领域权威参考' },
      { t: 'Python编程：从入门到实践', a: 'Eric Matthes', i: '978-7-115-42802-8', c: '编程技术', p: 79.80, s: 60, d: '2018-01-01', desc: 'Python入门经典' },
      { t: '百年孤独', a: '加西亚·马尔克斯', i: '978-7-5442-4528-8', c: '文学小说', p: 39.50, s: 45, d: '2011-06-01', desc: '魔幻现实主义代表作' },
      { t: '数据结构与算法分析', a: 'Mark Allen Weiss', i: '978-7-111-52739-8', c: '计算机科学', p: 69.00, s: 30, d: '2015-12-01', desc: '数据结构经典教材' },
      { t: '银河帝国：基地', a: '艾萨克·阿西莫夫', i: '978-7-5399-4574-0', c: '科幻小说', p: 35.00, s: 55, d: '2012-10-01', desc: '科幻巨匠经典系列' },
      { t: 'React设计原理', a: '卡颂', i: '978-7-115-59016-9', c: '编程技术', p: 79.00, s: 40, d: '2022-09-01', desc: '深入React内核' },
      { t: '人类简史', a: '尤瓦尔·赫拉利', i: '978-7-5086-4633-2', c: '历史人文', p: 68.00, s: 70, d: '2014-11-01', desc: '全球畅销历史读物' },
      { t: '设计模式：可复用面向对象软件的基础', a: 'Erich Gamma', i: '978-7-111-07575-2', c: '编程技术', p: 59.00, s: 18, d: '2000-09-01', desc: 'GoF设计模式经典' },
      { t: '小王子', a: '安托万·德·圣-埃克苏佩里', i: '978-7-02-004234-7', c: '文学小说', p: 22.00, s: 120, d: '2003-08-01', desc: '世界经典童话' },
      { t: '枪炮、病菌与钢铁', a: '贾雷德·戴蒙德', i: '978-7-5327-6090-1', c: '历史人文', p: 55.00, s: 38, d: '2006-04-01', desc: '人类社会发展史' }
    ]

    for (const b of initialBooks) {
      await sql`
        INSERT INTO books (title, author, isbn, category, price, stock, publish_date, description)
        VALUES (${b.t}, ${b.a}, ${b.i}, ${b.c}, ${b.p}, ${b.s}, ${b.d}, ${b.desc})
        ON CONFLICT DO NOTHING
      `
    }
    console.log('Initial books inserted or already exist.')

    // 验证
    const rows = await sql`SELECT * FROM users`
    console.log('Current users:', rows)
    const bookCount = await sql`SELECT COUNT(*) as count FROM books`
    console.log('Current books count:', bookCount[0].count)
  } catch (err) {
    console.error('Init DB failed:', err.message)
    process.exit(1)
  }
}

init()
