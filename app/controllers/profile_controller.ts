import { profileValidator, changePasswordValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

export default class ProfileController {
  async show({ auth, view }: HttpContext) {
    return view.render('pages/profil/profil', { user: auth.user! })
  }

  async updateName({ auth, request, response, session }: HttpContext) {
    const { fullName } = await request.validateUsing(profileValidator)
    const user = auth.user!

    user.fullName = fullName
    await user.save()

    session.flash('success', 'Ton nom a été modifié.')
    return response.redirect().toRoute('profile.show')
  }

  async updatePassword({ auth, request, response, session }: HttpContext) {
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)
    const user = auth.user!

    const valid = await hash.verify(user.password, currentPassword)
    if (!valid) {
      session.flash('error', 'Le mot de passe actuel est incorrect.')
      return response.redirect().toRoute('profile.show')
    }

    user.password = password
    await user.save()

    session.flash('success', 'Ton mot de passe a été modifié.')
    return response.redirect().toRoute('profile.show')
  }
}
