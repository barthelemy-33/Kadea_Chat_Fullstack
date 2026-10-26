/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
    router
      .post('forgot-password', [controllers.ForgotPasswords, 'store'])
      .as('forgot_password.store')
    router
      .get('forgot-password', [controllers.ForgotPasswords, 'create'])
      .as('forgot_password.create')
  })
  .use(middleware.guest())

router.get('verify-email/:token', [controllers.VerifyEmails, 'handle'])
router
  .get('reset-password/:token', [controllers.ResetPasswords, 'create'])
  .as('reset_password.create')
router
  .post('reset-password/:token', [controllers.ResetPasswords, 'store'])
  .as('reset_password.store')
router
  .group(() => {
    router.get('/dashboard', [controllers.Conversations, 'index']).as('dashboard')
    router.post('logout', [controllers.Session, 'destroy'])
    router.post('conversations', [controllers.Conversations, 'store']).as('conversations.store')
    router.get('conversations/:id', [controllers.Conversations, 'show']).as('conversations.show')
    router.post('conversations/:id/messages', [controllers.Messages, 'store']).as('messages.store')
    router.post('messages/:id/delete', [controllers.Messages, 'destroy']).as('messages.destroy')
    router.post('groups', [controllers.Conversations, 'storeGroup']).as('groups.store')
    router
      .post('conversations/:id/members', [controllers.GroupMembers, 'store'])
      .as('members.store')
    router
      .post('conversations/:id/members/:userId/remove', [controllers.GroupMembers, 'destroy'])
      .as('members.destroy')
    router.post('conversations/:id/leave', [controllers.GroupMembers, 'leave']).as('members.leave')
    router.post('messages/:id/update', [controllers.Messages, 'update']).as('messages.update')
    router.get('profile', [controllers.Profile, 'show']).as('profile.show')
    router.post('profile/name', [controllers.Profile, 'updateName']).as('profile.name')
    router.post('profile/password', [controllers.Profile, 'updatePassword']).as('profile.password')
    router.post('profile/avatar', [controllers.Profile, 'updateAvatar']).as('profile.avatar')
    router.get('users', [controllers.Conversations, 'directory']).as('users.index')
    router.get('groups/new', [controllers.Conversations, 'newGroup']).as('groups.new')
    router
      .post('conversations/:id/read', [controllers.Conversations, 'markRead'])
      .as('conversations.read')
    router.get('search', [controllers.Searches, 'index']).as('search')
    router
      .get('conversations/:id/reads', [controllers.Conversations, 'reads'])
      .as('conversations.reads')
  })
  .use(middleware.auth())

transmit.registerRoutes((route) => {
  if (route.getPattern() === '__transmit/subscribe') {
    route.middleware(middleware.auth())
  }
})
