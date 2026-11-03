import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PresignUploadDto } from './dto/upload.dto';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@ApiBearerAuth('access-token')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Pata presigned URL ya kupakia faili (S3)' })
  presign(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: PresignUploadDto,
  ) {
    return this.service.presign(businessId, userId, dto);
  }

  @Post('local')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        key: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Dev fallback — pakia faili moja kwa moja' })
  upload(
    @UploadedFile() file: { buffer: Buffer; size: number; originalname: string },
    @Body('key') key: string,
  ) {
    return this.service.saveLocal(
      key || `misc/${Date.now()}-${file.originalname}`,
      file.buffer,
    );
  }

  @Get('local/*path')
  @ApiOperation({ summary: 'Dev fallback — pakua faili lililohifadhiwa' })
  async serve(@Param('path') path: string | string[], @Res() res: Response) {
    const key = Array.isArray(path) ? path.join('/') : path;
    const dir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'storage', 'uploads');
    try {
      const buffer = await readFile(join(dir, key));
      res.set({ 'Content-Length': buffer.length.toString() }).send(buffer);
    } catch {
      res.status(404).json({ status: 404, title: 'Faili haipo' });
    }
  }
}
