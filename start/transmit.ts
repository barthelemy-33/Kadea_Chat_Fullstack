import transmit from '@adonisjs/transmit/services/main'
import Conversation from '#models/conversation'

transmit.authorize<{ id: string }>('conversations/:id/messages', async (ctx, { id }) => {
  const user = ctx.auth.user
  if (!user) {
    return false
  }

  const conversation = await Conversation.find(+id)
  if (!conversation) {
    return false
  }

  return conversation.isMember(user)
})
