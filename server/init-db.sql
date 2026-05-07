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
