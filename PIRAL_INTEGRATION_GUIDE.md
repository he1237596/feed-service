# 🚀 Piral项目集成Feed Service指南

本指南将帮助你如何在本地Piral项目中集成和使用Feed Service。

## 📋 前置条件

确保你的Piral项目已经设置好，并且Feed Service正在运行。

## 🏃‍♂️ 第一步：启动Feed Service

### 1.1 启动后端服务
```bash
# 进入feed-service目录
cd feed-service

# 安装依赖（如果还没有安装）
npm install

# 复制环境配置文件
cp .env.example .env

# 启动后端服务
npm run dev
```

后端服务将在 `http://localhost:3000` 启动

### 1.2 启动前端管理界面
```bash
# 新开一个终端，进入web目录
cd feed-service/web

# 安装依赖（如果还没有安装）
npm install

# 启动前端开发服务器
npm run dev
```

前端管理界面将在 `http://localhost:3002` 启动

### 1.3 访问管理界面
- 打开浏览器访问：http://localhost:3002
- 使用管理员账户登录：
  - 邮箱：`admin@piral-feed-service.com`
  - 密码：`admin123456`

## 🔗 第二步：在Piral项目中配置Feed Service

### 2.1 在你的Piral项目中安装依赖
```bash
cd your-piral-project

# 如果使用npm
npm install piral-cli @pilet/pilet-api

# 如果使用yarn
yarn add piral-cli @pilet/pilet-api
```

### 2.2 配置Piral应用
在你的Piral应用的根目录创建或修改 `package.json` 中的Feed配置：

```json
{
  "name": "your-piral-app",
  "version": "1.0.0",
  "dependencies": {
    "piral": "^1.0.0"
  },
  "pilet": {
    "name": "your-piral-app",
    "version": "1.0.0",
    "feeds": [
      {
        "name": "local",
        "url": "http://localhost:3000/api/feed"
      },
      {
        "name": "official",
        "url": "https://feed.piral.cloud/api/v1/pilet"
      }
    ]
  }
}
```

### 2.3 在Piral应用中注册Feed
在你的Piral应用的 `src/index.tsx` 文件中：

```typescript
import { createInstance } from 'piral';

const app = createInstance({
  requestPilets() {
    return Promise.all([
      fetch('http://localhost:3000/api/feed')
        .then(res => res.json())
        .then(data => data.items || []),
    ]);
  },
});

app.render('#root');
```

## 📦 第三步：发布你的Pilets到Feed Service

### 3.1 开发你的Pilet
```bash
# 在你的pilet项目中
cd your-pilet

# 开发模式
npm start

# 或者使用调试模式连接到本地Feed Service
npm start --debug --feed=http://localhost:3000/api/feed
```

### 3.2 构建和发布Pilet

#### 方式一：使用Piral CLI发布
```bash
# 构建pilet
npm run build

# 发布到本地Feed Service（支持自动版本提取）
npx pilet publish --url=http://localhost:3000/api/packages/upload --fresh

# 或者通过调试模式直接连接Feed
npx pilet start --debug --feed=http://localhost:3000/api/feed/pilets
```

#### 方式二：使用Web界面上传
1. 打开 http://localhost:3002
2. 使用管理员账户登录：`admin@piral-feed-service.com` / `admin123456`
3. 点击"包管理"
4. 点击"上传新包"
5. 填写包信息并上传构建好的 .tgz 文件

### 3.3 通过API发布（自动化）
```bash
# 1. 登录获取token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@piral-feed-service.com",
    "password": "admin123456"
  }'

# 2. 使用token发布包（替换YOUR_JWT_TOKEN）
curl -X POST http://localhost:3000/api/packages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=my-awesome-pilet" \
  -F "description=My awesome pilet for local development" \
  -F "isPublic=true" \
  -F "package=@./dist/my-awesome-pilet.tgz"
```

## 🔧 第四步：在Piral应用中使用Pilets

### 4.1 验证Pilets是否可用
```bash
# 检查Feed Service中的pilets
curl http://localhost:3000/api/packages

# 检查特定包的详细信息
curl http://localhost:3000/api/packages/my-awesome-pilet
```

### 4.2 在开发环境中测试
```bash
# 在你的Piral应用中
npm start

# 浏览器会自动加载并显示所有可用的pilets
# 包括来自本地Feed Service的pilets
```

## 🎯 第五步：常用操作和工作流

