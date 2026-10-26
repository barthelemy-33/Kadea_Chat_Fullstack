import type { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'
import { buildConversationItems } from '#services/conversation_list'

export default class SearchController {
  /**
   * Coupe un message autour du mot cherché, pour l'afficher en extrait
   */
  private makeSnippet(text: string, q: string) {
    const clean = text.replace(/\s+/g, ' ').trim()
    const index = clean.toLowerCase().indexOf(q.toLowerCase())

    if (index === -1) {
      return { before: clean.slice(0, 90), match: '', after: '' }
    }

    const start = Math.max(0, index - 30)
    const end = Math.min(clean.length, index + q.length + 60)

    return {
      before: (start > 0 ? '…' : '') + clean.slice(start, index),
      match: clean.slice(index, index + q.length),
      after: clean.slice(index + q.length, end) + (end < clean.length ? '…' : ''),
    }
  }

  async index({ auth, view, request }: HttpContext) {
    const q = String(request.input('q', '')).trim()
    const conversationItems = await buildConversationItems(auth.user!)

    // Seules les conversations dont je fais partie peuvent être cherchées
    const ids: number[] = []
    const byId: Record<number, (typeof conversationItems)[number]> = {}
    for (const item of conversationItems) {
      ids.push(item.id)
      byId[item.id] = item
    }

    const results = []

    if (q.length >= 2 && ids.length > 0) {
      // Les caractères spéciaux de la recherche sont traités comme du texte
      const escaped = q.replace(/[\\%_]/g, '\\$&')

      const messages = await Message.query()
        .whereIn('conversationId', ids)
        .whereNull('deletedAt')
        .whereILike('content', `%${escaped}%`)
        .preload('sender')
        .orderBy('createdAt', 'desc')
        .limit(30)

      for (const message of messages) {
        const conversation = byId[message.conversationId]
        results.push({
          id: message.id,
          conversationId: message.conversationId,
          title: conversation.title,
          initials: conversation.initials,
          avatarUrl: conversation.avatarUrl,
          author:
            message.senderId === auth.user!.id
              ? 'Toi'
              : message.sender.fullName || message.sender.email,
          date: message.createdAt.toFormat('dd/MM HH:mm'),
          snippet: this.makeSnippet(message.content || '', q),
        })
      }
    }

    return view.render('pages/search', { conversationItems, results, q })
  }
}
