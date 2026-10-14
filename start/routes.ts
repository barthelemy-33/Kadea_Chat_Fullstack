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
  })
  .use(middleware.auth())
