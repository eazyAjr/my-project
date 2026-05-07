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

-- 自动清理过期黑名单 token 的索引（可选，提升查询性能）
CREATE INDEX IF NOT EXISTS idx_token_blacklist_token ON token_blacklist(token);
