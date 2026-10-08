import { BadRequestException, NotFoundException } from '@nestjs/common';

export class TicketNotIssuedException extends BadRequestException {}
export class TicketNotFoundException extends NotFoundException {}
