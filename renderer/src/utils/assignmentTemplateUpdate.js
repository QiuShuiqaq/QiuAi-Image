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

    return {
      ...item,
      templateId: template.id || '',
      imageType: template.name || '',
      prompt: template.prompt || ''
    }
  })
}
