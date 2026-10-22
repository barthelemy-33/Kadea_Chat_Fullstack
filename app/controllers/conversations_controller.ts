import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { groupValidator } from '#validators/conversation'
import { buildConversationItems } from '#services/conversation_list'

export default class ConversationsController {
  async index({ auth, view, request }: HttpContext) {
    const q = String(request.input('q', '')).trim()
    let results: User[] = []

    if (q.length >= 2) {
      results = await User.query()
        .whereNot('id', auth.user!.id)
        .whereNotNull('emailVerifiedAt')
        .where((query) => {
          query.whereILike('fullName', `%${q}%`).orWhereILike('email', `%${q}%`)
        })
        .orderBy('fullName')
        .limit(10)
    }

    const conversationItems = await buildConversationItems(auth.user!)

    return view.render('pages/dashboard', { conversationItems, results, q })
  }

  async newGroup({ auth, view }: HttpContext) {
    const users = await User.query()
      .whereNot('id', auth.user!.id)
      .whereNotNull('emailVerifiedAt')
      .orderBy('fullName')

    const conversationItems = await buildConversationItems(auth.user!)

    return view.render('pages/groups/new', { users, conversationItems })
  }

  async directory({ auth, view, request }: HttpContext) {
    const q = String(request.input('q', '')).trim()

    const query = User.query()
      .whereNot('id', auth.user!.id)
      .whereNotNull('emailVerifiedAt')
      .orderBy('fullName')

    if (q.length >= 1) {
      query.where((builder) => {
        builder.whereILike('fullName', `%${q}%`).orWhereILike('email', `%${q}%`)
      })
    }

    const users = await query
    const conversationItems = await buildConversationItems(auth.user!)

    return view.render('pages/users', { users, conversationItems, q })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const me = auth.user!
    const other = await User.find(request.input('userId'))

    if (!other || other.id === me.id) {
      session.flash('error', 'Une erreur est survenue, réessaie.')
      return response.redirect().toRoute('dashboard')
    }

    const conversation = await Conversation.findOrCreatePrivate(me, other)
    await conversation.notifyMembers(me.id)

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

    // J'ouvre la conversation : tout est lu jusqu'au dernier message
    if (messages.length > 0) {
      await conversation
        .related('members')
        .pivotQuery()
        .where('user_id', auth.user!.id)
        .update({ last_read_message_id: messages[messages.length - 1].id })
    }

    const members = await conversation
      .related('members')
      .query()
      .whereNull('conversation_members.left_at')
      .orderBy('fullName')

    const memberItems = []
    let title = conversation.name || 'Groupe'

    for (const member of members) {
      memberItems.push({
        id: member.id,
        name: member.fullName || member.email,
        role: member.$extras.pivot_role,
      })

      if (conversation.type === 'private' && member.id !== auth.user!.id) {
        title = member.fullName || member.email
      }
    }

    const currentIds = []
    for (const item of memberItems) {
      currentIds.push(item.id)
    }

    const candidates = await User.query()
      .whereNotNull('emailVerifiedAt')
      .whereNotIn('id', currentIds)
      .orderBy('fullName')

    const isAdmin = await conversation.isAdmin(auth.user!)
    const conversationItems = await buildConversationItems(auth.user!)

    let current = null
    for (const item of conversationItems) {
      if (item.id === conversation.id) {
        current = item
      }
    }

    return view.render('pages/conversations/show', {
      conversation,
      messages,
      me: auth.user!.id,
      title,
      memberItems,
      isAdmin,
      candidates,
      conversationItems,
      current,
    })
  }

  /**
   * Marque la conversation comme lue (appelée quand un message arrive
   * pendant que la conversation est ouverte)
   */
  async markRead({ auth, params, response }: HttpContext) {
    const conversation = await Conversation.findOrFail(params.id)
    if (!(await conversation.isMember(auth.user!))) {
      return response.forbidden('Accès refusé')
    }

    const last = await Message.query()
      .where('conversationId', conversation.id)
      .orderBy('id', 'desc')
      .first()

    if (last) {
      await conversation
        .related('members')
        .pivotQuery()
        .where('user_id', auth.user!.id)
        .update({ last_read_message_id: last.id })
    }

    return response.noContent()
  }

  async storeGroup({ auth, request, response }: HttpContext) {
    const { name, memberIds } = await request.validateUsing(groupValidator)
    const conversation = await Conversation.createGroup(auth.user!, name, memberIds)
    await conversation.notifyMembers(auth.user!.id)

    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }
}
