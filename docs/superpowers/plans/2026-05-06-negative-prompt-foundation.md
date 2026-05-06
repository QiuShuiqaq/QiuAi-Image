# Negative Prompt Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-select negative prompt template pipeline for `series-design` and `series-generate`, and merge the selected negative constraints into the final submitted `prompt`.

**Architecture:** Keep the upstream draw API unchanged and add the feature inside QiuAi by storing `negativeTemplateId` and `negativePrompt` in studio drafts, adding a dedicated negative template store/bridge, and introducing a shared prompt-composition path in the studio image generation service. The renderer selects one negative template per supported mode, persists it, and the backend appends a normalized "strictly avoid" section into `promptFinal`.

**Tech Stack:** Electron, Vue 3, Node.js CommonJS services, Vitest, ESLint

---

## File Map

### Existing files to modify

- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\services\studioWorkspaceService.js`
  - Add default draft fields for `negativeTemplateId` and `negativePrompt` in `series-design` and `series-generate`.
  - Normalize missing legacy fields to empty strings.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\services\studioImageGenerationService.js`
  - Add negative prompt normalization and prompt assembly helpers.
  - Inject negative prompt text into `series-design` and `series-generate` `promptFinal`.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\App.vue`
  - Load/store negative template data.
  - Apply negative template selection into draft state for supported menus.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\components\ParameterSettingsPanel.vue`
  - Add the negative template single-select field to `series-design` and `series-generate`.
  - Emit the selected template id back to App state.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\components\PromptLibraryPanel.vue`
  - Move risk hint cards to the outermost right column.
  - Add a dedicated negative prompt template panel in the previous right content area.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\components\DesignWorkspace.vue`
  - Pass negative template props/events through to prompt library and parameter settings.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\services\desktopBridge.js`
  - Add browser fallback storage for negative prompt templates.
  - Add list/save/remove bridge functions.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\shared\ipcChannels.js`
  - Register negative template IPC channel names.

### New files to create

- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\services\negativePromptTemplateStoreService.js`
  - Dedicated negative prompt template store with 3 system defaults and custom save/remove flows.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\ipc\negativePromptTemplateIpc.js`
  - IPC registration for list/save/remove negative prompt templates.

### Existing tests to modify

- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\backend\test_studio_image_generation_service.test.js`
  - Add failing expectations for negative prompt text inclusion and no-inclusion cases.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\renderer\desktopBridge.test.js`
  - Add bridge/browser fallback tests for negative prompt template storage.
- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\renderer\componentSource.test.js`
  - Add source assertions for the new negative template UI and right-column relocation.

### New tests to create

- `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\backend\test_negative_prompt_template_store_service.test.js`
  - Verify default templates, single custom save, delete, and system-template protection.

## Task 1: Add Negative Prompt Template Store

**Files:**
- Create: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\services\negativePromptTemplateStoreService.js`
- Test: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\backend\test_negative_prompt_template_store_service.test.js`

- [ ] **Step 1: Write the failing store test**

```js
import { describe, expect, it } from 'vitest'

