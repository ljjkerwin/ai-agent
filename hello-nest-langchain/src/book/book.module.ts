import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { MarkService } from './mark.service';

@Module({
  controllers: [BookController],
  providers: [BookService, MarkService],
})
export class BookModule { }
