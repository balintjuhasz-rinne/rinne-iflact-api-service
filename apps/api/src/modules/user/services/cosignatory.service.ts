import {
  RESOLUTION_ACTIVE_STATUSES,
  RESOLUTION_STATUS,
  USER_COMMENT_ERRORS,
  USER_ERRORS,
  USER_POSITION,
  USER_ROLE,
  USER_STATUS,
  WORKPLACE_ERRORS,
} from '@flact/constants';
import { UpdateShareholderMessageDTO } from '@flact/dtos';
import { UserCommentEntity, UserEntity } from '@flact/entities';
import { BadRequestError, ErrorDetail, NotFoundError, UnprocessableEntityError } from '@flact/exceptions';
import { Injectable } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import _ from 'lodash';
import { Connection, FindConditions, In } from 'typeorm';
import { DeepPartial } from 'typeorm/browser';
import { JwtPayload } from '../../auth/dtos/jwt.payload.dto';
import { RabbitmqBlockchainService } from '../../rabbitmq/services/rabbitmq.blockchain.service';
import {
  AddCosignatoryWorkplacesBodyDTO,
  CosignatoryWorkplaceDTO,
  GetCosignatoriesQueryDTO,
  GetCosignatoriesResponseDTO,
  UpdateCosignatoryBodyDTO,
} from '../dtos/cosignatory.controller.dtos';
import { validateWorkplaceDataOrFail } from '../helpers/user.validator.helper';
import { UserCommentRepository } from '../repositories/user.comment.repository';
import { UserLogRepository } from '../repositories/user.log.repository';
import { UserNotificationRepository } from '../repositories/user.notification.repository';
import { UserPositionRepository } from '../repositories/user.position.repository';
import { UserRepository } from '../repositories/user.repository';
import { UserWorkplaceRepository } from '../repositories/user.workplace.repository';
import { UserWorkplaceEntity } from './../../../../../../libs/entities/src/user.workplace.entity';
import { MessageRepository } from './../repositories/message.repository';
import { UserLogService } from './user.log.service';
import { WorkplaceService } from './workplace.service';

