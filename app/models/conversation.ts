import { ConversationSchema } from '#database/schema'
import { hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Message from '#models/message'
import User from '#models/user'
import { DateTime } from 'luxon'
import transmit from '@adonisjs/transmit/services/main'

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

  static async createGroup(creator: User, name: string, memberIds: number[]) {
    // Garder seulement des utilisateurs qui existent, ont confirmé leur e-mail
    const members = await User.query()
      .whereIn('id', memberIds)
      .whereNot('id', creator.id)
      .whereNotNull('emailVerifiedAt')

    // Créer la conversation de type groupe
    const conversation = await this.create({ type: 'group', name, createdBy: creator.id })

    // Ajouter le créateur en admin
    await conversation.related('members').attach({
      [creator.id]: { role: 'admin', joined_at: DateTime.now().toSQL() },
    })

    // Ajouter les autres en membres, un par un
    for (const member of members) {
      await conversation.related('members').attach({
        [member.id]: { role: 'member', joined_at: DateTime.now().toSQL() },
      })
    }

    return conversation
  }

  async isAdmin(user: User) {
    const membership = await (this as Conversation)
      .related('members')
      .query()
      .where('users.id', user.id)
      .whereNull('conversation_members.left_at')
      .where('conversation_members.role', 'admin')
      .first()

    return membership !== null
  }

  async notifyMembers(exceptUserId: number) {
    const members = await (this as Conversation)
      .related('members')
      .query()
      .whereNull('conversation_members.left_at')

    for (const member of members) {
      if (member.id !== exceptUserId) {
        transmit.broadcast(`users/${member.id}`, { type: 'conversations_changed' })
      }
    }
  }
}
