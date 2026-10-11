import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.text('type').notNullable()
      table.string('name').nullable()
      table.text('avatar_url').nullable()
      table.integer('created_by').unsigned().notNullable()
      table.foreign('created_by').references('users.id').onDelete('RESTRICT')
      table.text('private_key').nullable().unique()
      table.timestamp('last_message_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
