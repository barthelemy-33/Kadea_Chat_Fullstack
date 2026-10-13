import type { HttpContext } from '@adonisjs/core/http'
import UserToken from '#models/user_token'
import { resetPasswordValidator } from '#validators/user'
import { DateTime } from 'luxon'

export default class ResetPasswordsController {
  async create({ params, view, response, session }: HttpContext) {
    const userToken = await UserToken.findValid(params.token, 'reset_password')

    if (!userToken) {
      session.flash('error', 'Ce lien est invalide ou a expiré.')
      return response.redirect().toRoute('session.create')
    }

    return view.render('pages/auth/reset_password', { token: params.token })
  }
  async store({ params, request, response, session }: HttpContext) {
    const { password } = await request.validateUsing(resetPasswordValidator)
    const userToken = await UserToken.findValid(params.token, 'reset_password')

    if (!userToken) {
      session.flash('error', 'Ce lien est invalide ou a expiré.')
      return response.redirect().toRoute('session.create')
    }

    // Changement du mot de passe
    const user = userToken.user
    user.password = password
    await user.save()

    // Marquer le token comme utilisé
    userToken.usedAt = DateTime.now()
    await userToken.save()

    session.flash('success', 'Mot de passe modifié avec succès.')
    return response.redirect().toRoute('session.create')
  }
}
