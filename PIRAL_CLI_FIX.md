# 🚨 Piral CLI 发布问题修复说明

## 问题描述
当使用 `npx pilet publish --url=http://localhost:3000` 发布pilet时，出现以下错误：
```
Using feed service "http://localhost:3000".
⚠ [0066] Failed to upload: Not Found (404). Received: "{\"error\":\"Route not found\"}"
⚠ [0062] Could not upload "my-pilet-1.0.0.tgz" to feed service.
✖ [0064] Failed to upload some pilet(s)!
```

## ✅ 解决方案

### 方案一：使用修复后的上传端点
```bash
# 构建pilet
npm run build

# 使用新的专用上传端点
npx pilet publish --url=http://localhost:3000/api/packages/upload --fresh
```

### 方案二：使用调试模式开发
```bash
# 直接连接Feed服务进行开发
npx pilet start --debug --feed=http://localhost:3000/api/feed/pilets
```

### 方案三：使用Web界面上传
1. 启动服务并初始化：
   ```bash
   docker compose up -d
   docker compose exec feed-service node seed.js
   ```
2. 访问管理界面：http://localhost:3002
3. 登录：`admin@piral-feed-service.com` / `admin123456`
4. 点击"包管理" → "上传新包"
5. 填写包信息并上传.tgz文件

## 🔧 后端修复内容

### 1. 新增Piral CLI兼容的上传端点
- **端点**: `POST /api/packages/upload`
- **认证**: 无需认证（CLI友好）
- **自动处理**: 从文件名提取包名，从package.json提取版本
- **权限**: 自动设置为公开包，使用系统用户身份

### 2. 新增Piral兼容的Feed端点
- **端点**: `GET /api/feed/pilets`
- **格式**: Piral CLI期望的Feed格式
- **返回**: 所有公开包的列表，包含版本信息和下载链接

### 3. Web界面修复
- ✅ 修复了表单验证问题
- ✅ 添加了完整的上传表单
- ✅ 改进了错误处理和用户提示

## 📝 配置更新

### 在Piral应用中配置Feed
```json
{
  "pilet": {
    "feeds": [
      {
        "name": "local",
        "url": "http://localhost:3000/api/feed/pilets"
      }
    ]
  }
}
```

### 在Piral应用中注册Feed
```typescript
import { createInstance } from 'piral';

const app = createInstance({
  requestPilets() {
    return Promise.all([
      fetch('http://localhost:3000/api/feed/pilets')
        .then(res => res.json())
        .then(data => data.items || []),
    ]);
  },
});

app.render('#root');
```

## 🎯 推荐工作流

### 日常开发
```bash
# 1. 启动Feed Service
cd feed-service && npm run dev

# 2. 启动Feed管理界面（新终端）
cd feed-service/web && npm run dev

# 3. 开发pilet（新终端）
cd your-pilet && npx pilet start --debug --feed=http://localhost:3000/api/feed/pilets

# 4. 发布新版本
npm run build && npx pilet publish --url=http://localhost:3000/api/packages/upload --fresh

# 5. 在Piral应用中测试
cd your-piral-app && npm start
```

### 团队协作
- 开发者可以使用CLI快速上传
- 管理员可以通过Web界面管理包和用户
- 支持版本控制和权限管理

## 🔍 验证修复效果

### 测试上传端点
```bash
# 测试上传端点是否存在
curl -I http://localhost:3000/api/packages/upload

# 测试Feed端点
curl http://localhost:3000/api/feed/pilets
```

### 查看包列表
```bash
# 查看所有包
curl http://localhost:3000/api/packages

# 查看特定包
curl http://localhost:3000/api/packages/my-pilet-name
```

## 🔧 最新修复：Multer字段兼容性问题

### 新的问题
```
MulterError: Unexpected field<br> at wrappedFileFilter ...
```

### 解决方案
后端现在支持Piral CLI使用的多种文件字段名：
- ✅ `file` - Piral CLI默认字段名
- ✅ `package` - 备用字段名
- ✅ 自动回退机制

### 更智能的上传端点
新的 `/api/packages/upload` 端点具有以下特性：
1. **多字段名支持**：自动检测Piral CLI使用的字段名
2. **自动回退**：如果第一个字段名失败，尝试备用字段名
3. **错误处理**：完善的文件清理和错误恢复机制

---

🎉 **现在你可以成功使用Piral CLI发布pilets到本地Feed Service了！**

修复要点：
1. ✅ 添加了CLI友好的上传端点（无需认证）
2. ✅ 提供了Piral兼容的Feed格式
3. ✅ 修复了Web界面的上传问题
4. ✅ 解决了Multer字段名兼容性问题
5. ✅ 添加了自动字段名检测和回退机制
6. ✅ 完善了文档和使用说明