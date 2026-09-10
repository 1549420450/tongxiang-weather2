# 桐乡天气

## GitHub Pages 与 15 分钟抓取

仓库默认分支使用 `main`，Settings → Pages → Source 选择 GitHub Actions。工作流 `.github/workflows/weather-pages.yml` 在代码推送、手动触发和每小时 07/22/37/52 分钟运行。GitHub 调度不是严格定时器，可能延迟；公开仓库 60 天无活动可能停用计划任务，需在 Actions 重新启用。

流程：安装锁定依赖 → 测试与类型检查 → 官方接口抓取 → 校验数据并交叉核验日出日落 → 构建同一 React 页面为静态站点 → 发布 Pages。抓取或校验失败会阻断部署，已发布站点保留。无需天气密钥或个人令牌，不定时向主分支提交天气数据。

`npm run fetch:weather` 更新 `public/data/weather.json`；`npm run build:pages` 输出 `dist-pages`。Actions 根据 `GITHUB_REPOSITORY` 自动配置站点子路径。原有 `npm run dev` 与 `npm run build` 保留。

页面优先读取快照；快照缺失或过期时尝试直连官方接口。抓取时间超过 45 分钟或模型有效时间超过 90 分钟显示过期，不伪造缺失数据；旧数据状态停用天气动画。抓取结果保留原始天气字段、来源 URL、有效时间、抓取时间与 SHA-256 内容指纹（用于追踪内容，不是上游数字签名）。数据属于模型估算，不保证气象观测准确性。太阳事件使用 Astronomy Engine 独立算法核验，允许 5 分钟差异。

实拍素材与许可见 [ASSETS.md](./ASSETS.md)。无需登录即可访问公开页面。

现已加入天文摄影模块：月相与照亮比例、月出月落、天文黑夜、避月光时段，以及七颗行星的观测窗口、最高位置、方位和视星等。计算始终使用北京时间，不依赖天气接口。窗口按 5 分钟步长筛选，不代表天气一定适宜观测。

天文计算使用 [Astronomy Engine](https://github.com/cosinekitty/astronomy)。用 Node.js 22.18+ 执行 `node --test tests/astronomy.test.mjs` 可检查月相、四季窗口与时区边界。

面向浙江省桐乡市居民的实时天气网站，展示当前天气、未来 12 小时、未来 7 天和日出日落，并根据昼夜和天气状态切换动态背景。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

天气与日出日落数据来自 [Open-Meteo](https://open-meteo.com/)。默认位置为桐乡市梧桐街道附近（30.63287, 120.56081），时区为 Asia/Shanghai。完整产品方案见 [PLAN.md](./PLAN.md)。
