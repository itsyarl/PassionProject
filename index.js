const Twit = require("twit");
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const {dialogflow, Permission} = require('actions-on-google');
const CLIENT_ID = process.env.CLIENT_ID;
const app = dialogflow({debug:true, clientId: CLIENT_ID});

const faunadb = require('faunadb'),
q = faunadb.query;

var adminClient = new faunadb.Client({ secret: process.env.ADMIN_SECRET });
var serverClient = new faunadb.Client({ secret: process.env.SERVER_SECRET });

const T = new Twit({
    consumer_key: process.env.TWITTER_KEY,
    consumer_secret: process.env.TWITTER_SECRET,
    access_token: process.env.TWITTER_TOKEN,
    access_token_secret: process.env.TWITTER_SECRET_TOKEN,
});

let today = new Date();
let day = ("0" + today.getDate()).slice(-2);
let month = ("0" + (today.getMonth()+1)).slice(-2);
let year = today.getFullYear();
let date = `${day}/${month}/${year}`;

const port = process.env.PORT || 8080;
const expressApp = express();
expressApp.use(bodyParser.json());
expressApp.post('/webhook', app);

expressApp.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

app.intent('get_stop', async conv => {
    const user = await serverClient.query(q.Paginate(q.Match(q.Index('getUser'))));
    const name = user.data[0];
    if (name.length === 0){
        conv.close('Tot de volgende keer');
    } else {
        conv.close(`Tot de volgende keer ${name}`);
    } 
})


app.intent('Default Welcome Intent', async (conv, params, confirmationGranted) => { 
    const pot = await serverClient.query(q.Paginate(q.Match(q.Index('getUser'))));
    console.log(pot.data);
    if (pot.data.length === 0) {
        try {
            const permissions = ['NAME'];
            let context = 'om je aan te spreken met je naam.';
            const {name} = conv.user;
            console.log(conv.parameters['PERMISSION']);
            if (name.display) {
                conv.ask(`Is het correct dat ik je aanspreek met ${name.given}`);
                serverClient.query(
                    q.Create(
                        q.Collection('Pot'),
                        { data: { u: name.given } }
                    )
                )
            } else if (conv.parameters["PERMISSiON"] === false){
                conv.ask(`Is het correct dat ik je aanspreek met daddy`);
                serverClient.query(
                    q.Create(
                        q.Collection('Pot'),
                        { data: { u: "daddy" } }
                    )
                )
            } else {
                const options = {
                    context,
                    permissions,
                };
                conv.ask(new Permission(options));
            }
        } catch (err) {
        console.error(err);
        }
    } else {
        await hello(conv)
    }
}); 

const hello = async (conv) => {
    const pot = await await serverClient.query(q.Paginate(q.Match(q.Index('getUser'))));
    conv.ask(`Hallo ${pot.data[0]}, ik ben jouw bloempot.`);
    conv.ask('Laten we praten!');
}

app.intent('Default Welcome Intent - yes', async conv => {
    await hello(conv);
})

app.intent('Default Welcome Intent - no', conv => {
    conv.ask("Hoe mag ik je dan wel noemen?");
})

app.intent('Default Welcome Intent - name', conv => {
    const givenName =  conv.parameters['given-name'];
    conv.ask("Dan noem ik je " + givenName);
    serverClient.query(
        q.Create(
            q.Collection('Pot'),
            { data: { u: givenName } }
        )
    )
})

app.intent('get_status_water', async (conv) => {
    const pot = await serverClient.query(q.Paginate(q.Match(q.Index('getWater'), date)));
    const water = pot.data[0];
    console.log(water);

    if (water >= 50){
        console.log("water is perfect");
        conv.ask("water is perfect, ik voel me goed");
    }else if (water >= 40){
        console.log("water oké");
        conv.ask("mijn water is oké, een vier-uurtje mag er wel bijna aankomen");
    }else{
        console.log("Geef mij water!!!");
        conv.ask("Geef mij water aub, ik lig op sterven");
    } 
})

app.intent('get_status_zon', async (conv) => {
    const allZon = await serverClient.query(q.Paginate(q.Match(q.Index('getSun'), date)));
    let totalZon = 0;
    for(var i = 0; i < allZon.data.length; i++) {
        totalZon += allZon.data[i];
    }
    const zon = totalZon / allZon.data.length;
    if (zon >= 4.4){
        console.log("De zon is geweldig");
        conv.ask("Wat is de zon weer goed vandaag");
    }else if (zon >= 3){
        console.log("zon oké");
        conv.ask("Er is weinig zon, of sta ik verkeerd");
    }else{
        console.log("te weinig zon");
        conv.ask("Ik krijg echt te weinig zon, zo ga ik nooit groot worden.");
    } 
})

