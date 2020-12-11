import { DMChannel, Guild, Message, NewsChannel, TextChannel, User } from "discord.js";
import { UserTable, GuildTable, MetadataTable } from "./tables";

const Discord = require('discord.js');
const dynamo = require('dynamodb');

const {  } = require('./tables');
const { TOKEN, INVITE_LINK } = require('./token');

dynamo.AWS.config.loadFromPath('./credentials.json');

const client = new Discord.Client();

client.once('ready', () => {
    console.log('Running...');
});

class CommandTemplate {
    constructor(
        public fn: (arg: string, fullResponse: Message) => void,
        public desc: string,
        public hidden: boolean,
    ) { }
}

function test(_: string, fullResponse: Message) {
    sendMessage(fullResponse.channel, '', 'Done.');
    GuildTable.update({
        'key': `guild#783156031085215744`,
        'active_users': {},
    });
    MetadataTable.update({
        key: 'metadata',
        active_guilds: {'783156031085215744': 'true'}
    });
}
function handleError(channel: TextChannel | NewsChannel | DMChannel, err: string) {
    console.log(`Error: ${err}`);
    sendMessage(channel, '', 'Hmmm, something went wrong...');
}

function info(_: string, fullResponse: Message) {
    UserTable.get(`user#${fullResponse.author.id}`, (item) => {
        sendMessage(fullResponse.channel, '', JSON.stringify(item));
    });
}

function help(cmdMap: Map<string, CommandTemplate>) {
    return (args: string, fullResponse: Message) => {
        const msg = [];
        for (const name of cmdMap.keys()) {
            const cmd = cmdMap.get(name);
            if (cmd === undefined) {
                handleError(fullResponse.channel, `"${cmd} not found in command map`)
            } else {
                if (!cmd.hidden || args === 'showall') {
                    msg.push(`postman!**${name}** - ${cmd.desc}`);
                }
            }
        }
        sendMessage(fullResponse.channel, 'Available commands:', msg.join('\n'));
    }
}

