import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
	@ApiProperty({
		description: 'The JSON Web Token (JWT) for the authenticated user.',
		example:
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFtaXIuem91ZXJhbWkiLCJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwidG9rZW5WZXJzaW9uIjoxLCJpYXQiOjE2NjgyMDM4MjUsImV4cCI6MTY2ODIwNzQyNX0.some_signature',
	})
	access_token: string;
}
