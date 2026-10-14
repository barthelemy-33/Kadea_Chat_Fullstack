import Conversation from '#models/conversation'
import type { HttpContext } from '@adonisjs/core/http'
import { messageValidator } from '#validators/message'
import Message from '#models/message'
import { DateTime } from 'luxon'

export default class MessagesController {
  async store({ request, response, params, auth }: HttpContext) {
    // Recherche de la conversation

    const conversation = await Conversation.findOrFail(params.id)

    // Verification d'user s'il fait partir une conversation

    if (!(await conversation.isMember(auth.user!))) {
      return response.forbidden('Accès refusé')
    }

    // Verification du message

    const { content } = await request.validateUsing(messageValidator)

    // Creation du message

    await Message.create({
      conversationId: conversation.id,
      senderId: auth.user!.id,
      content,
    })

    conversation.lastMessageAt = DateTime.now()
    await conversation.save()

    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }
}
