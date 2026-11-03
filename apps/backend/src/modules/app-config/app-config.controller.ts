import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

const VERSION = process.env.APP_VERSION ?? '1.0.0';
const MIN_VERSION = process.env.APP_MIN_VERSION ?? '1.0.0';

@ApiTags('Config')
@Controller()
export class AppConfigController {
  @Public()
  @Get('app/config')
  @ApiOperation({
    summary: 'Mipangilio ya app — force update, maintenance, VAT (I6)',
  })
  config() {
    const latest = VERSION;
    return {
      version: latest,
      minSupportedVersion: MIN_VERSION,
      forceUpdate: latest !== MIN_VERSION,
      maintenance: process.env.MAINTENANCE_MODE === 'true',
      maintenanceMessage:
        process.env.MAINTENANCE_MESSAGE ??
        'Tunafanya matengenezo. Tutarudi hivi punde.',
      apiVersion: 'v1',
      currency: 'TZS',
      country: 'TZ',
      timezone: 'Africa/Dar_es_Salaam',
      vat: { rate: 0.18, inclusive: true, label: 'VAT 18%' },
      support: {
        phone: process.env.SUPPORT_PHONE ?? '+255700000000',
        email: process.env.SUPPORT_EMAIL ?? 'msaada@myboke.co.tz',
        whatsapp: process.env.SUPPORT_WHATSAPP ?? '255700000000',
      },
      features: {
        offlineSync: true,
        efd: true,
        bluetoothPrint: true,
        barcodeLabels: true,
        bundles: true,
        variants: true,
        assistant: true,
        webhooks: true,
      },
      limits: {
        importRows: 5000,
        uploadMb: 10,
        quickKeys: 8,
      },
    };
  }
}
