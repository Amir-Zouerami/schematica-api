import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class TeamNotFoundException extends BaseAppException {
	constructor(teamId: string) {
		super(`Team with ID "${teamId}" not found.`, HttpStatus.NOT_FOUND, 'TEAM_NOT_FOUND');
	}
}
