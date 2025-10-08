import type { AppConfig } from './app.config';
import type { DbConfig } from './database.config';
import type { JwtConfig } from './jwt.config';

export type AllConfigTypes = AppConfig & DbConfig & JwtConfig;
