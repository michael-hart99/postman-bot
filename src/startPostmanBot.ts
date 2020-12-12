import { DMChannel, Guild, GuildChannel, GuildMember, Message, NewsChannel, TextChannel, User } from "discord.js";
import { GuildItem } from "dynamodb";
import { UserTable, GuildTable, MetadataTable, HistoryTable } from "./tables";

const Discord = require('discord.js');
const dynamo = require('dynamodb');

const {  } = require('./tables');
const { TOKEN, INVITE_LINK } = require('./token');

dynamo.AWS.config.loadFromPath('./credentials.json');

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const PLACEHOLDER = '{}';
const PHRASES = [
  PLACEHOLDER + ' has a letter on the way!',
  PLACEHOLDER + ' should keep an eye on their mailbox...',
  'Look out, mail on the way for ' + PLACEHOLDER,
  'Keep \'em peeled, ' + PLACEHOLDER + ', I\'ve got a letter for you.',
  'Making my way downtown, walking fast, with a letter for ' + PLACEHOLDER,
  'Yo, anyone know where ' + PLACEHOLDER + ' lives? Jk, I know. It\'s on this letter I have for them.',
  'Wish I could go home and see my family but I guess I have to deliver this letter to ' + PLACEHOLDER,
  'Start checking your mailbox, ' + PLACEHOLDER + '!',
  'Hey! ' + PLACEHOLDER + '! Don\'t let this letter pass you by!',
  'Beep beep, this letter is headed straight for ' + PLACEHOLDER,
  'Nbd but ' + PLACEHOLDER + ' you\'ll be getting something really cool in the mail soon',
  'Yooooo I just peeked at this letter for ' + PLACEHOLDER + ' and they\'re totally gonna love it',
  PLACEHOLDER + '? Apparently someone has sent you a letter.',
  'A letter for ' + PLACEHOLDER + '? Reminds me, I think I went to postman academy with a ' + PLACEHOLDER,
  'Good lord, AMAZING letter on it\'s way to ' + PLACEHOLDER + ' rn',
  'I wish it wasn\'t against the rules, I would totally share a peek at this letter to ' + PLACEHOLDER + ' with you guys',
  PLACEHOLDER + ' go look at your mailbox! Haha it\'s probably not there... unless...?',
  'Ppl really out there still sending letters? Apparently this one is for ' + PLACEHOLDER,
  'Yessssss letter on the way to ' + PLACEHOLDER,
  'Dear ' + PLACEHOLDER + ', start checking ur mail',
  'Yo ' + PLACEHOLDER + ', u best check yo mailbox dawg',
  'Psssst ' + PLACEHOLDER + ' you got mail',
  PLACEHOLDER + ' put ur right hand in put ur right hand out, put ur right hand in the mailbox and pull this letter out'
];

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
    client.guilds.fetch({ guild_id: '783156031085215744', force: true }).then((res: Guild) => {
        res.members.fetch({ user: '614746191829270549', force: true }).then(console.log);
    }).catch(console.log);
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

function viewAssigneeHelper(guild_id: string, fullResponse: Message) {
    HistoryTable.get(`history#${guild_id}#current`, history_item => {
        if (history_item === null) {
            sendMessage(fullResponse.channel, '', 'Looks like there is no ongoing round');
        } else {
            if (history_item['matches'][fullResponse.author.id]) {
                client.guilds.fetch({ guild_id, force: true }).then((guild: Guild) => {
                    UserTable.get(`user#${history_item['matches'][fullResponse.author.id]['recipient']}`, user_item => {
                        if (user_item === null) {
                            handleError(fullResponse.channel, `not able to find user ${history_item['matches'][fullResponse.author.id]['recipient']} when getting assignee`);
                        } else {
                            guild.members.fetch({ user: user_item['discord_id'], force: true }).then((member: GuildMember) => {
                                let name: string;
                                if (member.nickname === null) {
                                    name = `${member.user.username}#${member.user.discriminator}`;
                                } else {
                                    name = member.nickname;
                                }
                                sendMessage(
                                    fullResponse.author,
                                    `Shhhh, don't tell anyone!`,
                                    [
                                        `@${name}`,
                                        '',
                                        user_item['address']['line1'],
                                        user_item['address']['line2'],
                                        user_item['address']['line3'],
                                        user_item['address']['line4'],
                                    ].join('\n'),
                                );
                            }).catch(() => handleError(fullResponse.channel, `Something went wrong when looking for user ${user_item['discord_id']} in guild ${guild_id}`));
                        }
                    });
                }).catch(() => handleError(fullResponse.channel, `unable to find guild ${guild_id}`));
            } else {
                sendMessage(fullResponse.channel, '', 'Looks like you are not in the current round');
            }
        }
    });
}
function viewAssignee(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 1) {
        const guild_id = argArray[0];
        viewAssigneeHelper(guild_id, fullResponse);
    } else {
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                viewAssigneeHelper(author_item['server'], fullResponse);
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!viewassignee <server id>\'');
            }
        });
    }
}

