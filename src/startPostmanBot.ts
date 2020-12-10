import { DMChannel, Guild, Message, NewsChannel, TextChannel } from "discord.js";
import { UserTable, GuildTable } from "./tables";

const Discord = require('discord.js');
const dynamo = require('dynamodb');

const {  } = require('./tables');
const { TOKEN, INVITE_LINK } = require('./token');

dynamo.AWS.config.loadFromPath('./credentials.json');

const client = new Discord.Client();

client.once('ready', () => {
    console.log('Running...');
});

function test(_: string, fullResponse: Message) {
    sendMessage(fullResponse.channel, '', 'Done.');
    GuildTable.update({
        'key': `guild#${783156031085215744}`,
        'active_users': {},
    });
    /*
    Metadata.update({
        key: 'metadata',
        active_guilds: { }
    });
    */
}

function info(_: string, fullResponse: Message) {
    UserTable.get(`user#${fullResponse.author.id}`, (item) => {
        sendMessage(fullResponse.channel, '', JSON.stringify(item));
    });
}
function viewAddress(_: string, fullResponse: Message) {
    UserTable.get(`user#${fullResponse.author.id}`, (item) => {
        if (item === null) {
            UserTable.update({
                key: `user#${fullResponse.author.id}`,
                discord_id: fullResponse.author.id,
                username: fullResponse.author.username,
                discriminator: fullResponse.author.discriminator,
                address: {
                    line1: '',
                    line2: '',
                    line3: '',
                    line4: '',
                },
            });
            sendMessage(fullResponse.channel, '', 'Looks like you haven\'t set an address yet');
        } else if (
            item['address']['line1'] === '' &&
            item['address']['line2'] === '' &&
            item['address']['line3'] === '' &&
            item['address']['line4'] === ''
        ) {
            sendMessage(fullResponse.channel, '', 'Looks like you haven\'t set an address yet');
        } else {
            sendMessage(
                fullResponse.channel,
                '',
                [
                    item['address']['line1'],
                    item['address']['line2'],
                    item['address']['line3'],
                    item['address']['line4'],
                ].join('\n')
            );
        }
    });
}

function setAddress(args: string, fullResponse: Message) {
    function formatAddress(s: string) {
        return s.trim().toUpperCase();
    }
    let lines = args.split('\n');
    if (lines.length !== 4) {
        sendMessage(fullResponse.channel, '', `bad args: "${args}"`);
    } else {
        lines = lines.map(formatAddress);
        UserTable.update({
            key: `user#${fullResponse.author.id}`,
            discord_id: fullResponse.author.id,
            username: fullResponse.author.username,
            discriminator: fullResponse.author.discriminator,
            address: {
                line1: lines[0],
                line2: lines[1],
                line3: lines[2],
                line4: lines[3],
            },
        });
        sendMessage(fullResponse.channel, 'Updated successfully', lines.join('\n'));
    }
}

function joinServer(args: string, fullResponse: Message) {
    const guild_id = parseInt(args);
    if (isNaN(guild_id)) {
        sendMessage(fullResponse.channel, '', `bad args: "${args}"`);
    } else {
        GuildTable.get(`guild#${guild_id}`, item => {
            if (item === null) {
                sendMessage(fullResponse.channel, '', `Looks like that server hasn\'t invited me. Have someone invite me using this link: ${INVITE_LINK}`);
            } else {
                const active_users = item['active_users'];
                if (active_users[fullResponse.author.id] !== undefined) {
                    sendMessage(fullResponse.channel, '', 'You seem to already be a part of this server\'s postcard list');
                } else {
                    active_users[fullResponse.author.id] = true;
                    GuildTable.update({
                        'key': `guild#${guild_id}`,
                        'active_users': active_users,
                    });
                    sendMessage(fullResponse.channel, 'Updated successfully', 'You have been added to that server\'s postcard list');
                }
            }
        });
    }
}

function leaveServer(args: string, fullResponse: Message) {
    args;
    fullResponse;
}

function cmdNotFound(cmd: string, fullResponse: Message) {
    sendMessage(fullResponse.channel, '', 'I don\'t know how to do "' + cmd + '".');
}

const PREFIX = 'postman!';
const NOT_CMD = '[[NOT_COMMAND]]';

class Command {
    constructor(
        public fn: (arg: string, fullResponse: Message) => void,
        public desc: string,
        public restricted: boolean,
    ) { }
}
const dmCommands = new Map<string, Command>([
    ['test', new Command(test, 'A test command', false)],
    ['info', new Command(info, 'View your user info', false)],
    //['help', new Command(help, '', false)],
    ['viewaddress', new Command(viewAddress, 'View your saved address', false)],
    ['setaddress', new Command(setAddress, 'Set/change your saved address', false)],
    //['sendmail', new Command(_, '', false)],
    //['undosendmail', new Command(_, '', false)],
    ['joinserver', new Command(joinServer, 'Join a server\'s postcard list', false)],
    ['leaveserver', new Command(leaveServer, 'Leave a server\'s postcard list', false)],
    //['deletealldata', new Command(_, '', false)],
    //['togglereminder', new Command(_, '', true)],
    //['startnewround', new Command(_, '', true)],
    //['authorize', new Command(_, '', true)],
    //['unauthorize', new Command(_, '', true)],
    //['changechannel', new Command(_, '', true)],
]);
    //'join': joinServer,
    //'leave': leaveServer,

function sendMessage(channel: TextChannel | NewsChannel | DMChannel, title: string, content: string) {
    channel.send({
        embed: {
            title: title,
            description: content,
        },
    });
}

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
    if (!msg.author.bot && msg.webhookID === null) {
        const request = parseMessage(msg.content.toLowerCase());
        if (request.command !== NOT_CMD) {
            if (msg.channel.type === 'text' || "news") {
                // if in group_channel...
                const cmd = dmCommands.get(request.command);
                if (cmd === undefined) {
                    cmdNotFound(request.command, msg);
                } else {
                    cmd.fn(request.args, msg);
                }
            } else if (msg.channel.type === 'dm') {
                // if in dm...
                const cmd = dmCommands.get(request.command);
                if (cmd === undefined) {
                    cmdNotFound(request.command, msg);
                } else {
                    cmd.fn(request.args, msg);
                }
            } else {
                // UNK?
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
