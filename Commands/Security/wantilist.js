// Commands/Security/wantilist.js - Discord.js v14
const { EmbedBuilder, Colors } = require("discord.js");
const Pro = require("pro.db");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "wantilist",
  aliases: ["عرض-المحظورين"],
  description: "عرض قائمة الأعضاء الذين تمت إضافتهم في قائمة WANTI",
  run: async (client, message) => {
    if (!message.guild) return;

    // السماح: الملاك فقط
    if (!owners.includes(message.author.id)) return message.react("❌");

    // التحقق من تمكين الأمر
    const isEnabled = Pro.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    // اللون الافتراضي
    const Color =
      Pro.get(`Guild_Color = ${message.guild.id}`) ||
      message.guild.members.me?.displayHexColor ||
      Colors.Blurple;

    // جلب القائمة
    const wantilist = Pro.get(`wanti_${message.guild.id}`) || [];
    if (wantilist.length === 0) {
      return message.react("❌");
    }

    // بناء قائمة المستخدمين بشكل منسق
    const embed = new EmbedBuilder()
      .setColor(Color)
      .setTitle(`📋 قائمة WANTI (${wantilist.length})`)
      .setDescription(
        wantilist
          .map((userID, index) => `\`${index + 1}\` <@${userID}>`)
          .join("\n")
      )
      .setTimestamp();

    // إرسال الرسالة
    await message.reply({ embeds: [embed] });
  },
};
