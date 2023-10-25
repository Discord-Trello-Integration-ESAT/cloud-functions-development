const functions = require("firebase-functions");
const fetch = require("node-fetch");
const admin = require('firebase-admin');
const nacl = require('tweetnacl');
const { Client } = require('discord.js');
const { InteractionType, InteractionResponseType } = require('discord-interactions');
const axios = require('axios');
const OAuth = require('oauth').OAuth;
const cors = require('cors')({ origin: true });

admin.initializeApp();


const client = new Client({
  intents: [
    'GUILDS',
    'GUILD_MESSAGES'
  ]
});

client.login(functions.config().discord.token);

// Your config variables
const trelloApiKey = functions.config().trello.key;
const trelloToken = functions.config().trello.token;
const trelloSecret = functions.config().trello.client_secret;
const discordToken = functions.config().discord.token;
const trelloUserinfoApiKey = functions.config().trello.userinfo_apikey;


const discordWebhookUrl = "https://discord.com/api/webhooks/1148038326167801967/f6ObijJ7DlYacyIHahM7UlzqFjgJ5N_nPZMrG1Za4CC9G_EwHHfxIrHUO1Me7ip5yHhH";

async function editOriginalMessage(content) {

  const url = `https://discord.com/api/webhooks/1149610459796881468/WHUR5O7ZFS3JgZJpQDLnSFBXGaxNBcQEKP-RvAcQ0do-U1wCt6O284ZKV1HbXzTuT-zK`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: content
    })
  });

  if (!response.ok) {
    // Handle error
    const data = await response.json();
    console.error('Failed to edit message:', data);
  }
}


async function exchangeCodeForToken(authorizationCode) {

  console.log("exchangeCodeForToken called")

  const response = await fetch('https://trello.com/1/OAuthGetAccessToken', {
    method: 'POST',
    body: JSON.stringify({
      key: trelloApiKey,
      secret: trelloSecret,
      code: authorizationCode,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /* const data = await response.json(); */

  const text = await response.text();
  console.log("Raw response:", text);

  return
}


exports.syncTrelloToDiscordTasks = functions.https.onRequest(async (request, response) => {
  try {
    // Fetch tasks from Trello API
    const trelloResponse = await fetch(`https://api.trello.com/1/boards/p2z1s6BG/cards?key=${trelloApiKey}&token=${trelloToken}`);
    const trelloTasks = await trelloResponse.json();
    console.log("Trello Response:", trelloTasks);

    // Take only the last 5 tasks
    const lastFiveTasks = trelloTasks.slice(-5);

    // Map last 5 Trello tasks to Discord embed format
    const discordMessages = lastFiveTasks.map(task => ({
      title: task.name,
      description: task.desc,
      url: task.shortUrl,
    }));
    
    console.log("Discord Messages:", discordMessages);

    // Send to Discord
    const discordResponse = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: discordMessages }),
    });

    if (discordResponse.ok) {
      try {
        const discordData = await discordResponse.json();
        console.log("Discord Response:", discordData);
      } catch (e) {
        console.error("Could not parse Discord response:", e);
      }
    } else {
      console.log("Discord Error:", discordResponse.statusText);
    }

    response.send("Successfully synced last 5 Trello tasks to Discord.");
  } catch (error) {
    console.error("Error:", error);
    response.status(500).send("Internal Server Error");
  }
});

exports.trelloTaskWebhookToDiscord = functions.https.onRequest(async (request, response) => {
  try {
    const eventData = request.body;

   // If this is an initial validation request from Trello, 
    // eventData or eventData.action might be undefined.
    // Return 200 to indicate that the endpoint is working.
    if (!eventData || !eventData.action) {
      console.log("Validation request received or eventData/action is missing. Responding with 200 OK.");
      response.status(200).send("OK");
      return;
    }

    // Check for the type of action; for this example, let's consider 'createCard'
    if (eventData.action.type === 'createCard') {
      const card = eventData.action.data.card;

      // Additional check for card
      if (!card) {
        console.error("Card information is missing in eventData");
        response.status(400).send("Bad Request: Missing card information");
        return;
      }

      //console.log("Received Trello Webhook for New Task:", card);

      // Map Trello task to Discord embed format
      const discordMessage = {
        title: card.name,
        description: `ID: ${card.id}, Short ID: ${card.idShort}`,
        url: `https://trello.com/c/${card.shortLink}`,
      };

      console.log("Sending Discord Notification for New Task:", discordMessage);

      // Send to Discord
      const discordResponse = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [discordMessage] }),
      });

      if (discordResponse.ok) {
        try {
          const discordData = await discordResponse.json();
          console.log("Discord Response:", discordData);
        } catch (e) {
          console.error("Could not parse Discord response:", e);
        }
      } else {
        console.log("Discord Error:", discordResponse.statusText);
      }

    }

    response.status(200).send("Received");
  } catch (error) {
    console.error("Error:", error);
    response.status(500).send("Internal Server Error");
  }
});




