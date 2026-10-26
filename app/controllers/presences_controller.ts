import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { touch, isOnline } from '#services/presence'

export default class PresenceController {
  async beat({ auth, response }: HttpContext) {
    const me = auth.user!.id
    touch(me)

    // Les autres membres de mes conversations privées
    const rows = await db
      .from('conversation_members as mine')
      .join('conversation_members as theirs', 'theirs.conversation_id', 'mine.conversation_id')
      .join('conversations', 'conversations.id', 'mine.conversation_id')
      .where('mine.user_id', me)
      .whereNull('mine.left_at')
      .where('theirs.user_id', '!=', me)
      .whereNull('theirs.left_at')
      .where('conversations.type', 'private')
      .select('theirs.user_id as userId')

    const online: number[] = []
    for (const row of rows) {
      if (isOnline(row.userId)) {
        online.push(row.userId)
      }
    }

    return response.json(online)
  }
}
