const db = require("pro.db");
const { EmbedBuilder, Colors } = require("discord.js");
const { prefix, owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "pslist",
  description: "Displays the current status of all protection mechanisms.",
  usage: ` pslist`,
  run: async (client, message) => {
    if (!owners.includes(message.author.id)) return message.react("❌");
    if (!message.guild) return;

    const color = db.get(`Guild_Color_${message.guild.id}`) || Colors.Blurple;
    const onOff = (v) => (v === "on" || v === true ? "مُفعل" : "مُغلق");

    const gid = message.guild.id;
    const antibots = onOff(db.get(`antibots_${gid}`) || db.get(`antibots-${gid}`));
    const anticreate = onOff(db.get(`anticreate_${gid}`) || db.get(`anticreate-${gid}`));
    const antidelete = onOff(db.get(`antiDelete_${gid}`) || db.get(`antiDelete-${gid}`));
    const antijoin = onOff(db.get(`antijoinEnabled_${gid}`) || db.get(`antijoinEnabled-${gid}`));
    const antilinks = onOff(db.get(`antilinks_${gid}`) || db.get(`antilinks-${gid}`));
    const antispam = onOff(db.get(`spamProtectionEnabled_${gid}`) || db.get(`spamProtectionEnabled-${gid}`));
    const antiwebhook = onOff(db.get(`antiWebhook_${gid}`) || db.get(`antiWebhook-${gid}`));
    const antiperms = onOff(db.get(`antiPerms_${gid}`) || db.get(`antiPerms-${gid}`));
    const serverAvatar = onOff(db.get(`antiServerAvatar_${gid}`) || db.get(`antiServerAvatar-${gid}`));
    const serverName = onOff(db.get(`antiServerName_${gid}`) || db.get(`antiServerName-${gid}`));

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("Protection Status")
      .setDescription(
        [
          `\`#1\` Antibots: ${antibots}`,
          `\`#2\` Anticreate: ${anticreate}`,
          `\`#3\` Antidelete: ${antidelete}`,
          `\`#4\` Antijoin: ${antijoin}`,
          `\`#5\` AntiLinks: ${antilinks}`,
          `\`#6\` AntiSpam: ${antispam}`,
          `\`#7\` AntiWebhook: ${antiwebhook}`,
          `\`#8\` AntiPermissions: ${antiperms}`,
          `\`#9\` Server Avatar Protection: ${serverAvatar}`,
          `\`#10\` Server Name Protection: ${serverName}`,
        ].join("\n")
      );

    return message.reply({ embeds: [embed] });
  },
};
