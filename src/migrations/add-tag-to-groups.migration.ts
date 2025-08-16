import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddTagToGroups1727123456789 implements MigrationInterface {
    name = 'AddTagToGroups1727123456789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'groups',
            new TableColumn({
                name: 'tag',
                type: 'varchar',
                isNullable: true
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('groups', 'tag')
    }
}
