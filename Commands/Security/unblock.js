// Commands/Moderation/unblock.js - Discord.js v14
const { EmbedBuilder, PermissionsBitField, Colors } = require("discord.js");
const Pro = require("pro.db");
const { prefix, owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "unblock",
  description: "إلغاء البلاك/الحظر الداخلي عن عضو (قائمة البلاك ليست)",
  run: async (client, message, args) => {
    if (!message.guild) return;

    const Color =
      Pro.get(`Guild_Color = ${message.guild.id}`) ||
      message.guild.members.me?.displayHexColor ||
      "#f5f5ff";

    // نفس نظام السماح في كودك الأصلي: رول مخزن أو نفس الـID أو KickMembers أو مالك البوت
    const allowDb = Pro.get(`Allow - Command block = [ ${message.guild.id} ]`);
    const allowedRole = allowDb ? message.guild.roles.cache.get(allowDb) : null;
    const isAuthorAllowed =
      message.member.roles.cache.has(allowedRole?.id) ||
      message.author.id === allowDb ||
      message.member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
      owners.includes(message.author.id);

    if (!isAuthorAllowed) return;

    // الهدف: منشن أو ID
    const mentionedUser = message.mentions.users.first();
    const targetId = mentionedUser?.id || args?.[0] || message.content.split(/\s+/)[1];

    if (!targetId) {
      const embed = new EmbedBuilder()
        .setColor(Color)
        .setDescription(
          `**يرجى استعمال الأمر بالطريقة الصحيحة.\n unblock <@${message.author.id}>**`
        );
      return message.reply({ embeds: [embed] });
    }

    try {
      // توافق مع طريقتين للتخزين:
      // 1) أسلوبك القديم:
      await Pro.delete(`blockedUsers_${targetId}`).catch(() => {});
      // 2) الأسلوب المقترح الجديد لكل سيرفر:
      await Pro.delete(`blocked:${message.guild.id}:${targetId}`).catch(() => {});

      // جلب المستخدم للّوق (اختياري)
      const selectedUser = await client.users.fetch(targetId).catch(() => null);

      // قناة لوق البلاك ليست (إن وجدت)
      const logblocklist = Pro.get(`logblocklist_${message.guild.id}`);
      const logChannel = logblocklist
        ? message.guild.channels.cache.get(logblocklist)
        : null;

      if (logChannel) {
        const unblockEmbed = new EmbedBuilder()
          .setColor(Color)
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({ forceStatic: false }),
          })
          .setDescription(
            `**Un Block**\n\nUser : <@${targetId}>\nBy : <@${message.author.id}>`
          )
          .setFooter({
            text: selectedUser?.username || "Unknown User",
            iconURL:
              selectedUser?.displayAvatarURL({
                extension: "png",
                forceStatic: false,
                size: 128,
              }) || undefined,
          });

        logChannel.send({ embeds: [unblockEmbed] }).catch(() => {});
      }

      message.react("✅").catch(() => {});
    } catch (error) {
      console.error(error);
      message.react("❌").catch(() => {});
    }
  },
};
