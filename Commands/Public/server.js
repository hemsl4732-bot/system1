// Commands/Public/server.js
const { EmbedBuilder, ChannelType } = require("discord.js");
const db = require("pro.db");
const Data = require("pro.db");

module.exports = {
  name: "server",
  aliases: ["سيرفري"],
  run: async (client, message) => {
    const isEnabled = Data.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    const setChannel = Data.get(`setChannel_${message.guild.id}`);
    if (setChannel && message.channel.id !== setChannel) return;

    const Color =
      db.get(`Guild_Color_${message.guild.id}`) || "#f5f5ff";

    // نحمل الأعضاء
    await message.guild.members.fetch();

    const members = message.guild.members.cache;
    const channels = message.guild.channels.cache;

    const textCount = channels.filter(
      (c) => c.type === ChannelType.GuildText
    ).size;
    const voiceCount = channels.filter(
      (c) => c.type === ChannelType.GuildVoice
    ).size;
    const categoryCount = channels.filter(
      (c) => c.type === ChannelType.GuildCategory
    ).size;

    const emojis = message.guild.emojis.cache.size;
    const firstFiveEmojis = message.guild.emojis.cache
      .map((e) => e)
      .slice(0, 5)
      .join(" ");

    const boostCount = message.guild.premiumSubscriptionCount;
    const verificationLevel = message.guild.verificationLevel;
    const rolesCount = message.guild.roles.cache.size;

    const online =
      members.filter((m) => m.presence?.status === "online").size +
      members.filter((m) => m.presence?.status === "idle").size +
      members.filter((m) => m.presence?.status === "dnd").size;
    const offline = members.size - online;
    const bots = members.filter((m) => m.user.bot).size;

    const embed = new EmbedBuilder()
      .setColor(Color)
      .setTitle("Server Information")
      .setThumbnail(
        message.guild.iconURL({ dynamic: true, size: 1024 })
      )
      .addFields(
        {
          name: "🆔 سيرفر ايدي:",
          value: `${message.guild.id}`,
          inline: true,
        },
        {
          name: "📆 تاريخ الإنشاء:",
          value: `**<t:${Math.floor(
            message.guild.createdTimestamp / 1000
          )}:R>**`,
          inline: true,
        },
        {
          name: "👑 مالك السيرفر:",
          value: `<@${message.guild.ownerId}>`,
          inline: true,
        },
        {
          name: `👥 الأعضاء (${message.guild.memberCount}):`,
          value: `**${online}** Online/Idle/DND\n**${offline}** Offline\n**${bots}** Bot`,
          inline: true,
        },
        {
          name: `💬 الرومات (${channels.size}):`,
          value: `**${textCount}** Text | **${voiceCount}** Voice\n**${categoryCount}** Category`,
          inline: true,
        },
        {
          name: "🌐 آخر:",
          value: `Verification: **${verificationLevel}**\nBoosts: **${boostCount}** 🔮\nRoles: **${rolesCount}**`,
          inline: true,
        },
        {
          name: `🛡️ الإيموجيات (${emojis}):`,
          value: firstFiveEmojis || "لا يوجد",
          inline: true,
        }
      );

    return message.reply({ embeds: [embed] });
  },
};
