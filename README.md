# 港口吊装游戏

个人开发的竖屏手机游戏原型与设计规划，考虑微信小游戏、TapTap。

## 项目入口

- [未来规划归档](docs/harbor-future-plan.md)：已认可、待定与已放弃的设计；“一键归档”后续更新此处。
- [10月19日讨论归档](docs/harbor-session-2026-10-19.md)：本轮最新规则、已取消方案和待讨论方向。
- [第一关平衡检查](docs/harbor-first-level-balance.md)：模拟依据与风险。
- [完整版取舍记录](docs/harbor-full-version-decisions.md)：保留讨论编号。
- [早期交互讨论](docs/harbor-design-notes.md)。
- [游戏参考](docs/game-references.md)与[灵感视频评论分析](docs/game-comment-analysis.md)。
- [原型说明](prototypes/harbor-operator/README.md)与[验证报告](prototypes/harbor-operator/REPORT.md)。

## 启动原型

在本项目目录执行：

```powershell
node prototypes/harbor-operator/server.cjs
```

浏览器打开 http://localhost:4173/ 。若该端口已有旧原型服务，先结束旧服务再启动。

验证：

```powershell
node prototypes/harbor-operator/check.cjs
```

`docs/reviews-*.json` 为参考游戏评价数据，`references/` 为灵感图片，原型目录内 `preview*.png`／`preview*.jpg` 为历次预览。迁移来源见 [文件清单](docs/file-migration-2026-10-16.json)。
