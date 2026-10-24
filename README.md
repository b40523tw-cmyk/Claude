# Long Life

用一副「投資組合」牌組，撐過人生一路上的財務難關。類「殺戮尖塔」的回合制卡牌肉鴿，網頁版先做、手機直式版面優先。

設計文件：<https://claude.ai/artifact/3r7zyhu3WLmQjZzpo3RGaV>（主頁、卡表、怪物、遺物）

## 目前進度：v0.1 第 1 章試玩版

- 五大主題全部 50 張卡 + 3 張起始卡，效果都已實作（未解鎖的卡在通關第 1 章後解鎖）
- 第 1 章「社會新鮮人」：5 場戰鬥，第 3 場小 BOSS 學貸、第 5 場大 BOSS 卡債循環利息；打完有休整點（存款回滿、免費移除卡、升級 1 張）
- 岔路只給氛圍暗示（約 70% 準）、商店（買卡／移除／升級／融合）、5 個黑色幽默事件
- 戰鬥後二選一：選卡或回復 20% 存款；大 BOSS 後 80% 掉遺物（3 選 1，可能混詛咒遺物）
- 圖鑑（怪物、卡牌、遺物）、進度存在瀏覽器裡可以接著玩
- 難度 0：每場只有 1 隻怪

還沒做：第 2、3 章、天賦樹、難度分階段、多隻怪同時出場、音效。

## 開發

```bash
npm install
npm run dev      # 本機開發伺服器
npm test         # 規則測試 + 自動模擬跑局（會印出各主題通關率）
npm run build    # 打包成單一 HTML：dist/index.html，以及給 Artifact 用的 dist/game.html
npm run shots    # 用 Playwright 截手機畫面到 shots/
```

## 程式結構

| 路徑 | 內容 |
| --- | --- |
| `src/data/cards.ts` | 50 張卡的數值、升級、描述與效果 |
| `src/data/monsters.ts` | 怪物存款、招式（意圖）與圖鑑小知識 |
| `src/data/relics.ts` | 遺物（通用、主題、詛咒） |
| `src/data/events.ts` | 岔路事件 |
| `src/engine/combat.ts` | 戰鬥規則：出牌、傷害、爆擊、狀態、怪物行動 |
| `src/engine/run.ts` | 一輪的流程：岔路、獎勵、商店、遺物 |
| `src/ui/` | Preact 介面與怪物插圖（SVG） |

數值都是設計文件裡的初稿，要調數值改 `src/data/` 底下的檔案即可。
