import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base-app.exception';

export class TeamConflictException extends BaseAppException {
	constructor(teamName: string) {
		super(
			`A team with the name "${teamName}" already exists.`,
			HttpStatus.CONFLICT,
			'TEAM_NAME_ALREADY_EXISTS',
		);
	}
}
