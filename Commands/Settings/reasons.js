// Commands/Setup/reasons.js - Discord.js v14
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} = require("discord.js");
const db = require("pro.db");
const { prefix, owners } = require(`${process.cwd()}/config`);
const ms = require("ms");

module.exports = {
  name: "reasons",
  aliases: ["اضافه-سبب"],
  run: async (client, message) => {
    if (!message.guild) return;
    // نفس سلوكك (ما فيه تقييد مالك بالأصل في الكود المعطى، فنبقيه كما هو)
    const Color =
      db.get(`Guild_Color_${message.guild.id}`) ||
      message.guild.members.me?.displayHexColor ||
      Colors.Blurple;

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("add_reason").setLabel("إضافة").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("edit_reason").setLabel("تعديل").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("remove_reason").setLabel("حذف").setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(Color)
      .setDescription("يرجى اختيار العملية: إضافة، تعديل، أو حذف سبب.");

    const sentMessage = await message.reply({ embeds: [embed], components: [buttons] });

    const filter = (i) =>
      i.user.id === message.author.id &&
      ["add_reason", "edit_reason", "remove_reason"].includes(i.customId);

    const collector = sentMessage.createMessageComponentCollector({ filter, time: 60_000 });

    collector.on("collect", async (interaction) => {
      try {
        if (interaction.customId === "add_reason") {
          await handleAddReason(interaction, message);
        } else if (interaction.customId === "edit_reason") {
          const selectedType = await selectReasonType(interaction, message);
          if (!selectedType) return;
          const currentReasons = db.get(`${selectedType}_${message.guild.id}`) || [];
          if (currentReasons.length === 0) {
            await interaction.followUp({ content: "لا توجد أسباب متاحة لتعديلها.", ephemeral: true });
            return;
          }
          const selectedReason = await selectReasonToEdit(interaction, currentReasons);
          if (!selectedReason) return;
          await handleEditReason(interaction, selectedType, currentReasons, selectedReason);
        } else if (interaction.customId === "remove_reason") {
          const selectedType = await selectReasonType(interaction, message);
          if (!selectedType) return;
          const currentReasons = db.get(`${selectedType}_${message.guild.id}`) || [];
          if (currentReasons.length === 0) {
            await interaction.followUp({ content: "لا توجد أسباب متاحة لحذفها.", ephemeral: true });
            return;
          }
          const selectedReason = await selectReasonToRemove(interaction, currentReasons);
          if (!selectedReason) return;
          await handleRemoveReason(interaction, selectedType, currentReasons, selectedReason);
        }
      } catch (e) {
        console.error(e);
        try { await interaction.reply({ content: "حدث خطأ غير متوقع.", ephemeral: true }); } catch {}
      }
    });

    collector.on("end", async () => {
      if (!sentMessage.editable) return;
      try { await sentMessage.edit({ components: [] }); } catch {}
    });
  },
};

async function selectReasonType(interaction, message) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_reason_type")
    .setPlaceholder("اختر نوع السبب")
    .addOptions(
      { label: "أسباب الاسكات", value: "mute_reasons" },
      { label: "أسباب الميوت الصوتي", value: "vmute_reasons" }
    );

  const row = new ActionRowBuilder().addComponents(menu);
  await interaction.reply({ content: "يرجى اختيار نوع السبب من القائمة:", components: [row], ephemeral: true });

  return new Promise((resolve) => {
    const filter = (i) => i.user.id === message.author.id && i.isStringSelectMenu();
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60_000 });

    collector.on("collect", (i) => {
      resolve(i.values[0]);
      i.deferUpdate().catch(() => {});
      collector.stop();
    });

    collector.on("end", () => resolve(null));
  });
}

async function handleAddReason(interaction, message) {
  const selectedType = await selectReasonType(interaction, message);
  if (!selectedType) return;

  await interaction.followUp({
    content: 'أرسل السبب والوقت (مثال: `كلام-بذيء 1h`).',
    ephemeral: true,
  });

  const filter = (m) => m.author.id === interaction.user.id;
  const rc = interaction.channel.createMessageCollector({ filter, time: 60_000 });

  rc.on("collect", async (msg) => {
    const parts = msg.content.trim().split(/\s+/);
    if (parts.length < 2) {
      await interaction.followUp({ content: "صيغة غير صحيحة. مثال: `كلام-بذيء 1h`", ephemeral: true });
      return;
    }
    const label = parts.slice(0, -1).join(" ");
    const value = parts[parts.length - 1];
    if (!ms(value)) {
      await interaction.followUp({ content: 'تنسيق الوقت غير صحيح (مثال: "1h").', ephemeral: true });
      return;
    }
    const key = `${selectedType}_${message.guild.id}`;
    const list = db.get(key) || [];
    list.push({ label, value });
    db.set(key, list);
    await interaction.followUp({ content: `✅ تم إضافة "**${label}**" بوقت "**${value}**".`, ephemeral: true });
    rc.stop();
  });
}