function sendMailHelper(user_id: string, guild_id: string, fullResponse:Message) {
    GuildTable.get(`guild#${guild_id}`, guild_item => {
        if (guild_item === null) {
            handleError(fullResponse.channel, `Unable to find guild ${guild_id} in sendMail`);
        } else {
            client.guilds.fetch({ guild_id, force: true }).then((res: Guild) => {
                // @ts-ignore. Casting GuildChannel to TextChannel bc no one will use voice channel unless they want to kill the postman.
                const channel: TextChannel = res.channels.resolve(guild_item['group_channel']);
                if(channel === null) {
                    sendMessage(fullResponse.channel, '', 'Wasn\'t able to find that channel');
                } else {
                    const mention = '<@' + user_id + '>'
                    const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
                    const message = phrase.split(PLACEHOLDER).join(mention);
                    sendMessage(channel, 'Incoming letter', message);
                    sendMessage(fullResponse.channel, 'Updated successfully', 'Announcement has been sent');
                }
            }).catch(() => handleError(fullResponse.channel, 'Wasn\'t able to find that server'));
        }
    });
}
function sendMail(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 2) {
        const new_user_id = argArray[0];
        const guild_id = argArray[1];
        sendMailHelper(new_user_id, guild_id, fullResponse);
    } else if (argArray.length === 1) {
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                const new_user_id = argArray[0];
                sendMailHelper(new_user_id, author_item['server'], fullResponse);
            } else {
                const guild_id = argArray[0];
                HistoryTable.get(`history#${guild_id}#current`, history_item => {
                    if (history_item === null || !history_item['matches'][fullResponse.author.id]) {
                        sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!sendMail <user id> <server id>\'');
                    } else {
                        const new_user_id = history_item['matches'][fullResponse.author.id]['recipient'];
                        sendMailHelper(new_user_id, guild_id, fullResponse);
                    }
                });
            }
        });
    } else {
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                HistoryTable.get(`history#${author_item['server']}#current`, history_item => {
                    if (history_item === null || !history_item['matches'][fullResponse.author.id]) {
                        sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!sendMail <user id> <server id>\'');
                    } else {
                        const new_user_id = history_item['matches'][fullResponse.author.id]['recipient'];
                        const guild_id = author_item['server'];
                        sendMailHelper(new_user_id, guild_id, fullResponse);
                    }
                });
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!sendMail <server id>\'');
            }
        });
    }
}

