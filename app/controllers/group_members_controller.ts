import type { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class GroupMembersController {
  async store({ params, request, response, auth, session }: HttpContext) {
    const conversation = await Conversation.findOrFail(params.id)

    if (conversation.type !== 'group' || !(await conversation.isAdmin(auth.user!))) {
      return response.forbidden('Accès refusé')
    }

    const user = await User.query()
      .where('id', request.input('userId'))
      .whereNotNull('emailVerifiedAt')
      .first()

    if (!user) {
      session.flash('error', 'Utilisateur introuvable.')
      return response.redirect().toRoute('conversations.show', { id: conversation.id })
    }

    await conversation
      .related('members')
      .sync(
        { [user.id]: { role: 'member', joined_at: DateTime.now().toSQL(), left_at: null } },
        false
      )

    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }

  async destroy({ params, response, auth, session }: HttpContext) {
    const conversation = await Conversation.findOrFail(params.id)

    if (conversation.type !== 'group' || !(await conversation.isAdmin(auth.user!))) {
      return response.forbidden('Accès refusé')
    }

    const userId = Number(params.userId)

    if (userId === auth.user!.id) {
      session.flash('error', 'Tu ne peux pas te retirer toi-même.')
      return response.redirect().toRoute('conversations.show', { id: conversation.id })
    }

    await conversation
      .related('members')
      .pivotQuery()
      .where('user_id', userId)
      .update({ left_at: DateTime.now().toSQL() })

    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }

  async leave({ params, response, auth, session }: HttpContext) {
    const conversation = await Conversation.findOrFail(params.id)
    const me = auth.user!

    // Seulement un groupe, et seulement un membre
    if (conversation.type !== 'group' || !(await conversation.isMember(me))) {
      return response.forbidden('Accès refusé')
    }

    // Un admin ne peut pas quitter son groupe
    if (await conversation.isAdmin(me)) {
      session.flash('error', "L'administrateur ne peut pas quitter le groupe.")
      return response.redirect().toRoute('conversations.show', { id: conversation.id })
    }

    // Je quitte le groupe
    await conversation
      .related('members')
      .pivotQuery()
      .where('user_id', me.id)
      .update({ left_at: DateTime.now().toSQL() })

    session.flash('success', 'Tu as quitté le groupe.')
    return response.redirect().toRoute('dashboard')
  }
}
