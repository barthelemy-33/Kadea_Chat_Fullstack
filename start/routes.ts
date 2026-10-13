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
const ResetPasswordsController = () => import('#controllers/reset_passwords_controller')

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
  .get('reset-password/:token', [ResetPasswordsController, 'create'])
  .as('reset_password.create')
router.post('reset-password/:token', [ResetPasswordsController, 'store']).as('reset_password.store')
router
  .group(() => {
    router.on('/dashboard').render('pages/dashboard').as('dashboard')
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
