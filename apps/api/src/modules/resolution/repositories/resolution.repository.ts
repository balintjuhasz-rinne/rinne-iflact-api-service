import { FileEntity, ResolutionEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ResolutionEntity)
export class ResolutionRepository extends Repository<ResolutionEntity> {

  async findIdsByIdTemplates(resolutionIds: string[]): Promise<Partial<ResolutionEntity>[]> {
    const query = this.createQueryBuilder('r').select(['r.resolutionId as id']);
    resolutionIds
      .filter(resolutionId => resolutionId)
      .forEach((resolutionId, index) => {
        if (index) {
          query.orWhere(`(r.resolutionId)::text LIKE '%${resolutionId}%'`);
        } else {
          query.where(`(r.resolutionId)::text LIKE '%${resolutionId}%'`);
        }
      });

    return query.getRawMany<ResolutionEntity>();
  }

  async getDocuments(resolutionId: number, allianceId: number): Promise<FileEntity[]> {
    return this.createQueryBuilder('r')
      .innerJoin('r.documents', 'd')
      .where('r.resolutionId = :resolutionId', { resolutionId })
      .andWhere('r.allianceId = :allianceId', { allianceId })
      .select([
        'd.id as "id"',
        'd.originalName as "originalName"',
        'd.path as "path"',
        'd.type as "type"',
        'd.size as "size"',
      ])
      .getRawMany<FileEntity>();
  }
}
