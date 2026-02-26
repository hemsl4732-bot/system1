const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://mroan19899_db_user:PVvHyjqFNZYiCDbG@cluster0.d39lidi.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await mongoClient.connect();
    // Send a ping to confirm a successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error(err);
  }
}
run().catch(console.dir);








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

client.commands = new Collection();
client.aliases = new Collection();

const commandsPath = path.join(__dirname, "Commands");
const cats = fs.readdirSync(commandsPath);

for (const cat of cats) {
  const catPath = path.join(commandsPath, cat);
  const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const cmdPath = path.join(catPath, file);
    try {
      const cmd = require(cmdPath);

      if (!cmd || !cmd.name) {
        console.warn(`⚠️ ملف بدون اسم: ${cat}/${file}`);
        continue;
      }

      client.commands.set(cmd.name.toLowerCase(), cmd);

      if (Array.isArray(cmd.aliases)) {
        cmd.aliases.forEach((al) => {
          client.aliases.set(al.toLowerCase(), cmd.name.toLowerCase());
        });
      }

      console.log(`✅ Loaded command: ${cat}/${cmd.name}`);
    } catch (err) {
      console.error(`❌ Failed to load ${file} in ${cat}:`, err);
    }
  }
}

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
