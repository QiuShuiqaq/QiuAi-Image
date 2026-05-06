const crypto = require('node:crypto')

const TEMPLATE_KEY = 'negativePromptTemplates'

const defaultNegativePromptTemplates = [
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
    category: String(template.category || '反向提示词'),
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
    ...defaultNegativePromptTemplates.map((template) => ({
      ...template,
      ...(fixedTemplateMap.get(template.id) || {}),
      source: 'system-fixed'
    })),
    ...customTemplates
  ]
}

function normalizeTemplates(templates) {
  return mergeTemplates(Array.isArray(templates) ? templates : defaultNegativePromptTemplates)
}

function createNegativePromptTemplateStoreService({ store, createId = () => crypto.randomUUID() }) {
  function listTemplates() {
    return normalizeTemplates(store.get(TEMPLATE_KEY, defaultNegativePromptTemplates)).slice()
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

    const nextTemplates = currentTemplates.filter((item) => item.id !== id)
    store.set(TEMPLATE_KEY, normalizeTemplates(nextTemplates))
  }

  return {
    listTemplates,
    saveTemplate,
    removeTemplate
  }
}

module.exports = {
  createNegativePromptTemplateStoreService,
  defaultNegativePromptTemplates
}
