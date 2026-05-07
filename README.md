# 图书管理系统 - 项目文档

## 一、项目概述

本项目是一个基于 **Vue 3 + Express + Neon (PostgreSQL)** 的全栈图书管理系统，支持 JWT 登录认证、图书的增删改查、服务端分页搜索、Excel 导入导出等功能。

支持两种运行模式：
- **本地开发**：Vite 前端 + Express 后端（端口 3001）
- **Vercel 部署**：前端静态站点 + Serverless Functions

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| UI 组件库 | Element Plus |
| HTTP 请求 | Axios |
| Excel 处理 | xlsx |
| 后端框架 | Express 5 |
| 数据库 | Neon (PostgreSQL Serverless) |
| 数据库驱动 | @neondatabase/serverless |
| 认证 | JWT + bcryptjs |
| 部署 | Vercel |

---

## 三、项目目录结构

```
my-project/
├── .env                          # 环境变量（数据库连接、JWT 密钥）
├── .env.example                  # 环境变量示例
├── index.html                    # 前端入口 HTML
├── package.json                  # 依赖与脚本
├── vite.config.js                # Vite 配置（含 /api 代理）
├── vercel.json                   # Vercel 路由重写配置
│
├── api/                          # Vercel Serverless API 入口
│   ├── index.js                  # 无服务器函数主入口
│   └── _utils/
│       └── db.js                 # Neon 数据库连接（简化版，无 dotenv）
│
├── server/                       # 本地开发服务端
│   ├── index.js                  # Express 本地服务器（端口 3001）
│   ├── db.js                     # Neon 数据库连接（含 dotenv + cross-fetch）
│   ├── init-db.js                # Node.js 数据库初始化脚本
│   └── init-db.sql               # SQL 初始化脚本
│
└── src/                          # 前端 Vue 3 源码
    ├── main.js                   # 应用入口
    ├── App.vue                   # 根组件
    ├── api/
    │   └── request.js            # Axios 封装（Token 注入、401 处理）
    ├── router/
    │   └── index.js              # 路由配置 + 导航守卫
    ├── stores/
    │   ├── user.js               # 用户状态管理（登录/登出/用户信息）
    │   └── book.js               # 图书状态管理（CRUD + 导入导出）
    ├── utils/
    │   ├── auth.js               # localStorage Token/用户操作
    │   └── excel.js              # Excel 导入导出工具函数
    ├── views/
    │   ├── Login.vue             # 登录页面
    │   ├── Layout.vue            # 后台布局（侧边栏 + 头部）
    │   └── BookManage.vue        # 图书管理主页面
    ├── mock/                     # 本地模拟数据（已废弃，保留作参考）
    └── assets/styles/
        └── global.scss           # 全局样式
```

---

## 四、数据库设计

### 4.1 数据库类型

PostgreSQL (Neon Serverless)

### 4.2 数据表

#### users - 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键，自增 |
| username | VARCHAR(50) UNIQUE | 用户名 |
| password | VARCHAR(255) | 密码（支持明文或 bcrypt 加密） |
| nickname | VARCHAR(50) | 昵称 |
| role | VARCHAR(20) | 角色，默认 admin |
| created_at | TIMESTAMP | 创建时间 |

**默认账号**：`admin` / `admin`

#### token_blacklist - Token 黑名单表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键 |
| token | TEXT UNIQUE | JWT Token |
| expires_at | TIMESTAMP | Token 过期时间 |
| created_at | TIMESTAMP | 加入黑名单时间 |

用于服务端登出，已登出的 Token 无法再访问受保护接口。

#### books - 图书表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 主键，自增 |
| title | VARCHAR(255) | 书名（必填） |
| author | VARCHAR(255) | 作者（必填） |
| isbn | VARCHAR(50) | ISBN |
| category | VARCHAR(50) | 分类 |
| price | NUMERIC(10,2) | 价格 |
| stock | INTEGER | 库存 |
| publish_date | DATE | 出版日期 |
| description | TEXT | 描述 |
| created_at | TIMESTAMP | 创建时间 |

**初始数据**：16 本图书，涵盖编程技术、计算机科学、科幻小说、文学小说、历史人文。

### 4.3 初始化方式

**方式一：SQL 脚本**

在 Neon 控制台 SQL Editor 中执行 `server/init-db.sql` 的全部内容。

**方式二：Node 脚本**

```bash
node server/init-db.js
```

### 4.4 常用查询 SQL

```sql
-- 查询所有图书
SELECT * FROM books;

-- 按书名模糊查询
SELECT * FROM books WHERE title ILIKE '%三体%';

-- 按分类查询
SELECT * FROM books WHERE category = '编程技术';

-- 查询图书总数
SELECT COUNT(*) as total FROM books;

-- 查询所有用户
SELECT * FROM users;
```

