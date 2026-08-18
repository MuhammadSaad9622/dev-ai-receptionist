import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VoiceProviderFactory } from '../voice/voice-provider.factory';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voiceProviders: VoiceProviderFactory,
  ) {}

  getWithSettings(organizationId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: {
        settings: true,
        crmIntegration: {
          select: { provider: true, status: true, lastSyncAt: true },
        },
      },
    });
  }

  async updateSettings(organizationId: string, patch: Record<string, unknown>) {
    const updated = await this.prisma.organizationSettings.update({
      where: { organizationId },
      data: patch,
    });

    // Triage prompt/tools live on the voice provider's side (Retell's LLM
    // resource, etc.) — push the change live so editing settings in the
    // dashboard doesn't silently drift from what callers actually hear.
    // Best-effort: a sync failure shouldn't block saving the settings
    // themselves (e.g. RETELL_API_KEY not configured yet in early setup).
    await this.syncVoiceProvider(organizationId).catch((error: Error) => {
      this.logger.warn(
        `Voice provider sync failed after settings update for org ${organizationId}: ${error.message}`,
      );
    });

    return updated;
  }

  /** Explicit trigger for initial setup or manual retry after a failed sync. */
  async syncVoiceProvider(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { settings: true },
    });
    if (!org.settings) {
      throw new Error(
        `Organization ${organizationId} has no OrganizationSettings row`,
      );
    }
    const adapter = this.voiceProviders.get(org.voiceProvider);
    await adapter.syncAgentConfig(org, org.settings);
  }

  async listVoiceOptions(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { voiceProvider: true },
    });
    return this.voiceProviders.get(org.voiceProvider).listVoices();
  }

  async setVoiceId(organizationId: string, voiceId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { voiceId },
    });
  }
}
