const http = require('http');
const mongoose = require('mongoose'); // مكتبة الربط مع مونجو

// 1. السيرفر الوهمي عشان Render و UptimeRobot
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
  res.write('البوت شغال ومتصل بالسيرفر ✅'); 
  res.end();
}).listen(process.env.PORT || 8080);

console.log("السيرفر الوهمي جاهز، والبوت لن يتوقف!");

// 2. الربط مع MongoDB (استبدل الرابط برابطك الخاص)
// تأكد من وضع الباسورد الصحيح بدلاً من <password>
const mongoURI = "mongodb+srv://mroan19899_db_user:2NQCjTIXietw0j77@cluster0.d39lidi.mongodb.net/?appName=Cluster0"; 

mongoose.connect(mongoURI)
  .then(() => console.log('✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح!'))
  .catch(err => console.error('❌ خطأ في اتصال MongoDB:', err));

const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const db = require("pro.db");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent, 
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// 3. نظام منع الانهيار (Anti-Crash) - يمنع البوت من الانطفاء عند حدوث خطأ
process.on('unhandledRejection', (reason, p) => {
    console.log(' [Anti-crash] Unhandled Rejection');
    console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
    console.log(' [Anti-crash] Uncaught Exception');
    console.log(err, origin);
});

client.commands = new Collection();
client.aliases = new Collection();

// تحميل الأوامر
const commandsPath = path.join(__dirname, "Commands");
const cats = fs.readdirSync(commandsPath);

for (const cat of cats) {
  const catPath = path.join(commandsPath, cat);
  const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const cmdPath = path.join(catPath, file);
    try {
      const cmd = require(cmdPath);
      if (!cmd || !cmd.name) continue;
      client.commands.set(cmd.name.toLowerCase(), cmd);
      if (Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach((al) => {
          client.aliases.set(al.toLowerCase(), cmd.name.toLowerCase());
        });
      }
      console.log(`✅ Loaded command: ${cat}/${cmd.name}`);
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err);
    }
  }
}

// تحميل الأحداث (Events)
const eventsRoot = path.join(__dirname, "events");
fs.readdirSync(eventsRoot).forEach((folder) => {
  const fullFolder = path.join(eventsRoot, folder);
  if (!fs.lstatSync(fullFolder).isDirectory()) return;
  const eventFiles = fs.readdirSync(fullFolder).filter((f) => f.endsWith(".js"));

  for (const file of eventFiles) {
    const evPath = path.join(fullFolder, file);
    const eventName = file.split(".")[0];
    try {
      const eventFn = require(evPath);
      if (eventName === "ready") {
        client.once("ready", (...args) => eventFn(client, ...args));
      } else {
        client.on(eventName, (...args) => eventFn(client, ...args));
      }
      console.log(`⚡ Loaded event: ${folder}/${file}`);
    } catch (err) {
      console.error(`❌ Event load error in ${file}:`, err);
    }
  }
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(config.token);