### 5.1 日常开发工作流
```bash
# 1. 启动Feed Service（如果还没启动）
cd feed-service && npm run dev

# 2. 新开终端启动Feed Service前端
cd feed-service/web && npm run dev

# 3. 开发你的pilet
cd your-pilet && npm start

# 4. 发布新版本
npm run build && npx pilet publish --url=http://localhost:3000

# 5. 在Piral应用中测试
cd your-piral-app && npm start
```

### 5.2 管理包版本
```bash
# 查看包的版本历史
curl http://localhost:3000/api/packages/my-awesome-pilet/versions

# 设置特定版本为最新版本（需要管理员权限）
curl -X PATCH http://localhost:3000/api/packages/my-awesome-pilet/versions/1.1.0/latest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 删除某个版本
curl -X DELETE http://localhost:3000/api/packages/my-awesome-pilet/versions/1.0.0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5.3 团队协作
```bash
# 1. 为团队成员创建用户账户
# 访问 http://localhost:3002/users

# 2. 或者通过API创建用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@company.com",
    "password": "DevPassword123!",
    "role": "user"
  }'

# 3. 团队成员可以使用自己的凭证发布pilets
```

## 🔍 第六步：调试和故障排除

### 6.1 常见问题及解决方案

#### 问题1：Piral应用无法连接到Feed Service
```bash
# 检查Feed Service是否运行
curl http://localhost:3000/health

# 检查CORS配置
# 确保feed-service/.env中的CORS_ORIGIN包含你的Piral应用地址
CORS_ORIGIN=http://localhost:1234,http://localhost:3000
```

#### 问题2：Pilet发布失败
```bash
# 检查文件大小限制
# 在feed-service/.env中调整
MAX_FILE_SIZE=100MB

# 检查文件类型
ALLOWED_FILE_TYPES=.tgz,.tar.gz

# 查看详细错误日志
cd feed-service && npm run dev
# 观察终端输出
```

#### 问题3：认证问题
```bash
# 重置管理员密码
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@piral-feed-service.com",
    "newPassword": "NewPassword123!"
  }'
```

### 6.2 开发工具推荐

#### Feed Service管理界面功能
- **包管理**：上传、编辑、删除pilets
- **版本控制**：管理多个版本，设置最新版本
- **用户管理**：添加团队成员，分配权限
- **系统监控**：查看下载统计，系统状态

#### 命令行工具
```bash
# Piral CLI命令
npx pilet --help

# 常用命令
npx pilet new my-pilet
npx pilet upgrade
npx pilet validate
npx pilet publish --help
```

## 🚀 进阶用法

### 7.1 自动化CI/CD集成
```yaml
# .github/workflows/publish-pilet.yml
name: Publish Pilet
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build pilet
        run: npm run build
      
      - name: Publish to Feed Service
        run: |
          npx pilet publish \
            --url=${{ secrets.FEED_SERVICE_URL }} \
            --token=${{ secrets.FEED_SERVICE_TOKEN }} \
            --fresh
```

### 7.2 Docker部署Feed Service
```bash
# 使用Docker运行Feed Service
docker-compose up -d

# 或者在现有Docker网络中部署
docker run -d \
  --name piral-feed-service \
  -p 3000:3000 \
  --network your-app-network \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/storage:/app/storage \
  -e JWT_SECRET=your-production-secret \
  piral-feed-service
```

### 7.3 生产环境配置
```bash
# 生产环境环境变量
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-strong-secret-key
CORS_ORIGIN=https://your-piral-app.com
DB_PATH=/app/data/feed-service.db
STORAGE_PATH=/app/storage
LOG_LEVEL=warn
```

## 📚 更多资源

- [Piral官方文档](https://docs.piral.io)
- [Pilet API参考](https://docs.piral.io/reference/pilet-api)
- [Feed Service API文档](http://localhost:3002) （服务启动后访问）
- [Feed Service源代码](https://github.com/your-org/piral-feed-service)

## 🤝 获取帮助

如果你在集成过程中遇到问题：

1. 查看Feed Service管理界面的系统信息页面
2. 检查浏览器控制台的网络请求
3. 查看Feed Service的终端日志输出
4. 提交Issue到项目仓库

---

🎉 **恭喜！现在你可以在本地Piral项目中完整使用Feed Service了！**

你现在已经拥有了一个功能完整的微前端包管理和分发系统，支持团队协作、版本控制、权限管理等企业级功能。