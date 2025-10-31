import type { AppConfig } from './app.config';
import type { AuthConfig } from './auth.config';
import type { DbConfig } from './database.config';

export type AllConfigTypes = AppConfig & DbConfig & AuthConfig;