function undoSendMailHelper(user_id: string, guild_id: string, fullResponse: Message) {
    GuildTable.get(`guild#${guild_id}`, guild_item => {
        if (guild_item === null) {
            handleError(fullResponse.channel, `Unable to find guild ${guild_id} in undoSendMail`);
        } else {
            client.guilds.fetch({ guild_id, force: true }).then((res: Guild) => {
                // @ts-ignore. Casting GuildChannel to TextChannel bc no one will use voice channel unless they want to kill the postman.
                const channel: TextChannel = res.channels.resolve(guild_item['group_channel']);
                if(channel === null) {
                    sendMessage(fullResponse.channel, '', 'Wasn\'t able to find that channel');
                } else {
                    sendMessage(fullResponse.channel, 'Updated successfully', 'Announcement has been revoked');
                    sendMessage(channel, 'Oops', `Sorry, <@${user_id}>, that last message was a mistake...`);
                }
            }).catch(() => handleError(fullResponse.channel, 'Wasn\'t able to find that server'));
        }
    });
}
function undoSendMail(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 2) {
        const new_user_id = argArray[0];
        const guild_id = argArray[1];
        undoSendMailHelper(new_user_id, guild_id, fullResponse);
    } else if (argArray.length === 1) {
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                const new_user_id = argArray[0];
                undoSendMailHelper(new_user_id, author_item['server'], fullResponse);
            } else {
                const guild_id = argArray[0];
                HistoryTable.get(`history#${guild_id}#current`, history_item => {
                    if (history_item === null || !history_item['matches'][fullResponse.author.id]) {
                        sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!undosendMail <user id> <server id>\'');
                    } else {
                        const new_user_id = history_item['matches'][fullResponse.author.id]['recipient'];
                        undoSendMailHelper(new_user_id, guild_id, fullResponse);
                    }
                });
            }
        });
    } else {
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                HistoryTable.get(`history#${author_item['server']}#current`, history_item => {
                    if (history_item === null || !history_item['matches'][fullResponse.author.id]) {
                        sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!undosendMail <user id> <server id>\'');
                    } else {
                        const new_user_id = history_item['matches'][fullResponse.author.id]['recipient'];
                        const guild_id = author_item['server'];
                        undoSendMailHelper(new_user_id, guild_id, fullResponse);
                    }
                });
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!undosendMail <server id>\'');
            }
        });
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

async function getActiveUsers(guild: Guild, item: GuildItem) {
    const users: string[] = [];
    for (const user of Object.keys(item['active_users'])) {
        await guild.members.fetch({ user, force: true }).then((res: GuildMember) => {
            if (res.nickname === null) {
                users.push(`${res.user.username}#${res.user.discriminator}`);
            } else {
                users.push(res.nickname);
            }
        }).catch(() => console.log);
    }
    return users;
}
function listUsersHelper(guild_id: string, fullResponse: Message) {
    GuildTable.get(`guild#${guild_id}`, item => {
        if (item === null) {
            sendMessage(fullResponse.channel, '', `I couldn\'t find a matching server with ID ${guild_id}, double-check that the second number is the server ID`);
        } else {
            const authorized_users = item['authorized_users'];
            if (authorized_users[fullResponse.author.id]) {
                client.guilds.fetch({ guild_id, force: true }).then((guild: Guild) => {
                    getActiveUsers(guild, item).then((users: string[]) => {
                        sendMessage(fullResponse.channel, 'Member list', users.join('\n'));
                    });
                }).catch(() => handleError(fullResponse.channel, 'Unable to find guild although it exists in database'));
            } else {
                sendMessage(fullResponse.channel, '', 'You aren\'t authorized to do this');
            }
        }
    });
}
function listUsers(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 1) {
        const guild_id = argArray[0];
        listUsersHelper(guild_id, fullResponse);
    } else {
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                listUsersHelper(author_item['server'], fullResponse);
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!listusers <server id>\'');
            }
        });
    }
}

