const Discord = require('discord.js');
const client = new Discord.Client();
const TOKEN = 'NzgzMTM5MDA5Mzc0MzIyNzU5.X8WZCQ.ANbYGH8zZI3H2xF9Z3ZjK_b5Uwg';

const POSTCARD_SOMEBODY = '766492491514904616';

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

function getPairing(n, previous=null) {
    if (n <= 2) {
        throw 'Too small of group';
    }

    const recipients = [...Array(n).keys()];

    let filteredList = [];
    while (filteredList.length < n) {
        shuffle(recipients);

        if (previous === null) {
            filteredList = recipients.filter((v, i) => v !== i);
        } else {
            filteredList = recipients.filter((v, i) => v !== i && v !== previous[i]);
        }
    }
    return recipients;
}

const USERS = [
  {
      name: "Thomas",
      id: "321845235544096768",
      address: "Thomas Lin\n15267 NW Decatur Way\nPortland, OR 97229"
  },
  {
      name: "Michael",
      id: "614746191829270549",
      address: "Michael Hart\n5616 Roosevelt Way NE\nSeattle, WA 98105"
  },
  {
      name: "Dorothy",
      id: "422204916245987330",
      address: "Dorothy Lu\n5246 Brooklyn Ave NE\nSeattle, WA 98501 Unit 103"
  },
  {
      name: "Steffy",
      id: "246092921269387264",
      address: "Steffany Ng\n5246 Brooklyn Ave NE\nSeattle, WA 98105 Unit 103"
  },
  {
      name: "Prachatorn",
      id: "624786986313580564",
      address: "Prachatorn Joemjumroon\n927 132nd St. SW #A-1\nEverett, WA 98204"
  },
  {
      name: "Asa",
      id: "533363294325440532",
      address: "Asa\nMcCarty Hall, Room 609\n2100 NE Whitman Ln\nSeattle, WA 98195"
  },
  {
      name: "Alyssa",
      id: "253337187775545344",
      address: "Alyssa Diller\n3138 Northshore Rd\nBellingham, WA 98226"
  },
  {
      name: "Jessie",
      id: "657487234404188166",
      address: "Jessie\n5031 12th Ave NE Unit B\nSeattle, WA 98105"
  },
  {
      name: "Marissa",
      id: "625432710470565918",
      address: "Marissa Shibuya\n7040 West Mercer Way\nMercer Island, WA 98040"
  },
  {
      name: "Kelsey",
      id: "570503207797784576",
      address: "Kelsey Kua\n664 NE 40th St.\nSeattle, WA 98105"
  },
  {
      name: "Anna",
      id: "263198227157876736",
      address: "Anna Yates\n13759 173rd Pl SE\nRenton, WA 98059"
  },
  {
      name: "Jon",
      id: "186368107147689984",
      address: "Jonathan Kim\n73-1167 Kaiminani Dr\nKailua Kona, Hawaii 96740"
  },
  {
      name: "Noa",
      id: "759554232512282695",
      address: "Noa Roth\nP.O Box 624\nHolualoa, HI 96725"
  }
];

async function getUsers() {
    for (const user of Object.values(USERS)) {
        await client.users.fetch(user.id);
    }
}
async function sendToUsers() {
    const recipient = getPairing(USERS.length, null);

    for (let i = 0; i < USERS.length; ++i) {
        await client.users.cache.get(USERS[i].id).send({
            embed: {
                title: "Shhhhh, don't tell anyone!",
                description: USERS[recipient[i]].address,
                //image: {
                //    url: 'https://drive.google.com/uc?export=view&id=1U0d5gRo0gxPJiv3S3CWxXwEXVS2QZ_Sm'
                //},
                thumbnail: {
                    url: 'https://drive.google.com/uc?export=view&id=1U0d5gRo0gxPJiv3S3CWxXwEXVS2QZ_Sm'
                }
            },
        });
    }

    await client.channels.cache.get(POSTCARD_SOMEBODY).send({
        embed: {
            title: "Postcard Somebody Round 2 has begun!",
            description: "I've just sent you a DM with your person's address. Keep it secret and have some fun!\n\nIf you did not get a message, let Michael know ASAP",
            image: {
                url: 'https://drive.google.com/uc?export=view&id=1UODGEannSEuSIyOAgwT-_OjCVehb1piK'
            },
        }
    });
}

client.once('ready', () => {
    console.log('Running...');

    getUsers().then(() => {
        sendToUsers().then(() => {
            process.exit(0);
        });
    });
});

client.login(TOKEN);
