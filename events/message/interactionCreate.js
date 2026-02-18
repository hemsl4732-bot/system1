const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionsBitField,
    ChannelType 
} = require("discord.js");
const db = require("pro.db");
const path = require("path");

// تأكد من صحة هذا المسار لملف الإغلاق الخاص بك
const closeCommand = require("./commands/close.js"); 

module.exports = async (client, interaction) => {
    try {
        // 1. معالجة القوائم (فتح التذكرة)
        if (interaction.isStringSelectMenu() && interaction.customId === "M0") {
            await interaction.deferReply({ ephemeral: true });

            const guildId = interaction.guild.id;
            const categoryId = db.get(`Cat = [${guildId}]`); //
            const roleId = db.get(`Role = [${guildId}]`);     //

            if (!categoryId || !roleId) {
                return interaction.editReply({ content: "⚠️ الإعدادات ناقصة (الكاتيجوري أو الرتبة)." });
            }

            // منع تكرار التذاكر
            if (db.get(`member${interaction.user.id}`)) {
                return interaction.editReply({ content: "❌ لديك تذكرة مفتوحة بالفعل!" });
            }

            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] },
                    { id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            db.set(`channel${channel.id}`, interaction.user.id); //
            db.set(`member${interaction.user.id}`, channel.id);  //

            // --- التنسيق المطلوب (نفس الصورة) ---
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("close_ticket_btn").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("notify_staff").setEmoji("🔔").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("add_member").setEmoji("➕").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("change_color").setEmoji("🎨").setStyle(ButtonStyle.Secondary)
            );

            const welcomeText = db.get(`tcsend_${guildId}`) || "مرحباً بك، يرجى كتابة طلبك."; //
            const embed = new EmbedBuilder()
                .setColor("#d3a35a") // اللون الذهبي من صورتك
                .setDescription(`${welcomeText}\n\nصاحب التذكرة: <@${interaction.user.id}>`);

            await channel.send({ 
                content: `نوع التذكرة : ${interaction.values[0]}`,
                embeds: [embed], 
                components: [row] 
            });

            await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${channel}` });
        }

        // 2. معالجة الأزرار
        if (interaction.isButton()) {
            if (interaction.customId === 'close_ticket_btn') {
                // تنفيذ كود الإغلاق مباشرة من ملف close.js
                const fakeMessage = {
                    guild: interaction.guild,
                    channel: interaction.channel,
                    author: interaction.user,
                    member: interaction.member,
                    reply: (content) => interaction.reply(content),
                    react: (emoji) => interaction.channel.send(emoji)
                };
                await closeCommand.run(client, fakeMessage);
            }
        }

    } catch (error) {
        console.error("خطأ في التفاعل:", error);
        // لا ترسل رد إذا كان قد تم الرد بالفعل لتجنب خطأ إضافي
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "حدث خطأ أثناء تنفيذ هذا الأمر.", ephemeral: true }).catch(() => {});
        }
    }
};
