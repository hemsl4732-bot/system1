module.exports = async (client, interaction) => {
    // هذا السطر هو "المسكن" اللي يمنع الرسالة الحمراء
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        await interaction.deferUpdate().catch(() => {});
    }

    if (interaction.isButton()) {
        // ... باقي كودك حق الـ Auto_Reply    }

    // 2. معالجة القوائم (Select Menus) - كود فتح التذكرة
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "M0") { // الـ ID المستخدم في ملف setticket.js
            const guildId = interaction.guild.id;
            const categoryId = db.get(`Cat = [${guildId}]`); // جلب الكاتيجوري من القاعدة
            const roleId = db.get(`Role = [${guildId}]`); // جلب رول الإدارة من القاعدة

            // التحقق من الإعدادات
            if (!categoryId || !roleId) {
                return interaction.followUp({ content: "⚠️ لم يتم إكمال إعدادات التذاكر (الكاتيجوري أو الرول ناقص).", ephemeral: true });
            }

            // إنشاء روم التذكرة
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: 0, // Text Channel
                parent: categoryId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] },
                    { id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            await interaction.followUp({ content: `✅ تم فتح تذكرتك بنجاح: ${channel}`, ephemeral: true });
            
            // إرسال رسالة الترحيب داخل التذكرة (اختياري)
            const welcomeText = db.get(`tcsend_${guildId}`) || "أهلاً بك، يرجى انتظار رد الإدارة.";
            channel.send({ content: `<@${interaction.user.id}> \n ${welcomeText}` });
        }
    }

    // 3. كود الأزرار الخاص بك (الرد التلقائي)
    if (interaction.isButton()) {
        if (interaction.customId === `Auto_Reply`) {
            const Services = new Modal().setCustomId(`Reply-Bot`).setTitle(`Reply`);
            const Service_1 = new TextInputComponent().setCustomId('Auto-Reply').setLabel(`اضف الرسالة الذي سوف يرد عليها البوت`).setStyle(`PARAGRAPH`).setPlaceholder(' ').setRequired(true);
            const Service_2 = new TextInputComponent().setCustomId('-Reply').setLabel(`إضف الرد هنا`).setStyle(`PARAGRAPH`).setPlaceholder(' ').setRequired(true);
            
            const Service1 = new MessageActionRow().addComponents(Service_1);
            const Service2 = new MessageActionRow().addComponents(Service_2);
            
            Services.addComponents(Service1, Service2);
            await interaction.showModal(Services);
        }
    }

    // 4. كود المودل الخاص بك (حفظ الردود)
    if (interaction.isModalSubmit()) {
        if (interaction.customId === `Reply-Bot`) {
            const Service_1 = interaction.fields.getTextInputValue('Auto-Reply');
            const Service_2 = interaction.fields.getTextInputValue('-Reply');
            
            if (db.get(`Replys_${Service_1}`)) {
                return interaction.reply({ content: `موجود بالفعل`, ephemeral: true });
            }
            
            db.push(`Replys_${Service_1}`, { Word: Service_1, Reply: Service_2 });
            interaction.reply({ content: `تم الإضافة: ${Service_1} | ${Service_2}`, ephemeral: true });
        }
    }
};
