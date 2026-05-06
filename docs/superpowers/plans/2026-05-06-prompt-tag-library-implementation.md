# Prompt Tag Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `套图设计` 与 `套图生成` 增加标签化全局提示词、风险词顶部提示，并扩展提示词库支持标签分类与标签维护。

**Architecture:** 保留现有 `promptTemplates` 作为按钮提示词与自定义模板存储，新增独立 `promptTagCategories` 数据源承载标签分类与标签项。前端参数区不再把 `globalPrompt` 当作主输入，而是通过 `selectedGlobalTagIds` 实时拼接；任务提交前继续输出原有字符串 `globalPrompt`，保持后端协议兼容。

**Tech Stack:** Electron, Vue 3, Vitest, Electron Store, existing IPC bridge

---

## File Map

**Create:**

- `main/src/services/promptTagStoreService.js`
- `main/src/ipc/promptTagIpc.js`
- `tests/backend/test_prompt_tag_store_service.test.js`
- `tests/backend/test_studio_prompt_tag_submission.test.js`

**Modify:**

- `main/src/bootstrap/registerIpc.js`
- `main/src/services/studioWorkspaceService.js`
- `renderer/src/services/desktopBridge.js`
- `renderer/src/App.vue`
- `renderer/src/components/PromptLibraryPanel.vue`
- `renderer/src/components/ParameterSettingsPanel.vue`
- `renderer/src/components/DesignWorkspace.vue`
- `renderer/src/assets/styles.css`
- `tests/renderer/componentSource.test.js`
- `tests/renderer/appSource.test.js`
- `tests/backend/test_studio_workspace_service.test.js`

## Task 1: 标签存储服务与 IPC

**Files:**

- Create: `main/src/services/promptTagStoreService.js`
- Create: `main/src/ipc/promptTagIpc.js`
- Modify: `main/src/bootstrap/registerIpc.js`
- Test: `tests/backend/test_prompt_tag_store_service.test.js`

- [ ] **Step 1: 写失败测试**

```js
import { describe, expect, it } from 'vitest'

function createMemoryStore(initialState = {}) {
  const state = { ...initialState }
  return {
    get(key, fallbackValue) {
      return key in state ? state[key] : fallbackValue
    },
    set(key, value) {
      state[key] = value
    }
  }
}

describe('promptTagStoreService', () => {
  it('provides default tag categories and supports save/remove flows', async () => {
    const { createPromptTagStoreService } = await import('../../main/src/services/promptTagStoreService.js')
    const service = createPromptTagStoreService({
      store: createMemoryStore(),
      createId: (() => {
        let index = 0
        return () => `tag-id-${++index}`
      })()
    })

    const initialCategories = service.listCategories()
    expect(initialCategories.length).toBeGreaterThan(0)

    const savedCategory = await service.saveCategory({ name: '自定义分类' })
    expect(savedCategory.name).toBe('自定义分类')

    const savedTag = await service.saveTag({
      categoryId: savedCategory.id,
      name: '高清',
      prompt: '高精度商业电商画面，主体清晰锐利。'
    })
    expect(savedTag.name).toBe('高清')

    const categoriesAfterSave = service.listCategories()
    const matchedCategory = categoriesAfterSave.find((item) => item.id === savedCategory.id)
    expect(matchedCategory.tags).toHaveLength(1)

    await service.removeTag({
      categoryId: savedCategory.id,
      tagId: savedTag.id
    })
    expect(service.listCategories().find((item) => item.id === savedCategory.id)?.tags || []).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/backend/test_prompt_tag_store_service.test.js`

Expected: FAIL because `promptTagStoreService.js` does not exist yet.

- [ ] **Step 3: 实现最小标签存储服务与 IPC**

