import { DateTime } from 'luxon'
import type User from '#models/user'
import Message from '#models/message'

/**
 * Prépare la liste des conversations affichée dans la colonne de gauche,
 * avec le nombre de messages non lus pour l'utilisateur
 */
export async function buildConversationItems(user: User) {
  const conversations = await user
    .related('conversations')
    .query()
    .whereNull('conversation_members.left_at')
    .preload('members')
    .orderByRaw('conversations.last_message_at DESC NULLS LAST')

  const items = []

  for (const conversation of conversations) {
    let other: User | null = null
    for (const member of conversation.members) {
      if (member.id !== user.id) {
        other = member
      }
    }

    const lastMessage = await conversation
      .related('messages')
      .query()
      .orderBy('createdAt', 'desc')
      .first()

    // Nombre de messages non lus
    const lastRead = conversation.$extras.pivot_last_read_message_id || 0
    const joinedAt = conversation.$extras.pivot_joined_at

    const unreadQuery = Message.query()
      .where('conversationId', conversation.id)
      .whereNot('senderId', user.id)
      .whereNull('deletedAt')
      .where('id', '>', lastRead)

    if (joinedAt) {
      unreadQuery.where('createdAt', '>=', joinedAt)
    }

    const unreadRow = await unreadQuery.count('* as total').first()
    const unread = Number(unreadRow?.$extras.total || 0)

    let title = 'Conversation'
    let initials = '?'
    let avatarUrl: string | null = null

    if (conversation.type === 'group') {
      title = conversation.name || 'Groupe'
      initials = (conversation.name || 'G').slice(0, 2).toUpperCase()
    } else if (other) {
      title = other.fullName || other.email
      initials = other.initials
      avatarUrl = other.avatarUrl
    }

    let preview = 'Aucun message'
    let date = ''

    if (lastMessage) {
      if (lastMessage.deletedAt) {
        preview = 'Message supprimé'
      } else {
        preview = lastMessage.content || ''
      }

      if (lastMessage.createdAt.hasSame(DateTime.now(), 'day')) {
        date = lastMessage.createdAt.toFormat('HH:mm')
      } else {
        date = lastMessage.createdAt.toFormat('dd/MM')
      }
    }

    items.push({ id: conversation.id, title, initials, avatarUrl, preview, date, unread })
  }

  return items
}