async function handleEditReason(interaction, selectedType, currentReasons, selectedReason) {
  await interaction.followUp({ content: "ماذا تريد تعديل: **الاسم** أو **الوقت**؟", ephemeral: true });

  const filter = (m) => m.author.id === interaction.user.id;
  const rc = interaction.channel.createMessageCollector({ filter, time: 60_000 });

  rc.on("collect", async (msg) => {
    const opt = msg.content.trim().toLowerCase();
    if (opt === "الاسم") {
      await interaction.followUp({ content: "أرسل الاسم الجديد:", ephemeral: true });
      const nc = interaction.channel.createMessageCollector({ filter, time: 60_000 });
      nc.on("collect", async (nm) => {
        const newName = nm.content.trim();
        const key = `${selectedType}_${interaction.guild.id}`;
        const list = db.get(key) || [];
        const idx = list.findIndex((r) => r.label === selectedReason.label);
        if (idx === -1) {
          await interaction.followUp({ content: "السبب غير موجود.", ephemeral: true });
          nc.stop(); return;
        }
        list[idx].label = newName;
        db.set(key, list);
        await interaction.followUp({ content: `✅ تم تعديل الاسم إلى "**${newName}**".`, ephemeral: true });
        nc.stop();
      });
    } else if (opt === "الوقت") {
      await interaction.followUp({ content: 'أرسل الوقت الجديد (مثل "1h"):', ephemeral: true });
      const tc = interaction.channel.createMessageCollector({ filter, time: 60_000 });
      tc.on("collect", async (tm) => {
        const newTime = tm.content.trim();
        if (!ms(newTime)) {
          await interaction.followUp({ content: 'تنسيق الوقت غير صحيح (مثال "1h").', ephemeral: true });
          return;
        }
        const key = `${selectedType}_${interaction.guild.id}`;
        const list = db.get(key) || [];
        const idx = list.findIndex((r) => r.label === selectedReason.label);
        if (idx === -1) {
          await interaction.followUp({ content: "السبب غير موجود.", ephemeral: true });
          tc.stop(); return;
        }
        list[idx].value = newTime;
        db.set(key, list);
        await interaction.followUp({ content: `✅ تم تعديل الوقت إلى "**${newTime}**".`, ephemeral: true });
        tc.stop();
      });
    } else {
      await interaction.followUp({ content: "خيار غير صحيح. حاول مجددًا.", ephemeral: true });
    }
    rc.stop();
  });
}

async function handleRemoveReason(interaction, selectedType, currentReasons, selectedReason) {
  const list = currentReasons.filter((r) => r.label !== selectedReason.label);
  db.set(`${selectedType}_${interaction.guild.id}`, list);
  await interaction.followUp({ content: `🗑️ تم حذف "**${selectedReason.label}**".`, ephemeral: true });
}

async function selectReasonToEdit(interaction, currentReasons) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_reason_to_edit")
    .setPlaceholder("اختر السبب للتعديل")
    .addOptions(currentReasons.map((r) => ({ label: r.label, value: r.label })));

  const row = new ActionRowBuilder().addComponents(menu);
  await interaction.followUp({ content: "اختر السبب للتعديل:", components: [row], ephemeral: true });

  return new Promise((resolve) => {
    const filter = (i) => i.user.id === interaction.user.id && i.isStringSelectMenu();
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60_000 });
    collector.on("collect", (i) => {
      resolve(currentReasons.find((r) => r.label === i.values[0]) || null);
      i.deferUpdate().catch(() => {});
      collector.stop();
    });
    collector.on("end", () => resolve(null));
  });
}

async function selectReasonToRemove(interaction, currentReasons) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("select_reason_to_remove")
    .setPlaceholder("اختر السبب للحذف")
    .addOptions(currentReasons.map((r) => ({ label: r.label, value: r.label })));

  const row = new ActionRowBuilder().addComponents(menu);
  await interaction.followUp({ content: "اختر السبب للحذف:", components: [row], ephemeral: true });

  return new Promise((resolve) => {
    const filter = (i) => i.user.id === interaction.user.id && i.isStringSelectMenu();
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60_000 });
    collector.on("collect", (i) => {
      resolve(currentReasons.find((r) => r.label === i.values[0]) || null);
      i.deferUpdate().catch(() => {});
      collector.stop();
    });
    collector.on("end", () => resolve(null));
  });
}
