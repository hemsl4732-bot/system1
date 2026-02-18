const { EmbedBuilder, Colors } = require("discord.js");
const Data = require("pro.db");
const { createTranscript } = require("discord-html-transcripts");

module.exports = {
  name: "close",
  aliases: ["إغلاق", "اغلاق"],
  run: async (client, message) => {
    // التحقق إذا كان الأمر معطلاً من الإعدادات
    const isEnabled = Data.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    try {
      const guildId = message.guild.id;
      const channelId = message.channel.id;

      // 1. جلب رتبة الدعم وصاحب التذكرة
      const roleId = Data.get(`Role = [${guildId}]`);
      const memberId = Data.get(`channel${channelId}`);

      // التحقق: هل الشخص الذي أغلق التذكرة هو الدعم أو صاحب التذكرة نفسه؟
      if (!message.member.roles.cache.has(roleId) && message.author.id !== memberId) {
          return; // إذا لم يكن أحدهما، لا يفعل شيء
      }

      // التأكد أن هذه القناة هي قناة تذكرة فعلاً مسجلة في القاعدة
      if (!memberId) return message.react("❌");

      const Color = Data.get(`Guild_Color = ${guildId}`) ||
                    message.guild.members.me?.displayHexColor || Colors.Blurple;

      // --- الحل الجذري لمشكلتك ---
      // نقوم بمسح بيانات التذكرة فوراً لكي يستطيع المستخدم فتح تذكرة جديدة
      Data.delete(`channel${channelId}`);
      Data.delete(`member${memberId}`);
      // ----------------------------

      const ticketName = message.channel.name;

      // إرسال رسالة التنبيه قبل الحذف
      await message.reply("**🎫 جاري حفظ النسخة وحذف التذكرة خلال 5 ثوانٍ...**").catch(() => {});

      setTimeout(async () => {
        try {
          // إنشاء الترانزكريبت (سجل المحادثة)
          const transcript = await createTranscript(message.channel, {
            returnType: "buffer",
            minify: true,
            saveImages: true,
            useCDN: true,
            poweredBy: false,
            fileName: `${ticketName}.html`,
          });

          // إرسال اللوج
          const logChannelId = Data.get(`Channel = [${guildId}]`);
          const logChannel = message.guild.channels.cache.get(logChannelId);

          if (logChannel) {
            const embed = new EmbedBuilder()
              .setAuthor({ name: `تم إغلاق تذكرة`, iconURL: message.guild.iconURL() })
              .setColor(Color)
              .addFields(
                  { name: "صاحب التذكرة", value: `<@${memberId}>`, inline: true },
                  { name: "أغلقها بواسطة", value: `<@${message.author.id}>`, inline: true },
                  { name: "اسم القناة", value: `${ticketName}`, inline: true }
              )
              .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
              .setTimestamp();

            await logChannel.send({ embeds: [embed], files: [{ attachment: transcript, name: `${ticketName}.html` }] });
          }

          // حذف القناة نهائياً
          await message.channel.delete().catch(() => {});
          
        } catch (err) {
          console.error("Error in delete timeout:", err);
        }
      }, 5000);

    } catch (e) {
      console.error("close error:", e);
    }
  },
};
