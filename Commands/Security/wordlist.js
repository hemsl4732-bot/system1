// Commands/Security/wordlist.js - Discord.js v14
const { EmbedBuilder, Colors } = require("discord.js");
const { owners } = require(`${process.cwd()}/config`);
const db = require("pro.db");

module.exports = {
  name: "wordlist",
  aliases: ["wordlist"],
  description: "عرض جميع الكلمات المحظورة المخزنة في قاعدة البيانات.",

  run: async (client, message) => {
    if (!message.guild) return;

    // التحقق من أن المستخدم من الملاك
    if (!owners.includes(message.author.id)) {
      return message.react("❌");
    }

    // التحقق من تفعيل الأمر
    const isEnabled = db.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    // جلب الكلمات
    const words = db.get(`word_${message.guild.id}`) || [];

    if (!Array.isArray(words) || words.length === 0) {
      return message.reply({ content: "**لا توجد كلمات يعاقب كاتبها.**" });
    }

    // حصر عدد الكلمات إلى 1000 كحد أقصى
    const limitedWords = words.slice(0, 1000);

    // إنشاء عدة Embeds بحيث لا يتجاوز كل Embed 25 كلمة
    const embeds = [];
    for (let i = 0; i < limitedWords.length; i += 25) {
      const embed = new EmbedBuilder()
        .setTitle("📕 قائمة الكلمات المحظورة")
        .setColor(Colors.Red)
        .setTimestamp();

      limitedWords.slice(i, i + 25).forEach((wordObject, index) => {
        const addedByUser = client.users.cache.get(wordObject.addedBy);
        const addedByMention = addedByUser
          ? `<@${addedByUser.id}>`
          : "Unknown User";

        embed.addFields({
          name: `#${i + index + 1} ${wordObject.word}`,
          value: `By: ${addedByMention}`,
          inline: false,
        });
      });

      embeds.push(embed);
    }

    // إرسال جميع الـ Embeds بترتيب
    try {
      for (const embed of embeds) {
        await message.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(err);
      message.reply("حدث خطأ أثناء إرسال قائمة الكلمات. يرجى المحاولة لاحقًا.");
    }
  },
};
