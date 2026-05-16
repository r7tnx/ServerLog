import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Forms, Menu, showToast, Toasts } from "@webpack/common";

const GuildStore = findByPropsLazy("getGuild", "getGuilds");
const SelectedGuildStore = findByPropsLazy("getGuildId");
const GuildChannelStore = findByPropsLazy("getChannels", "getDefaultChannel");
const RoleStore = findByPropsLazy("getRoles", "getRole");
const GuildMemberStore = findByPropsLazy("getMember", "getMembers");
const GuildMemberCountStore = findByPropsLazy("getMemberCount");
const UserStore = findByPropsLazy("getUser", "getUsers");
const GuildEmojiStore = findByPropsLazy("getGuildEmoji");
const GuildStickerStore = findByPropsLazy("getGuildStickers");

const DISCORD_CDN = "https://cdn.discordapp.com";
const AUTHOR_NAME = "r7tnx";
const AUTHOR_IMAGE_SOURCE = "notminepfpr7tnxnoted.gif";
const LARGE_SERVER_WARNING_COUNT = 5000;
const MAX_MEMBERS_IN_HTML = 1000;
const HISTORY_KEY = "ServerLog.ExportHistory";

type ExportHistoryEntry = {
    guildName: string;
    guildId: string;
    type: string;
    fileName: string;
    time: string;
};

function showSuccess(message: string) {
    showToast(message, Toasts.Type.SUCCESS);
}

function showFailure(message: string) {
    showToast(message, Toasts.Type.FAILURE);
}

function settingToast(name: string, value: boolean, exportType = "HTML") {
    if (value) {
        showSuccess(`${name} export enabled for ${exportType}.`);
    } else {
        showFailure(`${name} export disabled. It will not show in ${exportType} exports.`);
    }
}

const settings = definePluginSettings({
    targetServerName: {
        type: OptionType.STRING,
        name: "Target Server Name",
        description: "Only allow ServerLog to run in this exact server. Leave this blank to use it anywhere.",
        placeholder: "Enter a Server Name.",
        default: ""
    },
    exportPreset: {
        type: OptionType.SELECT,
        name: "Export Preset",
        description: "Choose a preset for exports. Custom uses the toggles below; the other presets only change what gets included during export.",
        options: [
            { label: "Custom", value: "custom", default: true },
            { label: "Quick Export", value: "quick" },
            { label: "Full Export", value: "full" },
            { label: "Privacy Safe Export", value: "privacy" },
            { label: "Developer Export", value: "developer" }
        ]
    },
    privacyMode: {
        type: OptionType.BOOLEAN,
        name: "Privacy Mode",
        description: "A one-click safer mode for shared exports. It hides IDs, asset URLs, asset buttons, and cached members while exporting.",
        default: false,
        onChange(value: boolean) {
            if (value) {
                showFailure("Privacy Mode enabled. IDs, asset URLs, asset buttons, and cached members will be hidden in exports.");
            } else {
                showSuccess("Privacy Mode disabled. Your normal export settings will be used again.");
            }
        }
    },
    confirmBeforeExport: {
        type: OptionType.BOOLEAN,
        name: "Confirm Before Export",
        description: "Shows a quick summary before a file is saved, so you can double-check what is about to be included.",
        default: true
    },
    darkMode: {
        type: OptionType.BOOLEAN,
        name: "Dark Mode",
        description: "Starts exported HTML pages in a dark Discord-style theme. The page itself still has theme buttons.",
        default: true,
        onChange(value: boolean) {
            if (value) {
                showSuccess("Dark mode enabled for HTML exports.");
            } else {
                showFailure("Dark mode disabled. HTML exports will start in light mode.");
            }
        }
    },
    compactPage: {
        type: OptionType.BOOLEAN,
        name: "Compact Page",
        description: "Makes the HTML page use smaller spacing, which is nicer for huge servers.",
        default: false
    },
    fileNameFormat: {
        type: OptionType.SELECT,
        name: "File Name Format",
        description: "Choose how ServerLog names saved files.",
        options: [
            { label: "Server Name + Date", value: "name-date", default: true },
            { label: "Server Name Only", value: "name" },
            { label: "Server ID Only", value: "id" },
            { label: "Server ID + Date", value: "id-date" },
            { label: "Server Name + Export Type + Date", value: "name-type-date" }
        ]
    },
    webChannelExport: {
        type: OptionType.BOOLEAN,
        name: "Web Channel Export",
        description: "HTML: adds a Discord-like channel tree with categories, text channels, voice channels, and forums.",
        default: true,
        onChange(value: boolean) {
            settingToast("Channels", value, "HTML");
        }
    },
    webRoleExport: {
        type: OptionType.BOOLEAN,
        name: "Web Role Export",
        description: "HTML: adds roles in hierarchy order with color previews and badges like Managed or Mentionable.",
        default: true,
        onChange(value: boolean) {
            settingToast("Roles", value, "HTML");
        }
    },
    webEmojiExport: {
        type: OptionType.BOOLEAN,
        name: "Web Emoji Export",
        description: "HTML: adds a clean emoji gallery with open, download, copy name, and copy URL buttons.",
        default: true,
        onChange(value: boolean) {
            settingToast("Emojis", value, "HTML");
        }
    },
    webStickerExport: {
        type: OptionType.BOOLEAN,
        name: "Web Sticker Export",
        description: "HTML: adds a clean sticker gallery with open, download, copy name, and copy URL buttons.",
        default: true,
        onChange(value: boolean) {
            settingToast("Stickers", value, "HTML");
        }
    },
    webCachedMembersExport: {
        type: OptionType.BOOLEAN,
        name: "Web Cached Member Export",
        description: "HTML: adds members Discord already loaded. This can be incomplete, especially on big servers.",
        default: false,
        onChange(value: boolean) {
            if (value) {
                showFailure("Cached member HTML export enabled. Large servers may be incomplete.");
            } else {
                showSuccess("Cached member HTML export disabled. Members will not show in HTML exports.");
            }
        }
    },
    textChannelExport: {
        type: OptionType.BOOLEAN,
        name: "Text Channel Export",
        description: "TXT: adds the channel tree in a simple plain-text format.",
        default: true,
        onChange(value: boolean) {
            settingToast("Channels", value, "TXT");
        }
    },
    textRoleExport: {
        type: OptionType.BOOLEAN,
        name: "Text Role Export",
        description: "TXT: adds the role hierarchy in a simple plain-text format.",
        default: true,
        onChange(value: boolean) {
            settingToast("Roles", value, "TXT");
        }
    },
    textCachedMembersExport: {
        type: OptionType.BOOLEAN,
        name: "Text Cached Member Export",
        description: "TXT: adds cached members Discord already loaded. It does not force-load the whole server.",
        default: false,
        onChange(value: boolean) {
            if (value) {
                showFailure("Cached member TXT export enabled. Large servers may take longer.");
            } else {
                showSuccess("Cached member TXT export disabled. Members will not show in TXT exports.");
            }
        }
    },
    showIdentifiers: {
        type: OptionType.BOOLEAN,
        name: "Show Identifiers",
        description: "Shows IDs for servers, channels, roles, emojis, stickers, and cached members.",
        default: true,
        onChange(value: boolean) {
            if (value) {
                showSuccess("IDs enabled. IDs will show in exports.");
            } else {
                showFailure("IDs disabled. IDs will be hidden from exports.");
            }
        }
    },
    showAssetLinks: {
        type: OptionType.BOOLEAN,
        name: "Show Asset Links",
        description: "Shows CDN asset links for icons, banners, emojis, and stickers.",
        default: true,
        onChange(value: boolean) {
            if (value) {
                showSuccess("Asset URLs enabled. CDN links will show in exports.");
            } else {
                showFailure("Asset URLs disabled. CDN links will be hidden from exports.");
            }
        }
    },
    showAssetButtons: {
        type: OptionType.BOOLEAN,
        name: "Show Asset Buttons",
        description: "Adds optional Save Server Icon and Save Server Banner buttons to the Server Log menu.",
        default: false,
        onChange(value: boolean) {
            if (value) {
                showSuccess("Asset buttons enabled. Icon/banner buttons will show in the Server Log menu.");
            } else {
                showFailure("Asset buttons disabled. Icon/banner buttons will be hidden from the Server Log menu.");
            }
        }
    },
    readableJson: {
        type: OptionType.BOOLEAN,
        name: "Readable JSON",
        description: "Formats JSON with spacing so it is easier to read. Turn this off for smaller JSON files.",
        default: true,
        onChange(value: boolean) {
            if (value) {
                showSuccess("Pretty JSON enabled. JSON exports will be easier to read.");
            } else {
                showFailure("Pretty JSON disabled. JSON exports will be compact.");
            }
        }
    }
});

type GuildLike = {
    id: string;
    name: string;
    icon?: string | null;
    banner?: string | null;
    description?: string | null;
    vanityURLCode?: string | null;
    premiumTier?: number;
    premiumSubscriberCount?: number;
    memberCount?: number;
    member_count?: number;
    maxMembers?: number;
    ownerId?: string;
    features?: string[];
    roles?: any;
    emojis?: any;
    stickers?: any;
};

type ChannelLike = {
    id: string;
    name?: string | null;
    type?: number;
    guild_id?: string;
    guildId?: string;
    parent_id?: string | null;
    parentId?: string | null;
    position?: number;
    topic?: string | null;
    nsfw?: boolean;
};

