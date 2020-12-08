import { Guild, Message } from "discord.js";

const Discord = require('discord.js');
const dynamo = require('dynamodb');

const { tables } = require('./dynamo');
const { TOKEN } = require('./token');

dynamo.AWS.config.loadFromPath('./credentials.json');

const client = new Discord.Client();

client.once('ready', () => {
    console.log('Running...');
});

function test(_: string, fullResponse: Message) {
    console.log('Updated your profile.');
    tables.User.update({
        key: 'user#' + fullResponse.author.id,
        discord_id: fullResponse.author.id,
        username: fullResponse.author.username,
        discriminator: fullResponse.author.discriminator,
        address: {
            line1: '',
            line2: '',
            line3: '',
            country: '',
        },
    });
}
function cmdNotFound(cmd: string, fullResponse: Message) {
    fullResponse.channel.send('I don\'t know how to do "' + cmd + '".');
}

/*
function joinServer(args: string) {

    tables.User.update({
        key: 'user#12345',
        guilds: ['111'],
        discord_id: '12345',
        username: 'mr_test',
        discriminator: '3232',
        address: {
            line1: 'MR. TEST',
            line2: '223 TEST WAY SE',
            line3: 'SEATTLE, WA 99900',
            country: 'United STATES',
        },
    }, console.log);
}

function leaveServer(args: string) {

}
//*/
const PREFIX = 'postman!';
const NOT_CMD = '[[NOT_COMMAND]]';

class Command {
    constructor(
        public fn: (arg: string, fullResponse: Message) => void,
        public desc: string,
    ) { }
}
const dmCommands = new Map<string, Command>();
dmCommands.set('test', new Command(test, 'A test command.'));
    //'join': joinServer,
    //'leave': leaveServer,

//const BOT_INVITE_LINK = 'https://discord.com/oauth2/authorize?client_id=783139009374322759&scope=bot';
function parseMessage(content: string) {
    content = content.trim();

    if (content.indexOf(PREFIX) !== 0) {
        return {
            command: NOT_CMD,
            args: '',
        };
    } else {
        content = content.substr(content.indexOf(PREFIX) + PREFIX.length);
        if (!content.includes(' ')) {
            return {
                command: content.trim(),
                args: '',
            };
        } else {
            return {
                command: content.substr(0, content.indexOf(' ')).trim(),
                args: content.substr(content.indexOf(' ') + 1).trim(),
            };
        }
    }
}

// message sent by user
client.on('message', (msg: Message) => {
    console.log();
    if (!msg.author.bot && msg.webhookID === null) {
        const request = parseMessage(msg.content.toLowerCase());
        if (request.command !== NOT_CMD) {
            if (msg.channel.type === 'text') {
                // if in group_channel...
            } else if (msg.channel.type === 'dm') {
                const cmd = dmCommands.get(request.command);
                if (cmd === undefined) {
                    cmdNotFound(request.command, msg);
                } else {
                    cmd.fn(request.args, msg);
                }
                // authorized?
                // dont allow '#' in some fields?
            } else {

            }
        }
    }
    /*
    console.log();
    console.log();
    console.log(msg.content);
    console.log(msg.channel.type);
    console.log(msg.createdTimestamp);
    console.log(msg.author.bot);
    console.log(msg.webhookID === null);
    console.log();
    console.log('channel_id:'+msg.channel.id);
    if (msg.channel.type === 'text')
        console.log('guild_id:'+msg.channel.guild.id);
    console.log('author:'+msg.author.id);
    console.log('username:'+msg.author.username);
    console.log('discriminator:'+msg.author.discriminator);
    //*/
    // 

});

//joined a server
client.on("guildCreate", (guild: Guild) => {
    guild.fetchAuditLogs({type: "BOT_ADD", limit: 1}).then(log => { // Fetching 1 entry from the AuditLogs for BOT_ADD.
        const first = log.entries.first();
        if (!first) {
            throw 'hgfghfggh';
        } else {
        const authUser = first.executor;
        authUser;
        }
    });
    console.log("Joined a new guild: " + guild.name);
    //Your other stuff like adding to guildArray
})

//removed from a server
client.on("guildDelete", (guild: Guild) => {
    guild.available;
    console.log("Left a guild: " + guild.name);
    //remove from guildArray
})

client.login(TOKEN);
