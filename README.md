# 港口吊装游戏

个人开发的竖屏手机游戏原型与设计规划，目标为微信小游戏、抖音小游戏、TapTap普通小游戏。

## 项目入口

- [10月23日丰富度与工分／合约归档](docs/harbor-session-2026-10-23.md)：命名、兑换与刷新初稿，以及“是否替代免费三选一”的未回答问题和关联上下文。
- [想法与待决事项管理表](docs/harbor-idea-backlog.md)：按类型维护候选、方向认可、暂缓／封存及否定方案；后续讨论有实质结论时同步更新。
- [10月21至22日讨论与实现归档](docs/harbor-session-2026-10-22.md)：本轮最终规则、镜头／取消行为、计分修订、三批实现和待确认事项。
- [合约管理表（原工单）](docs/harbor-work-order-registry.md)：16张持续规则卡的总表、规则与数值、候选限制、验证状态及修改历史。
- [港口吊装游戏开发与三端上架步骤](docs/港口吊装游戏开发与三端上架步骤.md)：当前进度、12步开发与上架计划、个人资质准备、分工及近期执行清单。
- [三批修改与测试清单（2026-10-21）](docs/harbor-prototype-plan-2026-10-21.md)：三批均已接入原型，附可勾选人工试玩项与第三批参数、模拟记录；程序检查不替代用户验收。
- [未来规划归档](docs/harbor-future-plan.md)：已认可、待定与已放弃的设计；“一键归档”后续更新此处。
- [10月19日讨论归档](docs/harbor-session-2026-10-19.md)：历史规则与讨论背景，冲突处以最新归档为准。
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
