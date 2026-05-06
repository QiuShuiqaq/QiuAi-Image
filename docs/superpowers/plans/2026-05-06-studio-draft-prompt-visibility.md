# Studio Draft Retention And Prompt Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep parameter drafts after task submission, persist the final prompt used for each generated image, and make per-image prompt inputs and outputs easier to read.

**Architecture:** Leave the current studio task queue in place, but stop resetting renderer drafts after submit. Extend result objects produced by the image generation service with `promptFinal`, then render that value under each image card. Align the series-design dedicated prompt input with the existing multi-line series-generate input.

**Tech Stack:** Vue 3 renderer, Electron main-process studio services, Vitest

---

### Task 1: Lock The New Submit Behavior In The Renderer

**Files:**
- Modify: `tests/renderer/appSource.test.js`
- Test: `tests/renderer/appSource.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
it('keeps the active draft after a task is submitted instead of resetting it', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'renderer/src/App.vue'), 'utf8')

  expect(source).toContain('const createdTask = await createStudioTask({')
  expect(source).not.toContain('await resetActiveDraftAfterSubmit()')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/renderer/appSource.test.js`
Expected: FAIL because `handleSubmitTask` still calls `resetActiveDraftAfterSubmit()`.

- [ ] **Step 3: Write minimal implementation**

```javascript
const createdTask = await createStudioTask({
  menuKey: activeMenu.value,
  draft: formDrafts.value[activeMenu.value]
})
upsertTaskIntoState(createdTask)
selectedExportIds.value = []
setSubmitButtonState('success')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/renderer/appSource.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/renderer/appSource.test.js renderer/src/App.vue
git commit -m "fix: keep studio drafts after submit"
```

### Task 2: Persist Final Prompts In Generated Results

**Files:**
- Modify: `tests/backend/test_studio_image_generation_service.test.js`
- Modify: `main/src/services/studioImageGenerationService.js`
- Test: `tests/backend/test_studio_image_generation_service.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
expect(result.comparisonResults[0].promptFinal).toBe('参考原图生成更强卖点表达的商品图\n强化光泽和层次感')
```

```javascript
expect(result.groupedResults[0].outputs[0].promptFinal).toBe(
  '统一高级电商详情页风格\n按商品主图生成：输出产品电商效果图，突出主体展示、卖点呈现与主视觉氛围；禁止偏离商品主体。\n突出产品整体外观和电商氛围'
)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/backend/test_studio_image_generation_service.test.js`
Expected: FAIL because result cards do not include `promptFinal`.

- [ ] **Step 3: Write minimal implementation**

```javascript
function createResultCardFromSavedImage(savedImage = {}, { id, model, title, promptSummary, sourceImageName, promptFinal = '' }) {
  return {
    id,
    model,
    title,
    preview: savedImage.previewUrl || '',
    promptSummary,
    promptFinal,
    sourceImageName,
    status: '已完成',
    savedPath: savedImage.savedPath || ''
  }
}
```

```javascript
function createSeriesOutputFromSavedImage(savedImage = {}, { id, title, model, sourceTag, promptFinal = '' }) {
  return {
    id,
    title,
    model,
    preview: savedImage.previewUrl || '',
    savedPath: savedImage.savedPath || '',
    sourceTag,
    promptFinal
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/backend/test_studio_image_generation_service.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/backend/test_studio_image_generation_service.test.js main/src/services/studioImageGenerationService.js
git commit -m "feat: persist final prompts in studio image results"
```

### Task 3: Render Final Prompts And Expand Dedicated Prompt Input

**Files:**
- Modify: `tests/renderer/resultDisplayPanelSource.test.js`
- Modify: `tests/renderer/designWorkspaceSource.test.js`
- Modify: `renderer/src/components/ResultDisplayPanel.vue`
- Modify: `renderer/src/components/ParameterSettingsPanel.vue`
- Test: `tests/renderer/resultDisplayPanelSource.test.js`
- Test: `tests/renderer/designWorkspaceSource.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
expect(source).toContain('发送提示词')
expect(source).toContain('promptFinal')
expect(source).toContain('rows=\"3\"')
```

```javascript
expect(source).toContain('图片专属提示词')
expect(source).toContain('<textarea')
expect(source).not.toContain('type=\"text\"')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/renderer/resultDisplayPanelSource.test.js tests/renderer/designWorkspaceSource.test.js`
Expected: FAIL because result cards do not render prompt boxes and the series-design dedicated prompt is still a single-line input.

- [ ] **Step 3: Write minimal implementation**

```vue
<label v-if="output.promptFinal" class="result-prompt-box">
  <span>发送提示词</span>
  <textarea :value="output.promptFinal" rows="3" readonly></textarea>
</label>
```

```vue
<textarea
  :value="assignment.prompt"
  rows="3"
  placeholder="输入当前图片的专属提示词"
  @input="updateAssignment(index, 'prompt', $event.target.value)"
></textarea>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/renderer/resultDisplayPanelSource.test.js tests/renderer/designWorkspaceSource.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/renderer/resultDisplayPanelSource.test.js tests/renderer/designWorkspaceSource.test.js renderer/src/components/ResultDisplayPanel.vue renderer/src/components/ParameterSettingsPanel.vue
git commit -m "feat: show final prompts under studio image results"
```

### Task 4: Final Verification

**Files:**
- Test: `tests/renderer/appSource.test.js`
- Test: `tests/backend/test_studio_image_generation_service.test.js`
- Test: `tests/renderer/resultDisplayPanelSource.test.js`
- Test: `tests/renderer/designWorkspaceSource.test.js`

- [ ] **Step 1: Run the focused suite**

Run: `npm test -- tests/renderer/appSource.test.js tests/backend/test_studio_image_generation_service.test.js tests/renderer/resultDisplayPanelSource.test.js tests/renderer/designWorkspaceSource.test.js`
Expected: PASS

- [ ] **Step 2: Confirm no submit-reset call remains**

Run: `rg -n "resetActiveDraftAfterSubmit" renderer/src/App.vue`
Expected: no match inside submit-success flow.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-06-studio-draft-prompt-visibility.md
git commit -m "docs: add studio draft retention implementation plan"
```
