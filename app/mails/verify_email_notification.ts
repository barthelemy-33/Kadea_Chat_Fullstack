import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

export default class VerifyEmailNotification extends BaseMail {
  subject = 'Confirme ton adresse e-mail'

  constructor(
    private user: User,
    private verifyUrl: string
  ) {
    super()
  }

  prepare() {
    this.message.to(this.user.email)
    this.message.htmlView('emails/verify_email', {
      fullName: this.user.fullName,
      verifyUrl: this.verifyUrl,
    })
  }
}
