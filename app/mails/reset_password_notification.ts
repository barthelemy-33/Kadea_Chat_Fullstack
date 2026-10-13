import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

export default class ResetPasswordNotification extends BaseMail {
  subject = 'Réinitialise ton mot de passe'

  constructor(
    private user: User,
    private resetUrl: string
  ) {
    super()
  }

  prepare() {
    this.message.to(this.user.email)
    this.message.htmlView('emails/reset_password', {
      fullName: this.user.fullName,
      resetUrl: this.resetUrl,
    })
  }
}
