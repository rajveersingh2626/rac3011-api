import { Global, Module } from '@nestjs/common';
import { ScopeRepository } from './scope/scope.repository';
import { ScopeService } from './scope/scope.service';

@Global()
@Module({
  providers: [ScopeRepository, ScopeService],
  exports: [ScopeService],
})
export class CommonModule {}
