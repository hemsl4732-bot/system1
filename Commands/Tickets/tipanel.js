const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const Pro = require("pro.db");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { owners } = require(`${process.cwd()}/config`);

module.exports = {
  name: "tipanel",
  description: "لوحة إعدادات نظام التذاكر",
  run: async (client, message, args) => {
    if (!owners.includes(message.author.id)) return message.react("❌");
    const isEnabled = Pro.get(`command_enabled_${module.exports.name}`);
    if (isEnabled === false) return;

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("vipMenu")
        .setPlaceholder("اختر إحدى الخيارات")
        .addOptions(
          { label: "صورة التذكرة", description: "تحديد صورة التذكرة", value: "setimaget" },
          { label: "تحديد الرولات", description: "اضافة رولات التذكرة", value: "settrole" },
          { label: "تحديد لوج", description: "تعين شات لوج التذكرة", value: "setlog" },
          { label: "تحديد كاتجوري", description: "تحديد ايدي كاتجوري التذكرة", value: "setcategory" },
          { label: "تحديد أسباب", description: "تحديد أسباب فتح التذاكر", value: "setoptions" },
          { label: "حذف سبب", description: "حذف سبب محدد من الإسباب المضافة", value: "deleteoption" },
          { label: "ارسال رساله", description: "ارسال رسالة عند فتح التذكرة", value: "tcsend" },
          { label: "إعادة تعين", description: "حذف جميع إعدادت التذكرة", value: "tcrestart" },
        )
    );

    const cancelRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("Cancel").setLabel("إلغاء").setStyle(ButtonStyle.Danger)
    );

    const panel = await message.reply({ content: "**قائمة آوامر تعديل التذاكر**.", components: [selectRow, cancelRow] });

    const collector = panel.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id && (i.isStringSelectMenu() || i.isButton()),
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "Cancel" && i.isButton()) {
        collector.stop();
        return i.message.delete().catch(() => {});
      }
      if (!i.isStringSelectMenu() || !i.values?.length) return;
      await i.deferUpdate();
      const choice = i.values[0];

      if (choice === "setimaget") {
        await panel.delete().catch(() => {});
        let imageURL = args[0] || (message.attachments.first() && message.attachments.first().url);
        if (!imageURL) {
          const ask = await message.reply("**يرجى أرفاق رابط الصورة او الصورة.** ⚙️");
          const c = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 60_000 });
          c.on("collect", async (m) => {
            imageURL = m.attachments.first()?.url || m.content?.trim();
            if (!imageURL) return m.reply("**يرجى أرفاق رابط الصورة او الصورة.** ⚙️");
            await saveImage(message.guild.id, imageURL);
            await message.react("✅");
            await ask.edit("**تم حفظ الصورة بنجاح. ✅**");
            await m.delete().catch(() => {});
            c.stop();
          });
          return;
        }
        await saveImage(message.guild.id, imageURL);
        return message.reply("**تم حفظ الصورة بنجاح.** ✅");
      }

      if (choice === "settrole") {
        await panel.delete().catch(() => {});
        const ask = await message.reply("**يرجى أرفاق منشن الرول او الايدي.** ⚙️");
        const c = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 60_000 });
        let roleID;
        c.on("collect", async (m) => {
          const r = m.mentions.roles.first() || message.guild.roles.cache.get(m.content.trim());
          if (!r) return m.reply("**يرجى تحديد رول صحيح!** ❌").then(x => setTimeout(() => x.delete().catch(()=>{}), 5000));
          roleID = r.id;
          Pro.set(`Role = [${message.guild.id}]`, roleID);
          await ask.edit("**تم حفظ الرول بنجاح.** ✅");
          await m.delete().catch(()=>{});
          c.stop();
        });
        c.on("end", (_, reason) => { if (reason === "time" && !roleID) ask.edit("**انتهى وقت التعديل** ❌"); });
        return;
      }

      if (choice === "setlog") {
        await panel.delete().catch(() => {});
        let selectedChannelID = args[0]?.replace(/\D/g, "") || message.mentions.channels.first()?.id;

        if (!selectedChannelID) {
          const ask = await message.reply("**يرجى ارفاق منشن الشات او الايدي .** ⚙️");
          const c = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 30_000 });
          c.on("collect", async (m) => {
            const ch = m.mentions.channels.first();
            if (ch) selectedChannelID = ch.id;
            else {
              const id = m.content.replace(/\D/g, "");
              if (message.guild.channels.cache.has(id)) selectedChannelID = id;
              else m.reply("**يرجى ارفاق منشن الشات او الايدي .**⚙️");
            }
            if (selectedChannelID) c.stop();
          });
          c.on("end", () => {
            if (!selectedChannelID) ask.edit("**أنتهى وقت التعديل** ❌");
            else { Pro.set(`Channel = [${message.guild.id}]`, selectedChannelID); ask.edit("**تم حفظ القناة بنجاح.** ✅"); }
          });
          return;
        }
        Pro.set(`Channel = [${message.guild.id}]`, selectedChannelID);
        return message.reply("**تم حفظ القناة بنجاح.** ✅");
      }

      if (choice === "setcategory") {
        await panel.delete().catch(() => {});
        let categoryId = args[0];
        const byId = categoryId && message.guild.channels.cache.get(categoryId);
        if (!(byId && byId.type === ChannelType.GuildCategory)) categoryId = undefined;

        if (!categoryId) {
          const ask = await message.reply("**يرجى ارسال ايدي الكاتجوري.** ⚙️");
          const c = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 30_000 });
          c.on("collect", async (m) => {
            const id = m.content.trim();
            const ch = message.guild.channels.cache.get(id);
            if (ch && ch.type === ChannelType.GuildCategory) { categoryId = id; c.stop(); }
            else m.reply("**يرجى ارسال ايدي الكاتجوري.** ⚙️");
          });
          c.on("end", () => {
            if (!categoryId) ask.edit("**انتهى الوقت المخصص للتعديل** ❌");
            else { Pro.set(`Cat = [${message.guild.id}]`, categoryId); ask.edit("**تم حفظ الكاتجوري بنجاح.** ✅"); }
          });
          return;
        }
        Pro.set(`Cat = [${message.guild.id}]`, categoryId);
        return message.reply("**تم حفظ الكاتجوري بنجاح.** ✅");
      }

      if (choice === "setoptions") {
        await panel.delete().catch(() => {});
        const ask = await message.reply("**يرجى ارفاق سبب فتح التذكرة.** ⚙️");
        const c = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, max: 1, time: 60_000 });

        c.on("collect", async (m) => {
          let menuOptions = Pro.get(`menuOptions_${message.guild.id}`) || [];
          if (menuOptions.length >= 12) return message.reply("**لقد وصلت إلى الحد الأقصى! 🛑**");

          const newReason = m.content.trim();
          if (menuOptions.some(o => o.label === newReason)) return message.reply("**هذا الخيار موجود من قبل ❌**");

          await ask.edit("**يرجى ارفاق وصف التذكرة.** 👏");
          const dc = message.channel.createMessageCollector({ filter: d => d.author.id === message.author.id, max: 1, time: 60_000 });

          dc.on("collect", async (desc) => {
            const description = desc.content.trim();
            const newValue = `M${menuOptions.length + 1}`;
            menuOptions.push({ label: newReason, value: newValue, description });
            Pro.set(`menuOptions_${message.guild.id}`, menuOptions);

            await ask.edit("**يرجى ارفاق الاموجي.** 👌");
            const ec = message.channel.createMessageCollector({ filter: e => e.author.id === message.author.id, max: 1, time: 60_000 });

            ec.on("collect", async (em) => {
              const emoji = em.content.trim();
              if (!emoji.match(/<(a)?:.+:\d+>/)) return message.reply("**الرجاء ادخال اموجي صحيح! ❌**");
              const target = menuOptions.find(o => o.label === newReason);
              target.emoji = emoji;
              Pro.set(`menuOptions_${message.guild.id}`, menuOptions);
              await ask.edit("**تمت الإضافة بنجاح الآن ✅**");
            });
          });
        });
        return;
      }

      if (choice === "deleteoption") {
        await panel.delete().catch(() => {});
        const ask = await message.reply("**الرجاء ارفاق اسم السبب الذي تريد حذفه.** ⚙️");
        const c = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, max: 1, time: 60_000 });
        c.on("collect", async (m) => {
          const reason = m.content.trim();
          let menuOptions = Pro.get(`menuOptions_${message.guild.id}`) || [];
          const idx = menuOptions.findIndex(o => o.label === reason);
          if (idx === -1) return message.reply("**هذا السبب غير موجود! ❌**");
          menuOptions.splice(idx, 1);
          Pro.set(`menuOptions_${message.guild.id}`, menuOptions);
          await ask.edit("**تم حذف السبب بنجاح! ✅**");
        });
        return;
      }

      if (choice === "tcsend") {
        await panel.delete().catch(() => {});
        let tcsend = args.length ? args.join(" ") : undefined;
        if (!tcsend) {
          const ask = await message.reply("**يرجى إرفاق النص المراد إرسالة عند فتح التذكره.** ⚙️");
          const c = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id, time: 30_000 });
          c.on("collect", (m) => { tcsend = m.content; c.stop(); });
          c.on("end", () => {
            if (!tcsend) ask.edit("**أنتهى وقت التعديل** ❌");
            else { Pro.set(`tcsend_${message.guild.id}`, tcsend); ask.edit("**تم حفظ النص بنجاح.** ✅"); }
          });
          return;
        }
        Pro.set(`tcsend_${message.guild.id}`, tcsend);
        return message.reply("**تم حفظ النص بنجاح.** ✅");
      }

      if (choice === "tcrestart") {
        await panel.delete().catch(() => {});
        const g = message.guild.id;
        for (const k of [`Channel = [${g}]`,`Role = [${g}]`,`Image = [${g}]`,`Cat = [${g}]`,`menuOptions_${g}`]) {
          if (Pro.get(k)) Pro.delete(k);
        }
        const memberKey = `member${message.author.id}`;
        const channelKey = `channel${message.author.id}_${message.channel.id}`;
        if (Pro.get(memberKey)) Pro.delete(memberKey);
        if (Pro.get(channelKey)) Pro.delete(channelKey);
        return message.reply("**تم إعادة تعين جميع إعدادت التذكرة بنجاح.** ✅");
      }
    });

    async function saveImage(guildId, imageUrl) {
      const imagePath = path.join(process.cwd(), "Fonts", "Ticket.png");
      const res = await fetch(imageUrl);
      const buffer = await res.buffer();
      fs.writeFileSync(imagePath, buffer);
      Pro.set(`Image = [${guildId}]`, imagePath);
    }
  },
};
