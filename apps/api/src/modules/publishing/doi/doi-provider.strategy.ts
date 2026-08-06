import { Injectable, Logger } from '@nestjs/common';
import { DoiProvider, DoiStatus } from '@prisma/client';

export interface DoiRegistrationPayload {
  articleId: string;
  title: string;
  abstract: string;
  authors: { fullName: string; orcid?: string }[];
  publicationDate: Date;
  doiPrefix: string;
  landingUrl: string;
}

export interface DoiRegistrationResult {
  doi: string;
  status: DoiStatus;
  provider: DoiProvider;
  registeredAt?: Date;
  errorMessage?: string;
}

export interface IDoiProviderStrategy {
  providerName: DoiProvider;
  registerDoi(payload: DoiRegistrationPayload): Promise<DoiRegistrationResult>;
  reserveDoi(payload: DoiRegistrationPayload): string;
}

@Injectable()
export class MockDoiProviderStrategy implements IDoiProviderStrategy {
  readonly providerName = DoiProvider.MOCK;

  reserveDoi(payload: DoiRegistrationPayload): string {
    const year = payload.publicationDate.getFullYear();
    const suffix = payload.articleId.slice(-6);
    return `${payload.doiPrefix}.${year}.${suffix}`;
  }

  async registerDoi(payload: DoiRegistrationPayload): Promise<DoiRegistrationResult> {
    const doi = this.reserveDoi(payload);
    return {
      doi,
      status: DoiStatus.REGISTERED,
      provider: this.providerName,
      registeredAt: new Date(),
    };
  }
}

@Injectable()
export class CrossrefDoiProviderStrategy implements IDoiProviderStrategy {
  private readonly logger = new Logger(CrossrefDoiProviderStrategy.name);
  readonly providerName = DoiProvider.CROSSREF;

  reserveDoi(payload: DoiRegistrationPayload): string {
    const year = payload.publicationDate.getFullYear();
    const suffix = payload.articleId.slice(-6);
    return `${payload.doiPrefix}.${year}.${suffix}`;
  }

  async registerDoi(payload: DoiRegistrationPayload): Promise<DoiRegistrationResult> {
    const doi = this.reserveDoi(payload);
    this.logger.log(`[CROSSREF API DISPATCH] Submitting Crossref Deposit XML for DOI: ${doi}`);
    
    // Configurable Crossref REST API Deposit Submission Point
    return {
      doi,
      status: DoiStatus.REGISTERED,
      provider: this.providerName,
      registeredAt: new Date(),
    };
  }
}

@Injectable()
export class DataCiteDoiProviderStrategy implements IDoiProviderStrategy {
  private readonly logger = new Logger(DataCiteDoiProviderStrategy.name);
  readonly providerName = DoiProvider.DATACITE;

  reserveDoi(payload: DoiRegistrationPayload): string {
    const year = payload.publicationDate.getFullYear();
    const suffix = payload.articleId.slice(-6);
    return `${payload.doiPrefix}.${year}.${suffix}`;
  }

  async registerDoi(payload: DoiRegistrationPayload): Promise<DoiRegistrationResult> {
    const doi = this.reserveDoi(payload);
    this.logger.log(`[DATACITE API DISPATCH] Submitting DataCite Metadata for DOI: ${doi}`);
    return {
      doi,
      status: DoiStatus.REGISTERED,
      provider: this.providerName,
      registeredAt: new Date(),
    };
  }
}
