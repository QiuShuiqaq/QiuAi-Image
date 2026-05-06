const { ipcMain } = require('electron')
const ipcChannels = require('../../../shared/ipcChannels')

function registerNegativePromptTemplateIpc({ negativePromptTemplateService }) {
  ipcMain.handle(ipcChannels.NEGATIVE_PROMPTS_LIST, () => {
    return negativePromptTemplateService.listTemplates()
  })

  ipcMain.handle(ipcChannels.NEGATIVE_PROMPTS_SAVE, async (_event, payload = {}) => {
    return negativePromptTemplateService.saveTemplate(payload)
  })

  ipcMain.handle(ipcChannels.NEGATIVE_PROMPTS_REMOVE, async (_event, payload = {}) => {
    await negativePromptTemplateService.removeTemplate(payload.id)
    return {
      ok: true
    }
  })
}

module.exports = registerNegativePromptTemplateIpc
