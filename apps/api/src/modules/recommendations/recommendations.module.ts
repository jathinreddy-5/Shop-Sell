import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { DatabaseModule } from '../../database/database.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [DatabaseModule, SearchModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
