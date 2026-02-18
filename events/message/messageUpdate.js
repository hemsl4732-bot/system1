const db = require("pro.db");
const humanizeDuration = require("humanize-duration");
const Discord = require("discord.js");

module.exports = async (client, oldMessage, newMessage) => {
  if (!oldMessage || !newMessage) return;

  if (!oldMessage.guild || !newMessage.guild) return;

  const user = oldMessage.author || newMessage.author;
  if (!user || user.bot) return;

  if (oldMessage.channel.type === "DM") return;

  if (!oldMessage.guild.me.permissions.has("EMBED_LINKS")) return;
  if (!oldMessage.guild.me.permissions.has("MANAGE_MESSAGES")) return;

  let channelmessage = db.get(`channelmessage_${oldMessage.guild.id}`);
  const logChannel = oldMessage.guild.channels.cache.get(channelmessage);
  if (!logChannel) return;

  if (oldMessage.content && oldMessage.content.startsWith("https://")) {
    for (const attachment of oldMessage.attachments.values()) {
      logChannel.send({ files: [attachment.url] });
    }
    return;
  }

  const messageUpdate = new Discord.MessageEmbed()
    .setAuthor({
      name: user.username,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setThumbnail(
      "https://cdn.discordapp.com/attachments/1091536665912299530/1208178321851031654/EditMessage.png"
    )
    .setColor("#8cb9bd")
    .setDescription(
      `**تعديل الرسالة**\n\n**بواسطة : ** <@${user.id}>\n**فيـ :** ${oldMessage.channel}\n**[اضغط هنا للرسالة الأصلية](${newMessage.url})**\n\n**الرسالة القديمة :**\n\`\`\`${oldMessage.content || "بدون نص"}\`\`\`\n**الرسالة الجديدة :**\n\`\`\`${newMessage.content || "بدون نص"}\`\`\``
    )
    .setFooter({
      text: client.user.username,
      iconURL: client.user.displayAvatarURL(),
    });

  logChannel.send({ embeds: [messageUpdate] });
};
