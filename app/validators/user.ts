import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/**
 * Validator to use when resetting a password
 */
export const resetPasswordValidator = vine.create({
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use when updating the profile name
 */
export const profileValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(100),
})

/**
 * Validator to use when changing the password
 */
export const changePasswordValidator = vine.create({
  currentPassword: vine.string(),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})
