// Commands/Security/wanti.js - Discord.js v14
const { EmbedBuilder, Colors } = require("discord.js");
const { prefix, owners } = require(`${process.cwd()}/config`);
const Pro = require("pro.db");

module.exports = {
  name: "wanti",
  aliases: ["تحديد-شخص"],
  run: async (client, message, args) => {
    if (!message.guild) return;

    // صلاحية الأمر: ملاك البوت فقط (كما في كودك السابق)
    if (!owners.includes(message.author.id)) return message.react("❌");

    // إيقاف/تشغيل الأمر من DB (يحترم العلم القديم)
    const isEnabled = Pro.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    // لون الإيمبد
    const Color =
      Pro.get(`Guild_Color = ${message.guild.id}`) ||
      message.guild.members.me?.displayHexColor ||
      Colors.Blurple;

    // استخراج الهدف: منشن أو ID
    const mentionedUser = message.mentions.users.first();
    const userID = mentionedUser?.id || args[0];

    if (!userID || isNaN(userID)) {
      const embed = new EmbedBuilder()
        .setColor(Color)
        .setDescription(
          `**يرجى استعمال الأمر بالطريقة الصحيحة .\n wanti <@${message.author.id}>**`
        );
      return message.reply({ embeds: [embed] });
    }

    // تأكد من أن الـ ID يمثل مستخدمًا صالحًا
    const user = await client.users.fetch(userID).catch(() => null);
    if (!user) return message.react("❌");

    // جلب القائمة وتبديل الحالة (Toggle)
    const key = `wanti_${message.guild.id}`;
    const list = Pro.get(key) || [];
    const idx = list.indexOf(userID);

    if (idx !== -1) {
      // إزالة من القائمة
      list.splice(idx, 1);
      Pro.set(key, list);
      return message.react("☑️"); // نفس رد فعلك القديم عند الإزالة
    } else {
      // إضافة إلى القائمة
      Pro.push(key, userID);
      return message.react("✅"); // نفس رد فعلك القديم عند الإضافة
    }
  },
};
