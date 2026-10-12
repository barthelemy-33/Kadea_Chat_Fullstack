import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversation_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('conversation_id').unsigned().notNullable()
      table.foreign('conversation_id').references('conversations.id').onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
      table.text('role').notNullable().defaultTo('member')
      table.timestamp('joined_at').notNullable()
      table.timestamp('left_at').nullable()
      table.integer('last_read_message_id').unsigned().nullable()
      table.foreign('last_read_message_id').references('messages.id').onDelete('SET NULL')

      // Clé primaire : une personne ne peut être membre d'une conversation qu'une seule fois
      table.primary(['conversation_id', 'user_id'])

      // Accélère « toutes les conversations d'un utilisateur »
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
