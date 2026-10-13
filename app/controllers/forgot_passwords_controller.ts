import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserToken from '#models/user_token'
import env from '#start/env'
import ResetPasswordNotification from '#mails/reset_password_notification'
import mail from '@adonisjs/mail/services/main'

export default class ForgotPasswordsController {
  // Affichage de la page
  async create({ view }: HttpContext) {
    return view.render('pages/auth/forgot_password')
  }

  // Création du token de réinitialisation et envoi de l'e-mail
  async store({ request, response, session }: HttpContext) {
    const email = request.input('email')
    const user = await User.findBy('email', email)

    if (user) {
      const token = await UserToken.generate(user, 'reset_password')
      const resetUrl = `${env.get('APP_URL')}/reset-password/${token}`
      await mail.send(new ResetPasswordNotification(user, resetUrl))
    }

    session.flash(
      'success',
      "Si cette adresse est associée à un compte, un lien de réinitialisation vient d'être envoyé."
    )
    return response.redirect().toRoute('session.create')
  }
}
