const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const Data = require("pro.db");

module.exports = {
  name: "feel",
  run: async (client, message) => {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    )
      return message.react("❌");

    const enabled = Data.get(`command_enabled_feel`);
    if (enabled === false) return;

    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("feel_menu")
        .setPlaceholder("اختر إعداد")
        .addOptions([
          {
            label: "تحديد شات الفضفضة",
            value: "set_chat",
          },
          {
            label: "تغيير لون الامبيد",
            value: "change_color",
          },
        ])
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("feel_cancel")
        .setLabel("إلغاء")
        .setStyle(ButtonStyle.Danger)
    );

    await message.reply({
      content: "**قائمة feel ⚙️**",
      components: [row1, row2],
    });
  },
};
