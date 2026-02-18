// Commands/Public/edit-image.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const cloudinary = require("cloudinary").v2;
const deepai = require("deepai");
const DIG = require("discord-image-generation");
const Jimp = require("jimp");
const isImageUrl = require("is-image-url");
const {
  removeBackgroundFromImageUrl,
} = require("remove.bg");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "edit-image",
  aliases: ["عدل"],
  run: async (client, message, args) => {
    // من الأصل ما كان فيه تحقق تمكين، تقدر تضيف db لو تبي

    // المنيو
    const menu = new StringSelectMenuBuilder()
      .setCustomId("edit_img")
      .setPlaceholder("اختر إحدى الخيارات")
      .addOptions(
        {
          label: "رمادي",
          value: "ashen",
          description: "تحويل الصورة إلى رمادي",
          emoji: "🖤",
        },
        {
          label: "فلتر (Sepia)",
          value: "filter",
          description: "إضافة فلتر",
          emoji: "🟠",
        },
        {
          label: "دائري",
          value: "crop",
          description: "قص الصورة على شكل دائرة",
          emoji: "⚪",
        },
        {
          label: "بلور",
          value: "blur",
          description: "تأثير ضبابي",
          emoji: "💠",
        },
        {
          label: "عكس الألوان",
          value: "inverse",
          description: "Negative / Invert",
          emoji: "🌀",
        },
        {
          label: "إزالة الخلفية",
          value: "remove",
          description: "remove.bg",
          emoji: "🧼",
        }
      );

    const cancelBtn = new ButtonBuilder()
      .setCustomId("edit_cancel")
      .setLabel("إلغاء")
      .setStyle(ButtonStyle.Danger);

    const row1 = new ActionRowBuilder().addComponents(menu);
    const row2 = new ActionRowBuilder().addComponents(cancelBtn);

    const reply = await message.reply({
      content: "**قائمة أوامر تعديل الأفاتار**",
      components: [row1, row2],
    });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "edit_cancel") {
        collector.stop("cancel");
        return interaction.update({
          content: "تم الإلغاء ✅",
          components: [],
        });
      }

      if (!interaction.isStringSelectMenu()) return;

      const choice = interaction.values[0];

      // نحذف الرسالة القديمة
      await interaction.deferReply({ ephemeral: false });

      // نحدد الصورة
      let imgURL =
        message.attachments.first()?.url ||
        (args[0] && isImageUrl(args[0]) ? args[0] : null) ||
        message.mentions.users.first()?.displayAvatarURL({
          extension: "png",
          size: 1024,
        }) ||
        message.author.displayAvatarURL({ extension: "png", size: 1024 });

      // 1) رمادي
      if (choice === "ashen") {
        deepai.setApiKey("37daf812-c7fd-460c-903c-ad362b9d6b76");
        cloudinary.config({
          cloud_name: "ertghy",
          api_key: "256788467711845",
          api_secret: "2IGlZ3XdRuSJ0SD53NQZntKGMNk",
        });

        return cloudinary.uploader.upload(
          imgURL,
          {
            public_id: message.author.id,
            transformation: [{ effect: "grayscale" }],
          },
          (err, res) => {
            if (err) {
              console.error(err);
              return interaction.editReply("Error ..");
            }
            return interaction.editReply({
              files: [{ attachment: res.url }],
            });
          }
        );
      }

      // 2) فلتر Sepia
      if (choice === "filter") {
        const img = await new DIG.Sepia().getImage(imgURL);
        const attachment = new AttachmentBuilder(img, {
          name: "sepia.png",
        });
        return interaction.editReply({ files: [attachment] });
      }

      // 3) دائري (Jimp)
      if (choice === "crop") {
        try {
          const image = await Jimp.read(imgURL);
          const size = Math.min(image.bitmap.width, image.bitmap.height);
          image.circle();
          image.resize(size, size);
          const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
          const att = new AttachmentBuilder(buffer, {
            name: "circle.png",
          });
          return interaction.editReply({ files: [att] });
        } catch (e) {
          console.error(e);
          return interaction.editReply("حدث خطأ أثناء معالجة الصورة.");
        }
      }

      // 4) بلور
      if (choice === "blur") {
        try {
          const image = await Jimp.read(imgURL);
          image.blur(3);
          const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
          const att = new AttachmentBuilder(buffer, {
            name: "blur.png",
          });
          return interaction.editReply({ files: [att] });
        } catch (e) {
          console.error(e);
          return interaction.editReply("حدث خطأ أثناء البلور.");
        }
      }

      // 5) عكس ألوان
      if (choice === "inverse") {
        try {
          const image = await Jimp.read(imgURL);
          image.invert();
          const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
          const att = new AttachmentBuilder(buffer, {
            name: "inverse.png",
          });
          return interaction.editReply({ files: [att] });
        } catch (e) {
          console.error(e);
          return interaction.editReply("حدث خطأ أثناء عكس الألوان.");
        }
      }

      // 6) إزالة الخلفية
      if (choice === "remove") {
        const out = path.join(__dirname, `${message.author.id}.png`);
        try {
          await removeBackgroundFromImageUrl({
            url: imgURL,
            apiKey: "Z4eebwY5uQrGnMd2pznESTns",
            size: "regular",
            type: "auto",
            outputFile: out,
          });

          await interaction.editReply({
            files: [new AttachmentBuilder(out)],
          });

          fs.unlink(out, () => {});
        } catch (e) {
          console.error(e);
          return interaction.editReply(
            "حدث خطأ أثناء إزالة الخلفية."
          );
        }
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "cancel") return;
      reply
        .edit({ components: [] })
        .catch(() => {});
    });
  },
};