@Injectable()
export class CosignatoryService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userWorkplaceRepository: UserWorkplaceRepository,
    private readonly userLogRepository: UserLogRepository,
    private readonly userPositionRepository: UserPositionRepository,
    private readonly notificationRepository: UserNotificationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly commentRepository: UserCommentRepository,
    private readonly blockchainService: RabbitmqBlockchainService,
    private readonly logService: UserLogService,
    private readonly workplaceService: WorkplaceService,
    private readonly userLogService: UserLogService,
    private readonly connection: Connection,
  ) {
  }

  private async getCosignatoryOrFail(conditions: FindConditions<UserEntity>, relations: string[] = null): Promise<UserEntity> {
    const cosignatory = await this.userRepository.findOne({
      where: { ...conditions, role: USER_ROLE.CO_SIGNATORY },
      relations: relations || [],
    });
    if (!cosignatory) {
      throw new NotFoundError([{ field: 'id', message: USER_ERRORS.USER_NOT_FOUND }]);
    }
    return cosignatory;
  }

  private async getWorkplaceOrFail(userId: number, companyId: number, relations: string[] = null): Promise<UserWorkplaceEntity> {
    const workplace = await this.userWorkplaceRepository.findOne({
      where: { userId, companyId },
      relations: relations || [],
    });
    if (!workplace) {
      throw new NotFoundError([{
        field: 'companyId',
        message: WORKPLACE_ERRORS.WORKPLACE_NOT_FOUND,
        details: { companyId },
      }]);
    }
    return workplace;
  }

  async getCosignatories(filters: GetCosignatoriesQueryDTO, allianceId: number): Promise<GetCosignatoriesResponseDTO> {
    const [cosignatories, count] = await this.userRepository.findCosignatoriesAndCount(filters, allianceId);

    return new GetCosignatoriesResponseDTO({ cosignatories, count, limit: filters.limit, skip: filters.skip });
  }

  async getCosignatory(cosignatoryId: number, { allianceId }: JwtPayload): Promise<[UserEntity, UserWorkplaceEntity[]]> {
    const [cosignatory, workplaces] = await Promise.all([
      this.getCosignatoryOrFail({ id: cosignatoryId, allianceId, status: In([USER_STATUS.INACTIVE, USER_STATUS.ACTIVE]) }, ['avatar', 'comment']),
      this.userWorkplaceRepository.find({
        where: { userId: cosignatoryId },
        order: { id: 'ASC' },
        relations: ['company', 'positions'],
      }),
    ]);
    return [cosignatory, workplaces];
  }

  async getCosignatoriesEmails(allianceId: number): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: { allianceId, role: USER_ROLE.CO_SIGNATORY, registrationCompleted: true, status: USER_STATUS.ACTIVE },
      select: ['id', 'email'],
      order: { email: 'ASC' },
    });
  }

  async updateCosignatory(id: number, { workplaces, ...updateData }: UpdateCosignatoryBodyDTO, user: JwtPayload): Promise<UserEntity> {
    const cosignatory = await this.getCosignatoryOrFail({ id, allianceId: user.allianceId }, ['workplaces', 'workplaces.positions']);
    const userWorkplaces = workplaces?.map(workplace => ({
      ...workplace,
      userId: id,
      positions: workplace.positions.map(position => ({ name: position })),
    }));
    if (workplaces) {
      await this.updateCosignatoryWorkplaces(id, workplaces);
    }
    await this.userRepository.save({ id, ...updateData });
    await this.logService.logEntityChanges(cosignatory, user.id, { ...updateData, workplaces: userWorkplaces });
    return this.userRepository.findOne({ where: { id }, relations: ['workplaces', 'workplaces.positions'] });
  }

  private async updateCosignatoryWorkplaces(id: number, workplaces: CosignatoryWorkplaceDTO[]): Promise<void> {
    const changedWorkplaces = await this.getChangedWorkplacesOrFail(workplaces, id);

    await Promise.all(changedWorkplaces.map(async ({ workplace, oldWorkplace }) => {
      await this.updateWorkplaceDataInBlockchain(workplace, oldWorkplace);
      await this.userWorkplaceRepository.save(workplace);
    }));
  }

  private async getChangedWorkplacesOrFail(workplaces: CosignatoryWorkplaceDTO[], userId: number): Promise<{ workplace: UserWorkplaceEntity, oldWorkplace: UserWorkplaceEntity }[]> {
    const changedWorkplaces: { workplace: UserWorkplaceEntity, oldWorkplace: UserWorkplaceEntity }[] = [];
    const errors: ErrorDetail[] = [];

    await Promise.all(workplaces.map(async ({ companyId, votingValue, vetoPower, positions }) => {
      const currentWorkplace = await this.getWorkplaceOrFail(userId, companyId,
        ['positions', 'company', 'company.workplaces', 'company.workplaces.user'],
      );

      const currentVotingData = {
        votingValue: currentWorkplace.votingValue,
        vetoPower: currentWorkplace.vetoPower,
        positions: currentWorkplace.positions.map(position => position.name).sort(),
      };
      const newVotingData = { votingValue, vetoPower, positions: positions.sort() };
      const newPositions = positions.filter(position => !currentWorkplace.positions.find(({ name }) => name === position));
      if (_.isEqual(currentVotingData, newVotingData)) {
        return;
      }

      try {
        await this.checkActiveResolutionsAndFail(userId, companyId);
        validateWorkplaceDataOrFail(currentWorkplace.company.workplaces, { id: userId, votingValue });
      } catch ({ details }) {
        errors.push(...details);
      }

      const changedWorkplace = this.userWorkplaceRepository.create({
        ...currentWorkplace,
        votingValue,
        vetoPower,
        positions: [
          ...currentWorkplace.positions.filter(position => positions.includes(position.name)),
          ...this.userPositionRepository.create(newPositions.map(position => ({ name: position }))),
        ],
      });

      changedWorkplaces.push({ workplace: changedWorkplace, oldWorkplace: currentWorkplace });
    }));

    if (errors.length) {
      throw new UnprocessableEntityError(errors);
    }

    return changedWorkplaces;
  }

  private async checkActiveResolutionsAndFail(cosignatoryId: number, companyId: number): Promise<void> {
    const { count } = await this.blockchainService.getResolutionsInfo({
      cosignatoryId,
      companyId,
      statuses: [...RESOLUTION_ACTIVE_STATUSES /*RESOLUTION_STATUS.ACCEPTED, RESOLUTION_STATUS.REJECTED TODO: double check this!*/],
      isVote: false,
      endDateFrom: new Date().toISOString(),
    });

    if (count) {
      throw new UnprocessableEntityError([{
        field: 'id',
        message: USER_ERRORS.USER_HAS_ACTIVE_RESOLUTIONS,
        details: { companyId },
      }]);
    }
  }

  private async updateWorkplaceDataInBlockchain(workplace: UserWorkplaceEntity, oldWorkplace: UserWorkplaceEntity): Promise<void> {
    const currentPositions = oldWorkplace.positions?.map(({ name }) => name) || [];
    const positions = workplace.positions?.map(({ name }) => name) || [];
    const newPositions = _.difference(positions, currentPositions);
    const unnecessaryPositions = _.difference(currentPositions, positions);

    await Promise.all([
      this.blockchainService.removeCosignatory(unnecessaryPositions, workplace),
      this.blockchainService.sendRegisterCosignatoryEvent(newPositions, workplace.userId, workplace.companyId, workplace.votingValue, workplace.vetoPower),
    ]);

    if (currentPositions.includes(USER_POSITION.SHARE_HOLDER) && !unnecessaryPositions.includes(USER_POSITION.SHARE_HOLDER)) {
      await this.blockchainService.updateShareholder(
        plainToClass(UpdateShareholderMessageDTO, {
          id: workplace.userId,
          companyId: workplace.companyId,
          vetoPower: workplace.vetoPower,
          votingValue: workplace.votingValue,
        }),
      );
    }
  };

  async addCosignatoryWorkplaces(userId: number, workplacesDTO: AddCosignatoryWorkplacesBodyDTO, cosec: JwtPayload): Promise<UserWorkplaceEntity[]> {
    const cosignatory = await this.getCosignatoryOrFail({ id: userId, allianceId: cosec.allianceId }, ['workplaces']);

    const cosignatoryCompanies = cosignatory.workplaces.map(workplace => workplace.companyId);
    const newCosignatoryCompanies = workplacesDTO.workplaces.map(workplace => workplace.companyId);

    if (cosignatoryCompanies.filter(currentCompany => newCosignatoryCompanies.includes(currentCompany)).length) {
      throw new UnprocessableEntityError([{
        field: 'workplaces',
        message: USER_ERRORS.USER_ALREADY_ADDED_TO_WORK_PLACE,
      }]);
    }

    const workplaces: DeepPartial<UserWorkplaceEntity>[] = this.userWorkplaceRepository.create(
      workplacesDTO.workplaces.map(workplace => ({
        ...workplace,
        userId,
        positions: workplace.positions.map(position => ({ name: position })),
      }))
    );
    await this.workplaceService.validateWorkplaces(workplaces, cosec.allianceId);

    const savedWorkplaces = await this.connection.transaction(async (manager) => {
      const workplaceRepository = manager.getCustomRepository(UserWorkplaceRepository);
      const savedWorkplaces = await workplaceRepository.save(workplaces);
      await this.workplaceService.registerWorkplacesInBlockchain({ id: userId, workplaces: savedWorkplaces });
      return savedWorkplaces;
    });

    await this.workplaceService.logNewWorkplaces(workplaces, USER_ROLE.CO_SIGNATORY, cosec.id);
    const cosignatoryLogData = { id: cosignatory.id, role: cosignatory.role, workplaces: cosignatory.workplaces };
    await this.userLogService.logEntityChanges(cosignatoryLogData, cosec.id, { workplaces });

    return savedWorkplaces;
  }

  async deleteCosignatoryWithoutResolutions(id: number, allianceId: number): Promise<UserEntity> {
    const user = await this.getCosignatoryOrFail({ id, allianceId }, ['workplaces', 'workplaces.positions']);

    const { resolutionsInfo } = await this.blockchainService.getResolutionsInfo({ cosignatoryId: id });

    if (resolutionsInfo.length) {
      throw new BadRequestError([{ field: 'id', message: USER_ERRORS.USER_HAS_RESOLUTIONS }]);
    }

    return this.deleteCosignatory(user);
  }

  async deleteCosignatory(user: UserEntity): Promise<UserEntity> {
    await Promise.all(user.workplaces.map(async (workplace) => this.deleteCosignatoryWorkplace(workplace)));
    await Promise.all([
      this.userLogRepository.delete({ userId: user.id }),
      this.notificationRepository.delete({ userId: user.id }),
      this.messageRepository.delete({ userId: user.id }),
    ]);

    return this.userRepository.save({ id: user.id, status: USER_STATUS.DELETED });
  }

  async deleteCosignatoryWorkplace(workplace: UserWorkplaceEntity): Promise<void> {
    const positions = workplace.positions.map(position => position.name);
    await this.blockchainService.removeCosignatory(positions, workplace);
    await this.userWorkplaceRepository.remove(workplace);
  }

  async saveComment(cosignatoryId: number, text: string, cosec: JwtPayload): Promise<UserCommentEntity> {
    const cosignatory = await this.getCosignatoryOrFail({ id: cosignatoryId, allianceId: cosec.allianceId });
    const comment = await this.commentRepository.findOne({ userId: cosignatoryId });

    const updatedComment = await this.commentRepository.save({
      ...comment,
      authorId: cosec.id,
      text,
      userId: cosignatoryId,
    });

    await this.logService.logEntityChanges(cosignatory, cosec.id, { comment: updatedComment });
    return updatedComment;
  }

  async deleteComment(cosignatoryId: number, cosec: JwtPayload): Promise<UserCommentEntity> {
    const cosignatory = await this.getCosignatoryOrFail({ id: cosignatoryId, allianceId: cosec.allianceId }, ['comment']);
    const comment = await this.commentRepository.findOne({ userId: cosignatoryId });
    if (!comment) {
      throw new NotFoundError([{ field: '', message: USER_COMMENT_ERRORS.USER_COMMENT_NOT_FOUND }]);
    }
    await this.logService.logEntityChanges(cosignatory, cosec.id, { comment: null });
    return this.commentRepository.remove(comment);
  }

  async editCosignatoryStatus(status: USER_STATUS, id: number, cosec: JwtPayload): Promise<UserEntity> {
    const cosignatory = await this.getCosignatoryOrFail({ id, allianceId: cosec.allianceId },
      ['workplaces', 'workplaces.positions', 'workplaces.company', 'workplaces.company.workplaces', 'workplaces.company.workplaces.user'],
    );
    if (cosignatory.status === status) {
      return cosignatory;
    }
    return status === USER_STATUS.ACTIVE ? this.activateCosignatory(cosignatory, cosec.id) : this.deactivateCosignatory(cosignatory, cosec.id);
  }

  private async deactivateCosignatory(cosignatory: UserEntity, cosecId: number): Promise<UserEntity> {
    const { resolutionsInfo } = await this.blockchainService.getResolutionsInfo({ cosignatoryId: cosignatory.id });
    if (resolutionsInfo.filter(({ resolution }) => [RESOLUTION_STATUS.IN_PROGRESS, RESOLUTION_STATUS.UPCOMING].includes(resolution.status)).length) {
      throw new BadRequestError([{ field: 'id', message: USER_ERRORS.USER_HAS_ACTIVE_RESOLUTIONS }]);
    }

    await Promise.all(cosignatory.workplaces.map(workplace => {
      const positions = workplace.positions.map(position => position.name);
      return this.blockchainService.removeCosignatory(positions, workplace);
    }));

    const updatedUser = await this.userRepository.save({ ...cosignatory, status: USER_STATUS.INACTIVE });

    await this.logService.logEntityChanges(cosignatory, cosecId, updatedUser);
    return updatedUser;
  }

  private async activateCosignatory(cosignatory: UserEntity, cosecId: number): Promise<UserEntity> {
    await cosignatory.workplaces.map(({ company, votingValue }) => {
      validateWorkplaceDataOrFail(company.workplaces, { id: cosignatory.id, votingValue });
    });

    await this.workplaceService.registerWorkplacesInBlockchain(cosignatory);
    await this.logService.logEntityChanges(cosignatory, cosecId, { status: USER_STATUS.ACTIVE });

    return this.userRepository.save({ ...cosignatory, status: USER_STATUS.ACTIVE });
  }

}
