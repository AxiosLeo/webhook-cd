
'use strict';

/**
 * @param {import('@axiosleo/orm-mysql').MigrationInterface} migration
 */
function up(migration) {
  migration.createTable('webhook_status', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    platform: { type: 'varchar', length: 255 },
    team: { type: 'varchar', length: 255 },
    project: { type: 'varchar', length: 255 },
    coding_event: { type: 'varchar', length: 255 },
    event: { type: 'varchar', length: 255 },
    source: { type: 'varchar', length: 255 },
    target: { type: 'varchar', length: 255 },
    repo: { type: 'varchar', length: 255 },
    router: { type: 'varchar', length: 255 },
    status: { type: 'int', default: 0 },
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