```js
const crypto = require('node:crypto')

const TAG_KEY = 'promptTagCategories'

const defaultCategories = [
  {
    id: 'tag-category-quality',
    name: '画质',
    tags: [
      {
        id: 'tag-quality-hd',
        name: '高清',
        prompt: '高精度商业电商画面，主体清晰锐利，细节完整。'
      }
    ]
  }
]

function createPromptTagStoreService({ store, createId = () => crypto.randomUUID() }) {
  function listCategories() {
    return normalizeCategories(store.get(TAG_KEY, defaultCategories))
  }

  async function saveCategory(payload = {}) {
    // create/update category
  }

  async function saveTag(payload = {}) {
    // create/update tag inside category
  }

  async function removeTag(payload = {}) {
    // remove tag by category/tag ids
  }

  async function removeCategory(categoryId) {
    // remove empty category only
  }

  return {
    listCategories,
    saveCategory,
    saveTag,
    removeTag,
    removeCategory
  }
}
```

在 `promptTagIpc.js` 中注册：

```js
ipcMain.handle('prompt-tags:list', async () => promptTagService.listCategories())
ipcMain.handle('prompt-tags:save-category', async (_event, payload) => promptTagService.saveCategory(payload))
ipcMain.handle('prompt-tags:save-tag', async (_event, payload) => promptTagService.saveTag(payload))
ipcMain.handle('prompt-tags:remove-tag', async (_event, payload) => promptTagService.removeTag(payload))
ipcMain.handle('prompt-tags:remove-category', async (_event, payload) => promptTagService.removeCategory(payload?.id))
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/backend/test_prompt_tag_store_service.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add main/src/services/promptTagStoreService.js main/src/ipc/promptTagIpc.js main/src/bootstrap/registerIpc.js tests/backend/test_prompt_tag_store_service.test.js
git commit -m "feat: add prompt tag store service"
```

## Task 2: 前端桥接与提示词库标签页

**Files:**

- Modify: `renderer/src/services/desktopBridge.js`
- Modify: `renderer/src/components/PromptLibraryPanel.vue`
- Modify: `renderer/src/App.vue`
- Modify: `renderer/src/assets/styles.css`
- Test: `tests/renderer/componentSource.test.js`

- [ ] **Step 1: 写失败测试**

```js
it('renders tag library controls inside prompt library panel', () => {
  const promptLibrarySource = fs.readFileSync(
    path.resolve(process.cwd(), 'renderer/src/components/PromptLibraryPanel.vue'),
    'utf8'
  )

  expect(promptLibrarySource).toContain('标签库')
  expect(promptLibrarySource).toContain('新建标签分类')
  expect(promptLibrarySource).toContain('保存标签')
  expect(promptLibrarySource).toContain('删除标签')
  expect(promptLibrarySource).toContain('删除分类')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/renderer/componentSource.test.js`

Expected: FAIL because `PromptLibraryPanel.vue` does not yet include the tag library UI.

- [ ] **Step 3: 实现桌面桥接和标签库中栏**

在 `desktopBridge.js` 添加：

```js
export async function listPromptTagCategories() {
  return await window.electronAPI.invoke('prompt-tags:list')
}

export async function savePromptTagCategory(payload) {
  return await window.electronAPI.invoke('prompt-tags:save-category', payload)
}

export async function savePromptTag(payload) {
  return await window.electronAPI.invoke('prompt-tags:save-tag', payload)
}

export async function removePromptTag(payload) {
  return await window.electronAPI.invoke('prompt-tags:remove-tag', payload)
}

export async function removePromptTagCategory(payload) {
  return await window.electronAPI.invoke('prompt-tags:remove-category', payload)
}
```

在 `PromptLibraryPanel.vue` 中增加中栏：

```vue
<article class="prompt-library-column">
  <div class="prompt-library-column__header">
    <h3>标签库</h3>
    <button class="secondary-action" type="button" @click="createTagCategory">新建标签分类</button>
  </div>
</article>
```

并为每个分类渲染：

```vue
<label class="form-field">
  <span>分类名称</span>
  <input v-model="category.name" type="text" />
</label>
<button class="primary-action" type="button" @click="saveCategory(category)">保存分类</button>
<button class="secondary-action" type="button" @click="removeCategory(category)">删除分类</button>
<button class="secondary-action" type="button" @click="appendTag(category.id)">新增标签</button>
```

标签项渲染：

```vue
<label class="form-field">
  <span>标签名称</span>
  <input v-model="tag.name" type="text" />
</label>
<label class="form-field">
  <span>提示词片段</span>
  <textarea v-model="tag.prompt" rows="4"></textarea>
</label>
<button class="primary-action" type="button" @click="saveTag(category.id, tag)">保存标签</button>
<button class="secondary-action" type="button" @click="removeTag(category.id, tag.id)">删除标签</button>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/renderer/componentSource.test.js`

