import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import Conversation from '#models/conversation'
import { groupValidator } from '#validators/conversation'

export default class ConversationsController {
  /**
   * Prépare la liste des conversations affichée dans la colonne de gauche
   */
  private async buildItems(user: User) {
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

      items.push({ id: conversation.id, title, initials, avatarUrl, preview, date })
    }

    return items
  }

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

    const conversationItems = await this.buildItems(auth.user!)

    return view.render('pages/dashboard', { conversationItems, results, q })
  }

  async newGroup({ auth, view }: HttpContext) {
    const users = await User.query()
      .whereNot('id', auth.user!.id)
      .whereNotNull('emailVerifiedAt')
      .orderBy('fullName')

    const conversationItems = await this.buildItems(auth.user!)

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
    const conversationItems = await this.buildItems(auth.user!)

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
    const conversationItems = await this.buildItems(auth.user!)

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

  async storeGroup({ auth, request, response }: HttpContext) {
    const { name, memberIds } = await request.validateUsing(groupValidator)
    const conversation = await Conversation.createGroup(auth.user!, name, memberIds)
    await conversation.notifyMembers(auth.user!.id)

    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }
}
