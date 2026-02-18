// Commands/Security/setrjoin.js - Discord.js v14
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Colors,
} = require("discord.js");
const { owners } = require(`${process.cwd()}/config`);
const Pro = require("pro.db");

module.exports = {
  name: "setrjoin",
  description: "اختيار إجراء تلقائي ضد الحسابات الجديدة عند الانضمام (Kick/Ban/Prison)",
  run: async (client, message) => {
    if (!message.guild) return;

    // السماح: ملّاك البوت فقط كما في كودك الأصلي
    if (!owners.includes(message.author.id)) return message.react("❌");

    const color =
      Pro.get(`Guild_Color = ${message.guild.id}`) ||
      message.guild.members.me?.displayHexColor ||
      Colors.Blurple;

    // قائمة الخيارات (v14)
    const punishmentMenu = new StringSelectMenuBuilder()
      .setCustomId("punishmentMenu")
      .setPlaceholder("يرجى الاختيار ..")
      .addOptions(
        {
          label: "Kick",
          value: "kick",
          emoji: "💡",
          description: "طرد الحسابات الجديدة من السيرفر",
        },
        {
          label: "Ban",
          value: "ban",
          emoji: "💡",
          description: "حظر الحسابات الجديدة من السيرفر",
        },
        {
          label: "Prison",
          value: "prison",
          emoji: "💡",
          description: "سجن/حجز الحسابات الجديدة داخل رول/قناة محددة",
        }
      );

    const cancelBtn = new ButtonBuilder()
      .setCustomId("joinCancel")
      .setLabel("الغاء")
      .setStyle(ButtonStyle.Secondary);

    const selectRow = new ActionRowBuilder().addComponents(punishmentMenu);
    const buttonRow = new ActionRowBuilder().addComponents(cancelBtn);

    const prompt = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle("إعداد إجراء Anti-Join")
          .setDescription("**أختار الإجراء المناسب لك.**")
          .setFooter({ text: "سيُحفظ اختيارك ويُستخدم تلقائيًا عند انضمام الحسابات الجديدة." }),
      ],
      components: [selectRow, buttonRow],
    });

    // نجمع التفاعل على نفس رسالة الأمر (أفضل من وضع client.on داخل كل أمر)
    const filter = (i) =>
      i.user.id === message.author.id &&
      (i.customId === "punishmentMenu" || i.customId === "joinCancel");

    const collector = prompt.createMessageComponentCollector({
      filter,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      try {
        // إلغاء
        if (i.customId === "joinCancel") {
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("تم إلغاء الإعداد.")
            ],
            components: [],
          });
          return;
        }

        // اختيار من القائمة
        if (i.customId === "punishmentMenu") {
          const punishment = i.values[0]; // kick | ban | prison

          await Pro.set(`antijoinPunishment_${message.guild.id}`, punishment);

          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Green)
                .setDescription(`✅ تم حفظ الإجراء: **${punishment.toUpperCase()}**`)
            ],
            components: [],
          });

          // تفاعل بسيط على رسالة الأمر للتأكيد (غير ضروري لكن لطيف)
          message.react("✅").catch(() => {});
          collector.stop("done");
        }
      } catch (err) {
        console.error(err);
        try {
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("❌ حدث خطأ غير متوقع أثناء الحفظ.")
            ],
            components: [],
          });
        } catch {}
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (reason === "time") {
        // انتهى الوقت — تعطيل الأزرار والقائمة
        try {
          await prompt.edit({
            components: [],
          });
        } catch {}
      }
    });
  },
};
