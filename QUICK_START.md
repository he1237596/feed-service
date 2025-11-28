# 快速开始指南

## 🚀 快速启动

### 1. 环境准备

确保你的系统已安装：
- Node.js >= 16.0.0
- npm >= 8.0.0
- Docker (可选，用于容器化部署)

### 2. 安装依赖

```bash
# 克隆项目后进入目录
cd feed-service

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env
```

### 3. 配置环境变量

编辑 `.env` 文件，配置必要的环境变量：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_PATH=./data/feed-service.db

# 认证配置
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# 存储配置
STORAGE_PATH=./storage
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=.tgz,.tar.gz

# 管理员配置
ADMIN_EMAIL=admin@piral-feed-service.com
ADMIN_PASSWORD=admin123456
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
npm run migrate

# 填充种子数据
npm run seed
```

### 5. 启动服务

#### 开发模式
```bash
npm run dev
```

#### 生产模式
```bash
npm run build
npm start
```

### 6. 验证安装

访问以下端点验证服务是否正常运行：

- **健康检查**: http://localhost:3000/health
- **API 文档**: http://localhost:3000/api/feed

## 🐳 Docker 部署

### 使用 Docker Compose (推荐)

```bash
# 生产环境
docker compose up -d

# 开发环境
docker compose -f docker-compose.dev.yml up -d

# 包含额外服务 (Nginx, Redis, 监控)
docker compose --profile with-nginx --profile monitoring up -d

# 运行种子数据（创建管理员账户和示例包）
docker compose exec feed-service node seed.js
```

### 单独使用 Docker

```bash
# 构建镜像
docker build -t piral-feed-service .

# 运行容器
docker run -d \
  --name piral-feed-service \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/storage:/app/storage \
  -e JWT_SECRET=your-secret-key \
  piral-feed-service
```

## 📚 API 使用示例

### 1. 用户认证

```bash
# 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!","role":"user"}'

# 用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@piral-feed-service.com","password":"admin123456"}'
```

### 2. 包管理

```bash
# 获取包列表
curl http://localhost:3000/api/packages

# 获取包详情
curl http://localhost:3000/api/packages/hello-world-piral

# 创建新包
curl -X POST http://localhost:3000/api/packages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=my-piral-app" \
  -F "description=My first Piral app" \
  -F "isPublic=true" \
  -F "package=@my-piral-app.tgz"
```

### 3. 版本管理

```bash
# 获取包的版本列表
curl http://localhost:3000/api/versions/my-piral-app

# 下载特定版本
curl -O http://localhost:3000/api/versions/my-piral-app/1.0.0/download
```

### 4. Feed 服务

```bash
# 获取 Feed 信息 (Piral 兼容)
curl http://localhost:3000/api/feed/my-piral-app

# NPM 兼容的包信息
curl http://localhost:3000/api/feed/my-piral-app/npm
```

## 🔧 开发指南

### 项目结构

```
src/
├── index.ts                 # 应用程序入口
├── types/                   # TypeScript 类型定义
├── utils/                   # 工具函数
├── middleware/              # Express 中间件
├── database/               # 数据库相关
│   ├── Database.ts         # 数据库连接
│   ├── models/             # 数据模型
│   └── seed.ts            # 种子数据
└── routes/                 # API 路由
    ├── auth.ts            # 认证路由
    ├── packages.ts        # 包管理路由
    ├── versions.ts        # 版本管理路由
    └── feed.ts            # Feed 服务路由
```

### 开发命令

```bash
# 开发模式 (热重载)
npm run dev

# 构建项目
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 修复代码风格
npm run lint:fix

# 监听模式测试
npm run test:watch
```

### 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3000 | 服务端口 |
| NODE_ENV | development | 运行环境 |
| DB_PATH | ./data/feed-service.db | 数据库文件路径 |
| JWT_SECRET | - | JWT 密钥 (生产环境必须设置) |
| STORAGE_PATH | ./storage | 文件存储路径 |
| CORS_ORIGIN | * | CORS 允许的源 |
| LOG_LEVEL | info | 日志级别 |

## 🔒 安全配置

### 生产环境安全检查清单

- [ ] 设置强密码的 `JWT_SECRET`
- [ ] 配置合适的 `CORS_ORIGIN`
- [ ] 启用 HTTPS
- [ ] 配置防火墙规则
- [ ] 定期备份数据库
- [ ] 监控日志文件
- [ ] 更新依赖包

## 📊 监控和日志

### 查看日志

```bash
# 查看应用日志
tail -f logs/app.log

# Docker 日志
docker logs -f piral-feed-service

# Docker Compose 日志
docker-compose logs -f feed-service
```

### 健康检查

```bash
# 基本健康检查
curl http://localhost:3000/health

# 详细状态
curl http://localhost:3000/api/feed/health/status
```

## 🛠️ 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `DB_PATH` 路径是否存在
   - 确保目录有写权限

2. **文件上传失败**
   - 检查 `STORAGE_PATH` 路径
   - 确认文件大小限制

3. **认证失败**
   - 检查 `JWT_SECRET` 配置
   - 确认 token 未过期

4. **端口占用**
   - 修改 `PORT` 环境变量
   - 检查其他服务占用

### 调试模式

```bash
# 启用调试日志
export LOG_LEVEL=debug

# 启动开发服务器
npm run dev
```

## 📞 获取帮助

- 查看项目文档: `README.md`
- 提交 Issue: GitHub Issues
- 贡献代码: `CONTRIBUTING.md` (如果存在)

---

🎉 **恭喜！你已经成功启动了 Piral Feed Service！**