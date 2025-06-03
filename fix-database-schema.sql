-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing group tables to recreate with correct types
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS group_roles CASCADE;
DROP TABLE IF EXISTS group_settings CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Create groups table with UUID columns
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    uuid uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    name VARCHAR NOT NULL,
    description VARCHAR,
    "avatarUrl" VARCHAR,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "inviteCode" VARCHAR,
    "ownerId" uuid NOT NULL,
    FOREIGN KEY ("ownerId") REFERENCES users(uuid) ON DELETE RESTRICT
);

-- Create group_roles table
CREATE TABLE group_roles (
    id SERIAL PRIMARY KEY,
    uuid uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "groupId" uuid NOT NULL,
    name VARCHAR NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    permissions JSONB NOT NULL,
    color VARCHAR,
    FOREIGN KEY ("groupId") REFERENCES groups(uuid) ON DELETE CASCADE
);

-- Create group_settings table
CREATE TABLE group_settings (
    id SERIAL PRIMARY KEY,
    uuid uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "groupId" uuid NOT NULL,
    "allowTextMessages" BOOLEAN NOT NULL DEFAULT true,
    "allowVoiceMessages" BOOLEAN NOT NULL DEFAULT true,
    "allowImageMessages" BOOLEAN NOT NULL DEFAULT true,
    "allowVideoMessages" BOOLEAN NOT NULL DEFAULT true,
    "allowFileSharing" BOOLEAN NOT NULL DEFAULT true,
    "allowGifts" BOOLEAN NOT NULL DEFAULT true,
    FOREIGN KEY ("groupId") REFERENCES groups(uuid) ON DELETE CASCADE
);

-- Create group_members table
CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    uuid uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "userId" uuid NOT NULL,
    "groupId" uuid NOT NULL,
    "roleId" uuid NOT NULL,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(uuid) ON DELETE CASCADE,
    FOREIGN KEY ("groupId") REFERENCES groups(uuid) ON DELETE CASCADE,
    FOREIGN KEY ("roleId") REFERENCES group_roles(uuid) ON DELETE RESTRICT
);

-- Create indexes for better performance
CREATE INDEX idx_groups_owner_id ON groups("ownerId");
CREATE INDEX idx_group_roles_group_id ON group_roles("groupId");
CREATE INDEX idx_group_settings_group_id ON group_settings("groupId");
CREATE INDEX idx_group_members_user_id ON group_members("userId");
CREATE INDEX idx_group_members_group_id ON group_members("groupId");
CREATE INDEX idx_group_members_role_id ON group_members("roleId");
