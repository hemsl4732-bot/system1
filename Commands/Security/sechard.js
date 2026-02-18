const db = require("pro.db");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "sechard",
  description: "تعيين الإعدادات الحماية القصوى",
  usage: "!sechard <on|off>",
  run: async (client, message, args) => {
    if (!owners.includes(message.author.id)) return message.react("❌");
    if (!message.guild) return;

    const value = (args[0] || "").toLowerCase();
    if (!["on", "off"].includes(value)) {
      return message.reply("يرجى تحديد 'on' أو 'off' لتفعيل أو إلغاء تفعيل جميع الإعدادات.");
    }

    const enable = value === "on";
    const gid = message.guild.id;

    db.set(`antibots_${gid}`, enable);
    db.set(`anticreate_${gid}`, enable);
    db.set(`antidelete_${gid}`, enable);
    db.set(`antijoinPunishment_${gid}`, enable);
    db.set(`antilink_${gid}`, enable);
    db.set(`spamProtectionEnabled_${gid}`, enable);
    db.set(`antiWebhook_${gid}`, enable);
    db.set(`antiPerms_${gid}`, enable);
    db.set(`antiServerAvatar_${gid}`, enable);
    db.set(`antiServerName_${gid}`, enable);

    return message.reply(enable ? "تم تفعيل الحماية القصوى!" : "تم إلغاء تفعيل الحماية القصوى!");
  },
};
