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

module.exports = async (client, interaction) => {
    try {
        // 1. معالجة القوائم (Select Menus) - كود فتح التذكرة
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "M0") { // الـ ID المتوافق مع setticket.js
                await interaction.deferReply({ ephemeral: true });

                const guildId = interaction.guild.id;
                const categoryId = db.get(`Cat = [${guildId}]`); // جلب الكاتيجوري
                const roleId = db.get(`Role = [${guildId}]`);   // جلب رتبة الدعم

                // التحقق من الإعدادات لمنع الخطأ الأحمر
                if (!categoryId || !roleId) {
                    return interaction.editReply({ 
                        content: "⚠️ الإعدادات غير مكتملة (تأكد من تحديد الكاتيجوري ورتبة الدعم)." 
                    });
                }

                // منع العضو من فتح أكثر من تذكرة
                if (db.get(`member${interaction.user.id}`)) {
                    return interaction.editReply({ content: "❌ لديك تذكرة مفتوحة بالفعل!" });
                }

                // إنشاء روم التذكرة
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

                // حفظ بيانات التذكرة لربطها بملف close.js
                db.set(`channel${channel.id}`, interaction.user.id);
                db.set(`member${interaction.user.id}`, channel.id);

                const welcomeText = db.get(`tcsend_${guildId}`) || "أهلاً بك، يرجى انتظار رد الإدارة.";
                
                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket_btn')
                        .setLabel('إغلاق التذكرة')
                        .setStyle(ButtonStyle.Danger)
                );

                await channel.send({ 
                    content: `<@${interaction.user.id}> | <@&${roleId}>`,
                    embeds: [new EmbedBuilder().setDescription(welcomeText).setColor("Blue")],
                    components: [closeButton]
                });

                await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${channel}` });
            }
        }

        // 2. كود الأزرار (Auto Reply & Close)
        if (interaction.isButton()) {
            if (interaction.customId === `Auto_Reply`) {
                const modal = new ModalBuilder().setCustomId(`Reply-Bot`).setTitle(`إضافة رد تلقائي`);
                
                const input1 = new TextInputBuilder()
                    .setCustomId('Auto-Reply')
                    .setLabel(`الرسالة التي سيرد عليها البوت`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                const input2 = new TextInputBuilder()
                    .setCustomId('-Reply')
                    .setLabel(`الرد المختصر`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(input1),
                    new ActionRowBuilder().addComponents(input2)
                );
                
                await interaction.showModal(modal);
            }

            // زر الإغلاق السريع داخل التذكرة
            if (interaction.customId === 'close_ticket_btn') {
                await interaction.reply("**🎫 سيتم حذف التذكرة خلال ثواني...**");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
            }
        }

        // 3. كود المودل (حفظ الردود التلقائية)
        if (interaction.isModalSubmit()) {
            if (interaction.customId === `Reply-Bot`) {
                const word = interaction.fields.getTextInputValue('Auto-Reply');
                const reply = interaction.fields.getTextInputValue('-Reply');
                
                if (db.get(`Replys_${word}`)) {
                    return interaction.reply({ content: `هذا الرد موجود بالفعل!`, ephemeral: true });
                }
                
                db.push(`Replys_${word}`, { Word: word, Reply: reply });
                await interaction.reply({ content: `✅ تم إضافة الرد التلقائي بنجاح.`, ephemeral: true });
            }
        }

    } catch (error) {
        console.error("Interaction Error:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ حدث خطأ داخلي أثناء تنفيذ العملية.", ephemeral: true }).catch(() => {});
        }
    }
};
