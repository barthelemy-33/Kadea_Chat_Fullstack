import vine, { SimpleMessagesProvider } from '@vinejs/vine'

vine.messagesProvider = new SimpleMessagesProvider(
  {
    // Messages par règle de validation
    'required': 'Le champ {{ field }} est obligatoire.',
    'string': 'Le champ {{ field }} doit contenir du texte.',
    'number': 'Le champ {{ field }} doit être un nombre.',
    'email': "Cette adresse e-mail n'est pas valide.",
    'minLength': 'Le champ {{ field }} doit contenir au moins {{ min }} caractères.',
    'maxLength': 'Le champ {{ field }} ne doit pas dépasser {{ max }} caractères.',
    'sameAs': 'Les deux mots de passe ne correspondent pas.',
    'array.minLength': 'Choisis au moins {{ min }} membre.',
    'database.unique': 'Cette adresse e-mail est déjà utilisée.',
    'file.size': 'Le fichier est trop lourd (maximum {{ size }}).',
    'file.extname': 'Format non accepté. Formats autorisés : {{ extnames }}.',
  },
  {
    // Noms lisibles des champs
    fullName: 'nom',
    email: 'adresse e-mail',
    password: 'mot de passe',
    passwordConfirmation: 'confirmation du mot de passe',
    currentPassword: 'mot de passe actuel',
    name: 'nom du groupe',
    memberIds: 'membres',
    content: 'message',
    avatar: 'photo',
  }
)