---

## 五、后端 API 文档

### 5.1 基础信息

- **本地地址**：`http://localhost:3001`
- **基础路径**：`/api`
- **认证方式**：Bearer Token（`Authorization: Bearer <token>`）

### 5.2 接口列表

#### 健康检查

```
GET /api/health
```

无需认证，返回数据库当前时间。

**响应**：
```json
{ "status": "ok", "dbTime": "2026-05-07T06:36:19.823Z" }
```

---

#### 登录

```
POST /api/login
```

**请求体**：
```json
{
  "username": "admin",
  "password": "admin"
}
```

**响应**：
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userInfo": {
    "username": "admin",
    "nickname": "管理员",
    "role": "admin"
  }
}
```

---

#### 获取当前用户信息

```
GET /api/me
```

需要认证。

**响应**：
```json
{
  "success": true,
  "userInfo": {
    "username": "admin",
    "nickname": "管理员",
    "role": "admin"
  }
}
```

---

#### 退出登录

```
POST /api/logout
```

需要携带 Token，服务端将 Token 加入黑名单。

**响应**：
```json
{ "success": true, "message": "退出登录成功" }
```

---

#### 图书列表（分页 + 搜索）

```
GET /api/books?page=1&size=10&title=&author=&category=
```

需要认证。支持 `title`（书名模糊）、`author`（作者模糊）、`category`（精确分类）筛选。

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "JavaScript高级程序设计",
      "author": "Nicholas C. Zakas",
      "isbn": "978-7-115-27579-0",
      "category": "编程技术",
      "price": 99.00,
      "stock": 50,
      "publishDate": "2020-05-01",
      "description": "前端开发经典书籍"
    }
  ],
  "total": 16,
  "page": 1,
  "size": 10
}
```

---

#### 新增图书

```
POST /api/books
```

需要认证。`title`、`author`、`category` 为必填项。

**请求体**：
```json
{
  "title": "新书",
  "author": "作者",
  "isbn": "123",
  "category": "编程技术",
  "price": 50,
  "stock": 10,
  "publishDate": "2024-01-01",
  "description": "描述"
}
```

---

#### 编辑图书

```
PUT /api/books/:id
```

需要认证。

**请求体**：同新增图书。

---

#### 删除图书

```
DELETE /api/books/:id
```

需要认证。

**响应**：
```json
{ "success": true, "message": "删除成功" }
```

---

#### 导出 Excel

```
GET /api/books/export?title=&author=&category=
```

需要认证。支持筛选条件，返回 `.xlsx` 文件流。

---

#### 批量导入图书

```
POST /api/books/batch
```

需要认证。前端解析 Excel 后，将 JSON 数组传入后端批量插入。

**请求体**：
```json
{
  "list": [
    {
      "title": "书名",
      "author": "作者",
      "isbn": "",
      "category": "",
      "price": 0,
      "stock": 0,
      "publishDate": "",
      "description": ""
    }
  ]
}
```

**响应**：
```json
{ "success": true, "message": "成功导入 5 条数据", "count": 5 }
```

---

### 5.3 认证中间件说明

所有 `/api/books/*`、`/api/me`、`/api/books/export`、`/api/books/batch` 接口需要认证。请求头必须携带：

```
Authorization: Bearer <jwt_token>
```

如果 Token 已过期或在黑名单中，返回 401：
```json
{ "success": false, "message": "登录已过期，请重新登录" }
```

---

### 5.4 后端文件说明

| 文件 | 说明 |
|------|------|
| `server/index.js` | 本地 Express 服务器（端口 3001），含 dotenv 加载 |
| `api/index.js` | Vercel Serverless 入口，逻辑与 server/index.js 一致 |
| `server/db.js` | Neon 连接（含 dotenv + cross-fetch polyfill，兼容 Node 16） |
| `api/_utils/db.js` | Neon 连接简化版（无 dotenv，Vercel 直接注入环境变量） |

---

## 六、前端架构

### 6.1 路由结构

| 路径 | 组件 | 认证 | 说明 |
|------|------|------|------|
| `/login` | `Login.vue` | 否 | 登录页 |
| `/` | `Layout.vue` | 是 | 后台布局，重定向到 `/book` |
| `/book` | `BookManage.vue` | 是 | 图书管理 |

**导航守卫**：
- 未登录访问需要认证的页面 → 跳转 `/login`（带 `redirect` 参数）
- 已登录访问 `/login` → 跳转首页
- 自动设置页面标题

### 6.2 状态管理（Pinia）

#### useUserStore - 用户状态

