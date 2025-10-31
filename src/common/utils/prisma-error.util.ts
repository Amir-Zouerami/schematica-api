import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaErrorCode } from '../constants/prisma-error-codes.constants';

type PrismaErrorMappings = { [key in PrismaErrorCode]?: Error } & {
	default?: Error;
};

/**
 * Handles known Prisma request errors and maps them to custom application exceptions.
 * If the error is not a known Prisma error or no mapping is provided, it throws a
 * default or a generic InternalServerErrorException.
 *
 * @param error The error object caught in a catch block.
 * @param exceptions An object mapping PrismaErrorCodes to specific exception instances.
 * @throws {Error} The mapped application exception or a default InternalServerErrorException.
 */
export function handlePrismaError(error: unknown, exceptions?: PrismaErrorMappings): never {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		const specificError = exceptions?.[error.code as PrismaErrorCode];

		if (specificError) {
			throw specificError;
		}
	}

	if (exceptions?.default) {
		throw exceptions.default;
	}

	throw new InternalServerErrorException('An unexpected database error occurred.');
}
