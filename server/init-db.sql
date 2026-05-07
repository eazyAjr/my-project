-- 初始化用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认管理员账号（密码为 admin，建议后续用 bcrypt 加密）
INSERT INTO users (username, password, nickname, role)
VALUES ('admin', 'admin', '管理员', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Token 黑名单表（用于服务端登出）
CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_token ON token_blacklist(token);

-- 图书表
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
);

-- 插入初始图书数据
INSERT INTO books (title, author, isbn, category, price, stock, publish_date, description) VALUES
('JavaScript高级程序设计', 'Nicholas C. Zakas', '978-7-115-27579-0', '编程技术', 99.00, 50, '2020-05-01', '前端开发经典书籍'),
('Vue.js设计与实现', '霍春阳', '978-7-115-58386-4', '编程技术', 89.90, 35, '2022-03-01', '深入理解Vue.js框架原理'),
('深入理解计算机系统', 'Randal E. Bryant', '978-7-111-54493-7', '计算机科学', 139.00, 20, '2016-11-01', '计算机科学经典教材'),
('算法导论', 'Thomas H. Cormen', '978-7-111-40701-0', '计算机科学', 128.00, 15, '2013-01-01', '算法领域权威著作'),
('三体', '刘慈欣', '978-7-5366-9293-0', '科幻小说', 68.00, 100, '2008-01-01', '中国科幻里程碑之作'),
('活着', '余华', '978-7-5063-6830-2', '文学小说', 29.00, 80, '2012-08-01', '余华代表作'),
('CSS权威指南', 'Eric A. Meyer', '978-7-508-69467-5', '编程技术', 108.00, 25, '2019-04-01', 'CSS领域权威参考'),
('Python编程：从入门到实践', 'Eric Matthes', '978-7-115-42802-8', '编程技术', 79.80, 60, '2018-01-01', 'Python入门经典'),
('百年孤独', '加西亚·马尔克斯', '978-7-5442-4528-8', '文学小说', 39.50, 45, '2011-06-01', '魔幻现实主义代表作'),
('数据结构与算法分析', 'Mark Allen Weiss', '978-7-111-52739-8', '计算机科学', 69.00, 30, '2015-12-01', '数据结构经典教材'),
('银河帝国：基地', '艾萨克·阿西莫夫', '978-7-5399-4574-0', '科幻小说', 35.00, 55, '2012-10-01', '科幻巨匠经典系列'),
('React设计原理', '卡颂', '978-7-115-59016-9', '编程技术', 79.00, 40, '2022-09-01', '深入React内核'),
('人类简史', '尤瓦尔·赫拉利', '978-7-5086-4633-2', '历史人文', 68.00, 70, '2014-11-01', '全球畅销历史读物'),
('设计模式：可复用面向对象软件的基础', 'Erich Gamma', '978-7-111-07575-2', '编程技术', 59.00, 18, '2000-09-01', 'GoF设计模式经典'),
('小王子', '安托万·德·圣-埃克苏佩里', '978-7-02-004234-7', '文学小说', 22.00, 120, '2003-08-01', '世界经典童话'),
('枪炮、病菌与钢铁', '贾雷德·戴蒙德', '978-7-5327-6090-1', '历史人文', 55.00, 38, '2006-04-01', '人类社会发展史')
ON CONFLICT DO NOTHING;
