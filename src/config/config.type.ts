import type { AppConfig } from './app.config';
import type { AuthConfig } from './auth.config';
import type { DbConfig } from './database.config';
import { EncryptionConfig } from './encryption.config';
import { FileConfig } from './file.config';

export type AllConfigTypes = AppConfig & DbConfig & AuthConfig & FileConfig & EncryptionConfig;
