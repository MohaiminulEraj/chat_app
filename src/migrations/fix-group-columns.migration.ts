import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixGroupColumns1748706900000 implements MigrationInterface {
    name = 'FixGroupColumns1748706900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing tables if they have wrong column types
        await queryRunner.query(`DROP TABLE IF EXISTS "group_members" CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS "group_roles" CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS "group_settings" CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS "groups" CASCADE`)

        // Create groups table with correct UUID columns
        await queryRunner.query(`
            CREATE TABLE "groups" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "name" character varying NOT NULL,
                "description" character varying,
                "avatarUrl" character varying,
                "isPublic" boolean NOT NULL DEFAULT false,
                "inviteCode" character varying,
                "ownerId" uuid NOT NULL,
                CONSTRAINT "UQ_groups_uuid" UNIQUE ("uuid"),
                CONSTRAINT "PK_groups_id" PRIMARY KEY ("id")
            )
        `)

        // Create group_roles table
        await queryRunner.query(`
            CREATE TABLE "group_roles" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "name" character varying NOT NULL,
                "priority" integer NOT NULL DEFAULT 0,
                "permissions" jsonb NOT NULL,
                "color" character varying,
                CONSTRAINT "UQ_group_roles_uuid" UNIQUE ("uuid"),
                CONSTRAINT "PK_group_roles_id" PRIMARY KEY ("id")
            )
        `)

        // Create group_settings table
        await queryRunner.query(`
            CREATE TABLE "group_settings" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "allowTextMessages" boolean NOT NULL DEFAULT true,
                "allowVoiceMessages" boolean NOT NULL DEFAULT true,
                "allowImageMessages" boolean NOT NULL DEFAULT true,
                "allowVideoMessages" boolean NOT NULL DEFAULT true,
                "allowFileSharing" boolean NOT NULL DEFAULT true,
                "allowGifts" boolean NOT NULL DEFAULT true,
                CONSTRAINT "UQ_group_settings_uuid" UNIQUE ("uuid"),
                CONSTRAINT "PK_group_settings_id" PRIMARY KEY ("id")
            )
        `)

        // Create group_members table
        await queryRunner.query(`
            CREATE TABLE "group_members" (
                "id" SERIAL NOT NULL,
                "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "userId" uuid NOT NULL,
                "groupId" uuid NOT NULL,
                "roleId" uuid NOT NULL,
                "isMuted" boolean NOT NULL DEFAULT false,
                "mutedUntil" TIMESTAMP,
                CONSTRAINT "UQ_group_members_uuid" UNIQUE ("uuid"),
                CONSTRAINT "PK_group_members_id" PRIMARY KEY ("id")
            )
        `)

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "groups"
            ADD CONSTRAINT "FK_groups_ownerId"
            FOREIGN KEY ("ownerId") REFERENCES "users"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "group_roles"
            ADD CONSTRAINT "FK_group_roles_groupId"
            FOREIGN KEY ("groupId") REFERENCES "groups"("uuid") ON DELETE CASCADE ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "group_settings"
            ADD CONSTRAINT "FK_group_settings_groupId"
            FOREIGN KEY ("groupId") REFERENCES "groups"("uuid") ON DELETE CASCADE ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "group_members"
            ADD CONSTRAINT "FK_group_members_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("uuid") ON DELETE CASCADE ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "group_members"
            ADD CONSTRAINT "FK_group_members_groupId"
            FOREIGN KEY ("groupId") REFERENCES "groups"("uuid") ON DELETE CASCADE ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "group_members"
            ADD CONSTRAINT "FK_group_members_roleId"
            FOREIGN KEY ("roleId") REFERENCES "group_roles"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "group_members" CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS "group_settings" CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS "group_roles" CASCADE`)
        await queryRunner.query(`DROP TABLE IF EXISTS "groups" CASCADE`)
    }
}
