# meta-lc-cli

[English](./README.md) | 中文

## 定位
应用生成与工具链 CLI，负责 App DSL 校验与脚手架流水线产物。

## 里程碑映射
- 主里程碑：Phase 6 (+ API Generator task in Phase 2)
- 主线看板：[GitHub Project #5](https://github.com/orgs/zhongmiao-org/projects/5)

## 职责边界
- In-scope：承接 Meta-Driven SaaS OS 主线对应模块职责。
- 依赖关系：协调可被 kernel、bff、runtime 消费的生成产物。
- Non-goal：不承担长期运行时引擎职责。

## MUST 约束
- DSL 是唯一真相。
- 所有数据/实时链路必须经过 BFF。
- Runtime 不承载业务规则实现。
- Meta Kernel 是唯一结构来源。

## 协作说明
- Phase 5（Designer）与 materials 保持在   [ngx-lowcode](https://github.com/zhongmiao-org/ngx-lowcode) 基础库。
- [ngx-puzzle](https://github.com/zhongmiao-org/ngx-puzzle) 继续作为独立基础库。

## 快速开始
克隆后：

```bash
npm install
npm run build
```

后续接入实现包后：

```bash
# 生成最小可校验 DSL 模板
npx meta-lc init --out ./app.dsl.json

# 校验 DSL（失败返回 exit code 1）
npx meta-lc validate --file ./app.dsl.json

# 输出结构化结果
npx meta-lc validate --file ./app.dsl.json --json

# 输出人类可读摘要
npx meta-lc explain --file ./app.dsl.json

# 生成 Pipeline 计划（默认仅写 plan.json）
npx meta-lc generate --file ./app.dsl.json --out demo

# 写出四类产物（DB/API/Perm/Page）
npx meta-lc generate --file ./app.dsl.json --out demo --write

# 生成租户/角色模板（默认预览）
npx meta-lc template --file ./app.dsl.json --out demo

# 写出租户/角色模板文件
npx meta-lc template --file ./app.dsl.json --out demo --write
```

## 参考
- 统一文档仓库：[lowcode-docs](https://github.com/zhongmiao-org/lowcode-docs)
- 架构基线：[Meta-Driven Standard](https://github.com/zhongmiao-org/lowcode-docs/blob/main/meta-driven-standard_zh.md)
