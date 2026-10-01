import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { UserRole } from '../common/enums/user-role.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  createCheckout(@Body() dto: CreateCheckoutDto, @Req() request: Request) {
    return this.payments.createCheckout(dto, request);
  }

  @Get('configuration')
  configuration() {
    return this.payments.configuration();
  }

  @Get('transactions/:orderId')
  getTransaction(@Param('orderId') orderId: string) {
    return this.payments.getTransaction(orderId);
  }

  @Get('vnpay/ipn')
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.payments.handleVnpayIpn(query);
  }

  @Get('vnpay/return')
  async vnpayReturn(@Query() query: Record<string, string>, @Res() response: Response) {
    const url = await this.payments.handleVnpayReturn(query);
    return response.redirect(url);
  }

  @Post('momo/ipn')
  @HttpCode(204)
  async momoIpn(@Body() payload: Record<string, unknown>) {
    await this.payments.handleMomoIpn(payload);
  }

  @Patch('transactions/:orderId/manual-confirm')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
  manualConfirm(@Param('orderId') orderId: string) {
    return this.payments.manualConfirm(orderId);
  }
}
