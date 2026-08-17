import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string;

  @IsNumberString()
  PORT: string;

  @IsNotEmpty()
  DATABASE_URL: string;

  @IsNotEmpty()
  REDIS_URL: string;

  @IsOptional()
  @IsNotEmpty()
  CREDENTIALS_ENCRYPTION_KEY?: string;
}

// Fails fast on boot rather than surfacing as a mysterious 500 later —
// especially important here since a missing Twilio/Retell/CRM secret should
// never silently degrade to "the AI just doesn't answer calls."
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return validated;
}
