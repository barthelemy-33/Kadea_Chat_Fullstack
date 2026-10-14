import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Conversation from '#models/conversation'

export default class ConversationsController {
  async index({ auth, view }: HttpContext) {
    const users = await User.query()
      .whereNot('id', auth.user!.id)
      .whereNotNull('emailVerifiedAt')
      .orderBy('fullName')

    return view.render('pages/dashboard', { users })
  }
  async store({ auth, request, response, session }: HttpContext) {
    const me = auth.user!
    const other = await User.find(request.input('userId'))

    if (!other || other.id === me.id) {
      session.flash('error', 'Erreur est survenue, Veuillez réessayer')
      return response.redirect().toRoute('dashboard')
    }

    await Conversation.findOrCreatePrivate(me, other)

    return response.redirect().toRoute('dashboard')
  }
}
