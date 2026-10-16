import Conversation from '#models/conversation'
import type { HttpContext } from '@adonisjs/core/http'
import { messageValidator } from '#validators/message'
import Message from '#models/message'
import { DateTime } from 'luxon'
import transmit from '@adonisjs/transmit/services/main'

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

    const message = await Message.create({
      conversationId: conversation.id,
      senderId: auth.user!.id,
      content,
    })

    conversation.lastMessageAt = DateTime.now()
    await conversation.save()

    // Envoi du message à tous les abonnés du canal de cette conversation
    transmit.broadcast(`conversations/${conversation.id}/messages`, {
      type: 'new',
      id: message.id,
      content: message.content,
      senderName: auth.user!.fullName || auth.user!.email,
      time: message.createdAt.toFormat('HH:mm'),
    })

    await conversation.notifyMembers(auth.user!.id)

    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }
  async destroy({ response, params, auth }: HttpContext) {
    const message = await Message.findOrFail(params.id)
    const conversation = await Conversation.findOrFail(message.conversationId)

    if (message.senderId !== auth.user!.id || !(await conversation.isMember(auth.user!))) {
      return response.forbidden('Accès refusé')
    }

    const deletedAt = DateTime.now()
    message.deletedAt = deletedAt
    await message.save()

    transmit.broadcast(`conversations/${message.conversationId}/messages`, {
      type: 'deleted',
      id: message.id,
      deletedAt: deletedAt.toFormat('dd/MM à HH:mm'),
    })

    return response.redirect().toRoute('conversations.show', { id: message.conversationId })
  }

  async update({ params, request, response, auth }: HttpContext) {
    const message = await Message.findOrFail(params.id)
    const conversation = await Conversation.findOrFail(message.conversationId)

    // Seul l'auteur, sur un message non supprimé, et encore membre
    if (
      message.senderId !== auth.user!.id ||
      message.deletedAt ||
      !(await conversation.isMember(auth.user!))
    ) {
      return response.forbidden('Accès refusé')
    }

    const { content } = await request.validateUsing(messageValidator)

    message.content = content
    message.editedAt = DateTime.now()
    await message.save()

    transmit.broadcast(`conversations/${conversation.id}/messages`, {
      type: 'edited',
      id: message.id,
      content: message.content,
    })

    return response.redirect().toRoute('conversations.show', { id: conversation.id })
  }
}
