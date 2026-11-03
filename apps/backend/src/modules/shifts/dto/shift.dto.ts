import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class OpenShiftDto {
  @ApiProperty({ example: '01JSHOP...' })
  @IsString()
  shopId!: string;

  @ApiProperty({
    example: '50000.00',
    description: 'Fedha ya kuanzia kwenye droo (float)',
  })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Kiasi si sahihi' })
  openingFloat!: string;

  @ApiPropertyOptional({ example: 'Shift ya asubuhi' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CloseShiftDto {
  @ApiProperty({ example: '172500.00', description: 'Fedha zilizohesabiwa' })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Kiasi si sahihi' })
  countedCash!: string;

  @ApiPropertyOptional({ example: 'Kiasi kimepungua 500' })
  @IsOptional()
  @IsString()
  note?: string;
}
