import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ProjectType } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  customerId: string;

  @IsEnum(ProjectType)
  type: ProjectType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthM?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  desiredMarginPercent?: number;

  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsObject()
  specificationJson?: {
    sheetThicknessMm?: number;
    tubeType?: string;
    paintType?: string;
    lockType?: string;
    accessories?: string[];
    customNotes?: string;
  };
}