| 属性/方法 | 说明 |
|-----------|------|
| `token` | 当前 JWT Token（响应式） |
| `userInfo` | 当前用户信息（响应式） |
| `login(username, password)` | 登录，成功后持久化到 localStorage |
| `fetchUserInfo()` | 拉取最新用户信息 |
| `logout()` | 调用后端登出接口 + 清除本地状态 |
| `isLoggedIn()` | 判断是否已登录 |

#### useBookStore - 图书状态

| 属性/方法 | 说明 |
|-----------|------|
| `books` | 当前页图书列表 |
| `total` | 图书总数 |
| `getBooks(params)` | 获取分页列表（含搜索条件） |
| `addBook(book)` | 新增图书 |
| `updateBook(id, data)` | 编辑图书 |
| `deleteBook(id)` | 删除图书 |
| `exportBooks(params)` | 下载 Excel（使用 axios blob 模式） |
| `importBooks(list)` | 批量导入（传入解析后的 JSON 数组） |

### 6.3 工具函数

#### auth.js - 认证工具

| 函数 | 说明 |
|------|------|
| `getToken()` / `setToken()` / `removeToken()` | Token 的 localStorage 操作 |
| `getUser()` / `setUser()` / `removeUser()` | 用户信息的 localStorage 操作 |
| `clearAuth()` | 一键清除认证信息 |

#### excel.js - Excel 工具

| 函数 | 说明 |
|------|------|
| `exportToExcel(data, columns, fileName)` | 前端本地导出 Excel（开发调试用） |
| `importFromExcel(file, columns)` | 解析上传的 Excel 为 JSON 数组 |

> 注意：生产环境的导出已改为后端生成文件流，前端只负责触发下载。

### 6.4 Axios 封装（request.js）

- **baseURL**：`/api`
- **请求拦截器**：自动附加 `Authorization: Bearer <token>`
- **响应拦截器**：
  - 直接返回 `response.data`
  - 401 时清除认证并强制跳转登录页
  - 其他错误弹出 ElMessage 提示

### 6.5 页面组件

#### Login.vue

- Element Plus 表单：用户名、密码
- 表单校验：必填
- 登录成功后跳转原目标页或首页

#### Layout.vue

- 顶部：系统标题 + 当前用户昵称 + 退出登录按钮
- 左侧：Element Plus 菜单（图书管理）
- 主区域：`<router-view />`
- 退出登录调用 `userStore.logout()`，成功后跳转 `/login`

#### BookManage.vue

- **搜索栏**：书名（模糊）、作者（模糊）、分类（下拉选择）
- **操作按钮**：新增图书、导出 Excel、导入 Excel
- **表格**：序号、书名、作者、ISBN、分类、价格、库存、出版日期、操作（编辑/删除）
- **分页**：服务端分页，`total, sizes, prev, pager, next, jumper`
- **新增/编辑弹窗**：表单校验（书名、作者、分类必填）
- **导入**：选择 Excel 文件 → 前端解析 → 调用批量导入接口 → 刷新列表

---

## 七、部署说明

### 7.1 Vercel 部署

1. 将代码推送到 GitHub/GitLab
2. 在 Vercel 导入项目
3. 在 Vercel 项目 Settings → Environment Variables 中添加：
   - `DATABASE_URL`：Neon 数据库连接字符串
   - `JWT_SECRET`：任意随机字符串
4. 重新部署

Vercel 会自动识别 `vercel.json` 中的路由重写规则，将 `/api/*` 请求转发到 `api/index.js` Serverless Function。

### 7.2 本地开发

**环境变量**（`.env`）：

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=your-random-secret-key
PORT=3001
```

**启动步骤**（需要两个终端）：

```bash
# 终端 1：启动后端
cd d:/project/test/my-project
npm run server

# 终端 2：启动前端
cd d:/project/test/my-project
npm run dev
```

- 前端地址：`http://localhost:5173`
- 后端地址：`http://localhost:3001`
- Vite 开发代理：`/api` → `localhost:3001`

---

## 八、开发脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端开发服务器 |
| `npm run build` | 构建前端生产包 |
| `npm run preview` | 预览生产构建 |
| `npm run server` | 启动后端 Express 服务器 |

---

## 九、环境要求

- **Node.js**：>= 18（推荐 20+）
- **数据库**：PostgreSQL（通过 Neon 提供）
- **浏览器**：现代浏览器（Chrome、Edge、Firefox、Safari）

---

## 十、功能清单

- [x] JWT 登录认证
- [x] Token 黑名单登出（服务端失效）
- [x] 图书列表（服务端分页 + 搜索筛选）
- [x] 新增/编辑/删除图书
- [x] 导出 Excel（后端生成，支持筛选条件）
- [x] 导入 Excel（前端解析 + 后端批量插入）
- [x] 路由守卫（未登录拦截）
- [x] Vercel Serverless 部署支持
- [x] 本地开发双模式支持
