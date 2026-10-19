import { profileValidator, changePasswordValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { avatarValidator } from '#validators/user'
import cloudinary from '#services/cloudinary'

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
  async updateAvatar({ auth, request, response, session, logger }: HttpContext) {
    const { avatar } = await request.validateUsing(avatarValidator)
    const user = auth.user!

    try {
      const result = await cloudinary.uploader.upload(avatar.tmpPath!, {
        public_id: `kadea-chat/avatars/user-${user.id}`,
        overwrite: true,
        invalidate: true,
        transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'auto' }],
      })

      user.avatarUrl = result.secure_url
      await user.save()
      session.flash('success', 'Ta photo de profil a été modifiée.')
    } catch (error) {
      logger.error({ err: error }, "Échec de l'envoi de la photo vers Cloudinary")
      session.flash('error', "L'envoi de la photo a échoué, réessaie.")
    }

    return response.redirect().toRoute('profile.show')
  }
}
