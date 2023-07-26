/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { events } from './mod.ts';
import { logger } from '../utils/logger.ts';
import { Auditor } from '../services/auditor.ts';
import { escapeMarkdown } from '../utils/helpers.ts';
import {
  ApplicationCommandPermissions,
  ApplicationCommandPermissionTypes,
  AuditLogEvents,
  BitwisePermissionFlags,
  ChannelTypes,
  DefaultMessageNotificationLevels,
  Embed,
  ExplicitContentFilterLevels,
  GuildNsfwLevel,
  MfaLevels,
  PremiumTiers,
  SystemChannelFlags,
  TargetTypes,
  VerificationLevels,
  WebhookTypes,
} from '../deps.ts';
import { bot } from '../bot.ts';

const log = logger({ name: 'Event: GuildAuditLogEntryCreate' });

const humanize = (str: string) =>
  str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase());

const formatToString = (obj: unknown) =>
  JSON.stringify(
    obj ?? 'null',
    (_key, value) => typeof value === 'bigint' ? value.toString() : value,
  );

events.guildAuditLogEntryCreate = async (auditLog, guildId) => {
  log.info(`[Guild: ${guildId}]`);

  try {
    console.dir({ auditLog }, { depth: 16 });

    const auditor = await Auditor.find(guildId);
    if (auditor) {
      const changes = [];

      switch (auditLog.actionType) {
        case AuditLogEvents.ChannelCreate:
        case AuditLogEvents.ChannelUpdate: {
          changes.push(`Channel: <#${auditLog.targetId}>`);
          break;
        }
        case AuditLogEvents.RoleCreate:
        case AuditLogEvents.RoleUpdate: {
          changes.push(`Role: <@&:${auditLog.targetId}>`);
          break;
        }
        case AuditLogEvents.MessagePin: {
          changes.push(
            `[Jump](https://discord.com/channels/${guildId}/${auditLog.options?.channelId}/${auditLog.options?.messageId})`,
          );
          break;
        }
        case AuditLogEvents.MessageUnpin: {
          changes.push(
            `[Jump](https://discord.com/channels/${guildId}/${auditLog.options?.channelId}/${auditLog.options?.messageId})`,
          );
          break;
        }
        case AuditLogEvents.MemberKick:
        case AuditLogEvents.MemberPrune:
        case AuditLogEvents.MemberBanAdd:
        case AuditLogEvents.MemberBanRemove:
        case AuditLogEvents.MemberUpdate:
        case AuditLogEvents.MemberRoleUpdate:
        case AuditLogEvents.MemberMove:
        case AuditLogEvents.MemberDisconnect: {
          changes.push(`Member: <@${auditLog.targetId}>`);
          break;
        }
        case AuditLogEvents.BotAdd: {
          changes.push(`Bot: <@${auditLog.targetId}>`);
          break;
        }
        default:
          break;
      }

      for (const change of auditLog.changes ?? []) {
        if (change.old === undefined && change.new === undefined) {
          continue;
        }

        if (typeof change.old !== 'object' && change.old === change.new) {
          continue;
        }

        if (Array.isArray(change.new) || Array.isArray(change.old)) {
          if (change.key === 'permission_overwrites') {
            // deno-lint-ignore no-explicit-any
            const newPermissions = (change.new ?? []) as any[];
            // deno-lint-ignore no-explicit-any
            const oldPermission = (change.old ?? []) as any[];

            if (oldPermission.length) {
              changes.push(
                `${humanize(change.key)}: Allow → ${
                  oldPermission.map((item) => {
                    return item.allow;
                  }).join(', ')
                }`,
              );
              changes.push(
                `${humanize(change.key)}: Deny → ${
                  oldPermission.map((item) => {
                    return item.deny;
                  }).join(', ')
                }`,
              );
            }
            if (newPermissions.length) {
              changes.push(
                `${humanize(change.key)}: Allow → ${
                  newPermissions.map((item) => {
                    return item.allow;
                  }).join(', ')
                }`,
              );
              changes.push(
                `${humanize(change.key)}: Deny → ${
                  newPermissions.map((item) => {
                    return item.deny;
                  }).join(', ')
                }`,
              );
            }
          } else {
            changes.push(
              `${humanize(change.key)}: ${
                // deno-lint-ignore no-explicit-any
                (change.new as any[] ?? []).map((item) => {
                  return JSON.stringify(item, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
                }).join(', ')}`,
            );
          }

          continue;
        }

        switch (auditLog.actionType) {
          case AuditLogEvents.GuildUpdate: {
            switch (change.key as string) {
              case 'system_channel_id':
                changes.push(`System channel: <#${change.old}> → <#${change.new}>`);
                continue;
              case 'system_channel_flags':
                changes.push(
                  `System channel: ${systemChannelFlagsBitsToString(change.old as number)} → ${
                    systemChannelFlagsBitsToString(change.new as number)
                  }`,
                );
                continue;
              case 'default_message_notifications':
                changes.push(
                  `Default message notifications: ${
                    defaultMessageNotificationLevelMapping[change.old as DefaultMessageNotificationLevels]
                  } → ${defaultMessageNotificationLevelMapping[change.new as DefaultMessageNotificationLevels]}`,
                );
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.ChannelCreate: {
            switch (change.key as string) {
              case 'name':
                changes.push(`Name: ${change.new}`);
                continue;
              case 'type':
                changes.push(`Type: ${channelTypesMapping[change.new as ChannelTypes]}`);
                continue;
              case 'flags':
                changes.push(`Flags: ${channelFlagsBitsToString(change.new as number)}`);
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.ChannelUpdate: {
            switch (change.key as string) {
              case 'name':
                changes.push(`Name: ${change.old} → ${change.new}`);
                continue;
              case 'type':
                changes.push(
                  `Type: ${channelTypesMapping[change.old as ChannelTypes]} → ${
                    channelTypesMapping[change.new as ChannelTypes]
                  }`,
                );
                continue;
              case 'flags':
                changes.push(
                  `Flags: ${channelFlagsBitsToString(change.old as number)}> → ${
                    channelFlagsBitsToString(change.new as number)
                  }`,
                );
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.ChannelDelete: {
            switch (change.key as string) {
              case 'name':
                changes.push(`Name: ${change.old}`);
                continue;
              case 'type':
                changes.push(`Type: ${channelTypesMapping[change.old as ChannelTypes]}`);
                continue;
              case 'flags':
                changes.push(`Flags: ${channelFlagsBitsToString(change.old as number)}`);
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.ChannelOverwriteCreate: {
            switch (change.key) {
              case 'id':
                changes.push(`Role: <@&${change.new}>`);
                break;
              case 'type':
                changes.push(`Type: ${change.new === 0 ? 'role' : 'member'}`);
                break;
              case 'allow':
                changes.push(`Allow: ${permissionBitsToString(change.new as bigint)}`);
                break;
              case 'deny':
                changes.push(`Deny: ${permissionBitsToString(change.new as bigint)}`);
                break;
              default:
                break;
            }
            continue;
          }
          case AuditLogEvents.ChannelOverwriteUpdate: {
            switch (change.key) {
              case 'id':
                changes.push(`Role: <@&${change.old}> → <@&${change.new}>`);
                break;
              case 'type':
                changes.push(`Type: ${change.old === 0 ? 'role' : 'member'} → ${change.new === 0 ? 'role' : 'member'}`);
                break;
              case 'allow':
                changes.push(
                  `Allow: ${permissionBitsToString(change.old as bigint)} → ${
                    permissionBitsToString(change.new as bigint)
                  }`,
                );
                break;
              case 'deny':
                changes.push(
                  `Deny: ${permissionBitsToString(change.old as bigint)} → ${
                    permissionBitsToString(change.new as bigint)
                  }`,
                );
                break;
              default:
                break;
            }
            continue;
          }
          case AuditLogEvents.ChannelOverwriteDelete: {
            switch (change.key) {
              case 'id':
                changes.push(`Role: <@&${change.old}>`);
                break;
              case 'type':
                changes.push(`Type: ${change.old === 0 ? 'role' : 'member'}`);
                break;
              case 'allow':
                changes.push(`Allow: ${permissionBitsToString(change.old as bigint)}`);
                break;
              case 'deny':
                changes.push(`Deny: ${permissionBitsToString(change.old as bigint)}`);
                break;
              default:
                break;
            }
            continue;
          }
          case AuditLogEvents.MemberKick: {
            break;
          }
          case AuditLogEvents.MemberPrune: {
            break;
          }
          case AuditLogEvents.MemberBanAdd: {
            break;
          }
          case AuditLogEvents.MemberBanRemove: {
            break;
          }
          case AuditLogEvents.MemberUpdate: {
            break;
          }
          case AuditLogEvents.MemberRoleUpdate: {
            break;
          }
          case AuditLogEvents.MemberMove: {
            break;
          }
          case AuditLogEvents.MemberDisconnect: {
            break;
          }
          case AuditLogEvents.BotAdd: {
            break;
          }
          case AuditLogEvents.RoleCreate: {
            switch (change.key) {
              case 'name':
                changes.push(`Name: <@&${change.new}>`);
                continue;
              case 'permissions':
                changes.push(`Permissions: ${permissionBitsToString(change.new as bigint)}`);
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.RoleUpdate: {
            switch (change.key) {
              case 'name':
                changes.push(`Name: <@&${change.old}> → <@&${change.new}>`);
                continue;
              case 'permissions':
                changes.push(
                  `Permissions: ${permissionBitsToString(change.old as bigint)} → ${
                    permissionBitsToString(change.new as bigint)
                  }`,
                );
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.RoleDelete: {
            switch (change.key) {
              case 'name':
                changes.push(`Name: <@&${change.old}>`);
                continue;
              case 'permissions':
                changes.push(`Permissions: ${permissionBitsToString(change.old as bigint)}`);
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.InviteCreate: {
            switch (change.key) {
              case 'code':
                changes.push(`Code: [${change.new}](https://discord.gg/${change.new})`);
                continue;
              case 'channel_id':
                changes.push(`Channel: <#${change.new}>`);
                continue;
              case 'inviter_id':
                changes.push(`Inviter: <@${change.new}>`);
                continue;
              case 'type':
                changes.push(`Type: ${targetTypesMapping[change.new as TargetTypes]}`);
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.InviteUpdate: {
            switch (change.key) {
              case 'code':
                changes.push(`Code: ${change.old} → [${change.new}](https://discord.gg/${change.new})`);
                continue;
              case 'channel_id':
                changes.push(`Channel: <#${change.old}> → <#${change.new}>`);
                continue;
              case 'inviter_id':
                changes.push(`Inviter: <@${change.old}> → <@${change.new}>`);
                continue;
              case 'type':
                changes.push(
                  `Type: ${targetTypesMapping[change.old as TargetTypes]} → ${
                    targetTypesMapping[change.new as TargetTypes]
                  }`,
                );
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.InviteDelete: {
            switch (change.key) {
              case 'code':
                changes.push(`Code: ${change.old}`);
                continue;
              case 'channel_id':
                changes.push(`Channel: <#${change.old}>`);
                continue;
              case 'inviter_id':
                changes.push(`Inviter: <@${change.old}>`);
                continue;
              case 'type':
                changes.push(`Type: ${targetTypesMapping[change.old as TargetTypes]}`);
                continue;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.WebhookCreate: {
            switch (change.key) {
              case 'channel_id':
                changes.push(`Channel: <#${change.new}>`);
                break;
              case 'type':
                changes.push(`Type: ${webhookTypesMapping[change.new as WebhookTypes]}`);
                break;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.WebhookUpdate: {
            switch (change.key) {
              case 'channel_id':
                changes.push(`Channel: <#${change.old}> → <#${change.new}>`);
                break;
              case 'type':
                changes.push(
                  `Type: ${webhookTypesMapping[change.old as WebhookTypes]} → ${
                    webhookTypesMapping[change.new as WebhookTypes]
                  }`,
                );
                break;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.WebhookDelete: {
            switch (change.key) {
              case 'channel_id':
                changes.push(`Channel: <#${change.old}>`);
                break;
              case 'type':
                changes.push(`Type: ${webhookTypesMapping[change.old as WebhookTypes]}`);
                break;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.EmojiCreate: {
            switch (change.key) {
              case 'name':
                changes.push(`Name: ${change.new} <:${change.new}:${auditLog.targetId}>`);
                break;
              default:
                break;
            }
            continue;
          }
          case AuditLogEvents.EmojiUpdate: {
            switch (change.key) {
              case 'name':
                changes.push(`Name: ${change.old} → ${change.new} <:${change.new}:${auditLog.targetId}>`);
                break;
              default:
                break;
            }
            continue;
          }
          case AuditLogEvents.EmojiDelete: {
            switch (change.key) {
              case 'name':
                changes.push(`Name: ${change.old} <:${change.old}:${auditLog.targetId}>`);
                break;
              default:
                break;
            }
            continue;
          }
          case AuditLogEvents.MessageDelete: {
            break;
          }
          case AuditLogEvents.MessageBulkDelete: {
            break;
          }
          case AuditLogEvents.MessagePin: {
            continue;
          }
          case AuditLogEvents.MessageUnpin: {
            continue;
          }
          case AuditLogEvents.IntegrationCreate: {
            switch (change.key) {
              case 'channel_id':
                changes.push(`Channel: <#${change.new}>`);
                break;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.IntegrationUpdate: {
            switch (change.key) {
              case 'channel_id':
                changes.push(`Channel: <#${change.old}> → <#${change.new}>`);
                break;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.IntegrationDelete: {
            switch (change.key) {
              case 'channel_id':
                changes.push(`Channel: <#${change.old}>`);
                break;
              default:
                break;
            }
            break;
          }
          case AuditLogEvents.StageInstanceCreate: {
            break;
          }
          case AuditLogEvents.StageInstanceUpdate: {
            break;
          }
          case AuditLogEvents.StageInstanceDelete: {
            break;
          }
          case AuditLogEvents.StickerCreate: {
            break;
          }
          case AuditLogEvents.StickerUpdate: {
            break;
          }
          case AuditLogEvents.StickerDelete: {
            break;
          }
          case AuditLogEvents.GuildScheduledEventCreate: {
            break;
          }
          case AuditLogEvents.GuildScheduledEventUpdate: {
            break;
          }
          case AuditLogEvents.GuildScheduledEventDelete: {
            break;
          }
          case AuditLogEvents.ThreadCreate: {
            break;
          }
          case AuditLogEvents.ThreadUpdate: {
            break;
          }
          case AuditLogEvents.ThreadDelete: {
            break;
          }
          case AuditLogEvents.ApplicationCommandPermissionUpdate: {
            const applicationCommand = await bot.helpers.getGuildApplicationCommand(auditLog.targetId!, guildId);
            changes.push(`Command: /${applicationCommand.name}`);

            // deno-lint-ignore no-explicit-any
            const oldUpdate = change.old as any as ApplicationCommandPermissions | undefined;
            // deno-lint-ignore no-explicit-any
            const newUpdate = change.new as any as ApplicationCommandPermissions | undefined;
            const update = oldUpdate ?? newUpdate;

            switch (update?.type) {
              case ApplicationCommandPermissionTypes.Role:
                changes.push(`Role: <@&${update.id}>`);
                break;
              case ApplicationCommandPermissionTypes.User:
                changes.push(`User: <@${update.id}>`);
                break;
              case ApplicationCommandPermissionTypes.Channel:
                changes.push(`Channel: <#${update.id}>`);
                break;
              default:
                break;
            }

            if (oldUpdate && !newUpdate) {
              changes.push(`Permission: ${oldUpdate.permission ? 'allow' : 'disallow'}`);
            } else if (oldUpdate && newUpdate) {
              changes.push(
                `Permission: ${oldUpdate.permission ? 'allow' : 'disallow'} → ${
                  newUpdate.permission ? 'allow' : 'disallow'
                }`,
              );
            } else if (newUpdate) {
              changes.push(`Permission: ${newUpdate.permission ? 'allow' : 'disallow'}`);
            }
            continue;
          }
          case AuditLogEvents.AutoModerationRuleCreate: {
            break;
          }
          case AuditLogEvents.AutoModerationRuleUpdate: {
            break;
          }
          case AuditLogEvents.AutoModerationRuleDelete: {
            break;
          }
          case AuditLogEvents.AutoModerationBlockMessage: {
            break;
          }
        }

        const changeIcon = change.new !== undefined ? ' →' : '';
        const oldChange = change.old !== undefined ? ` ${escapeMarkdown(formatToString(change.old))}${changeIcon}` : '';
        const newChange = change.new !== undefined ? ` ${escapeMarkdown(formatToString(change.new))}` : '';

        changes.push(
          `${humanize(change.key)}:${oldChange}${newChange}`,
        );
      }

      const user = auditLog.userId ? await bot.helpers.getUser(auditLog.userId!) : null;

      console.dir({ changes });

      const body = JSON.stringify({
        embeds: [
          {
            author: user
              ? {
                name: user.username,
              }
              : undefined,
            title: Auditor.getDescription(auditLog.actionType),
            description: changes.join('\n'),
            color: 15065943,
          } satisfies Embed,
        ],
      });

      const webhook = await fetch(auditor.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!webhook.ok) {
        const text = await webhook.text();
        log.error(`Failed to execute auditor webhook | ${webhook.statusText} | ${auditor.guildId} | ${text} | ${body}`);
      }
    }
  } catch (err) {
    log.error(err);
  }
};

const permissionStringMapping = {
  [BitwisePermissionFlags.CREATE_INSTANT_INVITE]: 'Create Instant Invite',
  [BitwisePermissionFlags.KICK_MEMBERS]: 'Kick Members',
  [BitwisePermissionFlags.BAN_MEMBERS]: 'Ban Members',
  [BitwisePermissionFlags.ADMINISTRATOR]: 'Administrator',
  [BitwisePermissionFlags.MANAGE_CHANNELS]: 'Manage Channels',
  [BitwisePermissionFlags.MANAGE_GUILD]: 'Manage Guild',
  [BitwisePermissionFlags.ADD_REACTIONS]: 'Add Reactions',
  [BitwisePermissionFlags.VIEW_AUDIT_LOG]: 'View Audit Log',
  [BitwisePermissionFlags.PRIORITY_SPEAKER]: 'Priority Speaker',
  [BitwisePermissionFlags.STREAM]: 'Stream',
  [BitwisePermissionFlags.VIEW_CHANNEL]: 'View Channel',
  [BitwisePermissionFlags.SEND_MESSAGES]: 'Send Messages',
  [BitwisePermissionFlags.SEND_TTS_MESSAGES]: 'Send Tts Messages',
  [BitwisePermissionFlags.MANAGE_MESSAGES]: 'Manage Messages',
  [BitwisePermissionFlags.EMBED_LINKS]: 'Embed Links',
  [BitwisePermissionFlags.ATTACH_FILES]: 'Attach Files',
  [BitwisePermissionFlags.READ_MESSAGE_HISTORY]: 'Read Message History',
  [BitwisePermissionFlags.MENTION_EVERYONE]: 'Mention Everyone',
  [BitwisePermissionFlags.USE_EXTERNAL_EMOJIS]: 'Use External Emojis',
  [BitwisePermissionFlags.VIEW_GUILD_INSIGHTS]: 'View Guild Insights',
  [BitwisePermissionFlags.CONNECT]: 'Connect',
  [BitwisePermissionFlags.SPEAK]: 'Speak',
  [BitwisePermissionFlags.MUTE_MEMBERS]: 'Mute Members',
  [BitwisePermissionFlags.DEAFEN_MEMBERS]: 'Deafen Members',
  [BitwisePermissionFlags.MOVE_MEMBERS]: 'Move Members',
  [BitwisePermissionFlags.USE_VAD]: 'Use Vad',
  [BitwisePermissionFlags.CHANGE_NICKNAME]: 'Change Nickname',
  [BitwisePermissionFlags.MANAGE_NICKNAMES]: 'Manage Nicknames',
  [BitwisePermissionFlags.MANAGE_ROLES]: 'Manage Roles',
  [BitwisePermissionFlags.MANAGE_WEBHOOKS]: 'Manage Webhooks',
  [BitwisePermissionFlags.MANAGE_GUILD_EXPRESSIONS]: 'Manage Guild Expressions',
  [BitwisePermissionFlags.USE_SLASH_COMMANDS]: 'Use Slash Commands',
  [BitwisePermissionFlags.REQUEST_TO_SPEAK]: 'Request To Speak',
  [BitwisePermissionFlags.MANAGE_EVENTS]: 'Manage Events',
  [BitwisePermissionFlags.MANAGE_THREADS]: 'Manage Threads',
  [BitwisePermissionFlags.CREATE_PUBLIC_THREADS]: 'Create Public Threads',
  [BitwisePermissionFlags.CREATE_PRIVATE_THREADS]: 'Create Private Threads',
  [BitwisePermissionFlags.USE_EXTERNAL_STICKERS]: 'Use External Stickers',
  [BitwisePermissionFlags.SEND_MESSAGES_IN_THREADS]: 'Send Messages In Threads',
  [BitwisePermissionFlags.USE_EMBEDDED_ACTIVITIES]: 'Use Embedded Activities',
  [BitwisePermissionFlags.MODERATE_MEMBERS]: 'Moderate Members',
};

const permissionBitsToString = (permissions: bigint) => {
  return Object.entries(permissionStringMapping).map(([key, value]) => {
    return permissions & BigInt(key) ? value : null;
  }).filter((value) => value !== null).join(', ');
};

const defaultMessageNotificationLevelMapping = {
  [DefaultMessageNotificationLevels.AllMessages]:
    DefaultMessageNotificationLevels[DefaultMessageNotificationLevels.AllMessages],
  [DefaultMessageNotificationLevels.OnlyMentions]:
    DefaultMessageNotificationLevels[DefaultMessageNotificationLevels.OnlyMentions],
};
const _explicitContentFilterLevelsMapping = {
  [ExplicitContentFilterLevels.Disabled]: ExplicitContentFilterLevels[ExplicitContentFilterLevels.Disabled],
  [ExplicitContentFilterLevels.MembersWithoutRoles]:
    ExplicitContentFilterLevels[ExplicitContentFilterLevels.MembersWithoutRoles],
  [ExplicitContentFilterLevels.AllMembers]: ExplicitContentFilterLevels[ExplicitContentFilterLevels.AllMembers],
};
const _verificationLevelsMapping = {
  [VerificationLevels.None]: VerificationLevels[VerificationLevels.None],
  [VerificationLevels.Low]: VerificationLevels[VerificationLevels.Low],
  [VerificationLevels.Medium]: VerificationLevels[VerificationLevels.Medium],
  [VerificationLevels.High]: VerificationLevels[VerificationLevels.High],
  [VerificationLevels.VeryHigh]: VerificationLevels[VerificationLevels.VeryHigh],
};
const _mfaLevelsMapping = {
  [MfaLevels.None]: MfaLevels[MfaLevels.None],
  [MfaLevels.Elevated]: MfaLevels[MfaLevels.Elevated],
};
const systemChannelFlagsMapping = {
  [SystemChannelFlags.SuppressJoinNotifications]: SystemChannelFlags[SystemChannelFlags.SuppressJoinNotifications],
  [SystemChannelFlags.SuppressPremiumSubscriptions]:
    SystemChannelFlags[SystemChannelFlags.SuppressPremiumSubscriptions],
  [SystemChannelFlags.SuppressGuildReminderNotifications]:
    SystemChannelFlags[SystemChannelFlags.SuppressGuildReminderNotifications],
  [SystemChannelFlags.SuppressJoinNotificationReplies]:
    SystemChannelFlags[SystemChannelFlags.SuppressJoinNotificationReplies],
};
const systemChannelFlagsBitsToString = (bits: number) => {
  return Object.entries(systemChannelFlagsMapping).map(([key, value]) => {
    return bits & Number(key) ? value : null;
  }).filter((value) => value !== null).join(', ');
};
const channelFlagsMapping = {
  [SystemChannelFlags.SuppressJoinNotifications]: SystemChannelFlags[SystemChannelFlags.SuppressJoinNotifications],
  [SystemChannelFlags.SuppressPremiumSubscriptions]:
    SystemChannelFlags[SystemChannelFlags.SuppressPremiumSubscriptions],
  [SystemChannelFlags.SuppressGuildReminderNotifications]:
    SystemChannelFlags[SystemChannelFlags.SuppressGuildReminderNotifications],
  [SystemChannelFlags.SuppressJoinNotificationReplies]:
    SystemChannelFlags[SystemChannelFlags.SuppressJoinNotificationReplies],
};
const channelFlagsBitsToString = (bits: number) => {
  return Object.entries(channelFlagsMapping).map(([key, value]) => {
    return bits & Number(key) ? value : null;
  }).filter((value) => value !== null).join(', ');
};
const _premiumTiersMapping = {
  [PremiumTiers.None]: PremiumTiers[PremiumTiers.None],
  [PremiumTiers.Tier1]: PremiumTiers[PremiumTiers.Tier1],
  [PremiumTiers.Tier2]: PremiumTiers[PremiumTiers.Tier2],
  [PremiumTiers.Tier3]: PremiumTiers[PremiumTiers.Tier3],
};
const _guildNsfwLevelMapping = {
  [GuildNsfwLevel.Default]: GuildNsfwLevel[GuildNsfwLevel.Default],
  [GuildNsfwLevel.Explicit]: GuildNsfwLevel[GuildNsfwLevel.Explicit],
  [GuildNsfwLevel.Safe]: GuildNsfwLevel[GuildNsfwLevel.Safe],
  [GuildNsfwLevel.AgeRestricted]: GuildNsfwLevel[GuildNsfwLevel.AgeRestricted],
};
const channelTypesMapping = {
  [ChannelTypes.GuildText]: ChannelTypes[ChannelTypes.GuildText],
  [ChannelTypes.DM]: ChannelTypes[ChannelTypes.DM],
  [ChannelTypes.GuildVoice]: ChannelTypes[ChannelTypes.GuildVoice],
  [ChannelTypes.GroupDm]: ChannelTypes[ChannelTypes.GroupDm],
  [ChannelTypes.GuildCategory]: ChannelTypes[ChannelTypes.GuildCategory],
  [ChannelTypes.GuildAnnouncement]: ChannelTypes[ChannelTypes.GuildAnnouncement],
  [ChannelTypes.AnnouncementThread]: ChannelTypes[ChannelTypes.AnnouncementThread],
  [ChannelTypes.PublicThread]: ChannelTypes[ChannelTypes.PublicThread],
  [ChannelTypes.PrivateThread]: ChannelTypes[ChannelTypes.PrivateThread],
  [ChannelTypes.GuildStageVoice]: ChannelTypes[ChannelTypes.GuildStageVoice],
  [ChannelTypes.GuildDirectory]: ChannelTypes[ChannelTypes.GuildDirectory],
  [ChannelTypes.GuildForum]: ChannelTypes[ChannelTypes.GuildForum],
};
const webhookTypesMapping = {
  [WebhookTypes.Incoming]: WebhookTypes[WebhookTypes.Incoming],
  [WebhookTypes.ChannelFollower]: WebhookTypes[WebhookTypes.ChannelFollower],
  [WebhookTypes.Application]: WebhookTypes[WebhookTypes.Application],
};
const targetTypesMapping = {
  [TargetTypes.Stream]: TargetTypes[TargetTypes.Stream],
  [TargetTypes.EmbeddedApplication]: TargetTypes[TargetTypes.EmbeddedApplication],
};