app.intent('get_status_zuurstof', async (conv) => {
    const allAir =  await serverClient.query(q.Paginate(q.Match(q.Index('getAir'), date)));
    let totalAir = 0;
    for(var i = 0; i < allAir.data.length; i++) {
        totalAir += allAir.data[i];
    }
    const zuurstof = totalAir / allAir.data.length;
    console.log(zuurstof);
    if (zuurstof >= 40){
        console.log("De zuurstof is geweldig");
        conv.ask("Fisse lucht is toch geweldig he? Gelukkig is hier genoeg!");
    }else if (zuurstof < 40){
        console.log("zuurstof oké");
        conv.ask("Zou ik als het mooi weer is nog eens buiten mogen, het is hier nogal benauwd.");
    }else{
        console.log("te weinig zuurstof");
        conv.ask("Ik stik bijna, ik heb veel meer zuurstof nodig.");
    } 
})

app.intent('get_status_hoeGaatHet', async (conv) => {
    const allData = await serverClient.query(
        q.Call(q.Function("averageOfDay"), date)
    );

    console.log(allData);

    const allWater = allData.data.map(data => {
        return data[0]
    });

    const allZuurstof = allData.data.map(data => {
        return data[1]
    });

    const allZon = allData.data.map(data => {
        return data[2]
    });

    let totalWater = 0;
    let totalZon = 0;
    let totalZuurstof = 0;

    for(var i = 0; i < allWater.length; i++) {
        totalWater += allWater[i];
    }

    for(var i = 0; i < allZuurstof.length; i++) {
        totalZuurstof += allZuurstof[i];
    }

    for(var i = 0; i < allZon.length; i++) {
        totalZon += allZon[i];
    }

    const zon = totalZon / allZon.length;
    const water = totalWater / allWater.length;
    const zuurstof = totalZuurstof / allZuurstof.length;

// 2020-12-09T08:41:30.101209+00:00 app[web.1]: { data: [ [ 49.14, 43.89, 4.3 ] ] }

// 2020-12-09T08:41:30.101362+00:00 app[web.1]: 4.3

// 2020-12-09T08:41:30.101439+00:00 app[web.1]: 49.14

// 2020-12-09T08:41:30.101499+00:00 app[web.1]: 43.89

    console.log(zon);
    console.log(water);
    console.log(zuurstof);
    
    if (zon >= 4 && water >= 50 && zuurstof >= 40) {
        conv.ask("Het is een mooie dag. Ik heb heel veel zon gekregen. Dit was zalig warm! Ik heb ook echt niet veel dorst. Ik hoop dat jouw dag ook zo mooi was.");
    } else if (zon >= 4 && water >= 40 && zuurstof >= 40) {
        conv.ask("De zon voelt fantastisch vandaag. Alleen begin ik wel al een beetje dorst te krijgen.");
    } else if (zon >= 3 && water >= 40 && zuurstof >= 40) {
        conv.ask("De zon was wel een beetje verstopt denk ik. Ik mis ze wel een beetje. Ik begin ook wel al een beetje dorst te krijgen.");
    } else if (zon >= 4 && water < 30 && zuurstof >= 40) {
        conv.ask("Het weer was prachtig vandaag, lekker veel zon. Maar kan je mij water geven? Ik heb echt veel dorst.");
    } else if (zon >= 3 && water >= 50 && zuurstof >= 40) {
        conv.ask("De zon was wel een beetje verstopt denk ik. Die heb ik gemist vandaag. Verder heb ik nog genoeg gedronken en is alles in orde!");
    } else if (zon <= 3 && water >= 50 && zuurstof >= 40) {
        conv.ask("Er was heel weinig zon vandaag, had het erg koud. Gelukkig had ik genoeg eten zodat ik toch nog kon verder groeien!");
    } else if (zon >= 2 && water >= 40 && zuurstof >= 40) {
        conv.ask("Wat een sombere dag, ik heb niet echt veel zon gekregen en begin toch wel dorst te krijgen.");
    } else if (zon <= 2 && water <= 30 && zuurstof >= 40) {
        conv.ask("vandaag was echt een rotdag! Heel weinig zon en ik sterf bijna van de dorst!");
    } else {
        conv.ask("ik weet het niet zo goed, ik ben een beetje verward.");
    }
})

app.intent('get_twitter', async (conv) => {
    const tweetData = await T.get('statuses/user_timeline', { q: 'user: @TheRealCharel', count: 1 });

    console.log(tweetData.data[0].text);
    conv.ask("Dit is mijn laatste tweet: " + tweetData.data[0].text);
})

app.catch((conv, e) => {  
    console.error(e);  
    conv.close('Er ging iets mis sorry.');
});

//©, 2020, Yarl Van onckelen