import { Controller, Get, Header } from '@nestjs/common';
import { homePage, privacyPage, termsPage } from './legal-pages';

// Trang công khai cho Google OAuth consent screen (không có prefix /api)
@Controller()
export class LegalController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  home() {
    return homePage();
  }

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy() {
    return privacyPage();
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  terms() {
    return termsPage();
  }
}
