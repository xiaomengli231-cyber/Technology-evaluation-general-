import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home page contains the product experience",async()=>{const source=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");assert.match(source,/把文献证据/);assert.match(source,/C1—C11/);assert.doesNotMatch(source,/codex-preview|SkeletonPreview/);});
test("catalog contains the complete technology taxonomy",async()=>{const source=await readFile(new URL("../lib/catalog.ts",import.meta.url),"utf8");assert.match(source,/污染底泥环保疏浚及处置/);assert.match(source,/原位钝化/);assert.match(source,/砷污染沉积物活性覆盖与稳定化/);assert.equal((source.match(/tech\("TECH-/g)??[]).length,12);});
test("C7 accepts 1—7 while C8 and C9 remain 1—5",async()=>{const source=await readFile(new URL("../lib/importer.ts",import.meta.url),"utf8");assert.match(source,/\[\["C7评分",7\],\["C8评分",5\],\["C9评分",5\]\]/);assert.match(source,/评分必须为 1—\$\{max\} 的整数/);});
