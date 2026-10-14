import vine from '@vinejs/vine'

export const messageValidator = vine.create({
  content: vine.string().trim().minLength(1).maxLength(2000),
})
