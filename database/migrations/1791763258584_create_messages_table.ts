import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('conversation_id').unsigned().notNullable()
      table.foreign('conversation_id').references('conversations.id').onDelete('CASCADE')
      table.integer('sender_id').unsigned().notNullable()
      table.foreign('sender_id').references('users.id').onDelete('RESTRICT')
      table.text('content').nullable()
      table.text('type').notNullable().defaultTo('text')
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Pour accelerer le chargement de l'historique d'une conversation
      table.index(['conversation_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
