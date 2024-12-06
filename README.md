# Luminate
branch: chinese中文版本

## 安装

`npm install`

启动服务器:
```
npm run dev
```

使用 OpenAI API:

1. 在项目根目录创建 `.env` 文件
2. 在 `.env` 文件中添加以下内容:
   ```
   VITE_OPENAI_API_KEY = "{YOUR_OPENAI_API_KEY}"
   ```
3. 将 `{YOUR_OPENAI_API_KEY}` 替换为您的 OpenAI API 密钥

## package.json 中的主要包和作用

- **@editorjs/editorjs**: 实现富文本编辑器功能
- **@mui/material**: Material UI 组件库，用于构建用户界面
- **axios**: 用于发送 HTTP 请求
- **d3**: 数据可视化库
- **openai**: OpenAI API 客户端
- **react**: 前端框架
- **zustand**: 状态管理库
- **vite**: 现代前端构建工具

## src 目录结构解释

```
src/
├── App.jsx                # 应用程序主组件
├── db/                    # 数据库相关
│   └── database-manager.jsx  # 数据库管理器
├── main.jsx              # 应用程序入口文件
├── main.scss             # 全局样式
├── store/                # 状态管理
│   ├── use-curr-store.jsx    # 当前状态管理
│   ├── use-dim-store.jsx     # 维度状态管理
│   ├── use-editor-store.jsx  # 编辑器状态管理
│   ├── use-response-store.jsx # 响应状态管理
│   └── use-selected-store.jsx # 选择状态管理
├── ui/                   # UI 组件
│   ├── app-bar/          # 顶部应用栏
│   ├── editor/           # 编辑器相关组件
│   │   ├── ai-block/     # AI 块组件
│   │   ├── ai-panel/     # AI 面板
│   │   └── text-editor/  # 文本编辑器
│   ├── hooks/            # 自定义 Hooks
│   ├── scatter-canvas-view/  # 散点图画布视图
│   ├── scatter-filter/   # 散点图过滤器
│   ├── visualization/    # 可视化组件
│   │   ├── axis/        # 坐标轴组件
│   │   ├── scatter-panel/  # 散点图面板
│   │   └── scatter-space/  # 散点图空间
│   └── welcome-modal/    # 欢迎模态框
└── util/                 # 工具函数
    ├── color-util.tsx    # 颜色工具
    ├── gpt-util.tsx      # GPT 相关工具
    ├── prompts.tsx       # 提示词管理
    └── space-generation-util.jsx  # 空间生成工具
```

## 主要功能模块

1. **编辑器模块**: 基于 EditorJS 的富文本编辑器，支持 AI 辅助写作
2. **可视化模块**: 使用 D3.js 实现的数据可视化功能
3. **AI 集成**: 通过 OpenAI API 提供智能写作建议
4. **状态管理**: 使用 Zustand 进行全局状态管理
5. **数据处理**: 包含数据过滤、转换和可视化处理功能

## 开发指南

本项目使用 Vite 作为构建工具，React 作为前端框架。开发时请遵循以下准则：

1. 组件开发遵循 React 函数式组件规范
2. 样式文件使用 SCSS 编写
3. 状态管理统一使用 Zustand
4. 代码提交前进行 ESLint 检查