function getPairing(n: number, previous: number[], fullResponse: Message) {
    if (n <= 2) {
        handleError(fullResponse.channel, 'Too small of group. Only ${n}');
    } else {
        const recipients = [...Array(n).keys()];

        let filteredList = [];
        while (filteredList.length < n) {
            shuffle(recipients);

            filteredList = recipients.filter((v, i) => v !== i && v !== previous[i]);
        }
        return recipients;
    }
}
function startNewRoundHelper(guild_id: string, fullResponse: Message) {
    GuildTable.get(`guild#${guild_id}`, guild_item => {
        if (guild_item === null) {
            sendMessage(fullResponse.channel, '', `I couldn\'t find a matching server with ID ${guild_id}, double-check that the second number is the server ID`);
        } else {
            if (guild_item['authorized_users'][fullResponse.author.id]) {
                const active_users = Object.keys(guild_item['active_users']);
                if (active_users.length < 3) {
                    sendMessage(fullResponse.channel, '', `Not enough active users. Only ${active_users.length}, and there must be 3 or more. Check who is active with \`postman!listusers\` and have people join the round with \`postman!join server ${guild_id}\``);
                } else {
                    client.guilds.fetch({ guild_id, force: true }).then((guild: Guild) => {
                        // @ts-ignore. Casting GuildChannel to TextChannel bc no one will use voice channel unless they want to kill the postman.
                        const channel: TextChannel = guild.channels.resolve(guild_item['group_channel']);
                        if(channel === null) {
                            sendMessage(fullResponse.channel, '', 'Wasn\'t able to find that channel');
                        } else {
                            HistoryTable.get(`history#${guild_id}#current`, history_item => {
                                const previous = new Array(active_users.length).fill(-1);
                                if (history_item !== null) {
                                    for (let i = 0; i < active_users.length; ++i) {
                                        if (history_item['matches'][active_users[i]]) {
                                            previous[i] = active_users.indexOf(history_item['matches'][active_users[i]]['recipient']);
                                        }
                                    }
                                }
                                const pairing = getPairing(active_users.length, previous, fullResponse);
                                const matches: { [key: string]: { recipient: string; sent: string; } } = {};
                                for (let i = 0; i < active_users.length; ++i) {
                                    matches[active_users[i]] = {
                                        'recipient': active_users[pairing[i]],
                                        'sent': 'false',
                                    };
                                }
                                const date = new Date().toISOString();
                                const round_num = parseInt(guild_item['history_length']) + 1;
                                GuildTable.update({
                                    'key': `guild#${guild_id}`,
                                    'history_length': round_num.toString(),
                                })
                                HistoryTable.update({
                                    'key': `history#${guild_id}#current`,
                                    'guild': guild_id,
                                    'round_id': round_num.toString(),
                                    'date': date,
                                    'matches': matches,
                                })
                                HistoryTable.update({
                                    'key': `history#${guild_id}#${round_num.toString()}`,
                                    'guild': guild_id,
                                    'round_id': round_num.toString(),
                                    'date': date,
                                    'matches': matches,
                                })
                                for (const user_id of active_users) {
                                    UserTable.get(`user#${user_id}`, user_item => {
                                        if (user_item === null) {
                                            handleError(fullResponse.channel, `not able to find user ${user_id} when starting round`);
                                        } else {
                                            guild.members.fetch({ user: user_id, force: true }).then((member: GuildMember) => {
                                                let name: string;
                                                if (member.nickname === null) {
                                                    name = `${member.user.username}#${member.user.discriminator}`;
                                                } else {
                                                    name = member.nickname;
                                                }
                                                sendMessage(
                                                    guild.member(user_id),
                                                    `Shhhh, don't tell anyone!`,
                                                    [
                                                        `@${name}`,
                                                        '',
                                                        user_item['address']['line1'],
                                                        user_item['address']['line2'],
                                                        user_item['address']['line3'],
                                                        user_item['address']['line4'],
                                                    ].join('\n'),
                                                );
                                            }).catch(() => handleError(fullResponse.channel, `Something went wrong when looking for user ${user_id} in guild ${guild_id}`));
                                        }
                                    });
                                }
                                sendMessage(
                                    channel,
                                    `Postcard Somebody Round ${round_num + 1} has begun!`,
                                    [
                                        `I've just sent you a DM with your assigned person's address. Keep it secret and have some fun!`,
                                        '',
                                        'If you did not get a message, post here or let Michael know ASAP',
                                    ].join('\n'));
                            });
                        }
                    }).catch(() => handleError(fullResponse.channel, 'Wasn\'t able to find that server'));
                }
            } else {
                sendMessage(fullResponse.channel, '', 'You aren\'t authorized to do this');
            }
        }
    });
}
function startNewRound(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 1) {
        const guild_id = argArray[0];
        startNewRoundHelper(guild_id, fullResponse);
    } else {
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                startNewRoundHelper(author_item['server'], fullResponse);
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!startnewround <server id>\'');
            }
        });
    }
}

