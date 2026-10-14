import vine from '@vinejs/vine'

export const groupValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(100),
  memberIds: vine.array(vine.number()).minLength(1),
})
