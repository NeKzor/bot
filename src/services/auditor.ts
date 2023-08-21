/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { AuditLogEvents } from '@discordeno/bot';
import { db } from './db.ts';

export interface AuditorWebhook {
  guildId: bigint;
  url: string;
}

export const Auditor = {
  async save(webhook: AuditorWebhook) {
    return await db.set(['auditor', webhook.guildId], webhook);
  },
  async find(guildId: bigint) {
    return (await db.get<AuditorWebhook>(['auditor', guildId])).value;
  },
  async remove(webhook: AuditorWebhook) {
    await db.delete(['auditor', webhook.guildId]);
  },
  getDescription(eventType: AuditLogEvents) {
    return auditLogEventDescriptions[eventType] ?? 'Unknown Audit Log Type';
  },
};

export enum AuditLogEventsExtended {
  /** Message was flagged by Auto Moderation */
  AutoModerationFlagToChannel =	144, 
  /** Member was timed out by Auto Moderation */
  AutoModerationUserCommunicationDisabled =	145, 
  /** Creator monetization request was created */
  CreatorMonetizationRequestCreated =	150, 
  /** Creator monetization terms were accepted */
  CreatorMonetizationTermsAccepted =	151, 
}

const auditLogEventDescriptions = {
  [AuditLogEvents.GuildUpdate]: 'Server settings were updated',
  [AuditLogEvents.ChannelCreate]: 'Channel was created',
  [AuditLogEvents.ChannelUpdate]: 'Channel settings were updated',
  [AuditLogEvents.ChannelDelete]: 'Channel was deleted',
  [AuditLogEvents.ChannelOverwriteCreate]: 'Permission overwrite was added to a channel',
  [AuditLogEvents.ChannelOverwriteUpdate]: 'Permission overwrite was updated for a channel',
  [AuditLogEvents.ChannelOverwriteDelete]: 'Permission overwrite was deleted from a channel',
  [AuditLogEvents.MemberKick]: 'Member was removed from server',
  [AuditLogEvents.MemberPrune]: 'Members were pruned from server',
  [AuditLogEvents.MemberBanAdd]: 'Member was banned from server',
  [AuditLogEvents.MemberBanRemove]: 'Server ban was lifted for a member',
  [AuditLogEvents.MemberUpdate]: 'Member was updated in server',
  [AuditLogEvents.MemberRoleUpdate]: 'Member was added or removed from a role',
  [AuditLogEvents.MemberMove]: 'Member was moved to a different voice channel',
  [AuditLogEvents.MemberDisconnect]: 'Member was disconnected from a voice channel',
  [AuditLogEvents.BotAdd]: 'Bot user was added to server',
  [AuditLogEvents.RoleCreate]: 'Role was created',
  [AuditLogEvents.RoleUpdate]: 'Role was edited',
  [AuditLogEvents.RoleDelete]: 'Role was deleted',
  [AuditLogEvents.InviteCreate]: 'Server invite was created',
  [AuditLogEvents.InviteUpdate]: 'Server invite was updated',
  [AuditLogEvents.InviteDelete]: 'Server invite was deleted',
  [AuditLogEvents.WebhookCreate]: 'Webhook was created',
  [AuditLogEvents.WebhookUpdate]: 'Webhook properties or channel were updated',
  [AuditLogEvents.WebhookDelete]: 'Webhook was deleted',
  [AuditLogEvents.EmojiCreate]: 'Emoji was created',
  [AuditLogEvents.EmojiUpdate]: 'Emoji name was updated',
  [AuditLogEvents.EmojiDelete]: 'Emoji was deleted',
  [AuditLogEvents.MessageDelete]: 'Single message was deleted',
  [AuditLogEvents.MessageBulkDelete]: 'Multiple messages were deleted',
  [AuditLogEvents.MessagePin]: 'Message was pinned to a channel',
  [AuditLogEvents.MessageUnpin]: 'Message was unpinned from a channel',
  [AuditLogEvents.IntegrationCreate]: 'App was added to server',
  [AuditLogEvents.IntegrationUpdate]: 'App was updated (as an example, its scopes were updated)',
  [AuditLogEvents.IntegrationDelete]: 'App was removed from server',
  [AuditLogEvents.StageInstanceCreate]: 'Stage instance was created (stage channel becomes live)',
  [AuditLogEvents.StageInstanceUpdate]: 'Stage instance details were updated',
  [AuditLogEvents.StageInstanceDelete]: 'Stage instance was deleted (stage channel no longer live)',
  [AuditLogEvents.StickerCreate]: 'Sticker was created',
  [AuditLogEvents.StickerUpdate]: 'Sticker details were updated',
  [AuditLogEvents.StickerDelete]: 'Sticker was deleted',
  [AuditLogEvents.GuildScheduledEventCreate]: 'Event was created',
  [AuditLogEvents.GuildScheduledEventUpdate]: 'Event was updated',
  [AuditLogEvents.GuildScheduledEventDelete]: 'Event was cancelled',
  [AuditLogEvents.ThreadCreate]: 'Thread was created in a channel',
  [AuditLogEvents.ThreadUpdate]: 'Thread was updated',
  [AuditLogEvents.ThreadDelete]: 'Thread was deleted',
  [AuditLogEvents.ApplicationCommandPermissionUpdate]: 'Permissions were updated for a command',
  [AuditLogEvents.AutoModerationRuleCreate]: 'Auto Moderation rule was created',
  [AuditLogEvents.AutoModerationRuleUpdate]: 'Auto Moderation rule was updated',
  [AuditLogEvents.AutoModerationRuleDelete]: 'Auto Moderation rule was deleted',
  [AuditLogEvents.AutoModerationBlockMessage]: 'Message was blocked by Auto Moderation',
  [AuditLogEventsExtended.AutoModerationFlagToChannel]: 'Message was flagged by Auto Moderation',
  [AuditLogEventsExtended.AutoModerationUserCommunicationDisabled]: 'Member was timed out by Auto Moderation',
  [AuditLogEventsExtended.CreatorMonetizationRequestCreated]: 'Creator monetization request was created',
  [AuditLogEventsExtended.CreatorMonetizationTermsAccepted]: 'Creator monetization terms were accepted',
};
