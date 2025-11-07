export type SupportedProviders = 'gitlab';

export class OAuthUserDto {
	provider: SupportedProviders;
	providerId: string;
	username: string;
	email: string | null;
}