function viewAddress(_: string, fullResponse: Message) {
    UserTable.get(`user#${fullResponse.author.id}`, (item) => {
        if (item === null) {
            handleError(fullResponse.channel, `Unable to find user info for "${fullResponse.author.username}", "${fullResponse.author.id}"`);
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
    if (args.match(/^([0-9]+)$/) === null) {
        sendMessage(fullResponse.channel, '', `bad args: "${args}"`);
    } else {
        const guild_id = args;
        GuildTable.get(`guild#${guild_id}`, item => {
            if (item === null) {
                sendMessage(fullResponse.channel, '', `Looks like that server hasn\'t invited me. Have someone invite me using this link: ${INVITE_LINK}`);
            } else {
                const active_users = item['active_users'];
                if (active_users[fullResponse.author.id]) {
                    sendMessage(fullResponse.channel, '', 'You seem to already be a part of this server\'s postcard list');
                } else {
                    active_users[fullResponse.author.id] = 'true';
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
    if (args.match(/^([0-9]+)$/) === null) {
        sendMessage(fullResponse.channel, '', `bad args: "${args}"`);
    } else {
        const guild_id = args;
        GuildTable.get(`guild#${guild_id}`, item => {
            if (item === null) {
                sendMessage(fullResponse.channel, '', `I don't know that server`);
            } else {
                const active_users = item['active_users'];
                if (active_users[fullResponse.author.id]) {
                    delete active_users[fullResponse.author.id];
                    GuildTable.update({
                        'key': `guild#${guild_id}`,
                        'active_users': active_users,
                    });
                    sendMessage(fullResponse.channel, 'Updated successfully', 'You have been removed from that server\'s postcard list');
                } else {
                    sendMessage(fullResponse.channel, '', 'You don\'t seem to be on this server\'s postcard list');
                }
            }
        });
    }
}

function deleteAllData(_: string, fullResponse: Message) {
    UserTable.delete(`user#${fullResponse.author.id}`);

    MetadataTable.get(`metadata`, item => {
        if (item === null) {
            handleError(fullResponse.channel, `Unable to get metadata item, does it exist?`);
        } else {
            for (const guild_id of Object.keys(item['active_guilds'])) {
                GuildTable.get(`guild#${guild_id}`, item => {
                    if (item === null) {
                        handleError(fullResponse.channel, `${guild_id} exists in Metadata but not in Guilds.`);
                    } else {
                        const active_users = item['active_users'];
                        const authorized_users = item['authorized_users'];
                        let change = false;
                        if (active_users[fullResponse.author.id]) {
                            change = true;
                            delete active_users[fullResponse.author.id];
                        }
                        if (authorized_users[fullResponse.author.id]) {
                            change = true;
                            delete authorized_users[fullResponse.author.id];
                        }
                        if (change) {
                            GuildTable.update({
                                'key': `guild#${guild_id}`,
                                'active_users': active_users,
                                'authorized_users': authorized_users,
                            });
                        }
                    }
                });
            }
        }
    });

    sendMessage(fullResponse.channel, 'Updated successfully', 'Your information has been deleted');
}

function authorize(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 2) {
        const new_user_id = argArray[0];
        const guild_id = argArray[1];
        GuildTable.get(`guild#${guild_id}`, item => {
            if (item === null) {
                sendMessage(fullResponse.channel, '', `I couldn\'t find a matching server with ID ${guild_id}, double-check that the second number is the server ID`);
            } else {
                const authorized_users = item['authorized_users'];
                if (authorized_users[fullResponse.author.id]) {
                    if (!authorized_users[new_user_id]) {
                        authorized_users[new_user_id] = 'true';
                        GuildTable.update({
                            'key': `guild#${guild_id}`,
                            'active_users': authorized_users,
                        });
                        sendMessage(fullResponse.channel, 'Updated successfully', 'That user is now authorized');
                    } else {
                        sendMessage(fullResponse.channel, '', 'It looks like that user is already authorized');
                    }
                } else {
                    sendMessage(fullResponse.channel, '', 'You aren\'t authorized to do this');
                }
            }
        });
    } else {
        sendMessage(fullResponse.channel, '', 'Make sure your command follows \'postman!authorize <user id> <server id>\'');
    }
}

function unauthorize (args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 2) {
        const new_user_id = argArray[0];
        const guild_id = argArray[1];
        GuildTable.get(`guild#${guild_id}`, item => {
            if (item === null) {
                sendMessage(fullResponse.channel, '', `I couldn\'t find a matching server with ID ${guild_id}, double-check that the second number is the server ID`);
            } else {
                const authorized_users = item['authorized_users'];
                if (authorized_users[fullResponse.author.id]) {
                    if (authorized_users[new_user_id]) {
                        authorized_users[new_user_id] = 'false';
                        GuildTable.update({
                            'key': `guild#${guild_id}`,
                            'active_users': authorized_users,
                        });
                        sendMessage(fullResponse.channel, 'Updated successfully', 'That user is now unauthorized');
                    } else {
                        sendMessage(fullResponse.channel, '', 'It looks like that user is already unauthorized');
                    }
                } else {
                    sendMessage(fullResponse.channel, '', 'You aren\'t authorized to do this');
                }
            }
        });
    } else {
        sendMessage(fullResponse.channel, '', 'Make sure your command follows \'postman!unauthorize <user id> <server id>\'');
    }
}

function changeChannel(args: string, fullResponse: Message) {
    client.channels.fetch('222109930545610754');
    args;
    fullResponse;
}

function cmdNotFound(cmd: string, fullResponse: Message) {
    sendMessage(fullResponse.channel, '', 'I don\'t know how to do "' + cmd + '".');
}

const channelCommands = new Map<string, CommandTemplate>();
const dmCommands = new Map<string, CommandTemplate>();
dmCommands.set('test', new CommandTemplate(test, 'A test command', true));
dmCommands.set('info', new CommandTemplate(info, 'View your user info', true));
dmCommands.set('help', new CommandTemplate(help(dmCommands), 'Displays list of available commands', false));
dmCommands.set('viewaddress', new CommandTemplate(viewAddress, 'View your saved address', false));
dmCommands.set('setaddress', new CommandTemplate(setAddress, 'Set/change your saved address', false));
//dmCommands.set('sendmail', new CommandTemplate(_, '', false));
//dmCommands.set('undosendmail', new CommandTemplate(_, '', false));
dmCommands.set('joinserver', new CommandTemplate(joinServer, 'Join a server\'s postcard list', false));
dmCommands.set('leaveserver', new CommandTemplate(leaveServer, 'Leave a server\'s postcard list', false));
dmCommands.set('deletealldata', new CommandTemplate(deleteAllData, 'Delete all stored data about you', false));
//dmCommands.set('startnewround', new CommandTemplate(_, '', true));
dmCommands.set('authorize', new CommandTemplate(authorize, 'Give someone admin postcard privileges in a server', true));
dmCommands.set('unauthorize', new CommandTemplate(unauthorize, 'Remove someone\'s admin postcard privileges in a server', true));
dmCommands.set('changechannel', new CommandTemplate(changeChannel, 'Changes the channel where postcard announcements are sent', true));

function sendMessage(channel: TextChannel | NewsChannel | DMChannel, title: string, content: string) {
    channel.send({
        embed: {
            title: title,
            description: content,
        },
    });
}

class Command {
    public static PREFIX = 'postman!';

    public valid: boolean;
    public command: string;
    public args: string;

    public constructor(content: string) {
        content = content.trim();

        if (content.indexOf(Command.PREFIX) !== 0) {
            this.valid = false;
            this.command = '';
            this.args = '';
        } else {
            this.valid = true;
            content = content.substr(content.indexOf(Command.PREFIX) + Command.PREFIX.length);
            if (!content.includes(' ')) {
                this.command = content.trim();
                this.args = '';
            } else {
                this.command = content.substr(0, content.indexOf(' ')).trim();
                this.args = content.substr(content.indexOf(' ') + 1).trim();
            }
        }
    }

    public isValid() {
        return this.valid;
    }
}

function initUser(user: User, callback: () => void) {
    UserTable.update({
        key: `user#${user.id}`,
        discord_id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        address: {
            line1: '',
            line2: '',
            line3: '',
            line4: '',
        },
        quick_cmd: '',
    }, callback);
}

function handleCommand(cmd: Command, fullResponse: Message) {
    if (fullResponse.channel.type === 'text' || fullResponse.channel.type === "news") {
        // if in group_channel...
        const matchingCmd = channelCommands.get(cmd.command);
        if (matchingCmd === undefined) {
            cmdNotFound(cmd.command, fullResponse);
        } else {
            matchingCmd.fn(cmd.args, fullResponse);
        }
    } else if (fullResponse.channel.type === 'dm') {
        // if in dm...
        const matchingCmd = dmCommands.get(cmd.command);
        if (matchingCmd === undefined) {
            cmdNotFound(cmd.command, fullResponse);
        } else {
            matchingCmd.fn(cmd.args, fullResponse);
        }
    } else {
        handleError(fullResponse.channel, `unexpected channel type: "${fullResponse}"`);
    }
}

// message sent by user
client.on('message', (msg: Message) => {
    if (!msg.author.bot && msg.webhookID === null) {
        const cmd = new Command(msg.content.toLowerCase());
        if (cmd.isValid()) {
            UserTable.get(`user#${msg.author.id}`, (item) => {
                if (item === null) {
                    initUser(msg.author, () => handleCommand(cmd, msg));
                } else {
                    handleCommand(cmd, msg);
                }
            });
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
