# Piral Feed Service

一个完整的 Piral 微前端种子管理系统，提供包管理、版本控制、发布和下载功能。

## 功能特性

- 📦 **包管理**: 完整的微前端包生命周期管理
- 🔄 **版本控制**: 语义化版本支持和版本历史管理
- 🔐 **认证授权**: JWT 基础的安全认证机制
- 📊 **API 接口**: RESTful API 设计，支持 CRUD 操作
- 💾 **数据持久化**: SQLite 数据库存储
- 🐳 **Docker 支持**: 容器化部署
- 📝 **完整文档**: 详细的 API 文档和使用指南

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd feed-service

# 安装后端依赖
npm install

# 安装前端依赖
cd web
npm install
cd ..

# 复制环境配置
cp .env.example .env

# 编辑配置文件
nano .env
```

### 开发

```bash
# 启动后端服务（开发模式）
npm run dev

# 启动前端开发服务器（新开终端）
cd web
npm run dev

# 或者构建前端并启动后端
npm run build:web
npm run dev
```

### 生产部署

```bash
# 构建前端
cd web
npm run build
cd ..

# 启动后端（前端已构建到public目录）
npm start
```

### 数据库初始化

#### 本地开发
```bash
# 运行数据库迁移
npm run migrate

# 填充种子数据
npm run seed
```

#### Docker 环境
```bash
# 启动容器
docker compose up -d

# 运行种子数据（自动创建管理员账户和示例包）
docker compose exec feed-service node seed.js
```

管理员账户：
- 邮箱：`admin@piral-feed-service.com`
- 密码：`admin123456`

## API 文档

### 认证接口

#### POST /api/auth/login
用户登录

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

### 包管理接口

#### GET /api/packages
获取包列表

#### GET /api/packages/:name
获取特定包信息

#### POST /api/packages
创建新包

#### PUT /api/packages/:name
更新包信息

#### DELETE /api/packages/:name
删除包

### 版本管理接口

#### GET /api/packages/:name/versions
获取包的版本列表

#### GET /api/packages/:name/versions/:version
获取特定版本信息

#### POST /api/packages/:name/versions
发布新版本

#### DELETE /api/packages/:name/versions/:version
删除特定版本

### Feed 接口

#### GET /api/feed
获取 Feed 服务信息

#### GET /api/feed/pilets
获取 Piral CLI 兼容的 Feed 信息

#### GET /api/feed/:name
获取特定包的 Feed 信息

#### GET /api/feed/:name/npm
获取 NPM 兼容的包信息

## Docker 部署

```bash
# 构建镜像
docker build -t piral-feed-service .

# 运行容器
docker run -p 3000:3000 -v $(pwd)/data:/app/data piral-feed-service
```

## 配置说明

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| PORT | 3000 | 服务端口 |
| NODE_ENV | development | 运行环境 |
| DB_PATH | ./data/feed-service.db | 数据库文件路径 |
| JWT_SECRET | - | JWT 密钥 |
| STORAGE_PATH | ./storage | 文件存储路径 |

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。