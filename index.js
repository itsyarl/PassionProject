'use strict';

const Twit = require("twit");
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require("node-fetch");

const faunadb = require('faunadb'),
q = faunadb.query;

const port = process.env.PORT || 8080;

const {dialogflow, input, option, List, Permission} = require('actions-on-google');
const CLIENT_ID = process.env.CLIENT_ID;
const app = dialogflow({debug:true, clientId: CLIENT_ID});

var adminClient = new faunadb.Client({ secret: process.env.ADMIN_SECRET });
var serverClient = new faunadb.Client({ secret: process.env.SERVER_SECRET });

app.intent('get_stop', async conv => {
    const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
    const name = pot.data.u;
    if (name === undefined){
        conv.close('Tot de volgende keer');
    } else {
        conv.close(`Tot de volgende keer ${name}`);
    } 
})


app.intent('Default Welcome Intent', async (conv, params, confirmationGranted) => { 
    const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
    if (pot.data.u === undefined) {
        try {
            const permissions = ['NAME'];
            let context = 'om je aan te spreken met je naam.';
            const {name} = conv.user;
            console.log(conv.parameters['PERMISSION']);
            if (name.display) {
                conv.ask(`Is het correct dat ik je aanspreek met ${name.given}`);
                serverClient.query(
                    q.Update(
                        q.Ref(q.Collection('Pot'), '281716958491050503'),
                        { data: { u: name.given } }
                    )
                )
            } else if (conv.parameters["PERMISSiON"] === false){
                conv.ask(`Is het correct dat ik je aanspreek met daddy`);
                serverClient.query(
                    q.Update(
                        q.Ref(q.Collection('Pot'), '281716958491050503'),
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
    const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
    console.log(pot.data.u)
    conv.ask(`Hallo ${pot.data.u}, ik ben jouw bloempot.`);
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
        q.Update(
            q.Ref(q.Collection('Pot'), '281716958491050503'),
            { data: { u: givenName } }
        )
    )
})

app.intent('get_status_water', async (conv) => {
    const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
    const water = pot.data.w;

    if (water > 80){
        console.log("water is perfect");
        conv.ask("water is perfect, ik voel me goed");
    }else if (water > 50){
        console.log("water oké");
        conv.ask("mijn water is oké, een vier-uurtje mag er wel bijna aankomen");
    }else{
        console.log("Geef mij water!!!");
        conv.ask("Geef mij water aub, ik lig op sterven");
    } 
})

app.intent('get_status_zon', async (conv) => {
    const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
    const zon = pot.data.zo;
    if (zon > 60){
        console.log("De zon is geweldig");
        conv.ask("Wat is de zon weer goed vandaag");
    }else if (zon > 50){
        console.log("zon oké");
        conv.ask("Er is weinig zon, of sta ik verkeerd");
    }else{
        console.log("te weinig zon");
        conv.ask("Ik krijg echt te weinig zon, zo ga ik nooit groot worden.");
    } 
})

app.intent('get_status_hoeGaatHet', async (conv) => {
    const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
    const zon = pot.data.zo;
    const water = pot.data.w;
    
    if (zon >= 80 && water >= 80) {
        conv.ask("Het is een mooie dag. Ik heb heel veel zon gekregen. Dit was zalig warm! Ik heb ook echt niet veel dorst. Ik hoop dat jouw dag ook zo mooi was.");
    } else if (zon >= 80 && water >= 50) {
        conv.ask("De zon voelt fantastisch vandaag. Alleen begin ik wel al een beetje dorst te krijgen.");
    } else if (zon >= 80 && water < 50) {
        conv.ask("Het weer was prachtig vandaag, lekker veel zon. Maar kan je mij water geven? Ik heb echt veel dorst.");
    } else if (zon >= 50 && water >= 80) {
        conv.ask("De zon was wel een beetje verstopt denk ik. Die heb ik gemist vandaag. Verder heb ik nog genoeg gedronken en is alles in orde!");
    } else if (zon <= 50 && water >= 80) {
        conv.ask("Er was heel weinig zon vandaag, had het erg koud. Gelukkig had ik genoeg eten zodat ik toch nog kon verder groeien!");
    } else if (zon >= 50 && water >= 50) {
        conv.ask("Wat een sombere dag, ik heb niet echt veel zon gekregen en begin toch wel dorst te krijgen.");
    } else if (zon <= 50 && water <= 50) {
        conv.ask("vandaag was echt een rotdag! Heel weinig zon en ik sterf bijna van de dorst!");
    } else {
        conv.ask("ik weet het niet zo goed, ik ben een beetje verward.");
    }
})

app.intent('get_status_zuurstof', async (conv) => {
    const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
    const zuurstof = pot.data.zu;
    if (zuurstof > 60){
        console.log("De zuurstof is geweldig");
        conv.ask("Fisse lucht is toch geweldig he? Gelukkig is hier genoeg!");
    }else if (zuurstof > 50){
        console.log("zuurstof oké");
        conv.ask("Zou ik als het mooi weer is nog eens buiten mogen, het is hier nogal benauwd.");
    }else{
        console.log("te weinig zuurstof");
        conv.ask("Ik stik bijna, ik heb veel meer zuurstof nodig.");
    } 
})

app.intent('get_twitter', async (conv) => {
    const T = new Twit({
        consumer_key: process.env.TWITTER_KEY,
        consumer_secret: process.env.TWITTER_SECRET,
        access_token: process.env.TWITTER_TOKEN,
        access_token_secret: process.env.TWITTER_SECRET_TOKEN,
    });

    const tweetData = await T.get('statuses/user_timeline', { q: 'user: @TheRealCharel', count: 1 });

    console.log(tweetData.data[0].text);
    conv.ask("Dit is mijn laatste tweet: " + tweetData.data[0].text);
})

app.catch((conv, e) => {  
    console.error(e);  
    conv.close('Er ging iets mis sorry.');
});

const expressApp = express().use(bodyParser.json());
expressApp.post('/webhook', app);

expressApp.listen(8080);

//©, 2020, Yarl Van onckelen