const EMPTY_IMAGE_TYPE_TEMPLATE_ID = 'system-empty-image-type'

function resolveImageTypeFromTemplate(template = null) {
  if (!template) {
    return ''
  }

  if (template.id === EMPTY_IMAGE_TYPE_TEMPLATE_ID) {
    return ''
  }

  return template.name || ''
}

function resolveNextBatchPrompts(item = {}, templatePrompt = '') {
  if (item.differentialEnabled === true && Array.isArray(item.batchPrompts)) {
    return item.batchPrompts.map(() => templatePrompt)
  }

  return item.batchPrompts
}

export function applyTemplateSelectionToAssignment({
  assignments = [],
  index = -1,
  template = null
} = {}) {
  return (Array.isArray(assignments) ? assignments : []).map((item, currentIndex) => {
    if (currentIndex !== index) {
      return item
    }

    if (!template) {
      return {
        ...item,
        templateId: '',
        imageType: ''
      }
    }

    const templatePrompt = template.prompt || ''

    return {
      ...item,
      templateId: template.id || '',
      imageType: resolveImageTypeFromTemplate(template),
      prompt: templatePrompt,
      batchPrompts: resolveNextBatchPrompts(item, templatePrompt)
    }
  })
}

export function applyTemplateSelectionToPromptAssignment({
  assignments = [],
  index = -1,
  template = null
} = {}) {
  return (Array.isArray(assignments) ? assignments : []).map((item, currentIndex) => {
    if (currentIndex !== index) {
      return item
    }

    if (!template) {
      return {
        ...item,
        templateId: '',
        imageType: ''
      }
    }

    const templatePrompt = template.prompt || ''

    return {
      ...item,
      templateId: template.id || '',
      imageType: resolveImageTypeFromTemplate(template),
      prompt: templatePrompt,
      batchPrompts: resolveNextBatchPrompts(item, templatePrompt)
    }
  })
}
