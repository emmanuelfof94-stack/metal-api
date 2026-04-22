import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PriceRuleType } from '@prisma/client';

export class CreatePricingItemDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  unit: string;

  @IsEnum(PriceRuleType)
  ruleType: PriceRuleType;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsString()
  formulaTemplate?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
