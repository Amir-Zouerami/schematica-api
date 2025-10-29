import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface,
} from 'class-validator';
import { ProjectLinkDto } from '../dto/project-link.dto';

@ValidatorConstraint({ name: 'areLinksUnique', async: false })
export class AreLinksUniqueConstraint implements ValidatorConstraintInterface {
	validate(links: ProjectLinkDto[], _args: ValidationArguments): boolean {
		if (!links || !Array.isArray(links) || links.length === 0) {
			return true;
		}

		const urls = links.map((link) => link.url);
		const uniqueUrls = new Set(urls);
		return uniqueUrls.size === urls.length;
	}

	defaultMessage(_args: ValidationArguments): string {
		return 'Each link URL within a project must be unique.';
	}
}
