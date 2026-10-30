# 港口原型公开试玩站

## 当前状态：已取消公开（2026-10-30）

用户明确要求“下架吧”。已调用Sites访问管理，将access_mode从public改为custom，并清空非本人访客和群组名单。返回结果仅owner可访问，external_visitor_count为0。此处下架指取消公开访问，不删除站点、部署或源版本；下方首次发布状态保留历史。尚未部署到其他服务。

替代方案研究：Netlify支持文件夹拖放发布，但本轮未验证国内手机可达性；阿里云OSS静态托管可使用自定义域名，内地节点绑定域名须备案，香港等境外节点无需ICP备案但跨境访问有延迟与稳定性风险，默认OSS域名访问HTML可能强制下载，不能把默认存储桶地址直接当作试玩链接。当前无新托管、购域名或开通付费服务授权，待用户选择渠道与提供账号／域名条件。

参考：https://docs.netlify.com/deploy/create-deploys/ 、https://help.aliyun.com/zh/oss/user-guide/access-buckets-via-custom-domain-names 。

- 发布日期：2026-10-30（Asia/Shanghai）。
- 用户授权：上传当前原型，公开访问，后续再下架；尚未指定下架时间，不设置自动定时任务。
- 地址：https://harbor-crane-playtest-20261030.heartygoose12.chatgpt.site
- Sites project_id：`appgprj_6ae4096cb20481919d7b047f44d9fc9a`
- 访问模式：`public`，已由Sites访问设置返回确认。
- 首次发布版本：1，原型参数版本phase4-v2。
- version_id：`appgprj_6ae4096cb20481919d7b047f44d9fc9a~appgver_db0952d783fc8191af6674f6961e8953`
- deployment_id：`appgdep_6ae409d2636c8191859cf64ee008a0c2`
- 部署结果：`succeeded`。
- 发布源提交：`0cba8c66dd82e95f272ac52479db2c99f8cd6007`，仅属于独立Sites副本，未提交主游戏仓库。
- 独立发布目录：`sites/harbor-playtest-20261030/`；身份保存在其`.openai/hosting.json`，后续更新复用同一project_id。

## 上传范围

游戏文件仅五个：`index.html`、`config.js`、`orders.js`、`core.js`、`game.js`，另有部署必需的Sites hosting清单。复制当前工作区原型，不改变玩法。未上传设计文档、想法库、测试脚本与截图、试玩导出、主仓库Git历史、服务脚本或本地凭据。无新增账号、统计收集或排行榜。

源代码核对无外部资源及本地API依赖；发布包清单和独立源仓库清单已检查。核心规则check.cjs、经济check-economy.cjs通过。Sites原生工具确认部署成功；本次未新增线上浏览器交互或真实手机网络验收，仍需朋友实测网络可达性和触控体验。

## 访问异常排查（2026-10-30）

用户反馈手机打开提示blocked。复查Sites状态active、access_mode public、disabled_by null，地址仍为当前线上地址；错误级Worker日志为空。电脑端匿名HTTP请求复现403 Forbidden，响应Server为Cloudflare，正文为“Sorry, you have been blocked / You are unable to access chatgpt.site”，Ray ID a5273f29ef582a93。这证明该次请求在平台边缘被阻止，不证明手机与该请求具有完全相同的阻断原因；尚未获得手机完整错误页、浏览器及网络对照信息。部署成功不代表外部网络可达性已通过。

现有Sites工具无直接管理平台Cloudflare防护的接口，不通过改游戏计分或反复重部署来处理此异常。下一步建议手机系统浏览器与Wi-Fi／移动数据交叉测试，记录错误页与Ray ID；持续失败时考虑其他托管渠道，尚未创建其他站点或向其他服务上传文件。

后续用户反馈：Safari及其他手机浏览器均无法访问，并提供手机截图，正文明确显示“Sorry, you have been blocked / You are unable to access chatgpt.site”，与电脑匿名请求的拦截页一致。已确认手机也遭到平台访问层拦截，未进入游戏页面；截图未显示具体拦截规则或Ray ID，用户尚未明确Wi-Fi／流量对照结果，因此不推定为某地区全面限制或手机浏览器故障。暂停反复更换浏览器的建议。后续可交由平台支持排查或另选托管渠道；当前站点仍公开，未擅自下架或迁移。

## 更新与下架

本地修改不会自动同步，后续明确更新时重新检查五文件并发布新版本。用户要求下架时，读取本project_id当前访问配置，再使用Sites支持的访问管理取消公开，限制为仅本人可访问；以工具返回实际状态为准。不默认删除项目、源码或历史版本，也不声称能撤回访客已经下载的前端文件。

## Netlify更新文件准备（2026-10-30）

用户要求准备更新文件，本轮未执行上传或部署。已将最新原型五个文件（index.html、config.js、orders.js、core.js、game.js）同步至sites/netlify-playtest-20261030，并生成sites/netlify-playtest-20261030.zip。ZIP根目录直接包含index.html及四个脚本，无额外目录、凭据、文档或测试文件。逐文件SHA256与当前原型一致，ZIP文件清单和game.js语法检查通过。版本phase4-v3，目标600／2600／5000／9000／16000，含每列首次装船达标后安全返回再询问切列、末列询问结算、短介绍和第二列起市场。仅准备文件，不声称Netlify线上已更新或真实手机网络已验收。

## 一键归档核对补记（2026-10-30）

本次实际检查Netlify文件夹的5个文件均与当前原型一致。ZIP内除根目录5文件外，还包含netlify-playtest-20261030/子目录及重复5文件，共10文件项及1目录项；两套内容哈希一致。此实际结构修正上文“无额外目录”的历史描述。本轮保留原包，未重打包／上传；建议使用已核对的发布文件夹，线上更新仍未确认。集中索引见harbor-session-2026-10-30.md。