describe('negativePromptTemplateStoreService', () => {
  it('lists fixed negative templates and only allows deleting custom templates', async () => {
    const memory = new Map()
    const store = {
      get(key, fallbackValue) {
        return memory.has(key) ? memory.get(key) : fallbackValue
      },
      set(key, value) {
        memory.set(key, value)
      }
    }

    const { createNegativePromptTemplateStoreService } = await import('../../main/src/services/negativePromptTemplateStoreService.js')
    const service = createNegativePromptTemplateStoreService({
      store,
      createId: () => 'negative-template-new'
    })

    const defaults = service.listTemplates()

    expect(defaults.some((item) => item.name === '电商通用')).toBe(true)
    expect(defaults.some((item) => item.name === '电商模特')).toBe(true)
    expect(defaults.some((item) => item.name === '电商静物')).toBe(true)
    expect(defaults.every((item) => item.source === 'system-fixed' || item.source === 'custom')).toBe(true)

    const saved = await service.saveTemplate({
      name: '服饰细节限制',
      category: '反向提示词',
      prompt: '线头，穿模，印花错位，假褶皱'
    })

    expect(saved).toEqual({
      id: 'negative-template-new',
      name: '服饰细节限制',
      category: '反向提示词',
      prompt: '线头，穿模，印花错位，假褶皱',
      source: 'custom'
    })

    await service.removeTemplate('negative-template-new')
    expect(service.listTemplates().some((item) => item.id === 'negative-template-new')).toBe(false)

    await service.removeTemplate('negative-common')
    expect(service.listTemplates().some((item) => item.id === 'negative-common')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/backend/test_negative_prompt_template_store_service.test.js
```

Expected: FAIL with module-not-found for `negativePromptTemplateStoreService.js`.

- [ ] **Step 3: Write minimal implementation**

```js
const crypto = require('node:crypto')

const TEMPLATE_KEY = 'negativePromptTemplates'

const defaultTemplates = [
  {
    id: 'negative-common',
    name: '电商通用',
    category: '反向提示词',
    prompt: '水印，logo，文字，广告标，多余贴纸，杂乱背景，路人乱入，多余人物，画面变形，产品扭曲，边缘模糊，低清像素，反光杂乱，阴影错乱，拼接痕迹，瑕疵破损，掉色色差，多余杂物，构图歪斜，裁剪不全，噪点颗粒',
    source: 'system-fixed'
  },
  {
    id: 'negative-model',
    name: '电商模特',
    category: '反向提示词',
    prompt: '畸形身材，比例失调，歪脸丑脸，五官崩坏，大小眼，高低肩，驼背，假胸，肢体变形，多手指，手部崩坏，妆容怪异，发型杂乱，服装褶皱崩坏，衣服变形，走光，多余配饰，背景路人，水印文字，滤镜过度，假面网红脸，肤色斑驳',
    source: 'system-fixed'
  },
  {
    id: 'negative-still-life',
    name: '电商静物',
    category: '反向提示词',
    prompt: '产品变形，造型扭曲，破损裂痕，划痕瑕疵，色差严重，反光刺眼，倒影错乱，多余杂物，灰尘污渍，包装残缺，文字乱码，logo 乱印，边缘虚化，对焦不准，重叠产品，多余摆件，背景花哨，阴影脏乱，低质感塑料感',
    source: 'system-fixed'
  }
]

function normalizeTemplateItem(template = {}) {
  return {
    id: String(template.id || ''),
    name: String(template.name || ''),
    category: String(template.category || ''),
    prompt: String(template.prompt || ''),
    source: template.source === 'system-fixed' ? 'system-fixed' : 'custom'
  }
}

function mergeTemplates(templates = []) {
  const normalizedIncoming = Array.isArray(templates) ? templates.map(normalizeTemplateItem) : []
  const customTemplates = normalizedIncoming.filter((item) => item.source === 'custom' && item.id)
  const fixedTemplateMap = new Map(
    normalizedIncoming
      .filter((item) => item.source === 'system-fixed' && item.id)
      .map((item) => [item.id, item])
  )

  return [
    ...defaultTemplates.map((template) => ({
      ...template,
      ...(fixedTemplateMap.get(template.id) || {}),
      source: 'system-fixed'
    })),
    ...customTemplates
  ]
}

function normalizeTemplates(templates) {
  return mergeTemplates(Array.isArray(templates) ? templates : defaultTemplates)
}

function createNegativePromptTemplateStoreService({ store, createId = () => crypto.randomUUID() }) {
  function listTemplates() {
    return normalizeTemplates(store.get(TEMPLATE_KEY, defaultTemplates)).slice()
  }

  async function saveTemplate(payload = {}) {
    const existingTemplate = listTemplates().find((item) => item.id === payload.id)
    const isFixedTemplate = existingTemplate?.source === 'system-fixed'
    const template = {
      id: isFixedTemplate ? existingTemplate.id : (payload.id || createId()),
      name: String(payload.name || existingTemplate?.name || ''),
      category: String(payload.category || existingTemplate?.category || '反向提示词'),
      prompt: String(payload.prompt || ''),
      source: isFixedTemplate ? 'system-fixed' : 'custom'
    }
    const nextTemplates = [
      ...listTemplates().filter((item) => item.id !== template.id),
      template
    ]
    store.set(TEMPLATE_KEY, normalizeTemplates(nextTemplates))
    return template
  }

  async function removeTemplate(id) {
    const currentTemplates = listTemplates()
    const targetTemplate = currentTemplates.find((item) => item.id === id)
    if (targetTemplate?.source === 'system-fixed') {
      return
    }

    store.set(TEMPLATE_KEY, normalizeTemplates(currentTemplates.filter((item) => item.id !== id)))
  }

  return {
    listTemplates,
    saveTemplate,
    removeTemplate
  }
}

module.exports = {
  createNegativePromptTemplateStoreService,
  defaultTemplates
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm test -- tests/backend/test_negative_prompt_template_store_service.test.js
```

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```powershell
git add tests/backend/test_negative_prompt_template_store_service.test.js main/src/services/negativePromptTemplateStoreService.js
git commit -m "feat: add negative prompt template store"
```

## Task 2: Add Studio Prompt Composition With Negative Constraints

**Files:**
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\services\studioImageGenerationService.js`
- Test: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\backend\test_studio_image_generation_service.test.js`

- [ ] **Step 1: Write the failing tests for prompt composition**

Add these tests to `test_studio_image_generation_service.test.js`:

```js
  it('appends negative prompt constraints into series-design promptFinal', async () => {
    const createDrawTaskDependency = vi.fn(async ({ prompt }) => ({
      id: `remote-${createDrawTaskDependency.mock.calls.length}`,
      prompt
    }))
    const service = createService({
      createDrawTaskDependency
    })

    await service.generateImageResults({
      menuKey: 'series-design',
      taskId: 'task-series-design-negative-prompt',
      outputDirectory: 'C:/output',
      draft: {
        model: 'gpt-image-2',
        globalPrompt: '统一高级电商视觉风格',
        negativePrompt: '水印，logo，文字，低清像素',
        batchCount: 1,
        size: '1:1',
        imageAssignments: [
          {
            id: 'image-1',
            name: 'look-1.png',
            path: 'C:/input/look-1.png',
            selected: true,
            prompt: '突出产品主视觉效果',
            imageType: '商品主图'
          }
        ]
      }
    })

    expect(createDrawTaskDependency.mock.calls[0][0].prompt).toBe(
      '统一高级电商视觉风格\n按商品主图生成：输出产品电商效果图，突出主体展示、卖点呈现与主视觉氛围；禁止偏离商品主体。\n突出产品主视觉效果\n\n生成要求：\n保留商品主体清晰完整，输出商业电商用途图片。\n\n严格避免以下问题：\n水印，logo，文字，低清像素'
    )
  })

  it('does not append negative prompt section when series-generate negativePrompt is empty', async () => {
    const createDrawTaskDependency = vi.fn(async ({ prompt }) => ({
      id: `remote-${createDrawTaskDependency.mock.calls.length}`,
      prompt
    }))
    const service = createService({
      createDrawTaskDependency
    })

    await service.generateImageResults({
      menuKey: 'series-generate',
      taskId: 'task-series-generate-no-negative-prompt',
      outputDirectory: 'C:/output',
      draft: {
        model: 'gpt-image-2',
        sourceImage: {
          name: 'main.png',
          path: 'C:/input/main.png'
        },
        globalPrompt: '统一高级电商详情页风格',
        negativePrompt: '',
        generateCount: 1,
        batchCount: 1,
        promptAssignments: [
          { index: 1, prompt: '突出产品整体外观', imageType: '商品主图' }
        ],
        size: '1:1'
      }
    })

    expect(createDrawTaskDependency.mock.calls[0][0].prompt).toBe(
      '统一高级电商详情页风格\n按商品主图生成：输出产品电商效果图，突出主体展示、卖点呈现与主视觉氛围；禁止偏离商品主体。\n突出产品整体外观'
    )
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/backend/test_studio_image_generation_service.test.js
```

Expected: FAIL because the current service never appends the negative constraint block.

- [ ] **Step 3: Write minimal prompt composition helpers and wire them into series flows**

Add these helpers near `composePrompt`:

```js
function normalizeNegativePromptText(value = '') {
  const items = String(value || '')
    .replace(/[、,，]+/g, '，')
    .split('，')
    .map((item) => item.trim())
    .filter(Boolean)

  return [...new Set(items)].join('，')
}

function composePromptWithNegativeConstraints({
  positiveParts = [],
  negativePrompt = ''
} = {}) {
  const positivePrompt = composePrompt(positiveParts)
  const normalizedNegativePrompt = normalizeNegativePromptText(negativePrompt)

  if (!normalizedNegativePrompt) {
    return positivePrompt
  }

  return composePrompt([
    positivePrompt,
    '生成要求：\n保留商品主体清晰完整，输出商业电商用途图片。',
    `严格避免以下问题：\n${normalizedNegativePrompt}`
  ])
}
```

Replace the two series calls:

```js
const promptFinal = composePromptWithNegativeConstraints({
  positiveParts: [draft.globalPrompt, assignment.composedPrompt],
  negativePrompt: draft.negativePrompt
})
```

and:

```js
const promptFinal = composePromptWithNegativeConstraints({
  positiveParts: [draft.globalPrompt, promptAssignment.composedPrompt],
  negativePrompt: draft.negativePrompt
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
npm test -- tests/backend/test_studio_image_generation_service.test.js
```

Expected: PASS with all existing studio image generation tests still green.

- [ ] **Step 5: Commit**

```powershell
git add main/src/services/studioImageGenerationService.js tests/backend/test_studio_image_generation_service.test.js
git commit -m "feat: append negative prompt constraints to studio prompts"
```

## Task 3: Persist Negative Prompt Fields In Studio Drafts

**Files:**
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\services\studioWorkspaceService.js`
- Test: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\backend\test_studio_workspace_service.test.js`

- [ ] **Step 1: Write the failing workspace normalization test**

Add this test to `test_studio_workspace_service.test.js`:

```js
  it('normalizes missing negative prompt fields for legacy series drafts', async () => {
    const service = createStudioWorkspaceServiceForTest({
      initialSnapshot: {
        formDrafts: {
          'series-design': {
            taskName: '旧套图设计',
            globalPrompt: '统一风格'
          },
          'series-generate': {
            taskName: '旧套图生成',
            globalPrompt: '统一风格'
          }
        }
      }
    })

    const snapshot = await service.getSnapshot()

    expect(snapshot.formDrafts['series-design'].negativeTemplateId).toBe('')
    expect(snapshot.formDrafts['series-design'].negativePrompt).toBe('')
    expect(snapshot.formDrafts['series-generate'].negativeTemplateId).toBe('')
    expect(snapshot.formDrafts['series-generate'].negativePrompt).toBe('')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/backend/test_studio_workspace_service.test.js
```

Expected: FAIL because the normalized drafts currently do not define those fields.

- [ ] **Step 3: Write minimal draft default/normalization changes**

In `studioWorkspaceService.js`, update the default draft blocks for `series-design` and `series-generate`:

```js
negativeTemplateId: '',
negativePrompt: '',
```

Also make sure the corresponding normalization branches copy them forward:

```js
negativeTemplateId: draft.negativeTemplateId || '',
negativePrompt: draft.negativePrompt || '',
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm test -- tests/backend/test_studio_workspace_service.test.js
```

Expected: PASS with no regressions in the workspace test file.

- [ ] **Step 5: Commit**

```powershell
git add main/src/services/studioWorkspaceService.js tests/backend/test_studio_workspace_service.test.js
git commit -m "feat: persist negative prompt fields in studio drafts"
```

## Task 4: Add Negative Prompt Template IPC And Browser Bridge Fallback

**Files:**
- Create: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\main\src\ipc\negativePromptTemplateIpc.js`
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\shared\ipcChannels.js`
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\services\desktopBridge.js`
- Test: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\renderer\desktopBridge.test.js`

- [ ] **Step 1: Write the failing desktop bridge tests**

Add these tests:

```js
  it('falls back to browser storage for negative prompt templates when the bridge is unavailable', async () => {
    const storage = new Map()
    window.localStorage = {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null
      },
      setItem(key, value) {
        storage.set(key, value)
      }
    }

    const {
      listNegativePromptTemplates,
      saveNegativePromptTemplate,
      removeNegativePromptTemplate
    } = await import('../../renderer/src/services/desktopBridge.js')

    const defaults = await listNegativePromptTemplates()
    expect(defaults.some((item) => item.name === '电商通用')).toBe(true)

    const saved = await saveNegativePromptTemplate({
      name: '家居杂乱限制',
      category: '反向提示词',
      prompt: '灰尘，污渍，背景杂乱'
    })

    expect(saved.name).toBe('家居杂乱限制')

    await removeNegativePromptTemplate({
      id: saved.id
    })

    const nextList = await listNegativePromptTemplates()
    expect(nextList.some((item) => item.id === saved.id)).toBe(false)
  })

  it('invokes negative prompt template channels through the desktop bridge', async () => {
    const invoke = vi.fn().mockResolvedValue([])

    window.qiuai = {
      channels: {
        NEGATIVE_PROMPTS_LIST: 'negative-prompts:list',
        NEGATIVE_PROMPTS_SAVE: 'negative-prompts:save',
        NEGATIVE_PROMPTS_REMOVE: 'negative-prompts:remove'
      },
      invoke
    }

    const {
      listNegativePromptTemplates,
      saveNegativePromptTemplate,
      removeNegativePromptTemplate
    } = await import('../../renderer/src/services/desktopBridge.js')

    await listNegativePromptTemplates()
    await saveNegativePromptTemplate({ id: 'negative-common' })
    await removeNegativePromptTemplate({ id: 'negative-common' })

    expect(invoke).toHaveBeenNthCalledWith(1, 'negative-prompts:list', undefined)
    expect(invoke).toHaveBeenNthCalledWith(2, 'negative-prompts:save', { id: 'negative-common' })
    expect(invoke).toHaveBeenNthCalledWith(3, 'negative-prompts:remove', { id: 'negative-common' })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm test -- tests/renderer/desktopBridge.test.js
```

Expected: FAIL because the bridge exports and channels do not exist yet.

- [ ] **Step 3: Write minimal IPC/bridge implementation**

Add these channel constants in `shared/ipcChannels.js`:

```js
  NEGATIVE_PROMPTS_LIST: 'negative-prompts:list',
  NEGATIVE_PROMPTS_SAVE: 'negative-prompts:save',
  NEGATIVE_PROMPTS_REMOVE: 'negative-prompts:remove',
```

Create `main/src/ipc/negativePromptTemplateIpc.js`:

```js
const { ipcMain } = require('electron')
const ipcChannels = require('../../../shared/ipcChannels')

function registerNegativePromptTemplateIpc({ negativePromptTemplateService, activationGuard }) {
  ipcMain.handle(ipcChannels.NEGATIVE_PROMPTS_LIST, async () => {
    await activationGuard?.assertActivated?.()
    return negativePromptTemplateService.listTemplates()
  })

  ipcMain.handle(ipcChannels.NEGATIVE_PROMPTS_SAVE, async (_event, payload = {}) => {
    await activationGuard?.assertActivated?.()
    return negativePromptTemplateService.saveTemplate(payload)
  })

  ipcMain.handle(ipcChannels.NEGATIVE_PROMPTS_REMOVE, async (_event, payload = {}) => {
    await activationGuard?.assertActivated?.()
    return negativePromptTemplateService.removeTemplate(payload.id)
  })
}

module.exports = registerNegativePromptTemplateIpc
```

Add browser fallback storage and exports in `desktopBridge.js`:

```js
const BROWSER_NEGATIVE_PROMPTS_KEY = 'qiuai-browser-negative-prompts'
```

and:

```js
function getBrowserNegativePromptTemplates() { /* mirror prompt template fallback style */ }
function saveBrowserNegativePromptTemplate(payload = {}) { /* mirror prompt template fallback style */ }
function removeBrowserNegativePromptTemplate(payload = {}) { /* mirror prompt template fallback style */ }

export function listNegativePromptTemplates() {
  if (!hasBridge()) {
    return Promise.resolve(getBrowserNegativePromptTemplates())
  }
  return invoke(getChannel('NEGATIVE_PROMPTS_LIST'))
}

export function saveNegativePromptTemplate(payload) {
  if (!hasBridge()) {
    return Promise.resolve(saveBrowserNegativePromptTemplate(payload))
  }
  return invoke(getChannel('NEGATIVE_PROMPTS_SAVE'), payload)
}

export function removeNegativePromptTemplate(payload) {
  if (!hasBridge()) {
    return Promise.resolve(removeBrowserNegativePromptTemplate(payload))
  }
  return invoke(getChannel('NEGATIVE_PROMPTS_REMOVE'), payload)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
npm test -- tests/renderer/desktopBridge.test.js
```

Expected: PASS with all bridge tests green.

- [ ] **Step 5: Commit**

```powershell
git add shared/ipcChannels.js main/src/ipc/negativePromptTemplateIpc.js renderer/src/services/desktopBridge.js tests/renderer/desktopBridge.test.js
git commit -m "feat: add negative prompt template bridge"
```

## Task 5: Add Renderer State Wiring For Negative Template Selection

**Files:**
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\App.vue`
- Test: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\renderer\appSource.test.js`

- [ ] **Step 1: Write the failing app source assertions**

Add assertions to `tests/renderer/appSource.test.js`:

```js
    expect(appSource).toContain('listNegativePromptTemplates')
    expect(appSource).toContain('saveNegativePromptTemplate')
    expect(appSource).toContain('removeNegativePromptTemplate')
    expect(appSource).toContain('negativePromptTemplates')
    expect(appSource).toContain('negativeTemplateId')
    expect(appSource).toContain('negativePrompt')
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/renderer/appSource.test.js
```

Expected: FAIL because App does not yet wire negative template state.

- [ ] **Step 3: Write minimal App state integration**

In `App.vue`:

```js
import {
  listNegativePromptTemplates,
  saveNegativePromptTemplate,
  removeNegativePromptTemplate
} from './services/desktopBridge'
```

Add state:

```js
const negativePromptTemplates = ref([])
```

Load on startup:

```js
negativePromptTemplates.value = await listNegativePromptTemplates()
```

When updating `series-design` or `series-generate` with `negativeTemplateId`, resolve the template and set:

```js
const negativeTemplate = negativePromptTemplates.value.find((item) => item.id === nextDraft.negativeTemplateId)
nextDraft.negativePrompt = negativeTemplate?.prompt || ''
```

Pass props/events down into workspace children.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm test -- tests/renderer/appSource.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add renderer/src/App.vue tests/renderer/appSource.test.js
git commit -m "feat: wire negative prompt template state into app"
```

## Task 6: Add Negative Prompt UI To Parameter Settings And Prompt Library

**Files:**
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\components\ParameterSettingsPanel.vue`
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\components\PromptLibraryPanel.vue`
- Modify: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\renderer\src\components\DesignWorkspace.vue`
- Test: `F:\ProgramDevelopment\VSCODE\vscode\VSCode2026.4\workspace\Pro_QiuAi\QiuAi\tests\renderer\componentSource.test.js`

- [ ] **Step 1: Write the failing component source assertions**

Add assertions such as:

```js
    expect(parameterSource).toContain('反向提示词')
    expect(parameterSource).toContain('negativeTemplateOptions')
    expect(parameterSource).toContain("请选择反向提示词模板")
    expect(promptLibrarySource).toContain('反向提示词库')
    expect(promptLibrarySource).toContain('电商通用')
    expect(promptLibrarySource).toContain('电商模特')
    expect(promptLibrarySource).toContain('电商静物')
    expect(promptLibrarySource).toContain('以下词建议直接避免使用')
    expect(promptLibrarySource).toContain('以下词建议改写后再使用')
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- tests/renderer/componentSource.test.js
```

Expected: FAIL because the new UI text and bindings do not exist.

- [ ] **Step 3: Write minimal UI implementation**

In `ParameterSettingsPanel.vue`, add a computed:

```js
const negativeTemplateOptions = computed(() => {
  return Array.isArray(props.negativePromptTemplates) ? props.negativePromptTemplates : []
})
```

Add a single select to both supported modes:

```vue
<label class="form-field">
  <span>反向提示词</span>
  <select
    :value="draftForm.negativeTemplateId || ''"
    @change="emitField('negativeTemplateId', $event.target.value)"
  >
    <option value="">请选择反向提示词模板</option>
    <option v-for="template in negativeTemplateOptions" :key="template.id" :value="template.id">
      {{ template.name }}
    </option>
  </select>
</label>
```

In `PromptLibraryPanel.vue`, replace the old right content area with a negative template panel following the existing disclosure pattern:

```vue
<article class="prompt-library-column prompt-library-stack__panel">
  <div class="prompt-library-column__header">
    <h3>反向提示词库</h3>
  </div>
  <div class="prompt-library-column__body scrollbar-hidden prompt-library-column__body--full">
    <!-- disclosure cards mirroring system/custom prompt template layout -->
  </div>
</article>
```

Move `禁用词提示` and `警告词提示` into the outermost right stack.

In `DesignWorkspace.vue`, pass the new props/events through both prompt library and parameter settings.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm test -- tests/renderer/componentSource.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add renderer/src/components/ParameterSettingsPanel.vue renderer/src/components/PromptLibraryPanel.vue renderer/src/components/DesignWorkspace.vue tests/renderer/componentSource.test.js
git commit -m "feat: add negative prompt template ui"
```

## Task 7: Run Focused Regression, Lint, And Final Verification

**Files:**
- Modify: none expected
- Test: all files touched above

- [ ] **Step 1: Run focused regression tests**

Run:

```powershell
npm test -- tests/backend/test_negative_prompt_template_store_service.test.js tests/backend/test_studio_image_generation_service.test.js tests/backend/test_studio_workspace_service.test.js tests/renderer/desktopBridge.test.js tests/renderer/appSource.test.js tests/renderer/componentSource.test.js
```

Expected: PASS with all targeted tests green.

- [ ] **Step 2: Run broader smoke regression**

Run:

```powershell
npm test -- tests/renderer/assignmentTemplateUpdate.test.js tests/backend/test_prompt_template_store_service.test.js tests/backend/test_prompt_tag_store_service.test.js tests/backend/test_studio_workspace_service.test.js tests/backend/test_studio_image_generation_service.test.js tests/renderer/componentSource.test.js tests/renderer/appSource.test.js tests/renderer/desktopBridge.test.js
```

Expected: PASS with all listed files green.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Review final source for single-select enforcement**

Check these code conditions manually:

```js
// App draft update path overwrites the current id and prompt.
nextDraft.negativeTemplateId = value
nextDraft.negativePrompt = negativeTemplate?.prompt || ''
```

```vue
<!-- UI uses a single <select>, not checkbox or tag multi-select -->
<select :value="draftForm.negativeTemplateId || ''">
```

Expected: only one template can ever be active per supported mode.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat: add negative prompt foundation"
```
