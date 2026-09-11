import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  @Post()
  create(@Body() createCountryDto: CreateCountryDto) {
    return this.countriesService.create(createCountryDto);
  }

  @Get()
  findAll() {
    return this.countriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCountryDto: UpdateCountryDto,
  ) {
    return this.countriesService.update(id, updateCountryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.countriesService.remove(id);
  }
}
