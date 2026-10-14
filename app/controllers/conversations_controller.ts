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
    return view.render('pages/dashboard', { users, conversations, me: auth.user!.id })
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