exports.discordLinkAccounts = functions.https.onRequest(async (req, res) => {

    // Getting Discord Public Key from Functions Config
    const PUBLIC_KEY = functions.config().discord.public_key;
  
    // Security checks
    const signature = req.header('X-Signature-Ed25519');
    const timestamp = req.header('X-Signature-Timestamp');
    const body = JSON.stringify(req.body);  // make sure to stringify the body
    
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(PUBLIC_KEY, 'hex')
    );
    
    if (!isVerified) {
      return res.status(401).end('Invalid request signature');
    }
    
  // Handle Discord Interaction

  const { type, data } = req.body;

  //console.log("Discord Request:", req.body);

  console.log("Discord Request type:", type);

  //console.log("Discord Request data:", data);

  if (type === InteractionType.PING) {
    return res.status(200).send({ type: InteractionResponseType.PONG });
  }

  if (type === 2) {
  
    console.log("Command slash type detected");

    res.status(200).send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    });

    console.log("Response deferred and Fetch request");

    const { name, options } = data;

    if (name === 'linkaccount') {
      
      console.log("linkaccount detected");

      const uniqueCode = options.find(opt => opt.name === 'code').value;
      const emailFromDiscord = options.find(opt => opt.name === 'email').value;

      console.log("uniqueCode", uniqueCode );
      console.log("emailFromDiscord", emailFromDiscord );

      const docRef = admin.firestore().collection('estudiantesMappings').doc(emailFromDiscord);
      const doc = await docRef.get();

      if (doc.exists) {

        const storedUniqueCode = doc.data().uniqueCode;

        console.log("doc exists")

        if (storedUniqueCode === uniqueCode) {

          console.log("Codes match");

          await doc.ref.update({ discordUserID: req.body.member.user.id });

          await editOriginalMessage("Cuenta de Discord correctamente asociada");

        } else {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Código único inválido'
            }
          });
        }
      } else {
        console.log("Email no encontrado")
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Email no encontrado'
          }
        });
      }
    }
  }

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: 'Unsupported command'
    }
  });
});

exports.linkTrelloAccount = functions.https.onRequest((req, res) => {

  console.log("linkTrelloAccount final version with data logs and data[0] changed to data");

  cors(req, res, async () => {
    const email = req.query.email;
    const token = req.query.token;

    console.log("Query params from getUserInfoFromTrello:", email, token);

    if (!email || !token) {
      res.status(400).json({ message: 'Email and API Token are required' });
      return;
    }

    const apiUrl = `https://api.trello.com/1/search/members?query=${email}&key=${trelloUserinfoApiKey}&token=${token}`;

    try {
      
      const response = await fetch(apiUrl);
      const data = await response.json();

      console.log("data", data);

      //Common user:: memberType : "normal", Witthout Trello account:: memberType: 'ghost'

      if (data && data[0].memberType === "normal") {
        // Store Trello user info in Firestore
        const docRef = admin.firestore().collection('estudiantesMappings').doc(email);
        await docRef.set({
          trelloUsername: data[0].username,
          trelloUserId: data[0].id
        }, { merge: true });

        res.status(200).send(data);

      } else if(data && data[0].memberType === "ghost"){

        console.log("User doesn't have a Trello account");

        console.log("data not Trello user", data);

        res.status(200).send(data);


      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching data from Trello:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
});

exports.getUserInfoFromTrello = functions.https.onRequest((req, res) => {

  console.log("getUserInfoFromTrello called without data.members");

  cors(req, res, async () => {
    const email = req.query.email;
    const token = req.query.token;

    console.log("Query params from getUserInfoFromTrello:", email, token);

    if (!email || !token) {
      res.status(400).json({ message: 'Email and API Token are required' });
      return;
    }

    const apiUrl = `https://api.trello.com/1/search/members?query=${email}&key=${trelloUserinfoApiKey}&token=${token}`;
    
    try {
      const response = await fetch(apiUrl);


      const data = await response.json();

      console.log("data", data);

      if (data) {
        res.status(200).send(data[0]);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching data from Trello:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
});


async function sendDiscordNotification(message) {
  await fetch('https://discord.com/api/webhooks/1149610459796881468/WHUR5O7ZFS3JgZJpQDLnSFBXGaxNBcQEKP-RvAcQ0do-U1wCt6O284ZKV1HbXzTuT-zK', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: message })
  });
  console.log("Message sent to Discord");
}


exports.trelloWebhookToDiscordHandler = functions.https.onRequest(async (request, response) => {

  console.log("trelloWebhookToDiscordHandler called with request corrected")

  try {
    if (request.method === 'HEAD') {
      response.status(200).send('OK');
      return;
    }
    
    const { body } = request;

    if (!body || !body.action || !body.action.data || !body.action.data.text) {
      console.log("Invalid request, action or text missing");
      response.status(400).send('Bad Request');
      return;
    }

    const commentText = body.action.data.text;

    if (commentText.includes('@')) {

      await sendDiscordNotification(`Un nuevo comentario de Trello incluye una mención: ${commentText}`);

    }

    response.status(200).send('OK');

  } catch (error) {
    console.error("An error occurred:", error);
    response.status(500).send('Internal Server Error');
  }
});
