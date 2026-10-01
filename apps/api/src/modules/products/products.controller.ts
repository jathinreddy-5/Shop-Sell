import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthUserPayload, ProductInputSchema } from '@shop-sell/shared';
import { ProductsService } from './products.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller()
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 1. Create Product (Owner only)
  @Roles('owner', 'admin')
  @Post('products')
  async createProduct(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: any
  ) {
    const storeId = await this.productsService.getStoreIdForOwner(user.sub);
    const validated = ProductInputSchema.parse(body);
    const product = await this.productsService.createProduct(storeId, validated);
    return { success: true, product };
  }

  // 2. List Seller Products
  @Roles('owner', 'admin')
  @Get('seller/products')
  async listSellerProducts(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    const storeId = await this.productsService.getStoreIdForOwner(user.sub);
    const result = await this.productsService.getSellerProducts(storeId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      search,
    });
    return result;
  }

  // 3. Update Product
  @Roles('owner', 'admin')
  @Patch('products/:id')
  async updateProduct(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const storeId = await this.productsService.getStoreIdForOwner(user.sub);
    const updated = await this.productsService.updateProduct(storeId, id, body);
    return { success: true, product: updated };
  }

  // 4. Archive Product
  @Roles('owner', 'admin')
  @Delete('products/:id')
  async archiveProduct(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string
  ) {
    const storeId = await this.productsService.getStoreIdForOwner(user.sub);
    const archived = await this.productsService.archiveProduct(storeId, id);
    return { success: true, product: archived };
  }

  // 5. Inventory Alerts
  @Roles('owner', 'admin')
  @Get('seller/inventory-alerts')
  async getInventoryAlerts(@CurrentUser() user: AuthUserPayload) {
    const storeId = await this.productsService.getStoreIdForOwner(user.sub);
    const alerts = await this.productsService.getInventoryAlerts(storeId);
    return { alerts };
  }

  // 6. Bulk CSV Import
  @Roles('owner', 'admin')
  @Post('seller/products/bulk-csv')
  async bulkImport(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { rows: any[] }
  ) {
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      throw new BadRequestException('CSV rows must be a non-empty array');
    }
    const storeId = await this.productsService.getStoreIdForOwner(user.sub);
    const result = await this.productsService.bulkImportCsv(storeId, body.rows);
    return { success: true, ...result };
  }

  // 7. Cloudflare R2 Media Presigned URL / Upload Hook
  @Roles('owner', 'admin')
  @Post('media/upload-url')
  async getUploadUrl(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { filename: string; mimeType: string; fileSize: number }
  ) {
    // Sanitize upload size (max 5MB) and mime type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedMimeTypes.includes(body.mimeType)) {
      throw new BadRequestException(
        `Invalid image MIME type: ${body.mimeType}. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    if (body.fileSize > 5 * 1024 * 1024) {
      throw new BadRequestException('Image size exceeds maximum limit of 5MB');
    }

    const fileExt = body.filename.split('.').pop() || 'jpg';
    const key = `products/${user.sub}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || 'https://media.shopsell.example.com';
    const publicUrl = `${publicDomain}/${key}`;

    return {
      key,
      uploadUrl: `${publicDomain}/mock-upload-endpoint/${key}`,
      publicUrl,
    };
  }
}
