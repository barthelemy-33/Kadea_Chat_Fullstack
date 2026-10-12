import { UserTokenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { createHash } from 'node:crypto'
import string from '@adonisjs/core/helpers/string'
import { DateTime } from 'luxon'

export default class UserToken extends UserTokenSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Fabrication du token

  static async generate(user: User, type: 'verify_email' | 'reset_password') {
    const token = string.random(64)
    const tokenHash = createHash('sha256').update(token).digest('hex')

    await this.create({
      userId: user.id,
      type: type,
      tokenHash: tokenHash,
      expiresAt: DateTime.now().plus({ hours: 24 }),
    })

    return token
  }
}
