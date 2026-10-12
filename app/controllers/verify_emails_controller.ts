import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import UserToken from '#models/user_token'

export default class VerifyEmailsController {
  async handle({ params, response, session }: HttpContext) {
    const tokenHash = createHash('sha256').update(params.token).digest('hex')
    const userToken = await UserToken.query()
      .where('tokenHash', tokenHash)
      .where('type', 'verify_email')
      .whereNull('usedAt')
      .where('expiresAt', '>', DateTime.now().toSQL())
      .preload('user')
      .first()

    if (!userToken) {
      session.flash('error', 'Ce lien est invalide ou a expiré.')
      return response.redirect().toRoute('session.create')
    }

    // Confirmation de l'utilisateur
    const user = userToken.user
    user.emailVerifiedAt = DateTime.now()
    await user.save()

    // Marquer le token comme utilisé
    userToken.usedAt = DateTime.now()
    await userToken.save()

    session.flash('success', 'Ton adresse e-mail est confirmée, tu peux te connecter.')
    return response.redirect().toRoute('session.create')
  }
}
