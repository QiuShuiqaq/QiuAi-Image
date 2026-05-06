const { ipcMain } = require('electron')
const ipcChannels = require('../../../shared/ipcChannels')

function registerPromptTagIpc({ promptTagService }) {
  ipcMain.handle(ipcChannels.PROMPT_TAGS_LIST, () => {
    return promptTagService.listCategories()
  })

  ipcMain.handle(ipcChannels.PROMPT_TAGS_SAVE_CATEGORY, async (_event, payload = {}) => {
    return promptTagService.saveCategory(payload)
  })

  ipcMain.handle(ipcChannels.PROMPT_TAGS_SAVE_TAG, async (_event, payload = {}) => {
    return promptTagService.saveTag(payload)
  })

  ipcMain.handle(ipcChannels.PROMPT_TAGS_REMOVE_TAG, async (_event, payload = {}) => {
    return promptTagService.removeTag(payload)
  })

  ipcMain.handle(ipcChannels.PROMPT_TAGS_REMOVE_CATEGORY, async (_event, payload = {}) => {
    return promptTagService.removeCategory(payload.id)
  })
}

module.exports = registerPromptTagIpc
