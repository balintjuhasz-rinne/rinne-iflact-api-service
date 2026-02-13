import { FileEntity } from '@flact/entities';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(FileEntity)
export class FileRepository extends Repository<FileEntity> {}
