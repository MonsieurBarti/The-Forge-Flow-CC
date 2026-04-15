# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/compare/tff-cc-v0.8.0...tff-cc-v0.8.1) (2026-04-15)


### Features

* add /tff:map-codebase command with parallel doc-writer agents ([eaadc23](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/eaadc235bcb890fb751dd72a9d18740cf67a14b1))
* add /tff:quick (S-tier shortcut) and /tff:status (lightweight status) commands ([20e38f1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/20e38f150788e37b47ee3673fecee2a850892575))
* add 3-way snapshot merge with entity-level conflict resolution ([a1214fa](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a1214fa7e32517a7899ea157634cbfc937b79027))
* add 5 slash commands for skill auto-learn pipeline ([6e66389](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6e66389e6448280dddeafb3b7be9ad5dc6c1fb88))
* add 5 workflows for skill auto-learn pipeline ([a321a5a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a321a5a0493f8060748c7d5cc0d2874cf0699bfb))
* add 7 CLI commands for skill auto-learn pipeline ([40727b8](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/40727b8f30bcc87ce5ba32b29150f90fb1d6e9c2))
* add aggregatePatterns with noise filtering and minimum count ([8ccee9f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8ccee9f617a4812d74bb31a9389ee69a840a3887))
* add application layer barrel export ([0199741](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/0199741d94b9f8f068e8019f44919d8f87a4c94a))
* add autonomous flow transitions and escalation to lifecycle workflows ([874967b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/874967b03c45fe2c8b87cd31da57c187787f668f))
* add autonomy settings value object for plan-to-pr mode ([9d1196d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9d1196d1529b73230ec0cde216515fc82c8fbb55))
* add bash observation hook for PostToolUse capture ([e57321e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e57321e15b0a73833b9f77cd9601af68573ff393))
* add bd init to project initialization and fix build script ([e3f7b09](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e3f7b09b3f1aa2221b79d1a5d77a9f2db96c6291))
* add BdCliAdapter wrapping beads CLI for bead store port ([946c7c4](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/946c7c4435a4fed063ac895d076151b2b1baaa23))
* add bead adapter factory for auto-detection of beads vs markdown mode ([16d6390](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/16d639007e467fc68ad48ffefa2ae9a2c03e79fe))
* add BeadSnapshot value object for team portability ([410b4d7](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/410b4d75e87b7bc0576e8c5a580bd1654b57404a))
* add canonical settings template reference ([2cbdbd9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2cbdbd9d52766651eb2692db2733ce61f73a37d8))
* add checkpoint save/load for execution resumability ([b83a936](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b83a936b8c9784a3ad7e45e240b5dd2d7077e9d3))
* add classifyComplexity heuristic for S/F-lite/F-full tiers ([7313142](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7313142817adc4f9d5ae7d97aecf94219e88752f))
* add CLI command router with project:init, slice:classify, waves:detect, review:check-fresh ([94f3d9b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/94f3d9bf473921dba8a0aa53751391839c71847f))
* add configurable minCount guardrail to aggregatePatterns ([08ddbfb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/08ddbfb6a18d7ff23fbda837e531920796a1abb1))
* add core workflows (new-project, new-milestone, progress, help) ([2620ab6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2620ab65a246796f0fe90cfca0538f7b5cd39dfd))
* add createMilestone, listMilestones services and CLI commands ([46af5a1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/46af5a1bbedbb646b190dc722468234f952e9f49))
* add createSlice service and slice:create, slice:transition CLI commands ([179aaf0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/179aaf0144a256f78f3884e649ff1c5d34723a97))
* add dead-letter resilience to observation hook ([bde621d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/bde621dbc5f33f6b3e5f5a244bc059db96de06f2))
* add debugging-methodology skill ([a393b34](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a393b3469e50953f6c27e124a819c8693ebd6001))
* add detectClusters, checkDrift, and validateSkill services ([4f1063f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4f1063f619bd63fccf5aa82fb120cb5c454e506f))
* add detectWaves topological sort for wave-based parallelism ([6b7efb3](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6b7efb3e1fc194339b64ca6710c2efccca466a48))
* add Dolt remote setup guidance to new-project workflow ([9e5f126](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9e5f1268a52c8b23de203d97015dd7dd8008d13b))
* add Dolt sync utilities for auto-push/pull ([f846225](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f8462255a32762cc28fee8ef71c9ad501f133554))
* add domain agent definitions (backend-dev, frontend-dev, devops) ([ace81fe](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ace81fed31eca27049861cccde4d6cce51105f5e))
* add enforceFreshReviewer use case ([480cf3b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/480cf3bcffd39ac38c16160147b1c3eee3ceb2d3))
* add escalation task creation for blocked autonomous flow ([8679084](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/867908449aa5cbfc19ad4af8642b94409210d8dd))
* add existing-repo onboarding and settings generation to new-project workflow ([b6abf3b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b6abf3b9d2c8bdad3482aaf89ff78b61240570ae))
* add exponential backoff retry to beads adapter ([7ee6ec2](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7ee6ec22b918b4f30a2d271c8cb73da772e33dcc))
* add extractNgrams for tool sequence pattern extraction ([a0bf607](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a0bf607ac66d9e425f0906957339fc4febafb0e8))
* add generateState service for STATE.md generation ([096259b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/096259bb9b6f4e53067f86c4d80b7e944dde1b21))
* add getProject service and project:get CLI command ([018e597](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/018e5973ac56100f84748997ecec29e0db89532d))
* add git merge driver setup to new-project workflow ([8797151](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8797151aba7747b466e4593857c9500988c9a140))
* add GitCliAdapter wrapping git CLI for git ops port ([e9e4b09](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e9e4b09edbe1a435db4f71e90911376ee9314e8c))
* add hooks for dependency checking and context monitoring ([4992f96](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4992f9641b05529e8719e6edc858787e589bcf87))
* add in-memory test adapters for all domain ports ([298b25a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/298b25aa13dbfa7d917a5cad6d8783586b50c59e))
* add initProject application service with singleton enforcement ([fcfc1dd](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/fcfc1ddc647c1aa72546d8e32fa063d6b93acf6f))
* add interactive-design skill for spec-driven brainstorming ([c83b01c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c83b01c49b9926a19591a729d5efceadd0fd3bd8))
* add management slash commands (add/insert/remove slice, rollback, pause, resume, sync, health, settings) ([1b96ef0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1b96ef00f4b9dd7be5fa17b50649a885102e9d63))
* add MarkdownArtifactAdapter with filesystem implementation ([9586ab9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9586ab997e90205df09272703059659bb962c8c4))
* add MarkdownBeadAdapter for graceful degradation without Dolt ([5701b32](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5701b32cdb7d555c8ee4563a3cfc119e6aba17dc))
* add milestone completion and management workflows ([158ac7c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/158ac7c9fc56441ae0288d24645015e4bd6ccfaa))
* add NOT_FOUND error code to domain errors ([7224fc9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7224fc9c009a23116de83288ddb8c9bd011d2526))
* add Observation, Pattern, Candidate value objects for skill auto-learn ([9e6db43](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9e6db43526b764130afcee94f3981d8e5297dfd9))
* add ObservationStore port with JSONL and in-memory adapters ([e44340f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e44340f90b087a50c81700f719fe00370eefcb7d))
* add project and milestone slash commands ([e3985b4](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e3985b4aa037a46a5189029b60cdea3e498addf3))
* add ProjectSettings Zod schema with resilient defaults ([3715d06](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/3715d06a86352c602b3310c5550b3d0bbee16d3b))
* add quality agent definitions (tester, code-reviewer, security-auditor, fixer) ([1f77988](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1f77988bce0ae400eebc3e5bb4af7f32fa3159c1))
* add rankCandidates with weighted scoring (frequency, breadth, recency, consistency) ([58bc42e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/58bc42e3a4306468eee023c05f97e4134ef31df3))
* add recordReview service and remaining CLI commands (sync, checkpoint, review:record) ([5daaa5f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5daaa5ff939fa3281aa2dabef5eb2274ed980356))
* add refinement cooldown metadata for auto-learn guardrails ([e87577f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e87577f6cc3ca284f5dc0294702e306d65b680fe))
* add ReviewMetadataAdapter using beads KV for review tracking ([8014acf](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8014acfc3ed65f3825fef4892416e2fc06f3b379))
* add skill auto-learn exports to domain barrel ([27e2417](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/27e24179e4c918eba13c0537afecd51ca05044b6))
* add skill library with 5 initial skills (hexagonal, TDD, review, commits, plannotator) ([678af9c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/678af9ce58118a31d8e55964e917a0deff158e0c))
* add slice lifecycle slash commands ([24ed555](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/24ed5552904cdb2e63bb7e654bbe7912d73e1d3d))
* add slice lifecycle workflows (discuss, research, plan, execute, verify, ship) ([168e2b2](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/168e2b2b9890338466996249fb0ac4be1c9a8b9d))
* add snapshot compaction for periodic deduplication ([420f217](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/420f217d845ddc52a6a1fca8f4a538a6555fed86))
* add snapshot hydration use case for clone-and-go ([6786a5a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6786a5a859edbef06b8c8df810500384fa289900))
* add snapshot serialization use case for beads-to-git ([c6a9f37](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c6a9f37cb3600e67619ec637ebce460db57c60dc))
* add snapshot:merge CLI command + git merge driver ([791b568](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/791b568a307f5b4161b9774cde06756214fade88))
* add snapshot:save and snapshot:load CLI commands ([c14973e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c14973e92ea55922be85cba52fcaebb3b26c9ed8))
* add state:repair-branches command + bump to 0.8.2 ([cc41cbc](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/cc41cbcf96ae15f861e87452ba8701320ca0dabf))
* add strategy agent definitions (brainstormer, architect, product-lead) ([8ea7d0f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8ea7d0f390539f201e73e0d1c86eeba71d2a63be))
* add stricter validation to beads normalizeBeadData ([a682f18](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a682f184b5dff88648990a032018842a55216452))
* add systematic next-step suggestions and orchestrator pattern to all workflows ([54e9787](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/54e97872ca242c3fb692464b45e70b766c87abc1))
* add tff-doc-writer agent for codebase documentation ([a103bc8](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a103bc88f289f5e3943b2c76468160edf0bd2ad7))
* add tff-skill-drafter agent for auto-learn pipeline ([bf70354](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/bf70354feffde8ec81c2b27909c830e63af6a583))
* add tff-spec-reviewer agent for two-stage review ([639eb96](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/639eb96ece7adb02641c4976a1d45d2649bcb603))
* add tff:debug command and workflow ([21c620c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/21c620ce745d3b235af2ca14a5dc5cf69090eac8))
* add transitionSlice use case with bead status sync ([00f89ad](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/00f89ad44a7439b6c5581ace23d27561151b3b3a))
* add TTL cache to git adapter for getCurrentBranch/getHeadSha ([96f6642](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/96f664258d57e4bf2cc7b4b8557bfa0f52ec2471))
* add workflow chaining logic for plan-to-pr autonomous mode ([a5d25ed](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a5d25edc2839ed35d4f922fb1a6f539bd66f3458))
* add worktree create/delete/list services and CLI commands ([d5f567b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/d5f567b6d20ba00d16c82936f276fd774a223d10))
* align beads integration with official bd recommendations ([4057a03](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4057a03b94ab918fbe3a508b7a997e921a6ada35))
* **app:** add checkStaleClaims use case with configurable TTL ([279be39](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/279be39ae1de398cfaafa64bb34b56f1295b5d21))
* auto-fetch state branch in post-checkout hook — enables restore on fresh clone ([29476c3](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/29476c351cd7ecb466830eb5e81a4ceae3c7a75c))
* auto-push state branches to remote after create/fork/sync (best-effort) ([d06d538](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/d06d538311bc0fc051a52407134c3807480b215b))
* auto-snapshot beads on every slice transition ([7d13933](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7d139331b9b147ce018e2ddce9922df834447164))
* **cli:** add claim:check-stale command ([2d9d71b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2d9d71bd478c34ba397930f01832293c1a20e598))
* compact snapshot on sync reconcile ([39d47a8](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/39d47a89421c6981dc46290e48444a741797327a))
* debug flow, existing-repo onboarding, settings UX ([682f72c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/682f72c6ced3989ce44ed6d550b7d4c771e882a2))
* **domain:** add claimedAt to BeadData and listStaleClaims to BeadStore port ([9ddfcd1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9ddfcd1d0d4efeaa28819de9ffea7f718db867c3))
* **domain:** add STALE_CLAIM and WRITE_FAILURE error codes ([a9e8be3](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a9e8be3c51144dac59e1bdc3fdbb8cc35a3106c8))
* enrich all agent prompts with personas, guardrails, deliverables, and status protocol ([d30f469](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/d30f46921a272ffa8e2aae62f2a511ee605f1f00))
* expand settings command to cover all config sections ([c2ccfdf](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c2ccfdf5c6766f173c528789ae02774db6d7da6d))
* expand skill validation with size, collision, and injection checks ([513154b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/513154b493a9f87bc6e594cd4673e860c76c7a5c))
* hydrate beads from snapshot on project init (clone-and-go) ([4dd1f60](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4dd1f6076c41acefa6a45d3d222a9d7a5a4cb6e2))
* implement sync:reconcile, fix beads integration, remove review:record ([e9b6732](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e9b6732d3e217ea63a4efe50c31cd30fade9c0af))
* implement two-stage review in ship workflow (spec compliance then code quality) ([088e686](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/088e68628b53cc621301efa2a55a2823975f75ef))
* **infra:** BdCliAdapter records claimedAt metadata and detects stale claims ([232dd41](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/232dd4168a88a41265c178be36cc2ba1509d77ec))
* **infra:** InMemoryBeadStore records claimedAt and detects stale claims ([9789319](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/978931977fbcd9c8a88019dab419ee2ee9177c31))
* **infra:** MarkdownBeadAdapter records claimedAt and detects stale claims ([47d84d6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/47d84d6eef17169c8e3520dd170bb2984d1f67bf))
* link agents to skill library via @skills/ references ([95fb323](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/95fb323dc1e0c97a8bc02c5afb573c5ecf6b27d0))
* **M01-S01:** StateStore port + SQLite adapter ([e603ca4](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e603ca4a008b572404e8bb0926b71a1fb668d8b2))
* **M01-S02:** Migrate CLI Commands to StateStore ([fef397e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/fef397e3399fefa669f1dcbf2ed2d5586d931751))
* **M01-S02:** State architecture refactor ([#68](https://github.com/MonsieurBarti/The-Forge-Flow-CC/issues/68)) ([9e0bf83](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9e0bf83c0ccfc7e811d9e2d4c3ad8544c338d652))
* **M01-S04:** Journal system ([6ea5c15](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6ea5c15d77964b9f07401b297ccdffa8fc0ba826))
* **M01-S05:** Post-Checkout Hook + Restore ([86ecd76](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/86ecd76d6fe2342feb3f6e94399495859de6a5ec))
* **M01-S10:** dev plugin for testing breaking changes ([805b75a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/805b75ae41d8fb2bd85a70149ad0a14a19c7a930))
* **M01-S10:** dev plugin for testing breaking changes ([825cc20](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/825cc20c03a8e67ffe728d24e97e53d8db37820b))
* **M01-S10:** dev plugin via CI name patching ([86dec68](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/86dec68324066ea035619b16ac215b3695271b14))
* **M01:** SQLite State Migration — replace Beads with SQLite + orphan state branches ([febc91e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/febc91e290125197f683192afe0b054698d3ac79))
* **M03:** V0.6.0 Classification Reform ([66ace17](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/66ace17eef2f631df3a5d9d64e2dc901b57f11f4))
* **M05-S01/T01:** add stress-testing-specs skill ([e29d620](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e29d62009004350edb05e10c208df768b180c2c2))
* **M05-S01/T02:** add architecture-review skill ([f5d010c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f5d010cb8e646571ee8579f18dcdd42a6e79f6c9))
* **M05-S01/T03:** add acceptance-criteria-validation skill ([cfd8ad0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/cfd8ad0e57bb25cb61eefaf7793b91177262637e))
* **M05-S01/T04:** add codebase-documentation skill ([0925f23](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/0925f231592b530290e6538cf130c3612ee861dd))
* **M05-S01/T05:** add skill-authoring skill ([9838fd7](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9838fd752f35e7147a7f90d8d7eb301105c0a347))
* **M05-S02/T01:** add verification-before-completion skill ([b744e44](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b744e4403b7dc6f0a6e6232f46ec9f12f074cbf4))
* **M05-S02/T02:** add receiving-code-review skill ([e7a9ce6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e7a9ce6f2534b66f460aa2a5eb55d2130d9c9e59))
* **M05-S03/T01:** add writing-plans skill ([334090b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/334090b507be39bcd9ae8be02b26731940c41dd7))
* **M05-S03/T02:** add executing-plans skill ([258539a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/258539a418a6e19d41508fb9d18cc10115626c72))
* **M05-S03/T03:** add finishing-work skill ([a2b875c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a2b875c73fa444d9164ece6dad230850a238bdb8))
* **M05-S04/T01:** rewrite test-driven-development skill with HARD-GATE and tester merge ([682415f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/682415ffb978dc38a20c75ca7c37c7bf582c9fd7))
* **M05-S04/T02:** rewrite debugging-methodology as systematic-debugging skill ([2e2bf6d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2e2bf6d350afc9dc1512f0011517a5efc11cba6b))
* **M05-S04/T03:** rewrite interactive-design as brainstorming skill ([9f6375f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9f6375f8f05f4e1954cbb1456b16dc64166785a3))
* **M05-S04/T04:** rewrite code-review-checklist as code-review-protocol skill ([405e69e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/405e69eede76071c45ba47e7a1b71968fd944b1b))
* **M05-S04/T05:** add lefthook enforcement note to commit-conventions ([e71a81c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e71a81c6142c7f621183dd30ba144659d862453a))
* **M05-S05/T01:** add agent-authoring skill ([1e5bfdd](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1e5bfddd62afa0c7d6db81aea0c2e929d3b05c8b))
* **M05-S06/T01:** rewrite tff-code-reviewer as lean agent ([57942f3](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/57942f378314debcc3ab0e793f02a6d9cc102641))
* **M05-S06/T02:** rewrite tff-spec-reviewer as lean agent ([e947fa1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e947fa165025b5d69ecef640477380bdfdb405b9))
* **M05-S06/T03:** rewrite tff-security-auditor as lean agent ([aa92897](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/aa92897f424cdcc7bf1de34785281c9fd9105d30))
* **M05-S06/T04:** rewrite tff-fixer as lean agent ([bf86ba6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/bf86ba60add5354a5d821cecb99e493d8dabacc2))
* **M05-S08:** config extraction + security fix + integration tests ([2e7a5ea](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2e7a5ead67253e07bfca30ecb7536a82ae70c384))
* make scoring weights configurable for rank-candidates ([1d1226a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1d1226ab40c933a24642d10622d2b2d99b697d5a))
* name specific tasks in wave cycle detection error ([8edff83](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8edff83c822e477114052b71a0ef92af3bc36e89))
* register workflow chaining CLI commands ([08a8db0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/08a8db0d9fe472040a7244c20e0915ecba7a2a3b))
* replace threshold clustering with Jaccard-distance density clustering ([c4769a1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c4769a1696e05c5475e8a3d84061ab726f062fb3))
* report beads adapter mode in health check ([5fc30e6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5fc30e6ef56a55924070963172603cd06ba4462e))
* restructure plugin for CC marketplace (plugin/ subdirectory with symlinks) ([3a6c841](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/3a6c841305d8e939551ab9c2c51707f8976d9355))
* rewrite discuss workflow for orchestrator-driven Q&A with SPEC.md output ([b01a0e9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b01a0e94dc671301b19b01894f8971a27831b482))
* rewrite plan workflow for spec-driven granular TDD tasks ([ae06466](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ae0646615accc69b26ecc038836bece761d19f39))
* **S01/T02:** add ALREADY_CLAIMED, VERSION_MISMATCH, HAS_OPEN_CHILDREN error codes ([72e6c06](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/72e6c062a5825e0af5d84c0908fa166385bff8ea))
* **S01/T03:** add value object types for StateStore ports ([56e5105](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/56e510593de6f7aba5d0fc6d4254db43b59b68ef))
* **S01/T05:** define 7 StateStore port interfaces ([07b3b2b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/07b3b2b3d4a72c76a732785b21760422e26d4928))
* **S01/T06:** SQLite v1 schema with migration framework ([e1a3c3f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e1a3c3f34720ba51c5cc912b31f04686883e2806))
* **S01/T07:** ProjectStore + MilestoneStore + SessionStore with contract tests ([fc4a39d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/fc4a39db7d0132e96e27f4808eeb0242c5989bad))
* **S01/T08:** SliceStore + TaskStore with contract tests and TDD ([8b41710](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8b41710c1440deaac5270f16d972357ca87e3538))
* **S01/T09:** DependencyStore with contract tests ([c9fbd06](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c9fbd06d000f4afb8b5fd2c16ad39530f8c6b46e))
* **S01/T10:** add detectWavesFromStores orchestrator ([037ed22](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/037ed22af2efa1248545b6ba56dc8f9d5fc61295))
* **S01/T11:** integration tests + domain exports for new ports ([7d16532](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7d165326f2e4fa872d77f53b16aad2c32f9054d8))
* **S02/T01:** redesign ReviewStore port + extend TaskStore with claimedBy ([10f2ebb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/10f2ebbbdccf725228ce799be521ae2de2cbb1ad))
* **S02/T03:** v2 migration + SQLiteStateAdapter ReviewStore and claimedBy ([ed1c95b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ed1c95b205ea5c5e5f15d4bd8414d36562c4fd05))
* **S02/T04:** InMemoryStateAdapter ReviewStore + delete standalone InMemoryReviewStore ([04d09d9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/04d09d963217dff55355ed7ccedd0e0435a8d58c))
* **S02/T05:** createStateStores() factory ([59ae14d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/59ae14d5f056b32a8a2e4091b597855ae4436d86))
* **S02/T08:** migrate project services and commands to StateStore ([7cb7954](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7cb7954a07a891fffbe70324f4dd60ac9f4ec427))
* **S02/T09:** migrate milestone services and commands to StateStore ([7fc4db2](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7fc4db21cb86aa839bd9200725ffc1740340355b))
* **S02/T11:** migrate transition, generateState, and commands (atomic pair) ([90dd1df](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/90dd1df226b552dd249cae2d808ef26faf46562b))
* **S02/T12:** migrate stale claims service and command to StateStore ([50deb2a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/50deb2a8799ebd5ec392fe6de917897d97d2899e))
* **S02:** add bead-vs-PR reconciliation to health workflow ([5a6b79d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5a6b79d0b859258b08f914db83f838b6c674d2b1))
* **S02:** add bead-vs-PR reconciliation to health workflow ([a34e2c8](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a34e2c8d3d4957f1a1629618e415e8895e7149ad))
* **S02:** add tffWarn helper and surface swallowed errors ([da299f2](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/da299f27dd061584e4b6f4ac0243dd59e4554329))
* **S02:** add tffWarn helper and surface swallowed errors ([42291eb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/42291eb7496a57f6a7349defe7c2ae9a52b9e07d))
* **S03/T01:** add S03 error codes and factory functions ([459b698](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/459b6984e40cbab160e2e045f242b4f4bee6a88d))
* **S03/T02:** add BranchMeta, RestoreResult, MergeResult value objects ([27b8c4c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/27b8c4c255d26b30c78bd5e1ec156f57b3d4c140))
* **S03/T03:** define StateBranchPort interface ([bbd9c2d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/bbd9c2d7ef1080fc45481adb0688ead98f30813e))
* **S03/T04:** extend GitOps port with state branch methods ([59815b5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/59815b533cb4f28205612e5a4859b669ae25e81e))
* **S03/T05:** extend InMemoryGitOps mock with state branch methods ([4a2630d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4a2630ddc4316998141903fc3e72bf11830213ed))
* **S03/T06:** implement GitCliAdapter state branch methods ([3d08e71](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/3d08e7120978fac927528df8b70c07379fda0ee6))
* **S03/T07:** add close/checkpoint to SQLiteStateAdapter and ClosableStateStores ([59611d7](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/59611d7081e5982cfd647a50da26e680eaf4a7a1))
* **S03/T08:** scaffold GitStateBranchAdapter with createRoot and exists ([4f302ae](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4f302aee453a76c5e4d33c399f3b60b49b361092))
* **S03/T09:** implement GitStateBranchAdapter fork ([65c83be](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/65c83be815c354f314c19e1f44f99f81e010c132))
* **S03/T10:** implement GitStateBranchAdapter sync with copyTffToWorktree helper ([e27ef1f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e27ef1f44f367ab198960cede941ef4efbb04b70))
* **S03/T11:** implement GitStateBranchAdapter restore ([0d30cd6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/0d30cd62a3f408c9ab05f7f5a272299b63f0f44f))
* **S03/T12b:** implement SQL ATTACH entity-level merge ([7b032d5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7b032d5dd985f18ebcefad3e934f158fe5657a0f))
* **S03/T12:** implement GitStateBranchAdapter merge and deleteBranch ([d4c45e9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/d4c45e9b647394b7ebc5b83d2f4836c0313fbc18))
* **S03/T13:** add createRootBranch use case ([6527e08](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6527e08c9bcdeac43263fe34773aa4bfafeb7a35))
* **S03/T14:** add forkBranch use case ([e75d271](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e75d2712031f708ebc2c8cb06918f9e3b2502a7f))
* **S03/T15:** add syncBranch use case ([06f4bd5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/06f4bd5004e15f0ccd2afcafebdd42854282d83b))
* **S03/T16:** add restoreBranch use case ([317719d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/317719dfec8c34e549e7536b4ec9f1313136f46e))
* **S03/T17:** add mergeBranch use case ([153674d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/153674d3ea43d9f51da367bcd2162949b6436413))
* **S03/T18:** add sync:branch, restore:branch, branch:merge CLI commands ([29c557a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/29c557a901a30ffce9aa1357619ddd8e414838ea))
* **S03/T19:** register state branch CLI commands and export use cases ([441544a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/441544a33fc4a60d17e2312dfbdef30ba3e25f17))
* **S03/T20:** create root state branch on project:init ([8529369](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8529369a2a22850cb4898ca36e95f47e5bd489ce))
* **S03/T21:** fork state branch on milestone:create ([08b8108](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/08b810802fc8c4a596cca2789c87fde707ac0eea))
* **S03/T22:** auto-sync state branch on slice:transition ([6c85e7f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6c85e7fe8d9bfa42765c26056eed644ebb699048))
* **S03:** add error handling convention and checks to workflows ([778e054](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/778e05466af4a1917c187757d01810aa19d87de4))
* **S03:** add error handling convention and checks to workflows ([6cb5c1f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6cb5c1fb82e63734c7c1b9948bdc19de8574c96e))
* **S03:** state branch sync ([001745e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/001745e11a6beca1456b9e22fbe5566775cc5019))
* **S04/T01:** add journal error codes to DomainErrorCodeSchema ([8ea9eae](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8ea9eae1d3792cf9efd08a83394bac37660beb87))
* **S04/T02:** add 10 journal entry Zod schemas ([59cd027](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/59cd027710334af68776d6da512afda82d78f73d))
* **S04/T03:** add JournalRepository port interface ([6da2070](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6da207041b9f3ba6aa20c52cad8b3bcb85d0afa1))
* **S04/T04:** add EventBus port interface ([03bc91f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/03bc91fc68770390a78f16fb019c19cd334eccad))
* **S04/T05:** add InMemoryJournalAdapter ([67f2a00](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/67f2a00fb86fe9d53d3a364430d75485443f54b8))
* **S04/T06:** add JournalEntryBuilder test fixture ([9810fba](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9810fba7a56a9b48cb74e6ce682e588a251065a2))
* **S04/T07:** add SimpleEventBus implementation ([cf9f9cc](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/cf9f9cc7557634db3a79919e3be7933224c9cb18))
* **S04/T08:** add JsonlJournalAdapter with corruption resilience ([048d8d5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/048d8d5bb570bd43896450260804b82f5cc8c0c6))
* **S04/T10:** add JournalEventHandler for SLICE_STATUS_CHANGED ([49eee9a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/49eee9a4d8069e385ccc0d40c746c47e703de377))
* **S04/T11:** add ReplayJournal use case with checkpoint cross-validation ([7eccc38](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7eccc3859098f6bb2e1fd62a0bd84600a9c65d11))
* **S04/T12:** wire EventBus into transitionSlice, export journal types ([f250d8d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f250d8d685d2957b27ab5301c78c610ef177a55e))
* **S05/T01:** add BranchMismatchError class ([8ab016f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8ab016f87f831ea9f94152ce5359842f5b0a003d))
* **S05/T02:** extend BranchMeta schema with optional restoredAt ([d57d414](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/d57d41437bff10b42575324bd9c9f863537cb73e))
* **S05/T04:** exclude branch-meta.json from state branch sync ([a8564b8](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a8564b8f6a837eebc7241e4b3468aa7820fe6020))
* **S05/T05:** add advisory locking utility via proper-lockfile ([9db0938](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9db09383fd787befb2c95efd54b80fb0e8204728))
* **S05/T06:** add branch-meta stamp read/write helpers ([b468eb6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b468eb634cc40cfda7643037e5b08d7033870583))
* **S05/T07:** add post-checkout hook shell script template ([ae4a8a0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ae4a8a0d2588f170fe0f65f2cc37874f6b2d2cf4))
* **S05/T08:** add branch alignment guard to createStateStores ([2bffddc](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2bffddc83946b167bcd3751efaf869193fa8bdd4))
* **S05/T09:** add withBranchGuard shared CLI wrapper ([7da3c99](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7da3c9944d43b19dcd47efb1d047dc0526b75c5b))
* **S05/T10:** add hook:post-checkout CLI command ([41d3547](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/41d3547da04ff83623ac856e03485ef2fed31156))
* **S05/T11:** add hook installation and wire into project:init ([8ca005b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8ca005b94fbb73da9f41e2fb2e87d99a78cad012))
* **S06:** add lefthook git hooks + biome linter ([f5a4955](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f5a4955b7a5ca75fc37f9adbc98df60b6458c219))
* **S06:** add lefthook git hooks + biome linter ([dd02c2e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/dd02c2e57f5f437ff9b1e299c3c5c59d85271018))
* **S08:** expand CI to all PRs, add lint step, fix test command ([23cc8e5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/23cc8e53fb1ff9203340a897ca149ceb584e533d))
* **S08:** expand CI to all PRs, add lint step, fix test command ([427f254](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/427f2549d05de8f7b9c53e5ab12cb849847aefd2))
* **S09:** add riskLevel signal to complexity classification ([c0896be](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c0896be48678678f518f1271cd33e39f0939d631))
* **S09:** add riskLevel signal to complexity classification ([978b50f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/978b50f2ec6648191ec86af83dc3feb76a2fd954))
* **S10/S11:** cleanup automation + auto-rebase milestone on slice close ([b1c998d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b1c998d0496f9725ac0993748bd9d466439f0830))
* **S10/S11:** cleanup automation + auto-rebase milestone on slice close ([e41ff3a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e41ff3a8b396cde5b865329cad1f2985e2f3ab57))
* **S10:** auto-generate STATE.md and save checkpoints after transitions ([6fb68ad](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6fb68ad2afbff1da1eb0f7ed39567377bad36b1d))
* **S10:** auto-generate STATE.md and save checkpoints after transitions ([7409dda](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7409ddaf97090b3da315a194959f06ec4b14eeca))
* **S11/T01:** add native binding path resolver ([f35720f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f35720f7d29d26f3547f044a544c763584900624))
* **S11/T03:** wire native binding resolver into SQLiteStateAdapter ([41c323d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/41c323d300f5d425b8cc23b33826cb0771fbdf12))
* **S11/T04:** wire native binding resolver into merge-state-dbs ([8d05613](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8d05613d4b72e22e021034f7a6f6bd2ea64d770f))
* **S11/T05:** copy native binding to dist on build, gitignore .node files ([6b7947c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6b7947c9d25460ef1d1bcdbb8ae59b16b95e1030))
* **S11/T06:** add cross-platform matrix builds to release workflow ([8327c9c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8327c9c9271c2b1c3365bd20c85a58a70b6ffc1e))
* **S11:** add 7 missing CLI commands — task:claim, task:close, task:ready, dep:add, slice:close, slice:list, milestone:close ([210491e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/210491ee35c980daad2ff75dd5290435f4266ae0))
* **testing:** test stores support simulated write failures ([8751656](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8751656ed5f3202c3684264527dd4a6234e71a5c))
* Tooling modernization — unify with tff-pi reference style ([#67](https://github.com/MonsieurBarti/The-Forge-Flow-CC/issues/67)) ([ae0f2b7](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ae0f2b7125297a203c2cf520fecfbc210edbd2d1))
* use bead adapter factory in CLI commands for graceful degradation ([32617bc](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/32617bc711a263d77cba828f5372c04766610ee8))
* v0.7.0-M05 — Skills Architecture Reform ([35b34ed](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/35b34ed953e6a0b0e3dcfbcb28a90855a7ce2a16))
* wire all 17 CLI commands — no more NOT_IMPLEMENTED stubs ([adf5c34](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/adf5c349a262d493b516519458f8975953657744))
* wire Dolt auto-push into slice transitions ([4e09a43](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4e09a43885cfe334ba36d756f004f208af148d8c))
* wire settings.yaml values into auto-learn workflow CLI args ([d748955](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/d748955c4ddb11b96a37cd13cab2787d3db53ecb))
* **workflow:** block F-lite/F-full execution without worktree ([f1a3aaf](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f1a3aaf34de0e1c20da6a4ec6467ec98c9f7c690))
* **workflow:** display slice:transition warnings to user ([1d1e0c2](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1d1e0c26a580328b60474b2790f03c446bd32ed8))
* **workflow:** execute-slice saves checkpoint per-task and resumes partial waves ([09802f3](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/09802f3475772221cf767d60fde51f7724336c64))
* **workflow:** health and execute check stale claims ([c47dc09](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c47dc097d5d1a2839f787f713b3901893d6e8bdf))


### Bug Fixes

* add version to marketplace.json for CC plugin updates ([53aa98a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/53aa98afc5785bc7d656dfac8b0477919c3a3fdb))
* align BdCliAdapter with real bd CLI API ([b78b43e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b78b43e9d8b22782078b7184f59e50344d3d5182))
* auto-detect bead IDs and numbers in CLI commands ([3f42ed9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/3f42ed917fb7355053dfbdb74d9f0d6247ac4d64))
* change autonomy default from plan-to-pr to guided ([e0e37d4](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e0e37d47ca3654f666a37bfd7321c7ea50d0cd71))
* **checkpoint:** saveCheckpoint checks write results and returns Err on failure ([5fef2b5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5fef2b5fba71d26f8ab7b871fbc450243831e1f6))
* **cli:** slice:transition surfaces warnings and blocks on checkpoint failure ([ba5f257](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ba5f257f9b1af0aeedd922ef59b1a5bcda48af0f))
* **M01-S11:** native bindings, .tff/ auto-creation, worktree fixes ([e6aa54c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e6aa54c23f427c8af53cb43ce3de28e0f3083b02))
* make context monitor hook exit immediately when no bridge file exists ([7ce4c39](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/7ce4c39fabdbe5723d557e7b496b7a549446185a))
* normalize beads JSON output (snake_case to camelCase) ([3f555cd](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/3f555cdcd57b8f1e069a5763f2e3c2d190d35ca2))
* prevent state branch artifact leak to code branches ([610060a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/610060afd571bb3bbcd528a685254c78447899de))
* prevent state branch artifact leak to code branches ([90909bb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/90909bbb0bac8944bd64881b0976cc0230d380f4))
* properly check Result from state branch fork/create operations + bump to 0.8.1 ([#62](https://github.com/MonsieurBarti/The-Forge-Flow-CC/issues/62)) ([1ebb2d6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1ebb2d6af107700134b446a92031caea200a6225))
* register state:repair-branches as slash command /tff:repair-branches ([#63](https://github.com/MonsieurBarti/The-Forge-Flow-CC/issues/63)) ([24cb862](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/24cb86222c1cec23e3efd3dcff881d3763cd186d))
* remove all hooks (caused startup errors) ([69cd7c9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/69cd7c966d307b68d4becb2fbc68aaaa574f1bc9))
* remove context monitor hook (caused PostToolUse errors) ([4cc715b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4cc715b162564cfa454b36e076a64200d4f6796f))
* replace dolt substring matching with parsed settings ([b0cfdab](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b0cfdabed9b8cf812bd3750f4e9b6c0b8904491f))
* **S01/T04:** update CLI commands for entity field renames ([5589c6a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5589c6ad7e0a8c2bfeec9e198415ef9ee3f2d142))
* **S01/T04:** update use-case callers for entity field renames ([f9993db](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f9993db2875ae7e75817174a17e3648118d271dc))
* **S01/T06:** propagate VERSION_MISMATCH error from init() instead of WRITE_FAILURE ([9ee632f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9ee632f24e179456a1fdd0383f538585cccdc54d))
* **S01:** correct misused error codes and version drift ([5f196b9](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5f196b936b05b385eae62fa057068ad330a9bfb7))
* **S01:** correct misused error codes and version drift ([4aee489](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4aee48982a0d87255fb573a491f57e1a1a1ffaa1))
* **S01:** derive milestone number from highest existing ID ([4925066](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/492506650c86506c6eb018a879a0cfab0ae76775))
* **S01:** derive milestone number from highest existing ID ([ed78e25](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ed78e2596e2d6d036bbe33c88b9a2d740f61a803))
* **S02/T02:** restore review-record.cmd.ts for T07 migration ([1658003](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1658003743e60eb336798e17af392722ac64bcae))
* **S02:** address code review and security audit findings ([6659388](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/665938824b67d3d897189e4440abfdde1f8ce9f5))
* **S03:** address security audit findings ([327b1cb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/327b1cba5dd25ab8e6b2c47971144be8dc051e2a))
* **S03:** create temp branch in branchExists test for CI compat ([5ccd24a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5ccd24ae79bc6d694fa77692a615baf3d27b5020))
* **S03:** fix branchExists test for detached HEAD in CI ([2577e9e](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2577e9e7d1889ff82de560d8b2e776780cb0ff7f))
* **S03:** fix InMemoryBeadStore.ready() deps and type dolt-sync ([e1f86e2](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e1f86e2748e47eb6916952bdcb327f89f9549dfd))
* **S03:** fix InMemoryBeadStore.ready() deps and type dolt-sync ([a84426a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a84426af97645feab533de76449b7360ee7d976c))
* **S03:** strip GIT_* env vars from git subprocesses ([e922141](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e9221411970a65fa6f18c98b259b031c9884c904))
* **S03:** wire mergeStateDbs into adapter + implement artifact copy ([c8ace56](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/c8ace5621a90a3973dd08ddbac0b591580473cc0))
* **S04:** add standalone contract test runner for CI compatibility ([19cf493](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/19cf4931c3eeb3848a273434871c60ed79ad6ee4))
* **S04:** fix biome lint errors (import sorting) ([06c7d29](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/06c7d292d5bd7c11fd811722786a06dc297936a4))
* **S04:** move Zod parse inside try block, restore deleted error tests ([82ff301](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/82ff301571f66a06e52482f3680140e3a16944b5))
* **S04:** replace hardcoded init delay with readiness retry ([e293a9f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e293a9feeaaeb3539c7cf5f3eba0212b682fdd1b))
* **S04:** replace hardcoded init delay with readiness retry ([a155c58](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a155c5859be157b3f7352f6ee631068b1a6e7e31))
* **S04:** validate journal entries with Zod at write time in JSONL adapter ([cc4d766](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/cc4d766715236365f84e383bf6dfc4a3a16b7b05))
* **S05:** fix .gitignore — add /branch-meta.json, restore .worktrees/ ([9c13352](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9c133523f5d2bcb940e84a1b2742a3bff93a6e4e))
* **S05:** fix biome lint and format errors ([73f41eb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/73f41eb4f8c7beeb2ae471a8311e37e5c60eb6d0))
* **S05:** strip GIT_* env vars in tests for CI compatibility ([da7b6f3](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/da7b6f31815701d5b053a022df23217d2717d3cb))
* **S05:** use --all flag to include closed beads in numbering scans ([8d96ac4](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8d96ac4ae4119c81077577359881b6e8456ddd36))
* **S05:** use --all flag to include closed beads in numbering scans ([40b19c0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/40b19c0db91b7e31a5be7c4a50ee1d0effe78eb5))
* **S06/S07:** mandatory plannotator review for all tiers ([9ce1299](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9ce12997e2ab04e4f47e26b111fa3b2b6823c3a3))
* **S06/S07:** mandatory plannotator review for all tiers ([a84bddb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a84bddb4dc2ed03366fca0eead180065274cdbac))
* **S06:** address code review findings ([9ac1937](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9ac1937e1942d97de7ac22212d62244ffa41b2d4))
* **S06:** clean up normalizeBeadData parent field mapping ([5f26295](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/5f262955a0773373a2ad1204d7515f09db5ada12))
* **S06:** fix biome lint and format errors ([582f82f](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/582f82f4dbf8bab013ad68bec0b4eaf04ffba7ee))
* **S06:** read actual bead status in slice:transition ([20dbffb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/20dbffb0d72848cf0b4ec33a48bb9dba31453bc3))
* **S06:** read actual bead status in slice:transition ([a56cf41](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a56cf41fdc7b34623f98752427d72293e7023f02))
* **S07:** check registerStatuses Result in initProject ([b2dfcdf](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/b2dfcdf1f0d40ecb645530f3e241620f804e756b))
* **S07:** register tff custom statuses with beads ([f40c68d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f40c68d2b24fc4ee0278999af9cf410fa9f4c4c7))
* **S07:** register tff custom statuses with beads and check transition results ([cd6222d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/cd6222dd103f6a4a4edff59f3b6af30eda034e91))
* **S07:** remove platform-specific rolldown binding from direct deps ([abfdd8d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/abfdd8d212b95ba2d6f97baa22bf795818eaf509))
* **S07:** use Skill tool for all plannotator invocations ([8bec25c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8bec25c666ebe9972bb7e8696686e71538d27d2a))
* **S07:** use Skill tool for all plannotator invocations ([a228794](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a228794a92be84ba494b456aa781c5451c53ef77))
* **S07:** use sync:state instead of stale sync:reconcile command ([0df8c74](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/0df8c7465e8263fc8574c791efe91fe5e0ce0a8d))
* **S08:** document bd dep add and remove bd link references ([4193d3a](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4193d3a45cf595aa7651fb781bc1c410bd8bf789))
* **S08:** document bd dep add and remove bd link references ([07ac2c4](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/07ac2c4d1298b1a3bde49ce64fdd55a31850fc70))
* **S08:** fix plannotator skill invocation in workflows ([3edfb2d](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/3edfb2df8ed85047b7369ea3f6d23298c3cbbd29))
* **S09/S13:** enforce .tff/worktrees path and add worktree instructions ([9e8f039](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9e8f039d0011dc32856275beac54ba0b19f855b7))
* **S09/S13:** enforce .tff/worktrees path and add worktree instructions to workflows ([59767b0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/59767b0f4bab61d6b0d0ba383c66c98a31cf9fe6))
* **S10:** use random suffix in git branch test to prevent CI collisions ([1f518ef](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/1f518ef5613da03c7930785432a6490abd98a823))
* **S11/T02:** create .tff/ directory before opening database in project:init ([ee60f6c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ee60f6cf675d9b6e86a2c0c977151250925a3dbe))
* **S11:** commit native binding for darwin-arm64 — marketplace installs need it in-repo ([4b1f252](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4b1f252a3199ec537b6f7ec94bf5c32951af2baf))
* **S11:** copy .tff/ to new worktrees and fix post-checkout hook resolution in worktrees ([404ffb2](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/404ffb2ca97f7cf8eba9be1ae9d9ee1fa72b65ef))
* **S11:** create slice worktree branch from milestone branch, not current HEAD ([69eedcf](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/69eedcf72a364c558eb24ac11ba2eeccd3b7321f))
* **S11:** ensure .tff/ is added to .gitignore during project:init ([23aec53](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/23aec5360d4eae3534232c606b20e4d20f7571ab))
* **S11:** gitignore build/ alongside .tff/ during project:init ([f275a05](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/f275a05f4d84d637eecd28021457eaebf7f074cd))
* **S11:** improve CLI error messages with schema examples for waves:detect and checkpoint:save ([afd90f5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/afd90f54f642af321076af7fdc1c0ef4d53c331b))
* **S11:** make auto-transition instructions explicit in all workflows ([2a28ac8](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/2a28ac8d4059fba673b0e7dc646381c8a53c85bf))
* **S11:** make auto-transition instructions explicit in all workflows ([74bfa99](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/74bfa9924c908ecde02fcb36144722a6094a1d99))
* **S12:** derive slice number from highest existing ID instead of count ([8441139](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/84411393d9f826b55f7249c57ca08fbac432acc3))
* **S12:** derive slice number from highest existing ID instead of count ([8a8b9ce](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8a8b9ce4b92a3e06ae0c8363050e59186d52afe1))
* **S13:** use CLAUDE_PLUGIN_ROOT for PostToolUse hook path ([9734548](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/97345488e4daa5736b1cc0c5c3cfa0ef64591b28))
* **S13:** use CLAUDE_PLUGIN_ROOT for PostToolUse hook path ([d0be617](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/d0be617444033f63683269dee32b8fe0cc8f7c0e))
* **S14:** parse --title and skip unknown flags in slice:create ([cc6b121](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/cc6b1212b6ca960120d22780161862c8fc5ee3a0))
* **S14:** parse --title and skip unknown flags in slice:create ([0fdf3a3](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/0fdf3a37bea4e46eb3c21f6e508a3fbeb9e088bd))
* **S15:** make milestone bead closure explicit in complete-milestone ([6112bbf](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6112bbf15f2c046accf5e0d940c180e16fac0382))
* **S16:** add merge gate to close beads after PR merge ([ad2bc77](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/ad2bc77a848049f5c7861145ab266c426794ca22))
* **S16:** add merge gate to close beads after PR merge ([6b91a2b](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/6b91a2bf9f62c15195e48c4a2f19044ca640c94c))
* **sync:** reconcileState fails fast on write errors instead of silently continuing ([9f322d8](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/9f322d84640b1ccc4a8d80f1103715e818be483e))
* tff never merges — only creates PRs, user merges via GitHub ([dcbbcdb](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/dcbbcdbee8500898cfd72d514e9f0447a281a117))
* update marketplace SHA to latest commit ([021f437](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/021f4371daa71c110b7ec5c0c344915d1d17521c))
* update marketplace SHA to latest commit ([08b9a63](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/08b9a63a972c56a7e2e8e860551d781fc7bb61f1))
* update marketplace SHA to latest commit ([add09f1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/add09f1dc8ac51c631fd00ae76870aa43716b084))
* update marketplace SHA to latest commit ([91be756](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/91be756261a8f7c9d24ba39f678fbad299aa569a))
* use ./plugin source path in marketplace.json (plannotator pattern) ([a65abe1](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/a65abe164dcb705d9ecceb31efaba705f7582cfc))
* use bd dep add instead of bd link for beads dependencies ([731bead](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/731bead2d39514213240b1e6b3a316de62d3436c))
* use correct CC hooks.json object format (was array) ([8c6b6e5](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/8c6b6e5e11e2f5e393b808b5fa82733ae2cbf4ba))
* use ESM import for yaml, move dependency to root package.json ([e76c726](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e76c726e0897063b3e26f37fec66d8356872765e))
* use relative source path in marketplace.json for CC plugin install ([0cc4df0](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/0cc4df06776f8cb8195afc1f30eda9b94949ca4a))
* use tff-tools command instead of node path in repair-branches ([#64](https://github.com/MonsieurBarti/The-Forge-Flow-CC/issues/64)) ([e10a523](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/e10a523c651216caed2b4d886911e0b77c68a1e7))
* use URL source format in marketplace.json for CC plugin install ([97b5de6](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/97b5de669212139fac1928a8a3286107e65b89c5))
* wire state branch creation into project:init, milestone:create, and slice:create ([4bf328c](https://github.com/MonsieurBarti/The-Forge-Flow-CC/commit/4bf328c86d957cc18a7d86be7149f2e00e00180f))

## [0.8.3] - 2026-04-06

### Changed

- Bumped version to 0.8.3 across all files

## [0.8.2] - 2026-04-06

### Added

- **`state:repair-branches` command** — Scans all milestones and slices, creates any missing state branches
  - `--dry-run` flag to preview what would be created
  - Reports created/failed/skipped counts
  - Idempotent — safe to run multiple times

### Fixed

- **State branch Result checking** — Fixed in 0.8.1, now users can repair any previously broken projects

### Changed

- Bumped version to 0.8.2 across all files

## [0.8.1] - 2026-04-06

### Fixed

- **State branch creation now properly reports errors** — Previously, state branch fork/create operations failed silently because the Result type was not being checked
  - `create-milestone.ts`: Now checks Result from `stateBranch.fork()` and logs warning on failure
  - `create-slice.ts`: Now checks Result from `stateBranch.fork()` and logs warning on failure  
  - `init-project.ts`: Now checks Result from `stateBranch.createRoot()` and logs warning on failure

### Changed

- Bumped version to 0.8.1 across all files:
  - `package.json`
  - `plugin/.claude-plugin/plugin.json`
  - `src/cli/index.ts` (CLI version string)

## [0.8.0] - 2026-04-05

### Added

- **M002 — Workflow Adherence & Enforcement:** Graduated enforcement ensuring AI agents follow structured workflows
  - **S01 — Session State Reminder:** Injects context at session start (milestone, slice, phase, wave position)
  - **S02 — Workflow Guard Hook:** PreToolUse detection of direct edits without `/tff:quick`, injects advisory warnings
  - **S03 — Phase Boundary Detection:** SPEC.md edit detection outside `/tff:discuss` workflow with recovery hints
  - **S04 — Pre-Op Validation Gates:** Hard BLOCK on `/tff:*` commands when status prerequisites not met
  - **S05 — State Machine Enforcement:** Invalid slice transitions rejected with valid next-step guidance
- **M001 — State Sync & Recovery Infrastructure:** Tiered crash recovery and synchronization
  - **S01 — Journal System + T1 Recovery:** Task lifecycle journal with checkpoint replay
  - **S02 — Lockfile Serialization:** Concurrent sync operations serialize safely
  - **S03 — State Consistency Gates:** Branch guard with `BRANCH_MISMATCH` errors
  - **S04 — T2/T3 Recovery + `/tff:repair`:** Tiered recovery for complete state restoration
- **Plugin Distribution:** Zero-install CLI with native bindings for 5 platforms
- **Compressed Notation:** Formal logic symbols (∀∃∈∧∨¬) applied to markdown files

### Infrastructure

- 1582 tests passing (Node 20 & 22)
- `.gsd/` → `.tff/` references updated in source code

## [0.7.0] - 2026-03-23

### Added

- **S01**: 5 new skills from agent conversions (stress-testing-specs, architecture-review, acceptance-criteria-validation, codebase-documentation, skill-authoring)
- **S02**: 2 new skills from superpowers (verification-before-completion, receiving-code-review)
- **S03**: 3 new skills for plan/execute/ship (writing-plans, executing-plans, finishing-work)
- **S05**: Agent-authoring skill with standardized template
- **S09**: `layer-rules.md` supporting file for hexagonal-architecture

### Changed

- **S04**: 4 skill rewrites with HARD-GATE + enhanced commit-conventions (TDD, systematic-debugging, brainstorming, code-review-protocol)
- **S06**: 4 agents rewritten as lean identity-only; 9 agents deleted (methodology moved to skills)
- **S07**: All 13+ workflows updated to use skill-loading instead of agent-spawning
- **S08**: Config extraction (beads.timeout, autonomy.max-retries, jaccard-threshold), validate-skill allowlist security fix
- **S09 — Skills Architecture Reform**: All 18 skills restructured from `skills/<name>.md` to `skills/<name>/SKILL.md` folder convention; all skills decoupled from TFF-specific commands, paths, agent names, and tier terminology (S-tier/F-lite/F-full → simple/standard/complex); `token-budget` frontmatter removed; hexagonal-architecture fully rewritten with DDD + CQRS patterns; all references updated across workflows, agents, README, and integration tests
- **Agent count**: 13 → 4 (lean identity-only agents; methodology now in skills)

### Security

- **S08**: validate-skill allowlist restricts command patterns

## [0.6.0] - 2026-03-22

### Added

- **R02 — riskLevel signal:** Complexity classification now detects risk signals (concurrency, security, data migration) that force automatic tier upgrades (S09)
- **S06 — Git hooks:** lefthook pre-commit with biome lint/format checks
- **S08 — CI expansion:** CI pipeline runs on all PRs with lint step
- **S10/S11 — Cleanup automation:** Auto-rebase milestone branch on slice close

### Changed

- **R01 — Classification timing:** Classification moved to end of discuss phase; orchestrator proposes tier, user confirms via AskUserQuestion (S02)
- **R02 — S-tier criteria:** S-tier restricted to single-file changes, no new files, no architecture impact, root cause known (S01)
- **R03 — User-confirmed classification:** `slice:classify` output is a suggestion, not auto-routing; no workflow step auto-skipped (S02, S03)
- **R04 — Unified pipeline:** All tiers follow same pipeline (discuss → research → plan → execute → verify → ship); tiers control depth, not skipping (S03)
- **R05 — Quick/debug alignment:** Quick and debug become entry-point shortcuts that converge on standard plan → execute → ship (S04)
- **Removed `.tff/` from git tracking** — internal project state is no longer version-controlled

### Fixed

- **R06 — Milestone numbering:** Fixed to use `--all` flag for closed beads in numbering scans (S05)

## [0.5.3] - 2026-03-22

### Added

- Bead-vs-PR reconciliation in `/tff:health` — detects stale beads whose PRs are already merged
- Error handling convention (rule 6) in orchestrator pattern — all tff-tools calls must check `ok` field
- Explicit error checks after state transitions in discuss, research, plan, execute, verify workflows
- Plan Review column in complexity tiers — plannotator review mandatory for ALL tiers including S-tier

### Changed

- **Directory restructure**: `.tff/slices/<id>/` → `.tff/milestones/<M0X>/slices/<id>/`
- **Requirements scoped per milestone**: `.tff/REQUIREMENTS.md` → `.tff/milestones/<M0X>/REQUIREMENTS.md`
- `quick.md` and `debug.md` now include plannotator-annotate plan review step (was skipped)
- `discuss-slice.md` S-tier shortcut skips discuss+research but still requires plan approval
- `milestone:create` derives number from highest existing `M(\d+)` instead of count (same as S12 slice fix)

### Fixed

- Milestone numbering: `milestone:create` produced duplicate M01 because `bd list` excludes closed beads
- Path traversal guard in `MarkdownArtifactAdapter.resolve()` — rejects `../` escape attempts
- Dolt remote validation — `doltPush`/`doltPull` reject non-alphanumeric remote names (prevents flag injection)

### Security

- Path traversal: resolved path must start with basePath (defense-in-depth)
- Dolt remote: validates against `^[a-zA-Z0-9_-]+$` before `execFile`

## [0.5.2] - 2026-03-22

### Changed

- Project init (`/tff:new`) no longer creates requirements or first milestone — just PROJECT.md + settings.yaml, then suggests `/tff:new-milestone`
- Requirements are now scoped per-milestone, written during `/tff:new-milestone`

### Fixed

- All shipping workflows (ship, quick, debug, complete-milestone) now close beads after PR merge via AskUserQuestion merge gate
- complete-milestone closes all slice beads (verifying PR merge status) before creating milestone PR
- Removed impossible "all slices closed" prerequisite from complete-milestone (replaced by auto-closure step)

## [0.5.1] - 2026-03-22

### Fixed

**CLI Tooling (R01)**
- S01: Corrected misused error codes and version drift across CLI commands
- S04: Replaced hardcoded 2s init delay with readiness retry loop (up to 5 attempts)
- S12: Derive slice number from highest existing ID instead of bead count
- S14: Parse `--title` flag and skip unknown flags in `slice:create` (was treating `--milestone` as slice name)

**Dual-State Coordination (R03)**
- S03: Fixed `InMemoryBeadStore.ready()` dependency resolution and typed dolt-sync
- S06: Read actual bead status in `slice:transition` instead of stale cached value
- S07 (beads): Register tff custom statuses with beads on project init

**Workflow Orchestration (R02)**
- S07 (plannotator): Standardized all plannotator invocations to use Skill tool instead of raw bash commands (5 workflows + skill reference)
- S09: Enforce `.tff/worktrees/` path in quick and debug workflows with explicit `tff-tools worktree:create` calls
- S11: Make auto-transition instructions explicit in all workflows (read settings, check autonomy mode)

**Observability (R06)**
- S02: Added `tffWarn` helper and surfaced swallowed errors in beads adapter
- S13: Fixed PostToolUse hook path resolution — use `${CLAUDE_PLUGIN_ROOT}` instead of relative path

**Dual-State Persistence (R03)**
- S10: Auto-generate STATE.md and save checkpoints after slice transitions

**Documentation**
- S05: Fixed Dolt remote setup instructions in new-project workflow

**Security**
- Removed `.beads/.beads-credential-key` from git tracking and added to `.gitignore`

## [0.5.0] - 2026-03-22

### Added

**Debug Flow**
- `/tff:debug` command — two-phase diagnose→fix workflow for systematic bug investigation
- `debugging-methodology` skill — Track A (reproducible error) and Track B (symptom-based) diagnostic methodology
- Phase 1 (diagnose) runs without creating a slice; Phase 2 creates S-tier slice only after root cause confirmed
- External root cause detection — exits with diagnostic report and workaround suggestions instead of entering fix phase

**Existing-Repo Onboarding**
- `/tff:new` detects existing source files via common extension heuristic (23 extensions)
- Consent-gated codebase analysis — runs `map-codebase` only with user approval
- Synthesizes proposed project name, vision, and requirements from generated docs
- Pre-fills project setup with user-validated values; graceful fallback on analysis failure
- `map-codebase` prerequisite relaxed to allow running before project init

**Settings UX**
- Default `settings.yaml` generated during `/tff:new` with inline YAML comments explaining every field
- `references/settings-template.md` — canonical commented template (single source of truth)
- `/tff:settings` expanded to manage all sections: model-profiles, autonomy, auto-learn, dolt
- Missing-field detection — offers to add new fields with defaults to existing configs
- `ProjectSettingsSchema` — full-file Zod schema with resilient per-field defaults via `.catch()`
- `loadProjectSettings()` — end-to-end YAML string → settings with graceful corruption handling

### Changed

- Autonomy default changed from `plan-to-pr` to `guided` (safest for new projects)
- `/tff:settings` description updated to reflect expanded scope

### Fixed

- Dolt auto-sync in `slice-transition.cmd.ts` replaced naive `includes('auto-sync: true')` substring matching with proper parsed settings — commented-out dolt config no longer falsely triggers sync

## [0.4.0] - 2026-03-21

### Added

**Team Portability (Plan C)**
- Beads-to-git snapshot serialization (`snapshot:save`, `snapshot:load`, `snapshot:merge`)
- Delta-based JSONL snapshots with periodic compaction on `/tff:sync`
- Auto-snapshot on every slice transition
- `MarkdownBeadAdapter` -- full `BeadStore` implementation for graceful degradation without Dolt
- `bead-adapter-factory` -- auto-detects bd availability, falls back to markdown-only mode
- 12 CLI commands migrated from hardcoded `BdCliAdapter` to factory
- 3-way entity-level snapshot merge with git merge driver (`.gitattributes`)
- Field-level conflict resolution: status (latest ts), design (flag conflict), deps (union), kvs (latest ts)
- `CONFLICT.md` generated for design conflicts requiring human resolution
- Clone-and-go: `/tff:init` hydrates beads from existing snapshot
- Dolt remote sync utilities (`doltPush`, `doltPull`, `shouldAutoSync`)
- Auto-push to Dolt remote on transitions when configured
- Guided Dolt remote setup during `/tff:new` (DoltHub, self-hosted, or skip)
- Git merge driver setup in `/tff:new` workflow
- Health check reports adapter mode (`beads: active` vs `beads: unavailable (markdown-only)`)
- `BeadStore` port contract tests (18 tests, reusable across adapters)
- `BeadSnapshot` value object with `createSnapshot`, `latestById`

**Interactive Design & Granular Planning (Plan D)**
- New `interactive-design` skill -- conversation methodology, spec templates (F-lite/F-full), spec-document-reviewer and plan-document-reviewer prompt templates
- Discuss workflow rewritten: orchestrator drives Q&A via AskUserQuestion → produces `SPEC.md`
- Brainstormer repurposed as spec challenger (F-full only), spawned after spec is drafted
- Product-lead validates acceptance criteria (∀ criterion: testable ∧ binary)
- Anonymous spec-document-reviewer dispatched via Agent tool (max 3 iterations)
- User gate before transition to researching
- Plan workflow rewritten: reads SPEC.md, maps file structure, produces bite-sized TDD tasks with exact code/paths/commands
- Task-to-acceptance-criteria traceability (AC1, AC2...)
- Anonymous plan-document-reviewer dispatched via Agent tool (max 3 iterations)
- Orchestrator pattern updated with conversation-driven workflow exception
- `SPEC.md` added to project directory conventions

### Changed

- Brainstormer agent: now purely spec challenger (removed legacy discussion driver mode)
- Beads positioned as essential: degraded mode warns users with clear install guidance
- All new content compressed with V3 formal notation style

### Fixed

- Marketplace.json: removed `version` field (not needed for CC plugin updates, caused stale cache)

## [0.3.1] - 2026-03-21

### Fixed

- Removed `version` from marketplace.json (not needed for CC plugin updates, caused stale cache issues)

## [0.3.0] - 2026-03-21

### Added

**Agent Intelligence**
- All 13 agents enriched with **Personality**, **Methodology**, and **Reads Before Acting** sections
- `tff-skill-drafter` agent (13th agent, added in 0.2.0) now has full personality profile
- `references/security-baseline.md` -- STRIDE threat categories and OWASP Top 10 quick reference for security-auditor

**Smarter Context Management**
- Token budget tiers (`critical` / `workflow` / `background`) on all 5 skill files
- Workflow SPAWN instructions rewritten to pass role-specific context (not full slice context)

**Auto-Learn Pipeline Hardening**
- Refinement cooldown metadata (`canRefine`, `recordRefinement`) with configurable 7-day cooldown
- Configurable scoring weights in `rankCandidates` (frequency, breadth, recency, consistency)
- Density-based clustering with Jaccard distance (replaces simple 70% co-activation threshold)
- Skill validation expansion: size limits, name collision detection, shell injection pattern warnings
- Property-based tests for scoring weight stability (fast-check)

**Autonomous Flow (plan-to-pr mode)**
- `autonomy.mode` setting: `guided` (V2 behavior) or `plan-to-pr` (auto-run from plan approval to PR)
- Workflow chaining: `nextWorkflow()` and `shouldAutoTransition()` use cases
- Escalation tasks: blocked agents create structured escalation context instead of stalling
- Auto-retry on verify failure (max 2, then escalate)
- Auto-fix loop on review findings (max 2 cycles, then escalate)
- Progress notifications: `[tff] M01-S02: <from> → <to>` at each transition
- 2 new CLI commands: `workflow:next`, `workflow:should-auto`

**Code Robustness**
- Git adapter TTL cache for `getCurrentBranch`/`getHeadSha` with invalidation on writes
- Beads adapter retry with exponential backoff (3 attempts, 500ms base, 4s max)
- Observation hook dead-letter resilience (failed appends captured, replayed on next success)
- Stricter beads `normalizeBeadData` validation (explicit checks for id/status fields)
- Sync reconciliation decomposed into testable helpers: `resolveContentConflict`, `resolveStatusConflict`, `detectOrphans`
- New status reconciliation behavior (bead wins for status -- previously only content was synced)
- Wave detection cycle errors now name the specific tasks involved
- Sort determinism documented in wave detection

**Test Coverage**
- 384 tests across 92 test files (up from ~300 in 0.2.0)
- Property-based tests for scoring (fast-check)
- Sync edge case tests (empty, partial, large orphan sets)
- Autonomous flow integration test (validates chain against state machine)
- Dead-letter shell test for observation hook
- Beads adapter retry tests
- Git adapter caching tests

### Changed

- All 13 agent `.md` files compressed with formal notation (∀, ∃, ∈, ∧, ∨, →) -- **45% character reduction**
- All 5 skill `.md` files compressed -- **31% character reduction**
- All 22 workflow `.md` files compressed -- **48% character reduction**
- Total markdown compression: **76,566 → 42,860 chars (45% reduction)**
- `detectClusters` API changed: accepts `Observation[]` instead of `CoActivation[]`
- `normalizeBeadData` now returns `Result<BeadData, DomainError>` instead of raw `BeadData`
- Auto-learn workflow CLI args now read from `.tff/settings.yaml`

### Fixed

- Configurable `minCount` in `aggregatePatterns` (was hardcoded default only)
- `checkDrift` custom `maxDrift` parameter verified working for 0.2 override

## [0.2.0] - 2026-03-21

### Added

- `sync:reconcile` -- full bidirectional markdown/beads reconciliation (5 new tests)
- Release checklist reference document (`references/release-checklist.md`)
- PR URLs always shown to user in ship-slice and complete-milestone workflows

### Changed

- **Beads adapter aligned with real `bd` CLI API** (validated against bd v0.61.0):
  - `bd create`: positional title, `-l` for labels, `--no-inherit-labels`
  - `bd show`: handle array response, normalize snake_case to camelCase
  - `bd dep add`: correct syntax (was `bd link`)
  - `bd update --claim`: atomic task claiming
  - `bd ready`: list unblocked tasks
  - `bd close --reason`: close with reason
  - `--stdin` support for descriptions with special characters
  - Increased timeout to 30s for Dolt auto-start
- Entity IDs changed from `z.uuid()` to `z.string().min(1)` (beads uses hash IDs, not UUIDs)
- `milestone:create` auto-detects project bead ID and auto-numbers milestones
- `slice:create` auto-detects active milestone and auto-numbers slices
- `project:init` calls `bd init --quiet` (idempotent) with stabilization delay
- Removed `review:record` CLI command (16 commands total, was 17)
- Plugin restructured for CC marketplace: `plugin/` subdirectory with symlinks
- tff **never merges** -- only creates PRs. User merges via GitHub.

### Fixed

- Hooks rewritten: removed Node.js hooks (caused PostToolUse/SessionStart errors), empty hooks.json
- Fixed label inheritance pollution (`--no-inherit-labels` in `bd create`)
- Fixed `normalizeBeadData` to find first `tff:` label in labels array
- Fixed build script: `tsc -p tsconfig.build.json`
- Fixed Zod v4 deprecation: `z.string().uuid()` replaced with `z.uuid()` then `z.string().min(1)`

### Removed

- `docs/` removed from git tracking (internal design specs/plans)
- Context monitor hook (caused errors, no bridge file writer exists)
- Dependency check hook (caused startup errors)

## [0.1.0] - 2026-03-21

### Added

**Domain Layer**
- `Result<T, E>` monad with `Ok`, `Err`, `isOk`, `isErr`, `match`
- Domain error types: `PROJECT_EXISTS`, `INVALID_TRANSITION`, `SYNC_CONFLICT`, `FRESH_REVIEWER_VIOLATION`, `NOT_FOUND`
- Domain events: `SLICE_PLANNED`, `SLICE_STATUS_CHANGED`, `TASK_COMPLETED`, `SYNC_CONFLICT`
- Value objects: `ComplexityTier` (S/F-lite/F-full), `SliceStatus` (state machine), `BeadLabel`, `CommitRef`, `Wave`, `SyncReport`
- Entities: `Project` (singleton per repo), `Milestone`, `Slice` (with state machine transitions), `Task` (with start/complete)
- Ports: `BeadStore`, `ArtifactStore`, `GitOps`, `ReviewStore`

**Application Layer**
- `initProject` -- singleton project enforcement
- `getProject` -- retrieve project data
- `createMilestone` / `listMilestones` -- milestone management with git branches
- `createSlice` -- slice creation with bead + markdown
- `transitionSlice` -- state machine transitions with bead sync
- `classifyComplexity` -- S/F-lite/F-full heuristic
- `detectWaves` -- topological sort for wave-based parallelism
- `enforceFreshReviewer` -- reviewer must not be executor
- `generateState` -- derive STATE.md from beads
- `saveCheckpoint` / `loadCheckpoint` -- execution resumability

**Infrastructure**
- `MarkdownArtifactAdapter` -- filesystem adapter for `.tff/` artifacts
- `BdCliAdapter` -- beads CLI wrapper
- `GitCliAdapter` -- git CLI wrapper with worktree support
- `ReviewMetadataAdapter` -- review tracking via beads KV
- In-memory test adapters for all ports

**CLI (`tff-tools.cjs`)**
- 16 commands: `project:init`, `project:get`, `milestone:create`, `milestone:list`, `slice:create`, `slice:transition`, `slice:classify`, `waves:detect`, `sync:state`, `sync:reconcile`, `worktree:create`, `worktree:delete`, `worktree:list`, `review:check-fresh`, `checkpoint:save`, `checkpoint:load`

**Plugin Layer**
- 24 slash commands (`/tff:new` through `/tff:help`, plus `/tff:quick`, `/tff:status`, `/tff:map-codebase`)
- 12 agent definitions (brainstormer, architect, product-lead, backend-dev, frontend-dev, devops, tester, code-reviewer, spec-reviewer, security-auditor, fixer, doc-writer)
- 17 workflow files (full lifecycle orchestration)
- 5 reference documents (conventions, model profiles, agent status protocol, orchestrator pattern, next-steps)
- 5 skills (hexagonal-architecture, test-driven-development, code-review-checklist, commit-conventions, plannotator-usage)
- CC marketplace manifest with `./plugin` source path

### Not Yet Implemented

- Skill auto-learn pipeline (designed, implementation pending)
