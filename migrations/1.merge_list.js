
'use strict';

/**
 * @param {import('@axiosleo/orm-mysql').MigrationInterface} migration
 */
function up(migration) {
  migration.createTable('merge_list', {
    uuid: { type: 'varchar', length: 255, uniqIndex: true },
    router: { type: 'varchar', length: 255, allowNull: false },
    platform: { type: 'varchar', length: 255, allowNull: false },
    team: { type: 'varchar', length: 255, allowNull: false },
    project: { type: 'varchar', length: 255, allowNull: false },
    source: { type: 'varchar', length: 255, allowNull: false },
    target: { type: 'varchar', length: 255, allowNull: false },
    repo: { type: 'varchar', length: 255, allowNull: false },
    status: { type: 'varchar', length: 20, default: 'wait' },
    created_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
  });
}

/**
 * @param {import('@axiosleo/orm-mysql').MigrationInterface} migration
 */
function down(migration) {
  migration.dropTable('merge_list');
}

module.exports = {
  up,
  down
};
