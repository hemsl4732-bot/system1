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
const closeCommand = require("../commands/close.js"); // تأكد من أن المسار لملف close.js صحيح

module.exports = async (client, interaction) => {
    try {
        // 1. معالجة القوائم (Select Menus) - كود فتح التذكرة
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "M0") {
                await interaction.deferReply({ ephemeral: true });

                const guildId = interaction.guild.id;
                const categoryId = db.get(`Cat = [${guildId}]`);
                const roleId = db.get(`Role = [${guildId}]`);

                if (!categoryId || !roleId) {
                    return interaction.editReply({ 
                        content: "⚠️ الإعدادات غير مكتملة (تأكد من تحديد الكاتيجوري ورتبة الدعم)." 
                    });
                }

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

                db.set(`channel${channel.id}`, interaction.user.id);
                db.set(`member${interaction.user.id}`, channel.id);

                // --- تنسيق الرسالة لتصبح مثل الصورة ---
                const welcomeText = db.get(`tcsend_${guildId}`) || "مرحباً عزيزي العميل ،\nيرجى كتابة طلباتك الي حين تواصل الدعم الفني معك\nيرجى ملاحظة إهمالك في التذكرة لمدة 12 ساعة يعرضك لـ إقفال التذكرة";

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("close_ticket_btn").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("notify_staff").setEmoji("🔔").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("add_member").setEmoji("➕").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("change_color").setEmoji("🎨").setStyle(ButtonStyle.Secondary)
                );

                const embed = new EmbedBuilder()
                    .setColor("#d3a35a") // اللون الذهبي
                    .setDescription(`${welcomeText} <@${interaction.user.id}>`);

                // اختيار النوع من القائمة
                const ticketType = interaction.values[0] || "عام";

                await channel.send({ 
                    content: `نوع التذكرة : ${ticketType}`,
                    embeds: [embed], 
                    components: [row] 
                });

                await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${channel}` });
            }
        }

        // 2. كود الأزرار
        if (interaction.isButton()) {
            // زر الإغلاق المرتبط بملف close.js
            if (interaction.customId === 'close_ticket_btn') {
                // محاكاة رسالة لتشغيل أمر close.js
                const fakeMessage = {
                    guild: interaction.guild,
                    channel: interaction.channel,
                    author: interaction.user,
                    member: interaction.member,
                    reply: (content) => interaction.reply(content),
                    react: (emoji) => interaction.channel.send(emoji)
                };
                return await closeCommand.run(client, fakeMessage);
            }

            // زر إضافة الرد التلقائي (القديم الخاص بك)
            if (interaction.customId === `Auto_Reply`) {
                const modal = new ModalBuilder().setCustomId(`Reply-Bot`).setTitle(`إضافة رد تلقائي`);
                const input1 = new TextInputBuilder().setCustomId('Auto-Reply').setLabel(`الرسالة`).setStyle(TextInputStyle.Paragraph).setRequired(true);
                const input2 = new TextInputBuilder().setCustomId('-Reply').setLabel(`الرد`).setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input1), new ActionRowBuilder().addComponents(input2));
                await interaction.showModal(modal);
            }
        }

        // 3. كود المودل
        if (interaction.isModalSubmit()) {
            if (interaction.customId === `Reply-Bot`) {
                const word = interaction.fields.getTextInputValue('Auto-Reply');
                const reply = interaction.fields.getTextInputValue('-Reply');
                if (db.get(`Replys_${word}`)) return interaction.reply({ content: `موجود بالفعل!`, ephemeral: true });
                db.push(`Replys_${word}`, { Word: word, Reply: reply });
                await interaction.reply({ content: `✅ تم الإضافة.`, ephemeral: true });
            }
        }

    } catch (error) {
        console.error("Interaction Error:", error);
    }
};
