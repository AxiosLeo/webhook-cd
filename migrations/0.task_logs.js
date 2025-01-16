
'use strict';

/**
 * @param {import('@axiosleo/orm-mysql').MigrationInterface} migration
 */
function up(migration) {
  migration.createTable('task_logs', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    router: { type: 'varchar', length: 255, allowNull: false },
    event: { type: 'varchar', length: 255, allowNull: false },
    trigger: { type: 'varchar', length: 20, allowNull: false },
    request: { type: 'json' },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
  });
}

/**
 * @param {import('@axiosleo/orm-mysql').MigrationInterface} migration
 */
function down(migration) {
  migration.dropTable('webhook_status');
}

module.exports = {
  up,
  down
};
