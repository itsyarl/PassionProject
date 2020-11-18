'use strict';
const express = require('express');
const bodyParser = require('body-parser');

const faunadb = require('faunadb'),
q = faunadb.query;

const port = process.env.PORT || 3000;

const {dialogflow, input, option, List, Permission} = require('actions-on-google');
const CLIENT_ID = '403085842130-p216nolofgbbrusosc3lau6pp287fk0c.apps.googleusercontent.com'
const app = dialogflow({debug:true, clientId: CLIENT_ID});

var adminClient = new faunadb.Client({ secret: '281716538278412813' });
var serverClient = new faunadb.Client({ secret: 'fnAD6iD6egACBwGH1znjPVIJsh_Y4Db0K5agNqSx' });

/*
function hoeGaatHet() {
    app.ask('Webhook-madness');
}
*/

app.intent('get_stop', async (conv, params, confirmationGranted) => {
    const {name} = await conv.user;
    if (confirmationGranted && name){
        conv.close(`Tot de volgende keer ${name.given}`);
    } else {
        conv.close('Tot de volgende keer');
    } 
})

app.intent('Default Welcome Intent', async (conv, params, confirmationGranted) => { 
    try {
        const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
        if (pot.data.userName =! undefined) {
            const permissions = ['NAME'];
            let context = 'Om je naam te weten';
            const {name} = conv.user;
            if (name.display) {
                serverClient.query(
                    q.Update(
                        q.Ref(q.Collection('Pot'), '281716958491050503'),
                        { data: { userName: name.given } }
                    )
                )
                hello(conv, name.given);
            } else {
                const options = {
                    context,
                    permissions,
                };
                conv.ask(new Permission(options));
            }
        } else {
            hello(conv, pot.username)
        }
    } catch (err) {
        console.error(err);
    }
}); 

const hello = (conv, name) => {
    conv.ask(`Hallo ${name}, ik ben jouw bloempot.`);
    conv.ask('Laten we praten!');
}

/*
    app.intent('get_start_option', (conv, input, option) => {
    if (option === 'Ja') {
        conv.ask('Laten we praten')
    } else {
        conv.close('Tot de volgende keer')
    }
    })
*/

app.intent('get_status_question', async (conv) => {
    try {
        const pot = await serverClient.query(q.Get(q.Ref(q.Collection('Pot'), '281716958491050503')));
        const water = pot.data.water;

        if (water > 30){
            conv.ask('Mijn water is in orde!');
        } else {
            conv.ask(`Ik heb nog wat water nodig, mijn water bedraagt ${water}`);
        }
    } catch (err) {
        console.error(err);
    }
})

app.catch((conv, e) => {  
    console.error(e);  
    conv.close('Er ging iets mis sorry.');
});

const expressApp = express().use(bodyParser.json());
expressApp.post('/webhook' ,app);

expressApp.listen(3000);