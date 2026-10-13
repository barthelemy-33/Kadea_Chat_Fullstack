import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserToken from '#models/user_token'
import VerifyEmailNotification from '#mails/verify_email_notification'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

export default class NewAccountController {
  /**
   * Display the signup page
   */
  async create({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  /**
   * Create a new user account and send a confirmation email
   */
  async store({ request, response, session }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)
    const user = await User.create({ fullName, email, password })

    const token = await UserToken.generate(user, 'verify_email')

    const verifyUrl = `${env.get('APP_URL')}/verify-email/${token}`
    await mail.send(new VerifyEmailNotification(user, verifyUrl))
    session.flash('success', 'Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.')
    return response.redirect().toRoute('session.create')
  }
}