type RoleLike = {
    id: string;
    name?: string;
    color?: number;
    colorString?: string;
    position?: number;
    hoist?: boolean;
    managed?: boolean;
    mentionable?: boolean;
};

type EmojiLike = {
    id?: string;
    name?: string;
    animated?: boolean;
    available?: boolean;
    managed?: boolean;
};

type StickerLike = {
    id?: string;
    name?: string;
    description?: string | null;
};

type MemberLike = {
    userId?: string;
    nick?: string | null;
    roles?: string[];
    user?: {
        id?: string;
        username?: string;
        globalName?: string;
        discriminator?: string;
    };
};

type ExportData = {
    guild: GuildLike;
    channels: ChannelLike[];
    roles: RoleLike[];
    emojis: EmojiLike[];
    stickers: StickerLike[];
    cachedMembers: MemberLike[];
};

type ExportOptions = {
    exportPreset: string;
    exportChannelsHtml: boolean;
    exportRolesHtml: boolean;
    exportEmojisHtml: boolean;
    exportStickersHtml: boolean;
    exportCachedMembersHtml: boolean;
    exportChannelsTxt: boolean;
    exportRolesTxt: boolean;
    exportCachedMembersTxt: boolean;
    showIds: boolean;
    showAssetUrls: boolean;
    showAssetButtons: boolean;
    prettyJson: boolean;
    compactHtml: boolean;
    confirmBeforeExport: boolean;
};

function normalizeExportPreset(value: any) {
    const preset = String(value ?? "custom").trim().toLowerCase();

    if (["custom", "quick", "full", "privacy", "developer"].includes(preset)) {
        return preset;
    }

    return "custom";
}

function getExportOptions(): ExportOptions {
    const preset = normalizeExportPreset(settings.store.exportPreset);

    const options: ExportOptions = {
        exportPreset: preset,
        exportChannelsHtml: settings.store.webChannelExport,
        exportRolesHtml: settings.store.webRoleExport,
        exportEmojisHtml: settings.store.webEmojiExport,
        exportStickersHtml: settings.store.webStickerExport,
        exportCachedMembersHtml: settings.store.webCachedMembersExport,
        exportChannelsTxt: settings.store.textChannelExport,
        exportRolesTxt: settings.store.textRoleExport,
        exportCachedMembersTxt: settings.store.textCachedMembersExport,
        showIds: settings.store.showIdentifiers,
        showAssetUrls: settings.store.showAssetLinks,
        showAssetButtons: settings.store.showAssetButtons,
        prettyJson: settings.store.readableJson,
        compactHtml: settings.store.compactPage,
        confirmBeforeExport: settings.store.confirmBeforeExport
    };

    if (preset === "quick") {
        options.exportChannelsHtml = true;
        options.exportRolesHtml = true;
        options.exportEmojisHtml = false;
        options.exportStickersHtml = false;
        options.exportCachedMembersHtml = false;
        options.exportChannelsTxt = true;
        options.exportRolesTxt = false;
        options.exportCachedMembersTxt = false;
        options.showIds = true;
        options.showAssetUrls = false;
        options.showAssetButtons = false;
        options.compactHtml = true;
    } else if (preset === "full") {
        options.exportChannelsHtml = true;
        options.exportRolesHtml = true;
        options.exportEmojisHtml = true;
        options.exportStickersHtml = true;
        options.exportCachedMembersHtml = true;
        options.exportChannelsTxt = true;
        options.exportRolesTxt = true;
        options.exportCachedMembersTxt = true;
        options.showIds = true;
        options.showAssetUrls = true;
        options.showAssetButtons = true;
    } else if (preset === "privacy") {
        options.exportChannelsHtml = true;
        options.exportRolesHtml = true;
        options.exportEmojisHtml = true;
        options.exportStickersHtml = true;
        options.exportCachedMembersHtml = false;
        options.exportChannelsTxt = true;
        options.exportRolesTxt = true;
        options.exportCachedMembersTxt = false;
        options.showIds = false;
        options.showAssetUrls = false;
        options.showAssetButtons = false;
    } else if (preset === "developer") {
        options.exportChannelsHtml = true;
        options.exportRolesHtml = true;
        options.exportEmojisHtml = true;
        options.exportStickersHtml = true;
        options.exportCachedMembersHtml = false;
        options.exportChannelsTxt = true;
        options.exportRolesTxt = true;
        options.exportCachedMembersTxt = false;
        options.showIds = true;
        options.showAssetUrls = true;
        options.showAssetButtons = true;
        options.prettyJson = true;
    }

    if (settings.store.privacyMode) {
        options.exportCachedMembersHtml = false;
        options.exportCachedMembersTxt = false;
        options.showIds = false;
        options.showAssetUrls = false;
        options.showAssetButtons = false;
    }

    return options;
}

function makeSafeFileName(name: string) {
    return name
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, " ")
        .trim() || "server";
}