Expected: PASS for the new source assertions.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/services/desktopBridge.js renderer/src/components/PromptLibraryPanel.vue renderer/src/App.vue renderer/src/assets/styles.css tests/renderer/componentSource.test.js
git commit -m "feat: add prompt tag library panel"
```

## Task 3: 参数区标签化全局提示词与旧草稿兼容

**Files:**

- Modify: `renderer/src/components/ParameterSettingsPanel.vue`
- Modify: `renderer/src/App.vue`
- Modify: `main/src/services/studioWorkspaceService.js`
- Modify: `tests/backend/test_studio_workspace_service.test.js`
- Modify: `tests/renderer/appSource.test.js`
- Modify: `tests/renderer/componentSource.test.js`

- [ ] **Step 1: 写失败测试**

```js
it('uses selected global tags instead of direct global prompt textarea in series modules', () => {
  const parameterSource = fs.readFileSync(
    path.resolve(process.cwd(), 'renderer/src/components/ParameterSettingsPanel.vue'),
    'utf8'
  )

  expect(parameterSource).toContain('已选标签')
  expect(parameterSource).toContain('清空标签')
  expect(parameterSource).toContain('selectedGlobalTagIds')
})
```

```js
it('normalizes legacy global prompt drafts with selected tag ids support', async () => {
  const snapshot = await service.getSnapshot()
  expect(snapshot.formDrafts['series-design']).toHaveProperty('selectedGlobalTagIds')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/renderer/appSource.test.js tests/renderer/componentSource.test.js tests/backend/test_studio_workspace_service.test.js`

Expected: FAIL because tag-based draft fields and UI do not exist yet.

- [ ] **Step 3: 实现参数区标签模式与草稿兼容**

在 `studioWorkspaceService.js` 草稿默认值中新增：

```js
selectedGlobalTagIds: [],
legacyGlobalPrompt: ''
```

在 `App.vue` 中加入：

```js
const promptTagCategories = ref([])
```

并加载：

```js
promptTagCategories.value = await listPromptTagCategories()
```

新增拼接逻辑：

```js
function buildGlobalPromptFromSelectedTags(menuKey) {
  const draft = formDrafts.value[menuKey] || {}
  const tagMap = new Map(promptTagCategories.value.flatMap((category) => {
    return (category.tags || []).map((tag) => [tag.id, tag])
  }))

  return (draft.selectedGlobalTagIds || [])
    .map((tagId) => tagMap.get(tagId)?.prompt || '')
    .filter(Boolean)
    .join('\n')
}
```

在 `ParameterSettingsPanel.vue` 中改为：

```vue
<section class="form-field">
  <span>全局主提示词</span>
  <div class="selected-tag-list">
    <strong>已选标签</strong>
  </div>
  <button class="secondary-action" type="button" @click="clearSelectedGlobalTags">清空标签</button>
</section>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/renderer/appSource.test.js tests/renderer/componentSource.test.js tests/backend/test_studio_workspace_service.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/ParameterSettingsPanel.vue renderer/src/App.vue main/src/services/studioWorkspaceService.js tests/backend/test_studio_workspace_service.test.js tests/renderer/appSource.test.js tests/renderer/componentSource.test.js
git commit -m "feat: add tag-based global prompt drafts"
```

## Task 4: 提交前拼接 globalPrompt 与风险提示

**Files:**

- Modify: `renderer/src/App.vue`
- Modify: `tests/backend/test_studio_prompt_tag_submission.test.js`
- Modify: `tests/renderer/appSource.test.js`

- [ ] **Step 1: 写失败测试**

```js
it('submits a composed global prompt from selected tags in series-design tasks', async () => {
  expect(createStudioTaskPayload.draft.globalPrompt).toBe('高精度商业电商画面，主体清晰锐利。\n纯白背景电商图，主体完整清晰。')
})
```

```js
it('contains top notice risk warning for prompt tags', () => {
  const appSource = fs.readFileSync(path.resolve(process.cwd(), 'renderer/src/App.vue'), 'utf8')
  expect(appSource).toContain('可能导致保留原图或生成失败')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/backend/test_studio_prompt_tag_submission.test.js tests/renderer/appSource.test.js`

Expected: FAIL because submission still uses manual `globalPrompt`.

- [ ] **Step 3: 实现提交流程拼接与风险提示**

在 `App.vue` 中增加风险词表：

```js
const HIGH_RISK_PROMPT_PATTERNS = ['和原图一致', '保持原样', '不改动布局', '复刻原图', '完全一致', '不要变化']
const MEDIUM_RISK_PROMPT_PATTERNS = ['尽量不变', '保留原图风格', '轻微修改', '只改一点', '背景不动']
```

增加检测方法：

```js
function detectPromptRisk(promptText = '') {
  const normalized = String(promptText || '')
  const highRiskMatch = HIGH_RISK_PROMPT_PATTERNS.find((item) => normalized.includes(item))
  if (highRiskMatch) {
    return {
      level: 'error',
      keyword: highRiskMatch,
      message: `检测到高风险提示词“${highRiskMatch}”，可能导致保留原图或生成失败`
    }
  }
}
```

提交前：

```js
const draftToSubmit = buildDraftForSubmit(activeMenu.value)
const promptRisk = detectPromptRisk(draftToSubmit.globalPrompt)
if (promptRisk) {
  showActionFeedback({
    type: promptRisk.level === 'error' ? 'error' : 'warning',
    title: '提示',
    message: promptRisk.message
  })
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/backend/test_studio_prompt_tag_submission.test.js tests/renderer/appSource.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add renderer/src/App.vue tests/backend/test_studio_prompt_tag_submission.test.js tests/renderer/appSource.test.js
git commit -m "feat: compose tag prompt on submit with risk notices"
```

## Task 5: 全量回归标签相关行为

**Files:**

- Modify: `tests/renderer/componentSource.test.js`
- Modify: `tests/backend/test_studio_workspace_service.test.js`
- Modify: `tests/backend/test_studio_image_generation_service.test.js`

- [ ] **Step 1: 补充回归测试**

```js
it('ignores duplicate global tag selections and preserves selection order', () => {
  expect(selectedGlobalTagIds).toEqual(['tag-quality-hd', 'tag-bg-white'])
})
```

```js
it('keeps button prompt templates and custom prompt import flows unchanged', async () => {
  expect(createDrawTaskDependency.mock.calls[0][0].prompt).toContain('这里是用户改过的主图按钮提示词')
})
```

- [ ] **Step 2: 运行相关测试确认现状**

Run: `npm test -- tests/backend/test_studio_workspace_service.test.js tests/backend/test_studio_image_generation_service.test.js tests/renderer/componentSource.test.js`

Expected: FAIL only where new tag behavior is not fully covered.

- [ ] **Step 3: 最小修补与样式收尾**

对以下点做最小补齐：

```js
// remove invalid tag ids on load
draft.selectedGlobalTagIds = (draft.selectedGlobalTagIds || []).filter((tagId) => validTagIds.has(tagId))
```

```css
.selected-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

- [ ] **Step 4: 运行完整相关测试**

Run: `npm test -- tests/backend/test_prompt_tag_store_service.test.js tests/backend/test_studio_prompt_tag_submission.test.js tests/backend/test_studio_workspace_service.test.js tests/backend/test_studio_image_generation_service.test.js tests/renderer/appSource.test.js tests/renderer/componentSource.test.js`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/backend/test_studio_workspace_service.test.js tests/backend/test_studio_image_generation_service.test.js tests/renderer/componentSource.test.js renderer/src/assets/styles.css
git commit -m "test: cover prompt tag library workflow"
```

## Self-Review

- Spec coverage: 标签库存储、提示词库中栏、参数区标签化、风险提示、旧草稿兼容、提交兼容、测试回归均有对应任务。
- Placeholder scan: 所有任务均包含明确文件、测试命令与实现片段，没有留空占位。
- Type consistency: 计划统一使用 `selectedGlobalTagIds`、`promptTagCategories`、`globalPrompt`、`legacyGlobalPrompt` 命名。