function authorizeHelper(new_user_id: string, guild_id: string, fullResponse: Message) {
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
                        'authorized_users': authorized_users,
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
}
function authorize(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 2) {
        const new_user_id = argArray[0];
        const guild_id = argArray[1];
        authorizeHelper(new_user_id, guild_id, fullResponse);
    } else if (argArray.length === 1) {
        const new_user_id = argArray[0];
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                authorizeHelper(new_user_id, author_item['server'], fullResponse);
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!authorize <user id> <server id>\'');
            }
        });
    } else {
        sendMessage(fullResponse.channel, '', 'You didn\'t specify a user. Make sure your command follows \'postman!authorize <user id>\'');
    }
}

function unauthorizeHelper(new_user_id: string, guild_id: string, fullResponse: Message) {
    GuildTable.get(`guild#${guild_id}`, item => {
        if (item === null) {
            sendMessage(fullResponse.channel, '', `I couldn\'t find a matching server with ID ${guild_id}, double-check that the second number is the server ID`);
        } else {
            const authorized_users = item['authorized_users'];
            if (authorized_users[fullResponse.author.id]) {
                if (authorized_users[new_user_id]) {
                    delete authorized_users[new_user_id];
                    GuildTable.update({
                        'key': `guild#${guild_id}`,
                        'authorized_users': authorized_users,
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
}
function unauthorize(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 2) {
        const new_user_id = argArray[0];
        const guild_id = argArray[1];
        unauthorizeHelper(new_user_id, guild_id, fullResponse);
    } else if (argArray.length === 1) {
        const new_user_id = argArray[0];
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                unauthorizeHelper(new_user_id, author_item['server'], fullResponse);
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!unauthorize <user id> <server id>\'');
            }
        });
    } else {
        sendMessage(fullResponse.channel, '', 'You didn\'t specify a user. Make sure your command follows \'postman!unauthorize <user id>\'');
    }
}

function changeChannelHelper(channel_id: string, guild_id: string, fullResponse: Message) {
    GuildTable.get(`guild#${guild_id}`, item => {
        if (item === null) {
            sendMessage(fullResponse.channel, '', `I couldn\'t find a matching server with ID ${guild_id}, double-check that the second number is the server ID`);
        } else {
            if (item['authorized_users'][fullResponse.author.id]) {
                client.guilds.fetch({ guild_id, force: true }).then((res: Guild) => {
                    if(res.channels.resolve(channel_id) === null) {
                        sendMessage(fullResponse.channel, '', 'Wasn\'t able to find that channel');
                    } else {
                        GuildTable.update({
                            'key': `guild#${guild_id}`,
                            'group_channel': channel_id,
                        });
                        sendMessage(fullResponse.channel, 'Updated successfully', 'Changed postcard announcement channel');
                    }
                }).catch(() => handleError(fullResponse.channel, 'Wasn\'t able to find that server'));
            } else {
                sendMessage(fullResponse.channel, '', 'You aren\'t authorized to do this');
            }
        }
    });
}
function changeChannel(args: string, fullResponse: Message) {
    const argArray = args.split(' ').filter((s) => s.match(/^([0-9]+)$/) !== null);
    if (argArray.length === 2) {
        const channel_id = argArray[0];
        const guild_id = argArray[1];
        changeChannelHelper(channel_id, guild_id, fullResponse);
    } else if (argArray.length === 1) {
        const channel_id = argArray[0];
        UserTable.get(`user#${fullResponse.author.id}`, author_item => {
            if (author_item !== null && author_item['server'] !== 'multiple' && author_item['server'] !== 'none') {
                changeChannelHelper(channel_id, author_item['server'], fullResponse);
            } else {
                sendMessage(fullResponse.channel, '', 'You\'re in multiple postman servers. Make sure your command follows \'postman!changechannel <channel id> <server id>\'');
            }
        });
    } else {
        sendMessage(fullResponse.channel, '', 'You didn\'t specify a channel. Make sure your command follows \'postman!changechannel <channel id>\'');
    }
}

function cmdNotFound(cmd: string, fullResponse: Message) {
    sendMessage(fullResponse.channel, '', 'I don\'t know how to do "' + cmd + '".');
}

const channelCommands = new Map<string, CommandTemplate>();
const dmCommands = new Map<string, CommandTemplate>();
dmCommands.set('test', new CommandTemplate(test, 'A test command.', true));
dmCommands.set('info', new CommandTemplate(info, 'View your user info.', true));
dmCommands.set('help', new CommandTemplate(help(dmCommands), 'Displays list of available commands.', false));
dmCommands.set('viewaddress', new CommandTemplate(viewAddress, 'View your saved address.', false));
dmCommands.set('setaddress', new CommandTemplate(setAddress, 'Set/change your saved address.', false));
dmCommands.set('viewAssignee', new CommandTemplate(viewAssignee, 'View your current assignee.', false));
dmCommands.set('sendmail', new CommandTemplate(sendMail, 'Sends an announcement for your assignee to check their mail.', false));
dmCommands.set('undosendmail', new CommandTemplate(undoSendMail, 'Sends an announcement for your assignee indicating the last message was a mistake.', false));
dmCommands.set('joinserver', new CommandTemplate(joinServer, 'Join a server\'s postcard list.', false));
dmCommands.set('leaveserver', new CommandTemplate(leaveServer, 'Leave a server\'s postcard list.', false));
dmCommands.set('deletealldata', new CommandTemplate(deleteAllData, 'Delete all stored data about you.', false));
dmCommands.set('listusers', new CommandTemplate(listUsers, 'Lists all active users who have joined in a given channel.', true));
dmCommands.set('startnewround', new CommandTemplate(startNewRound, 'Starts a new postcard round, assigning everyone a recipient.', true));
dmCommands.set('authorize', new CommandTemplate(authorize, 'Give someone admin postcard privileges in a server.', true));
dmCommands.set('unauthorize', new CommandTemplate(unauthorize, 'Remove someone\'s admin postcard privileges in a server.', true));
dmCommands.set('changechannel', new CommandTemplate(changeChannel, 'Changes the channel where postcard announcements are sent.', true));

function sendMessage(channel: TextChannel | NewsChannel | DMChannel | User | GuildMember, title: string, content: string) {
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
        server: 'none',
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
});

const INTRO_MESSAGE = [
    'You added Postman to a server, and thus you are currently the sole authorized user in that channel.',
    '',
    'To view all available commands, run `postman!help showall`',
    '',
    'To start a postcard round',
    '- have a few users join via `postman!joinserver <server id>`',
    '- have those users set their addresses via `postman!setaddress`',
    '- set the postcard announcement channel via `postman!changechannel <channel id>`',
    '- start the round with `postman!startround`',
    '',
    'To authorize another user, run `postman!authorize <user id>`'
].join('\n');

//joined a server
client.on("guildCreate", (guild: Guild) => {
    guild.fetchAuditLogs({ type: "BOT_ADD", limit: 1 }).then(log => { // Fetching 1 entry from the AuditLogs for BOT_ADD.
        const first = log.entries.first();
        if (!first) {
            console.log('Not able to get user for guildCreate trigger');
        } else {
            const authorized_users: {[key: string]: string} = {};
            authorized_users[first.executor.id] = 'true';
            GuildTable.update({
                'key': `guild#${guild.id}`,
                'guild': guild.id,
                'authorized_users': authorized_users,
                'active_users': {},
                'history_length': '0',
                'group_channel': '-1',
                'quick_cmd': '',
            });
            const active_guilds: {[key: string]: string} = {};
            active_guilds[guild.id] = 'true';
            MetadataTable.update({
                key: 'metadata',
                active_guilds: active_guilds,
            });
            sendMessage(first.executor, 'Hello!', INTRO_MESSAGE);
        }
    });
    console.log("Joined a new guild: " + guild.name);
})

//removed from a server
client.on("guildDelete", (guild: Guild) => {
    GuildTable.delete(`guild#${guild.id}`);

    MetadataTable.get('metadata', item => {
        if (item === null) {
            console.log('Metadata entry is missing');
        } else {
            const active_guilds = item['active_guilds'];
            delete active_guilds[guild.id];
            MetadataTable.update({
                key: 'metadata',
                active_guilds: active_guilds,
            });
        }
    });
    console.log("Left a guild: " + guild.name);
})

client.login(TOKEN);
