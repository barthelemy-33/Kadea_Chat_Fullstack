import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Conversation from '#models/conversation'

export default class ConversationsController {
  async index({ auth, view }: HttpContext) {
    const users = await User.query()
      .whereNot('id', auth.user!.id)
      .whereNotNull('emailVerifiedAt')
      .orderBy('fullName')

    const conversations = await auth
      .user!.related('conversations')
      .query()
      .whereNull('conversation_members.left_at')
      .preload('members')
      .orderByRaw('conversations.last_message_at DESC NULLS LAST')

    const conversationItems = []

    for (const conversation of conversations) {
      // Trouver l'autre membre
      let other: User | null = null
      for (const member of conversation.members) {
        if (member.id !== auth.user!.id) {
          other = member
        }
      }

      // Chercher le dernier message
      const lastMessage = await conversation
        .related('messages')
        .query()
        .orderBy('createdAt', 'desc')
        .first()

      // Préparer le nom, les initiales et la photo
      let title = 'Conversation'
      let initials = '?'
      let avatarUrl: string | null = null

      if (other) {
        title = other.fullName || other.email
        initials = other.initials
        avatarUrl = other.avatarUrl
      }

      // Préparer l'aperçu et la date
      let preview = 'Aucun message'
      let date = ''

      if (lastMessage) {
        if (lastMessage.deletedAt) {
          preview = 'Message supprimé'
        } else {
          preview = lastMessage.content || ''
        }
        date = lastMessage.createdAt.toFormat('dd/MM HH:mm')
      }

      // Ajouter l'objet à la liste
      conversationItems.push({
        id: conversation.id,
        title,
        initials,
        avatarUrl,
        preview,
        date,
      })
    }

    return view.render('pages/dashboard', { users, conversationItems })
  }
  async store({ auth, request, response, session }: HttpContext) {
    const me = auth.user!
    const other = await User.find(request.input('userId'))

    if (!other || other.id === me.id) {
      session.flash('error', 'Erreur est survenue, Veuillez réessayer')
      return response.redirect().toRoute('dashboard')
    }

    const conversation = await Conversation.findOrCreatePrivate(me, other)
    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }
  async show({ auth, view, params, response }: HttpContext) {
    const conversation = await Conversation.findOrFail(params.id)
    if (!(await conversation.isMember(auth.user!))) {
      return response.forbidden('Accès refusé')
    }

    const messages = await conversation
      .related('messages')
      .query()
      .preload('sender')
      .orderBy('createdAt', 'asc')

    return view.render('pages/conversations/show', { conversation, messages })
  }
}
