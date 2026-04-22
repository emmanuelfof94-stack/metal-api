import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualAdjustmentDto {
  @IsString()
  label: string;

  @IsString()
  category: 'material' | 'labor' | 'other';

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class GenerateQuoteDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsBoolean()
  forceRecompute?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualAdjustmentDto)
  manualAdjustments?: ManualAdjustmentDto[];
}
