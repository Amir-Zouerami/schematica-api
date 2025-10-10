import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllConfigTypes } from './config/config.type';

export function setupSwagger(app: INestApplication): void {
	const configService = app.get(ConfigService<AllConfigTypes, true>);

	const appTitle = configService.get('app.title', { infer: true });
	const appVersion = configService.get('app.version', { infer: true });
	const appTag = configService.get('app.tag', { infer: true });
	const appServerUrl = configService.get('app.serverUrl', { infer: true });
	const appDocsPath = configService.get('app.docsPath', { infer: true });
	const appDescription = configService.get('app.description', {
		infer: true,
	});

	const config = new DocumentBuilder()
		.setTitle(appTitle)
		.setDescription(appDescription)
		.setVersion(appVersion)
		.addTag(appTag)
		.addServer(appServerUrl)
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup(appDocsPath, app, document);
}