function escapeHtml(text: any) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttr(text: any) {
    return escapeHtml(text).replace(/`/g, "&#096;");
}

function normalizeCollection<T = any>(raw: any): T[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    if (raw instanceof Map) {
        return Array.from(raw.values());
    }

    if (typeof raw === "object") {
        return Object.values(raw);
    }

    return [];
}

function numberOrNull(value: any) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return number;
}

function formatCount(value: number | null) {
    if (value === null) return "Unknown";
    return value.toLocaleString();
}

function getTimestampForFile() {
    const date = new Date();
    const pad = (num: number) => String(num).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function getExportFileName(guild: GuildLike, type: "server-log" | "server-export", ext: string) {
    const format = settings.store.fileNameFormat.trim().toLowerCase();
    const name = makeSafeFileName(guild.name);
    const id = makeSafeFileName(guild.id);
    const date = getTimestampForFile();

    if (format === "name") return `${name}-${type}.${ext}`;
    if (format === "id") return `${id}-${type}.${ext}`;
    if (format === "id-date") return `${id}-${date}-${type}.${ext}`;
    if (format === "name-type-date") return `${name}-${type}-${date}.${ext}`;

    return `${name}-${date}-${type}.${ext}`;
}

function downloadBlob(fileName: string, blob: Blob) {
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadTextFile(fileName: string, content: string, type: string) {
    downloadBlob(fileName, new Blob([content], { type }));
}

async function downloadUrlFile(fileName: string, url: string) {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const blob = await res.blob();
        downloadBlob(fileName, blob);
        showSuccess(`Saved ${fileName}`);
    } catch (err) {
        console.error("[ServerLog] Failed to download file:", err);
        showFailure("Failed to download image. Check DevTools console.");
    }
}

function getCurrentGuild(props?: any): GuildLike | null {
    return props?.guild ?? GuildStore.getGuild(SelectedGuildStore.getGuildId()) ?? null;
}

function canUseGuild(guild: GuildLike | null) {
    if (!guild) {
        showFailure("No server found.");
        return false;
    }

    const target = settings.store.targetServerName.trim();

    if (target && guild.name !== target) {
        showFailure(`This is "${guild.name}", not "${target}".`);
        return false;
    }

    return true;
}

function getGuildMemberCount(guild: GuildLike) {
    const directCount =
        numberOrNull(guild.memberCount) ??
        numberOrNull(guild.member_count);

    if (directCount !== null) return directCount;

    try {
        const count = numberOrNull(GuildMemberCountStore.getMemberCount?.(guild.id));
        if (count !== null) return count;
    } catch {}

    try {
        const count = numberOrNull(GuildMemberStore.getMemberCount?.(guild.id));
        if (count !== null) return count;
    } catch {}

    try {
        const realGuild = GuildStore.getGuild?.(guild.id);

        const count =
            numberOrNull(realGuild?.memberCount) ??
            numberOrNull(realGuild?.member_count);

        if (count !== null) return count;
    } catch {}

    return null;
}

function isLargeServer(guild: GuildLike) {
    const count = getGuildMemberCount(guild);
    return count !== null && count >= LARGE_SERVER_WARNING_COUNT;
}

function getGuildAsset(guild: GuildLike, type: "icon" | "banner") {
    const hash = type === "icon" ? guild.icon : guild.banner;

    if (!hash) return null;

    const hashString = String(hash);
    const isAnimated = hashString.startsWith("a_");
    const ext = isAnimated ? "gif" : "png";
    const folder = type === "icon" ? "icons" : "banners";

    return {
        url: `${DISCORD_CDN}/${folder}/${guild.id}/${hashString}.${ext}?size=4096`,
        ext
    };
}

function getInviteUrl(guild: GuildLike) {
    if (!guild.vanityURLCode) return null;
    return `https://discord.gg/${guild.vanityURLCode}`;
}

function collectChannelsFromUnknown(value: any, guildId: string, channels: Map<string, ChannelLike>, depth = 0) {
    if (!value || depth > 8) return;

    if (Array.isArray(value)) {
        for (const item of value) {
            collectChannelsFromUnknown(item, guildId, channels, depth + 1);
        }

        return;
    }

    if (typeof value !== "object") return;

    const possibleChannel = value.channel ?? value;

    if (
        possibleChannel &&
        typeof possibleChannel === "object" &&
        possibleChannel.id &&
        typeof possibleChannel.type === "number"
    ) {
        const channelGuildId = possibleChannel.guild_id ?? possibleChannel.guildId;

        if (String(channelGuildId) === guildId) {
            channels.set(String(possibleChannel.id), possibleChannel);
        }
    }

    if (value.channel) return;

    for (const child of Object.values(value)) {
        collectChannelsFromUnknown(child, guildId, channels, depth + 1);
    }
}

function getGuildChannels(guild: GuildLike) {
    const channels = new Map<string, ChannelLike>();

    try {
        const rawChannels = GuildChannelStore.getChannels(guild.id);
        collectChannelsFromUnknown(rawChannels, guild.id, channels);
    } catch (err) {
        console.error("[ServerLog] Failed to read channels:", err);
    }

    return Array.from(channels.values()).sort((a, b) => {
        const aPos = typeof a.position === "number" ? a.position : 0;
        const bPos = typeof b.position === "number" ? b.position : 0;

        if (aPos !== bPos) return aPos - bPos;

        return String(a.id).localeCompare(String(b.id));
    });
}

function getParentId(channel: ChannelLike) {
    return channel.parent_id ?? channel.parentId ?? null;
}

function getChannelTypeLabel(type?: number) {
    switch (type) {
        case 0:
            return "Text";
        case 2:
            return "Voice";
        case 4:
            return "Category";
        case 5:
            return "Announcement";
        case 10:
            return "Announcement Thread";
        case 11:
            return "Public Thread";
        case 12:
            return "Private Thread";
        case 13:
            return "Stage Voice";
        case 15:
            return "Forum";
        case 16:
            return "Media";
        default:
            return `Type ${type ?? "Unknown"}`;
    }
}

function getChannelPrefix(type?: number) {
    switch (type) {
        case 2:
            return "🔊";
        case 4:
            return "📁";
        case 5:
            return "📢";
        case 10:
        case 11:
        case 12:
            return "🧵";
        case 13:
            return "🎙️";
        case 15:
            return "💬";
        case 16:
            return "🖼️";
        default:
            return "#";
    }
}

function getGuildRoles(guild: GuildLike) {
    let roles: RoleLike[] = [];

    try {
        roles = normalizeCollection<RoleLike>(RoleStore.getRoles(guild.id));
    } catch {}

    if (!roles.length) {
        roles = normalizeCollection<RoleLike>(guild.roles);
    }

    return roles
        .filter(role => role && role.id && role.name)
        .sort((a, b) => {
            const aPos = typeof a.position === "number" ? a.position : 0;
            const bPos = typeof b.position === "number" ? b.position : 0;
            return bPos - aPos;
        });
}

function getRoleColor(role: RoleLike) {
    if (role.colorString) return role.colorString;

    const color = Number(role.color ?? 0);

    if (!color) return "Default";

    return `#${color.toString(16).padStart(6, "0")}`;
}

function collectEmojisFromUnknown(value: any, emojis: Map<string, EmojiLike>, depth = 0) {
    if (!value || depth > 6) return;

    if (Array.isArray(value)) {
        for (const item of value) {
            collectEmojisFromUnknown(item, emojis, depth + 1);
        }

        return;
    }

    if (typeof value !== "object") return;

    if (value.name && (value.id || value.uniqueName || value.allNamesString)) {
        const key = String(value.id ?? value.name);
        emojis.set(key, value);
    }

    for (const child of Object.values(value)) {
        collectEmojisFromUnknown(child, emojis, depth + 1);
    }
}

function getGuildEmojis(guild: GuildLike) {
    const emojis = new Map<string, EmojiLike>();

    try {
        collectEmojisFromUnknown(GuildEmojiStore.getGuildEmoji(guild.id), emojis);
    } catch {}

    try {
        collectEmojisFromUnknown((GuildEmojiStore as any).getGuildEmojis?.(guild.id), emojis);
    } catch {}

    collectEmojisFromUnknown(guild.emojis, emojis);

    return Array.from(emojis.values())
        .filter(emoji => emoji && emoji.name)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function getEmojiUrl(emoji: EmojiLike) {
    if (!emoji.id) return null;

    const ext = emoji.animated ? "gif" : "png";
    return `${DISCORD_CDN}/emojis/${emoji.id}.${ext}?size=96&quality=lossless`;
}

function getGuildStickers(guild: GuildLike) {
    let stickers: StickerLike[] = [];

    try {
        stickers = normalizeCollection<StickerLike>(GuildStickerStore.getGuildStickers(guild.id));
    } catch {}

    if (!stickers.length) {
        stickers = normalizeCollection<StickerLike>(guild.stickers);
    }

    return stickers
        .filter(sticker => sticker && sticker.id && sticker.name)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function getStickerUrl(sticker: StickerLike) {
    if (!sticker.id) return null;
    return `${DISCORD_CDN}/stickers/${sticker.id}.png?size=160`;
}

function getCachedMembers(guild: GuildLike) {
    let members: MemberLike[] = [];

    try {
        members = normalizeCollection<MemberLike>(GuildMemberStore.getMembers(guild.id));
    } catch {}

    return members
        .filter(member => member && (member.userId || member.user?.id))
        .sort((a, b) => getMemberName(a).localeCompare(getMemberName(b)));
}

function getMemberName(member: MemberLike) {
    const userId = member.userId ?? member.user?.id;

    if (member.nick) return member.nick;
    if (member.user?.globalName) return member.user.globalName;
    if (member.user?.username) return member.user.username;

    try {
        const user = UserStore.getUser(userId);

        if (user?.globalName) return user.globalName;
        if (user?.username) return user.username;
    } catch {}

    return userId ?? "Unknown Member";
}

function getMemberUsername(member: MemberLike) {
    const userId = member.userId ?? member.user?.id;

    if (member.user?.username) return member.user.username;

    try {
        const user = UserStore.getUser(userId);

        if (user?.username) return user.username;
    } catch {}

    return "";
}

function getExportData(guild: GuildLike): ExportData {
    const opts = getExportOptions();

    return {
        guild,
        channels: getGuildChannels(guild),
        roles: getGuildRoles(guild),
        emojis: getGuildEmojis(guild),
        stickers: getGuildStickers(guild),
        cachedMembers:
            opts.exportCachedMembersHtml ||
            opts.exportCachedMembersTxt
                ? getCachedMembers(guild)
                : []
    };
}

function buildChannelsTxt(channels: ChannelLike[], opts = getExportOptions()) {
    const categories = channels.filter(channel => channel.type === 4);
    const categoryIds = new Set(categories.map(channel => String(channel.id)));

    const uncategorized = channels.filter(channel => {
        if (channel.type === 4) return false;

        const parentId = getParentId(channel);
        return !parentId || !categoryIds.has(String(parentId));
    });

    let text = "Channels\n====================\n\n";

    if (uncategorized.length) {
        text += "No Category\n";
        text += "--------------------\n";

        for (const channel of uncategorized) {
            text += `  ${getChannelPrefix(channel.type)} ${channel.name || "unnamed-channel"} (${getChannelTypeLabel(channel.type)})`;
            if (opts.showIds) text += ` - ${channel.id}`;
            text += "\n";
        }

        text += "\n";
    }

    for (const category of categories) {
        text += `📁 ${(category.name || "Unnamed Category").toUpperCase()}\n`;
        text += "--------------------\n";

        const children = channels.filter(channel => {
            if (channel.type === 4) return false;

            const parentId = getParentId(channel);
            return parentId && String(parentId) === String(category.id);
        });

        if (!children.length) {
            text += "  No channels in this category.\n\n";
            continue;
        }

        for (const channel of children) {
            text += `  ${getChannelPrefix(channel.type)} ${channel.name || "unnamed-channel"} (${getChannelTypeLabel(channel.type)})`;
            if (opts.showIds) text += ` - ${channel.id}`;
            text += "\n";
        }

        text += "\n";
    }

    return text;
}

function buildRolesTxt(roles: RoleLike[], opts = getExportOptions()) {
    let text = "Roles\n====================\n\n";

    if (!roles.length) {
        return text + "No roles found.\n\n";
    }

    for (const role of roles) {
        text += `${role.name}\n`;
        text += `Color: ${getRoleColor(role)}\n`;
        text += `Position: ${role.position ?? "Unknown"}\n`;
        text += `Tags: ${[
            role.managed ? "Managed" : "",
            role.hoist ? "Hoisted" : "",
            role.mentionable ? "Mentionable" : ""
        ].filter(Boolean).join(", ") || "None"}\n`;
        if (opts.showIds) text += `ID: ${role.id}\n`;
        text += "\n";
    }

    return text;
}

function buildMembersTxt(guild: GuildLike, members: MemberLike[], opts = getExportOptions()) {
    const memberCount = getGuildMemberCount(guild);
    const coverage =
        memberCount !== null && memberCount > 0
            ? `${((members.length / memberCount) * 100).toFixed(1)}%`
            : "Unknown";

    let text = "Cached Members\n====================\n\n";

    text += "This only includes members already cached by Discord. It may not include every member.\n\n";
    text += `Server Member Count: ${formatCount(memberCount)}\n`;
    text += `Cached Members Found: ${members.length.toLocaleString()}\n`;
    text += `Cache Coverage: ${coverage}\n\n`;

    if (isLargeServer(guild)) {
        text += `Large Server Notice: This server has ${formatCount(memberCount)} members. Cached exports may be incomplete and may take longer.\n\n`;
    }

    if (!members.length) {
        return text + "No cached members found.\n\n";
    }

    text += members.map((member, index) => {
        const userId = member.userId ?? member.user?.id ?? "Unknown ID";
        const displayName = getMemberName(member);
        const username = getMemberUsername(member);
        const roles = member.roles?.length ? member.roles.join(", ") : "No cached role IDs";

        return `${index + 1}. ${displayName}
Username: ${username || "Unknown"}${opts.showIds ? `\nUser ID: ${userId}` : ""}
Role IDs: ${roles}`;
    }).join("\n\n");

    return text + "\n\n";
}

function buildTextLog(data: ExportData) {
    const opts = getExportOptions();
    const { guild, channels, roles, cachedMembers } = data;
    const icon = getGuildAsset(guild, "icon");
    const banner = getGuildAsset(guild, "banner");
    const invite = getInviteUrl(guild);
    const memberCount = getGuildMemberCount(guild);

    let content = `ServerLog Export
====================

Server Name: ${guild.name}
${opts.showIds ? `Server ID: ${guild.id}\nOwner ID: ${guild.ownerId ?? "Unknown"}\n` : ""}Saved At: ${new Date().toLocaleString()}
Privacy Mode: ${settings.store.privacyMode ? "Enabled" : "Disabled"}

Description: ${guild.description || "No description"}
Vanity Invite: ${invite ?? "No vanity invite"}
Boost Tier: ${guild.premiumTier ?? "Unknown"}
Boost Count: ${guild.premiumSubscriberCount ?? "Unknown"}
Member Count: ${formatCount(memberCount)}

Channel Count: ${channels.filter(channel => channel.type !== 4).length}
Category Count: ${channels.filter(channel => channel.type === 4).length}
Role Count: ${roles.length}
Emoji Count: ${data.emojis.length}
Sticker Count: ${data.stickers.length}

${opts.showAssetUrls ? `Server Icon: ${icon?.url ?? "No icon"}\nServer Banner: ${banner?.url ?? "No banner"}\n\n` : ""}`;

    if (opts.exportChannelsTxt) {
        content += buildChannelsTxt(channels, opts);
    }

    if (opts.exportRolesTxt) {
        content += buildRolesTxt(roles, opts);
    }

    if (opts.exportCachedMembersTxt) {
        content += buildMembersTxt(guild, cachedMembers, opts);
    } else {
        content += "Note:\nCached member TXT export is disabled. HTML exports can still include other server sections.\n";
    }

    return content;
}

function getJsonExport(data: ExportData) {
    const opts = getExportOptions();
    const { guild, channels, roles, emojis, stickers, cachedMembers } = data;

    return {
        schema: "serverlog.export",
        exportedAt: new Date().toISOString(),
        privacyMode: settings.store.privacyMode,
        exporter: {
            name: "ServerLog",
            author: AUTHOR_NAME
        },
        server: {
            id: opts.showIds ? guild.id : null,
            name: guild.name,
            ownerId: opts.showIds ? guild.ownerId ?? null : null,
            description: guild.description ?? null,
            vanityInvite: getInviteUrl(guild),
            boostTier: guild.premiumTier ?? null,
            boostCount: guild.premiumSubscriberCount ?? null,
            memberCount: getGuildMemberCount(guild),
            icon: opts.showAssetUrls ? getGuildAsset(guild, "icon") : null,
            banner: opts.showAssetUrls ? getGuildAsset(guild, "banner") : null,
            features: guild.features ?? []
        },
        overview: {
            channels: channels.filter(channel => channel.type !== 4).length,
            categories: channels.filter(channel => channel.type === 4).length,
            roles: roles.length,
            emojis: emojis.length,
            stickers: stickers.length,
            cachedMembers: cachedMembers.length
        },
        channels: channels.map(channel => ({
            id: opts.showIds ? channel.id : null,
            name: channel.name ?? null,
            type: getChannelTypeLabel(channel.type),
            rawType: channel.type ?? null,
            parentId: opts.showIds ? getParentId(channel) : null,
            position: channel.position ?? null,
            topic: channel.topic ?? null,
            nsfw: !!channel.nsfw
        })),
        roles: roles.map(role => ({
            id: opts.showIds ? role.id : null,
            name: role.name ?? null,
            color: getRoleColor(role),
            position: role.position ?? null,
            hoisted: !!role.hoist,
            managed: !!role.managed,
            mentionable: !!role.mentionable
        })),
        emojis: emojis.map(emoji => ({
            id: opts.showIds ? emoji.id ?? null : null,
            name: emoji.name ?? null,
            animated: !!emoji.animated,
            available: emoji.available ?? null,
            managed: emoji.managed ?? null,
            url: opts.showAssetUrls ? getEmojiUrl(emoji) : null
        })),
        stickers: stickers.map(sticker => ({
            id: opts.showIds ? sticker.id ?? null : null,
            name: sticker.name ?? null,
            description: sticker.description ?? null,
            url: opts.showAssetUrls ? getStickerUrl(sticker) : null
        })),
        cachedMembers: cachedMembers.map(member => ({
            id: opts.showIds ? member.userId ?? member.user?.id ?? null : null,
            displayName: getMemberName(member),
            username: getMemberUsername(member) || null,
            roleIds: opts.showIds ? member.roles ?? [] : []
        }))
    };
}

function getInitialThemeName() {
    return settings.store.darkMode ? "discord" : "light";
}

function renderCopyButton(value: any, label = "Copy") {
    return `<button class="copy-btn" data-copy="${escapeAttr(value)}">${escapeHtml(label)}</button>`;
}

function renderSearchScript() {
    return `
        <script>
            const searchInput = document.getElementById("searchInput");
            const clearButton = document.getElementById("clearSearch");
            const expandButton = document.getElementById("expandAll");
            const collapseButton = document.getElementById("collapseAll");
            const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
            const themeButtons = Array.from(document.querySelectorAll("[data-theme-button]"));
            const cards = Array.from(document.querySelectorAll("[data-card]"));
            const sections = Array.from(document.querySelectorAll("details.export-section"));
            let activeFilter = "all";

            function matchesFilter(card) {
                if (activeFilter === "all") return true;
                return card.dataset.kind === activeFilter;
            }

            function updateSearch() {
                const query = (searchInput?.value || "").trim().toLowerCase();

                for (const card of cards) {
                    const text = card.getAttribute("data-search") || "";
                    const searchMatch = !query || text.toLowerCase().includes(query);
                    const filterMatch = matchesFilter(card);
                    card.style.display = searchMatch && filterMatch ? "" : "none";
                }

                if (query || activeFilter !== "all") {
                    for (const section of sections) section.open = true;
                }
            }

            searchInput?.addEventListener("input", updateSearch);

            clearButton?.addEventListener("click", () => {
                searchInput.value = "";
                activeFilter = "all";
                for (const button of filterButtons) button.classList.toggle("active", button.dataset.filter === "all");
                updateSearch();
            });

            expandButton?.addEventListener("click", () => {
                for (const section of sections) section.open = true;
            });

            collapseButton?.addEventListener("click", () => {
                for (const section of sections) section.open = false;
            });

            for (const button of filterButtons) {
                button.addEventListener("click", () => {
                    activeFilter = button.dataset.filter || "all";
                    for (const otherButton of filterButtons) otherButton.classList.toggle("active", otherButton === button);
                    updateSearch();
                });
            }

            for (const button of themeButtons) {
                button.addEventListener("click", () => {
                    document.body.dataset.theme = button.dataset.themeButton || "discord";
                    for (const otherButton of themeButtons) otherButton.classList.toggle("active", otherButton === button);
                });
            }

            async function copyText(text) {
                try {
                    await navigator.clipboard.writeText(text);
                    return true;
                } catch {
                    try {
                        const area = document.createElement("textarea");
                        area.value = text;
                        area.style.position = "fixed";
                        area.style.opacity = "0";
                        document.body.appendChild(area);
                        area.focus();
                        area.select();
                        const ok = document.execCommand("copy");
                        area.remove();
                        return ok;
                    } catch {
                        return false;
                    }
                }
            }

            for (const button of document.querySelectorAll("[data-copy]")) {
                button.addEventListener("click", async () => {
                    const original = button.textContent;
                    const ok = await copyText(button.dataset.copy || "");
                    button.textContent = ok ? "Copied" : "Failed";
                    setTimeout(() => button.textContent = original, 900);
                });
            }
        </script>
    `;
}

function renderInfoSection(guild: GuildLike, data: ExportData, opts = getExportOptions()) {
    const icon = getGuildAsset(guild, "icon");
    const banner = getGuildAsset(guild, "banner");
    const invite = getInviteUrl(guild);
    const memberCount = getGuildMemberCount(guild);

    const serverName = escapeHtml(guild.name);
    const serverId = escapeHtml(guild.id);
    const ownerId = escapeHtml(guild.ownerId ?? "Unknown");
    const description = guild.description ? escapeHtml(guild.description) : "No description";
    const savedAt = escapeHtml(new Date().toLocaleString());

    const iconUrl = icon?.url ? escapeHtml(icon.url) : "";
    const bannerUrl = banner?.url ? escapeHtml(banner.url) : "";

    const textChannels = data.channels.filter(channel => channel.type === 0).length;
    const voiceChannels = data.channels.filter(channel => channel.type === 2 || channel.type === 13).length;
    const forumChannels = data.channels.filter(channel => channel.type === 15 || channel.type === 16).length;
    const totalChannels = data.channels.filter(channel => channel.type !== 4).length;
    const categoryCount = data.channels.filter(channel => channel.type === 4).length;
    const nsfwChannels = data.channels.filter(channel => channel.nsfw).length;

    const features = Array.isArray(guild.features) && guild.features.length
        ? guild.features.map(feature => `<span class="pill">${escapeHtml(feature)}</span>`).join("")
        : `<span class="muted-text">No features found.</span>`;

    return `
        ${bannerUrl ? `<img class="banner" src="${bannerUrl}" alt="Server Banner">` : ""}

        <div class="hero" id="overview">
            <div class="top">
                ${iconUrl ? `<img class="server-icon" src="${iconUrl}" alt="Server Icon">` : `<div class="server-icon placeholder">${escapeHtml(guild.name.charAt(0).toUpperCase())}</div>`}

                <div>
                    <h1>Server Export</h1>
                    <div class="subtitle">${serverName} • exported with ServerLog</div>
                </div>
            </div>

            <div class="search-row">
                <input id="searchInput" placeholder="Search channels, roles, emojis, stickers, members..." />
                <button id="clearSearch">Clear</button>
                <button id="expandAll">Expand</button>
                <button id="collapseAll">Collapse</button>
            </div>

            <div class="filter-row">
                <button class="filter active" data-filter="all">All</button>
                <button class="filter" data-filter="channel">Channels</button>
                <button class="filter" data-filter="role">Roles</button>
                <button class="filter" data-filter="emoji">Emojis</button>
                <button class="filter" data-filter="sticker">Stickers</button>
                <button class="filter" data-filter="member">Members</button>
            </div>

            <div class="theme-row">
                <span>Theme</span>
                ${["discord", "amoled", "light", "old", "blurple"].map(theme => `
                    <button class="theme-button ${theme === getInitialThemeName() ? "active" : ""}" data-theme-button="${theme}">${theme === "amoled" ? "AMOLED" : theme.charAt(0).toUpperCase() + theme.slice(1)}</button>
                `).join("")}
            </div>
        </div>

        <div class="stats summary">
            <div class="stat"><div class="label">Members</div><div class="value big">${formatCount(memberCount)}</div></div>
            <div class="stat"><div class="label">Channels</div><div class="value big">${totalChannels}</div></div>
            <div class="stat"><div class="label">Categories</div><div class="value big">${categoryCount}</div></div>
            <div class="stat"><div class="label">Roles</div><div class="value big">${data.roles.length}</div></div>
            <div class="stat"><div class="label">Text Channels</div><div class="value big">${textChannels}</div></div>
            <div class="stat"><div class="label">Voice Channels</div><div class="value big">${voiceChannels}</div></div>
            <div class="stat"><div class="label">Forum/Media</div><div class="value big">${forumChannels}</div></div>
            <div class="stat"><div class="label">NSFW Channels</div><div class="value big">${nsfwChannels}</div></div>
            <div class="stat"><div class="label">Emojis</div><div class="value big">${data.emojis.length}</div></div>
            <div class="stat"><div class="label">Stickers</div><div class="value big">${data.stickers.length}</div></div>
        </div>

        ${settings.store.privacyMode ? `<div class="notice">Privacy Mode was enabled when this export was made. IDs, asset URLs, and cached members were hidden.</div>` : ""}

        ${isLargeServer(guild) ? `
            <div class="notice">
                Large server notice: this server has ${formatCount(memberCount)} members. Cached member exports may be incomplete.
            </div>
        ` : ""}

        <details class="export-section" id="server-info" open>
            <summary>Server Info <span>basic server details</span></summary>

            <div class="grid">
                <div class="box" data-card data-kind="info" data-search="${escapeAttr(guild.name)}">
                    <div class="box-head"><div><div class="label">Server Name</div><div class="value">${serverName}</div></div>${renderCopyButton(guild.name)}</div>
                </div>

                ${opts.showIds ? `
                    <div class="box" data-card data-kind="info" data-search="${serverId}">
                        <div class="box-head"><div><div class="label">Server ID</div><div class="value">${serverId}</div></div>${renderCopyButton(guild.id)}</div>
                    </div>

                    <div class="box" data-card data-kind="info" data-search="${ownerId}">
                        <div class="box-head"><div><div class="label">Owner ID</div><div class="value">${ownerId}</div></div>${renderCopyButton(guild.ownerId ?? "Unknown")}</div>
                    </div>
                ` : ""}

                <div class="box" data-card data-kind="info" data-search="${savedAt}">
                    <div class="label">Saved At</div>
                    <div class="value">${savedAt}</div>
                </div>

                <div class="box" data-card data-kind="info" data-search="${escapeAttr(description)}">
                    <div class="label">Description</div>
                    <div class="value">${description}</div>
                </div>

                <div class="box" data-card data-kind="info" data-search="${escapeAttr(invite ?? "")}">
                    <div class="box-head"><div><div class="label">Vanity Invite</div><div class="value">${invite ? escapeHtml(invite) : "No vanity invite"}</div></div>${invite ? renderCopyButton(invite) : ""}</div>
                </div>

                <div class="box"><div class="label">Boost Tier</div><div class="value">${escapeHtml(guild.premiumTier ?? "Unknown")}</div></div>
                <div class="box"><div class="label">Boost Count</div><div class="value">${escapeHtml(guild.premiumSubscriberCount ?? "Unknown")}</div></div>
            </div>
        </details>

        <details class="export-section" id="features">
            <summary>Server Features <span>${Array.isArray(guild.features) ? guild.features.length : 0} features</span></summary>
            <div class="pill-wrap">${features}</div>
        </details>

        ${opts.showAssetUrls ? `
            <details class="export-section" id="assets">
                <summary>Assets <span>icon and banner URLs</span></summary>

                <div class="grid">
                    <div class="box" data-card data-kind="asset" data-search="${iconUrl}">
                        <div class="box-head"><div><div class="label">Icon URL</div><div class="value">${iconUrl || "No icon"}</div></div>${iconUrl ? renderCopyButton(icon?.url ?? "") : ""}</div>
                    </div>

                    <div class="box" data-card data-kind="asset" data-search="${bannerUrl}">
                        <div class="box-head"><div><div class="label">Banner URL</div><div class="value">${bannerUrl || "No banner"}</div></div>${bannerUrl ? renderCopyButton(banner?.url ?? "") : ""}</div>
                    </div>
                </div>
            </details>
        ` : ""}
    `;
}

function renderChannel(channel: ChannelLike, opts = getExportOptions()) {
    const channelName = escapeHtml(channel.name || "unnamed-channel");
    const channelId = escapeHtml(channel.id);
    const channelType = escapeHtml(getChannelTypeLabel(channel.type));
    const prefix = escapeHtml(getChannelPrefix(channel.type));
    const topic = channel.topic ? escapeHtml(channel.topic) : "";

    return `
        <div class="item channel-item" data-card data-kind="channel" data-search="${channelName} ${channelId} ${channelType} ${topic}">
            <div class="item-main">
                <div class="item-title">
                    <span class="channel-icon">${prefix}</span>
                    ${channelName}
                    ${channel.nsfw ? `<span class="tag nsfw">NSFW</span>` : ""}
                </div>

                <div class="item-type">${channelType}</div>
            </div>

            ${opts.showIds ? `<div class="small">ID: ${channelId} ${renderCopyButton(channel.id, "Copy ID")}</div>` : ""}
            ${topic ? `<div class="small text">${topic}</div>` : ""}
        </div>
    `;
}

function renderChannelGroups(channels: ChannelLike[], opts = getExportOptions()) {
    const categories = channels.filter(channel => channel.type === 4);
    const categoryIds = new Set(categories.map(channel => String(channel.id)));

    const uncategorized = channels.filter(channel => {
        if (channel.type === 4) return false;

        const parentId = getParentId(channel);
        return !parentId || !categoryIds.has(String(parentId));
    });

    const sections: string[] = [];

    if (uncategorized.length) {
        sections.push(`
            <div class="category">
                <h3>No Category</h3>
                <div class="channel-tree">${uncategorized.map(channel => renderChannel(channel, opts)).join("")}</div>
            </div>
        `);
    }

    for (const category of categories) {
        const children = channels.filter(channel => {
            if (channel.type === 4) return false;

            const parentId = getParentId(channel);
            return parentId && String(parentId) === String(category.id);
        });

        sections.push(`
            <div class="category" data-card data-kind="channel" data-search="${escapeAttr(category.name || "Unnamed Category")}">
                <h3>${escapeHtml(category.name || "Unnamed Category")}</h3>
                <div class="channel-tree">${children.length ? children.map(channel => renderChannel(channel, opts)).join("") : `<div class="empty">No channels in this category.</div>`}</div>
            </div>
        `);
    }

    return sections.join("");
}

function renderChannelsSection(channels: ChannelLike[], opts = getExportOptions()) {
    const totalChannels = channels.filter(channel => channel.type !== 4).length;
    const totalCategories = channels.filter(channel => channel.type === 4).length;

    return `
        <details class="export-section" id="channels" open>
            <summary>Channels <span>${totalChannels} channels • ${totalCategories} categories</span></summary>
            ${channels.length ? renderChannelGroups(channels, opts) : `<div class="empty">No channels found. Try opening the server first, then export again.</div>`}
        </details>
    `;
}

function renderRolesSection(roles: RoleLike[], opts = getExportOptions()) {
    return `
        <details class="export-section" id="roles" open>
            <summary>Roles <span>${roles.length} roles</span></summary>

            ${roles.length ? roles.map(role => {
                const color = getRoleColor(role);

                return `
                    <div class="item role-card" style="--role-color: ${color === "Default" ? "#949ba4" : escapeHtml(color)};" data-card data-kind="role" data-search="${escapeAttr(role.name)} ${escapeAttr(role.id)}">
                        <div class="item-main">
                            <div class="item-title">
                                <span class="role-dot"></span>
                                ${escapeHtml(role.name)}
                                ${role.managed ? `<span class="tag bot">Managed</span>` : ""}
                                ${role.hoist ? `<span class="tag hoist">Hoisted</span>` : ""}
                                ${role.mentionable ? `<span class="tag mention">Mentionable</span>` : ""}
                            </div>

                            <div class="item-type">${escapeHtml(color)}</div>
                        </div>

                        ${opts.showIds ? `<div class="small">ID: ${escapeHtml(role.id)} ${renderCopyButton(role.id, "Copy ID")}</div>` : ""}
                        <div class="small">Position: ${escapeHtml(role.position ?? "Unknown")}</div>
                    </div>
                `;
            }).join("") : `<div class="empty">No roles found.</div>`}
        </details>
    `;
}

function renderEmojisSection(emojis: EmojiLike[], opts = getExportOptions()) {
    return `
        <details class="export-section" id="emojis" open>
            <summary>Emojis <span>${emojis.length} emojis</span></summary>

            ${emojis.length ? `<div class="asset-grid">
                ${emojis.map(emoji => {
                    const url = getEmojiUrl(emoji);
                    const safeUrl = url ? escapeHtml(url) : "";
                    const emojiName = `:${emoji.name}:`;

                    return `
                        <div class="asset" data-card data-kind="emoji" data-search="${escapeAttr(emoji.name)} ${escapeAttr(emoji.id ?? "")}">
                            ${safeUrl ? `<img src="${safeUrl}" alt="${escapeHtml(emoji.name)}">` : `<div class="asset-placeholder">?</div>`}
                            <div class="asset-name">${escapeHtml(emojiName)}</div>
                            ${emoji.animated ? `<div class="small">Animated</div>` : ""}
                            ${opts.showIds && emoji.id ? `<div class="small">ID: ${escapeHtml(emoji.id)} ${renderCopyButton(emoji.id, "Copy ID")}</div>` : ""}
                            ${opts.showAssetUrls && safeUrl ? `<div class="small url">${safeUrl} ${renderCopyButton(url ?? "", "Copy URL")}</div>` : ""}
                            <div class="asset-actions">
                                ${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noreferrer">Open</a><a href="${safeUrl}" download>Download</a>` : ""}
                                ${renderCopyButton(emojiName, "Copy Name")}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>` : `<div class="empty">No emojis found or emojis are not cached.</div>`}
        </details>
    `;
}

function renderStickersSection(stickers: StickerLike[], opts = getExportOptions()) {
    return `
        <details class="export-section" id="stickers" open>
            <summary>Stickers <span>${stickers.length} stickers</span></summary>

            ${stickers.length ? `<div class="asset-grid">
                ${stickers.map(sticker => {
                    const url = getStickerUrl(sticker);
                    const safeUrl = url ? escapeHtml(url) : "";

                    return `
                        <div class="asset" data-card data-kind="sticker" data-search="${escapeAttr(sticker.name)} ${escapeAttr(sticker.description ?? "")} ${escapeAttr(sticker.id ?? "")}">
                            ${safeUrl ? `<img src="${safeUrl}" alt="${escapeHtml(sticker.name)}">` : `<div class="asset-placeholder">?</div>`}
                            <div class="asset-name">${escapeHtml(sticker.name)}</div>
                            ${sticker.description ? `<div class="small text">${escapeHtml(sticker.description)}</div>` : ""}
                            ${opts.showIds && sticker.id ? `<div class="small">ID: ${escapeHtml(sticker.id)} ${renderCopyButton(sticker.id, "Copy ID")}</div>` : ""}
                            ${opts.showAssetUrls && safeUrl ? `<div class="small url">${safeUrl} ${renderCopyButton(url ?? "", "Copy URL")}</div>` : ""}
                            <div class="asset-actions">
                                ${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noreferrer">Open</a><a href="${safeUrl}" download>Download</a>` : ""}
                                ${renderCopyButton(sticker.name ?? "", "Copy Name")}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>` : `<div class="empty">No stickers found or stickers are not cached.</div>`}
        </details>
    `;
}

function renderMembersSection(guild: GuildLike, members: MemberLike[], opts = getExportOptions()) {
    const totalMembers = getGuildMemberCount(guild);
    const cachedCount = members.length;

    const coverage =
        totalMembers !== null && totalMembers > 0
            ? `${((cachedCount / totalMembers) * 100).toFixed(1)}%`
            : "Unknown";

    return `
        <details class="export-section" id="members" open>
            <summary>Cached Members <span>${cachedCount.toLocaleString()} cached</span></summary>

            <div class="notice">
                This only includes members Discord already loaded. It may be incomplete, especially in large servers.
            </div>

            ${isLargeServer(guild) ? `
                <div class="notice">
                    Large server notice: this server has ${formatCount(totalMembers)} members. Cached member export may take longer and will probably not include everyone.
                </div>
            ` : ""}

            <div class="stats">
                <div class="stat"><div class="label">Server Members</div><div class="value big">${formatCount(totalMembers)}</div></div>
                <div class="stat"><div class="label">Cached Members</div><div class="value big">${cachedCount.toLocaleString()}</div></div>
                <div class="stat"><div class="label">Cache Coverage</div><div class="value big">${coverage}</div></div>
            </div>

            ${members.length ? members.slice(0, MAX_MEMBERS_IN_HTML).map(member => {
                const userId = member.userId ?? member.user?.id ?? "Unknown ID";
                const displayName = getMemberName(member);
                const username = getMemberUsername(member);

                return `
                    <div class="item" data-card data-kind="member" data-search="${escapeAttr(displayName)} ${escapeAttr(username)} ${escapeAttr(userId)}">
                        <div class="item-main">
                            <div class="item-title">${escapeHtml(displayName)}</div>
                            <div class="item-type">${username ? escapeHtml(username) : "Cached User"}</div>
                        </div>

                        ${opts.showIds ? `<div class="small">ID: ${escapeHtml(userId)} ${renderCopyButton(userId, "Copy ID")}</div>` : ""}
                        ${member.roles?.length && opts.showIds ? `<div class="small">Role IDs: ${escapeHtml(member.roles.join(", "))}</div>` : ""}
                    </div>
                `;
            }).join("") : `<div class="empty">No cached members found, but the server member count may still show above.</div>`}

            ${members.length > MAX_MEMBERS_IN_HTML ? `<div class="notice">Only the first ${MAX_MEMBERS_IN_HTML.toLocaleString()} cached members were shown in HTML. Use TXT cached member export for a longer cached list.</div>` : ""}
        </details>
    `;
}

function renderAuthorFooter() {
    const imageSource = escapeHtml(AUTHOR_IMAGE_SOURCE);

    return `
        <footer>
            <img class="author-image" src="${imageSource}" alt="${AUTHOR_NAME}" onerror="this.remove()">
            <div>
                <div class="footer-title">Export made by ${escapeHtml(AUTHOR_NAME)}</div>
                <div class="footer-subtitle">ServerLog Vencord Plugin</div>
            </div>
        </footer>
    `;
}

function buildHtmlLog(data: ExportData) {
    const opts = getExportOptions();
    const { guild, channels, roles, emojis, stickers, cachedMembers } = data;
    const serverName = escapeHtml(guild.name);
    const initialTheme = getInitialThemeName();

    const sections = [
        renderInfoSection(guild, data, opts),
        opts.exportChannelsHtml ? renderChannelsSection(channels, opts) : "",
        opts.exportRolesHtml ? renderRolesSection(roles, opts) : "",
        opts.exportEmojisHtml ? renderEmojisSection(emojis, opts) : "",
        opts.exportStickersHtml ? renderStickersSection(stickers, opts) : "",
        opts.exportCachedMembersHtml ? renderMembersSection(guild, cachedMembers, opts) : "",
        renderAuthorFooter()
    ].filter(Boolean);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${serverName} Server Export</title>

    <style>
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body[data-theme="discord"] {
            --bg: #313338;
            --card: #2b2d31;
            --card2: #1e1f22;
            --border: #25262b;
            --text: #ffffff;
            --muted: #b5bac1;
            --accent: #5865f2;
            --accent2: #8ea1ff;
            --shadow: rgba(0, 0, 0, 0.25);
        }

        body[data-theme="amoled"] {
            --bg: #000000;
            --card: #050505;
            --card2: #0b0b0b;
            --border: #202020;
            --text: #f2f3f5;
            --muted: #a1a1aa;
            --accent: #5865f2;
            --accent2: #8ea1ff;
            --shadow: rgba(0, 0, 0, 0.55);
        }

        body[data-theme="light"] {
            --bg: #f4f4f5;
            --card: #ffffff;
            --card2: #f1f2f4;
            --border: #d9dce3;
            --text: #1f2328;
            --muted: #59636e;
            --accent: #5865f2;
            --accent2: #3f4bd8;
            --shadow: rgba(0, 0, 0, 0.12);
        }

        body[data-theme="old"] {
            --bg: #36393f;
            --card: #2f3136;
            --card2: #202225;
            --border: #1f2024;
            --text: #dcddde;
            --muted: #b9bbbe;
            --accent: #7289da;
            --accent2: #99aab5;
            --shadow: rgba(0, 0, 0, 0.25);
        }

        body[data-theme="blurple"] {
            --bg: #15172b;
            --card: #1f2240;
            --card2: #111328;
            --border: #343866;
            --text: #ffffff;
            --muted: #b8bcff;
            --accent: #5865f2;
            --accent2: #aab0ff;
            --shadow: rgba(0, 0, 0, 0.35);
        }

        body {
            margin: 0;
            background:
                radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 20%, transparent), transparent 30%),
                var(--bg);
            color: var(--text);
            font-family: Arial, sans-serif;
        }

        .layout {
            display: grid;
            grid-template-columns: 230px minmax(0, 1fr);
            gap: 18px;
            padding: 24px;
        }

        .sidebar {
            position: sticky;
            top: 24px;
            align-self: start;
            background: color-mix(in srgb, var(--card) 96%, transparent);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 18px 50px var(--shadow);
        }

        .sidebar-title {
            font-weight: 900;
            font-size: 16px;
            margin-bottom: 4px;
        }

        .sidebar-subtitle {
            color: var(--muted);
            font-size: 12px;
            margin-bottom: 12px;
            overflow-wrap: anywhere;
        }

        .sidebar a {
            display: block;
            color: var(--muted);
            text-decoration: none;
            padding: 8px 9px;
            border-radius: 10px;
            font-size: 13px;
            margin-bottom: 4px;
        }

        .sidebar a:hover {
            background: var(--card2);
            color: var(--text);
        }

        .card {
            background: color-mix(in srgb, var(--card) 96%, transparent);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 18px;
            box-shadow: 0 18px 50px var(--shadow);
            backdrop-filter: blur(8px);
            min-width: 0;
        }

        .compact .layout { padding: 14px; gap: 12px; }
        .compact .card, .compact .sidebar { border-radius: 14px; padding: 12px; }
        .compact .box, .compact .stat, .compact .item, .compact .asset { padding: 8px; }
        .compact details.export-section { padding: 8px; margin-top: 8px; }

        .banner {
            width: 100%;
            max-height: 260px;
            object-fit: cover;
            border-radius: 14px;
            background: var(--card2);
            margin-bottom: 14px;
        }

        .hero {
            background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--card)), var(--card));
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 14px;
        }

        .top { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }

        .server-icon {
            width: 68px;
            height: 68px;
            border-radius: 20px;
            background: var(--card2);
            object-fit: cover;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            color: var(--text);
            font-weight: 800;
            border: 1px solid var(--border);
        }

        h1 { color: var(--text); margin: 0; font-size: 32px; letter-spacing: -0.03em; }
        h3 { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 18px 0 8px; }
        .subtitle { color: var(--muted); margin-top: 4px; font-size: 13px; }

        .search-row, .filter-row, .theme-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .filter-row, .theme-row { margin-top: 10px; }
        .theme-row span { color: var(--muted); font-size: 12px; font-weight: 700; }

        input {
            flex: 1 1 260px;
            background: var(--card2);
            border: 1px solid var(--border);
            color: var(--text);
            border-radius: 12px;
            padding: 11px 12px;
            outline: none;
        }

        input:focus { border-color: var(--accent); }

        button, .copy-btn {
            background: var(--accent);
            border: 0;
            color: white;
            border-radius: 12px;
            padding: 9px 12px;
            font-weight: 700;
            cursor: pointer;
            font-size: 12px;
        }

        .copy-btn {
            padding: 5px 8px;
            border-radius: 8px;
            margin-left: 7px;
            vertical-align: middle;
        }

        .filter, .theme-button { background: var(--card2); color: var(--muted); border: 1px solid var(--border); }
        .filter.active, .theme-button.active { background: var(--accent); color: white; }

        .grid, .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; margin: 12px 0; }
        .summary { grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)); }
        .box, .stat, .item, .asset { background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 11px; }
        .box-head { display: flex; justify-content: space-between; align-items: start; gap: 10px; }
        .label { color: var(--muted); font-size: 11px; margin-bottom: 5px; }
        .value { color: var(--text); font-family: Consolas, monospace; overflow-wrap: anywhere; font-size: 12px; }
        .big { font-size: 18px; font-weight: 800; font-family: Arial, sans-serif; }

        details.export-section { background: color-mix(in srgb, var(--card) 80%, transparent); border: 1px solid var(--border); border-radius: 14px; padding: 10px; margin-top: 12px; scroll-margin-top: 20px; }
        details.export-section > summary { cursor: pointer; list-style: none; font-size: 18px; font-weight: 800; color: var(--text); display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 4px; }
        details.export-section > summary::-webkit-details-marker { display: none; }
        details.export-section > summary span { color: var(--muted); font-size: 12px; font-weight: 500; }

        .notice { background: color-mix(in srgb, var(--accent) 10%, var(--card2)); border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border)); color: var(--muted); padding: 10px; border-radius: 10px; margin: 12px 0; font-size: 13px; }
        .item { margin-bottom: 7px; }
        .item-main { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .item-title { color: var(--text); font-weight: 700; overflow-wrap: anywhere; font-size: 14px; }
        .item-type { color: var(--muted); font-size: 11px; white-space: nowrap; }
        .small { color: var(--muted); font-family: Consolas, monospace; font-size: 11px; margin-top: 5px; overflow-wrap: anywhere; }
        .small.text { color: var(--muted); font-family: Arial, sans-serif; line-height: 1.35; }
        .muted-text { color: var(--muted); font-size: 12px; }
        .tag, .pill { display: inline-block; font-size: 10px; border-radius: 999px; padding: 3px 7px; margin: 4px 4px 0 0; vertical-align: middle; border: 1px solid var(--border); background: var(--card); color: var(--muted); }
        .nsfw { background: #4f2f46; color: #ffb6e6; }
        .bot { background: #2f3d4f; color: #a8c7ff; }
        .hoist { background: #314f3a; color: #b1f2c1; }
        .mention { background: #463d25; color: #ffe08a; }
        .pill-wrap { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

        .channel-tree { border-left: 2px solid var(--border); padding-left: 10px; }
        .channel-item { position: relative; }
        .channel-icon { color: var(--muted); margin-right: 6px; }

        .role-card { border-left: 4px solid var(--role-color); }
        .role-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 7px; vertical-align: -1px; background: var(--role-color); }

        .empty { color: var(--muted); background: var(--card2); padding: 10px; border-radius: 10px; border: 1px solid var(--border); font-size: 13px; }
        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
        .asset img { width: 52px; height: 52px; object-fit: contain; display: block; margin-bottom: 8px; }
        .asset-placeholder { width: 52px; height: 52px; border-radius: 10px; background: var(--card); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .asset-name { color: var(--text); font-weight: 700; overflow-wrap: anywhere; font-size: 13px; }
        .url { max-height: 44px; overflow: hidden; }
        .asset-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .asset-actions a { color: white; background: var(--accent); text-decoration: none; border-radius: 8px; padding: 6px 8px; font-size: 11px; font-weight: 700; }

        footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; color: var(--muted); }
        .author-image { width: 44px; height: 44px; object-fit: cover; border-radius: 12px; }
        .footer-title { color: var(--text); font-weight: 700; font-size: 13px; }
        .footer-subtitle { color: var(--muted); font-size: 12px; margin-top: 2px; }

        @media (max-width: 850px) {
            .layout { grid-template-columns: 1fr; padding: 14px; }
            .sidebar { position: static; }
        }
    </style>
</head>

<body data-theme="${initialTheme}" class="${opts.compactHtml ? "compact" : ""}">
    <div class="layout">
        <aside class="sidebar">
            <div class="sidebar-title">ServerLog</div>
            <div class="sidebar-subtitle">${serverName}</div>
            <a href="#overview">Overview</a>
            <a href="#server-info">Server Info</a>
            ${opts.exportChannelsHtml ? `<a href="#channels">Channels</a>` : ""}
            ${opts.exportRolesHtml ? `<a href="#roles">Roles</a>` : ""}
            ${opts.exportEmojisHtml ? `<a href="#emojis">Emojis</a>` : ""}
            ${opts.exportStickersHtml ? `<a href="#stickers">Stickers</a>` : ""}
            ${opts.exportCachedMembersHtml ? `<a href="#members">Cached Members</a>` : ""}
            ${opts.showAssetUrls ? `<a href="#assets">Assets</a>` : ""}
        </aside>

        <main class="card">
            ${sections.join("\n")}
        </main>
    </div>

    ${renderSearchScript()}
</body>
</html>`;
}

function getPreviewText(type: "TXT" | "HTML" | "JSON", data: ExportData) {
    const opts = getExportOptions();
    const memberCount = getGuildMemberCount(data.guild);

    return `ServerLog ${type} Preview

Server: ${data.guild.name}
Privacy Mode: ${settings.store.privacyMode ? "On" : "Off"}
Members: ${formatCount(memberCount)}
Channels: ${data.channels.filter(channel => channel.type !== 4).length}
Categories: ${data.channels.filter(channel => channel.type === 4).length}
Roles: ${data.roles.length}
Emojis: ${data.emojis.length}
Stickers: ${data.stickers.length}
Cached Members: ${data.cachedMembers.length}

Included:
- HTML Channels: ${opts.exportChannelsHtml ? "Yes" : "No"}
- HTML Roles: ${opts.exportRolesHtml ? "Yes" : "No"}
- HTML Emojis: ${opts.exportEmojisHtml ? "Yes" : "No"}
- HTML Stickers: ${opts.exportStickersHtml ? "Yes" : "No"}
- HTML Cached Members: ${opts.exportCachedMembersHtml ? "Yes" : "No"}
- TXT Channels: ${opts.exportChannelsTxt ? "Yes" : "No"}
- TXT Roles: ${opts.exportRolesTxt ? "Yes" : "No"}
- TXT Cached Members: ${opts.exportCachedMembersTxt ? "Yes" : "No"}
- IDs: ${opts.showIds ? "Yes" : "No"}
- Asset URLs: ${opts.showAssetUrls ? "Yes" : "No"}

Continue export?`;
}

function shouldContinueExport(type: "TXT" | "HTML" | "JSON", data: ExportData) {
    const opts = getExportOptions();

    if (!opts.confirmBeforeExport) return true;

    return confirm(getPreviewText(type, data));
}

async function readExportHistory() {
    try {
        const stored = await DataStore.get<ExportHistoryEntry[]>(HISTORY_KEY);
        return Array.isArray(stored) ? stored : [];
    } catch (err) {
        console.error("[ServerLog] Failed to read export history:", err);
        return [];
    }
}

async function rememberExport(guild: GuildLike, type: string, fileName: string) {
    try {
        const history = await readExportHistory();

        history.unshift({
            guildName: guild.name,
            guildId: guild.id,
            type,
            fileName,
            time: new Date().toLocaleString()
        });

        await DataStore.set(HISTORY_KEY, history.slice(0, 10));
        return true;
    } catch (err) {
        console.error("[ServerLog] Failed to save export history:", err);
        return false;
    }
}

async function showExportHistory() {
    const history = await readExportHistory();

    if (!history.length) {
        alert("ServerLog Export History\n\nNo exports have been saved yet.");
        return;
    }

    alert(`ServerLog Export History\n\n${history.map((entry, index) => `${index + 1}. ${entry.type} - ${entry.guildName}\n${entry.fileName}\n${entry.time}`).join("\n\n")}`);
}

function saveTxt(guild: GuildLike) {
    if (!canUseGuild(guild)) return;

    const data = getExportData(guild);
    const opts = getExportOptions();

    if (!shouldContinueExport("TXT", data)) {
        showFailure("TXT export cancelled.");
        return;
    }

    if (opts.exportCachedMembersTxt && isLargeServer(guild)) {
        showFailure("Large server notice: TXT cached member export may take longer and may be incomplete.");
    }

    const fileName = getExportFileName(guild, "server-log", "txt");
    downloadTextFile(fileName, buildTextLog(data), "text/plain;charset=utf-8");

    console.log("[ServerLog] Saved TXT:", guild.name, guild.id);
    void rememberExport(guild, "TXT", fileName).then(saved => {
        if (saved) {
            showSuccess("Saved TXT server log and added it to Export History.");
        } else {
            showFailure("Saved TXT, but Export History failed to update.");
        }
    });
}

function saveHtml(guild: GuildLike) {
    if (!canUseGuild(guild)) return;

    const data = getExportData(guild);
    const opts = getExportOptions();

    if (!shouldContinueExport("HTML", data)) {
        showFailure("HTML export cancelled.");
        return;
    }

    if (opts.exportCachedMembersHtml && isLargeServer(guild)) {
        showFailure("Large server notice: cached member HTML export may be incomplete.");
    }

    const fileName = getExportFileName(guild, "server-export", "html");
    downloadTextFile(fileName, buildHtmlLog(data), "text/html;charset=utf-8");

    console.log("[ServerLog] Saved HTML export:", guild.name, guild.id);
    void rememberExport(guild, "HTML", fileName).then(saved => {
        if (saved) {
            showSuccess("Saved HTML server export and added it to Export History.");
        } else {
            showFailure("Saved HTML, but Export History failed to update.");
        }
    });
}

function saveJson(guild: GuildLike) {
    if (!canUseGuild(guild)) return;

    const data = getExportData(guild);
    const opts = getExportOptions();

    if (!shouldContinueExport("JSON", data)) {
        showFailure("JSON export cancelled.");
        return;
    }

    const json = JSON.stringify(getJsonExport(data), null, opts.prettyJson ? 4 : 0);
    const fileName = getExportFileName(guild, "server-export", "json");
    downloadTextFile(fileName, json, "application/json;charset=utf-8");

    console.log("[ServerLog] Saved JSON export:", guild.name, guild.id);
    void rememberExport(guild, "JSON", fileName).then(saved => {
        if (saved) {
            showSuccess("Saved JSON server export and added it to Export History.");
        } else {
            showFailure("Saved JSON, but Export History failed to update.");
        }
    });
}

function saveServerIcon(guild: GuildLike) {
    if (!canUseGuild(guild)) return;

    const icon = getGuildAsset(guild, "icon");

    if (!icon) {
        showFailure("This server has no icon.");
        return;
    }

    void downloadUrlFile(`${makeSafeFileName(guild.name)}-icon.${icon.ext}`, icon.url);
}

function saveServerBanner(guild: GuildLike) {
    if (!canUseGuild(guild)) return;

    const banner = getGuildAsset(guild, "banner");

    if (!banner) {
        showFailure("This server has no banner.");
        return;
    }

    void downloadUrlFile(`${makeSafeFileName(guild.name)}-banner.${banner.ext}`, banner.url);
}

function createServerLogMenuItem(guild: GuildLike) {
    const opts = getExportOptions();

    return (
        <Menu.MenuItem
            id="server-log-menu"
            label="Server Log"
        >
            <Menu.MenuItem
                id="server-log-save-txt"
                label="Save TXT"
                action={() => saveTxt(guild)}
            />

            <Menu.MenuItem
                id="server-log-save-html"
                label="Save HTML"
                action={() => saveHtml(guild)}
            />

            <Menu.MenuItem
                id="server-log-save-json"
                label="Save JSON"
                action={() => saveJson(guild)}
            />

            <Menu.MenuItem
                id="server-log-export-history"
                label="Export History"
                action={() => void showExportHistory()}
            />

            {opts.showAssetButtons && (
                <>
                    <Menu.MenuItem
                        id="server-log-save-icon"
                        label="Save Server Icon"
                        action={() => saveServerIcon(guild)}
                    />

                    <Menu.MenuItem
                        id="server-log-save-banner"
                        label="Save Server Banner"
                        action={() => saveServerBanner(guild)}
                    />
                </>
            )}
        </Menu.MenuItem>
    );
}

function getNodeLabel(node: any) {
    const label = node?.props?.label;

    if (typeof label === "string") return label.toLowerCase();

    return "";
}

function getNodeId(node: any) {
    return String(node?.props?.id ?? "").toLowerCase();
}

function isServerInfoNode(node: any) {
    const id = getNodeId(node);
    const label = getNodeLabel(node);

    return (
        id.includes("guild-info") ||
        id.includes("server-info") ||
        label === "server info"
    );
}

function insertAfterServerInfo(nodes: any, menuItem: any): boolean {
    if (!nodes) return false;

    if (Array.isArray(nodes)) {
        for (let i = 0; i < nodes.length; i++) {
            if (isServerInfoNode(nodes[i])) {
                nodes.splice(i + 1, 0, menuItem);
                return true;
            }

            if (insertAfterServerInfo(nodes[i]?.props?.children, menuItem)) {
                return true;
            }
        }

        return false;
    }

    return insertAfterServerInfo(nodes?.props?.children, menuItem);
}

const GuildHeaderMenu: NavContextMenuPatchCallback = (children, props) => {
    const guild = getCurrentGuild(props);

    if (!guild) return;

    const menuItem = createServerLogMenuItem(guild);

    if (!insertAfterServerInfo(children, menuItem)) {
        children.splice(
            Math.min(3, children.length),
            0,
            <Menu.MenuGroup>
                {menuItem}
            </Menu.MenuGroup>
        );
    }
};

function SettingsAboutComponent() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">ServerLog Settings Guide</Forms.FormTitle>

            <Forms.FormText>
                <div style={{ marginBottom: 14 }}>
                    ServerLog adds a <b>Server Log</b> button to the server dropdown. It can save a clean TXT,
                    HTML, or JSON snapshot of the server info your Discord client can already see.
                </div>

                <div style={{ marginBottom: 14 }}>
                    <b>Privacy Mode</b><br />
                    Privacy Mode hides IDs, asset URLs, icon/banner buttons, and cached members. It is best for exports
                    you plan to post publicly or send to other people.
                </div>

                <div style={{ marginBottom: 14 }}>
                    <b>HTML Export</b><br />
                    HTML is the fancy backup-style page. It includes the sidebar, search, filters, copy buttons,
                    theme switcher, channel tree, roles, emojis, stickers, and optional cached members.
                </div>

                <div style={{ marginBottom: 14 }}>
                    <b>TXT Export</b><br />
                    TXT is the simple version. It is good for quick copying, archiving, or sharing plain server info.
                </div>

                <div style={{ marginBottom: 14 }}>
                    <b>JSON Export</b><br />
                    JSON is for tools, backups, or future import/viewer ideas. Pretty JSON is easier to read, while
                    compact JSON makes the file smaller.
                </div>

                <div>
                    <b>Export Presets</b><br />
                    Custom follows your toggles. Quick is a smaller export, Full includes almost everything, Privacy Safe
                    hides sensitive details, and Developer keeps IDs and asset data useful for testing.
                </div>
            </Forms.FormText>
        </Forms.FormSection>
    );
}

export default definePlugin({
    name: "ServerLog",
    description: "Exports clean TXT, HTML, and JSON snapshots of a server, including channels, roles, emojis, stickers, assets, and cached member info.",
    authors: [{ name: "r7tnx", id: 1446266756162392248n }],
    tags: ["Utility", "Developer", "Server"],
    settings,
    settingsAboutComponent: SettingsAboutComponent,
    contextMenus: {
        "guild-header-popout": GuildHeaderMenu
    }
});
