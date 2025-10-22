import { HttpException } from '@nestjs/common';

export class BaseAppException extends HttpException {
	public metaCode: string;

	/**
	 * @param message The error message for the client.
	 * @param httpStatus The HTTP status code.
	 * @param metaCode A specific, machine-readable code for this error.
	 */
	constructor(message: string, httpStatus: number, metaCode: string) {
		super(message, httpStatus);
		this.metaCode = metaCode;
	}
}
