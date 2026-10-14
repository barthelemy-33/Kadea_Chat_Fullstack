import { ConversationSchema } from '#database/schema'
import { hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Message from '#models/message'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class Conversation extends ConversationSchema {
  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>

  @manyToMany(() => User, {
    pivotTable: 'conversation_members',
    pivotForeignKey: 'conversation_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['role', 'joined_at', 'left_at', 'last_read_message_id'],
  })
  declare members: ManyToMany<typeof User>

  static async findOrCreatePrivate(userA: User, userB: User) {
    const ids = [userA.id, userB.id].sort((a, b) => a - b)
    const privateKey = `${ids[0]}:${ids[1]}`

    const existing = await this.findBy('privateKey', privateKey)
    if (existing) {
      return existing
    }

    const conversation = await this.create({ type: 'private', createdBy: userA.id, privateKey })
    await conversation.related('members').attach({
      [userA.id]: { role: 'member', joined_at: DateTime.now().toSQL() },
      [userB.id]: { role: 'member', joined_at: DateTime.now().toSQL() },
    })
    return conversation
  }
  async isMember(user: User) {
    const membership = await (this as Conversation)
      .related('members')
      .query()
      .where('users.id', user.id)
      .whereNull('conversation_members.left_at')
      .first()

    return membership !== null
  }
}
