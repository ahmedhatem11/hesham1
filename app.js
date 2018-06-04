/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'username': '6fa0bd52-cbc0-4247-8b23-5029dde216c2',
  'password': 'AnN1ea4qJRAq',
  'version_date': '2018-03-16'
});

var count = -1;
var ncount = -1;
var pcount = -1;
var score1;
var score = 0;
var pos = 0;
var neg = 0;
var neu = 0;
var finalresult = "";
var questions = [["What is your opinion of the condition of the classrooms?", "What is your opinion of the condition of the classrooms? 2", "What is your opinion of the condition of the classrooms? 3", "What is your opinion of the condition of the classrooms? 4", "What is your opinion of the condition of the classrooms? 5"],
["What is your opinion of the cleanliness of the toilets?", "What is your opinion of the cleanliness of the toilets? 2", "What is your opinion of the cleanliness of the toilets? 3", "What is your opinion of the cleanliness of the toilets? 4", "What is your opinion of the cleanliness of the toilets? 5"],
["What is your opinion of the availability of parking spaces?", "What is your opinion of the availability of parking spaces? 2", "What is your opinion of the availability of parking spaces? 3", "What is your opinion of the availability of parking spaces? 4", "What is your opinion of the availability of parking spaces? 5"],
["What is your opinion of the air conditioning inside the buildings?", "What is your opinion of the air conditioning inside the buildings? 2", "What is your opinion of the air conditioning inside the buildings? 3", "What is your opinion of the air conditioning inside the buildings? 4", "What is your opinion of the air conditioning inside the buildings? 5"],
["What is your opinion of the health care in the university?", "What is your opinion of the health care in the university? 2", "What is your opinion of the health care in the university? 3", "What is your opinion of the health care in the university? 4", "What is your opinion of the health care in the university? 5"],
["What is your opinion of the food served by the university cafeterias?", "What is your opinion of the food served by the university cafeterias? 2", "What is your opinion of the food served by the university cafeterias? 3", "What is your opinion of the food served by the university cafeterias? 4", "What is your opinion of the food served by the university cafeterias? 5"],
["What is your opinion of the services of the library?", "What is your opinion of the services of the library? 2", "What is your opinion of the services of the library? 3", "What is your opinion of the services of the library? 4", "What is your opinion of the services of the library? 5"]];

var posq = [["What did you like in the condition of the classrooms?", "What did you like in the condition of the classrooms 2?"],
["What did you like in the cleanliness of the toilets?", "What did you like in the cleanliness of the toilets? 2"],
["What did you like in the availability of parking spaces?", "What did you like in the availability of parking spaces? 2"],
["What did you like in the air conditioning inside the buildings?", "What did you like in the air conditioning inside the buildings? 2"],
["What did you like in the health care in the university?", "What did you like in the health care in the university? 2"],
["What did you like in the food served by the university cafeterias?", "What did you like in the food served by the university cafeterias? 2"],
["What did you like in the services of the library?", "What did you like in the services of the library? 2"]];

var negq = [["What did not you like in the condition of the classrooms?", "What did not you like in the condition of the classrooms? 2"],
["What did not you like in the cleanliness of the toilets?", "What did not you like in the cleanliness of the toilets? 2"],
["What did not you like in the availability of parking spaces?", "What did not you like in the availability of parking spaces? 2"],
["What did not you like in the air conditioning inside the buildings?", "What did not you like in the air conditioning inside the buildings? 2"],
["What did not you like in the health care in the university?", "What did not you like in the health care in the university? 2"],
["What did not you like in the food served by the university cafeterias?", "What did not you like in the food served by the university cafeterias? 2"],
["What did not you like in the services of the library?", "What did not you like in the services of the library? 2"]];

var nextq = "Hello! How are you doing?";
var Lastq = "";
/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
//const SERVER_URL = (process.env.SERVER_URL) ?
//  (process.env.SERVER_URL) :
//  config.get('serverURL');
var SERVER_URL = 'https://honest-zebra-72.localtunnel.me'

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL.
 *
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s",
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText.replace(/[^\w\s]/gi, '').trim().toLowerCase()) {
      case 'hello':
      case 'hi':
        sendHiMessage(senderID);
        break;

      case 'reset':
      count =0;
      nextq = "Hello! How are you doing?";
      finalresult = "";
      break;
      default:
        if(count == -1){
          var wm = "";
          if(messageText.toLowerCase().includes(" you"))
            wm = "I'm great!\r\nSo, let us start our Survey";
          else
            wm = "Okay, let us start our Survey";
          var messageData = {
            recipient: {
            id: senderID
            },
            message: {
            text: wm,
            metadata: "DEVELOPER_DEFINED_METADATA"
            }
          };
          callSendAPI(messageData);
          count ++;
          var num = Math.random() * questions[count].length;
          num = num | 0;
          var msg = questions[count][num];
          var messageData1 = {
            recipient: {
            id: senderID
            },
            message: {
            text: msg,
            metadata: "DEVELOPER_DEFINED_METADATA"
            }
          };
          callSendAPI(messageData1);
          Lastq = msg;
          return;
        }else
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function sendTextMessage(recipientId, messageText) {
  var parameters = {
    'text': '' + messageText,
    'features': {
        'keywords': {
        'sentiment': true,
        'limit': 10
      },
        'sentiment': {
        'document': true
      }
    }
  }
  try {
    natural_language_understanding.analyze(parameters, function(err, response) {
      if (err){
        // Checking text that API don't understand
        var b = messageText.includes("................");
        if(b){
          var messageData = {
            recipient: {
            id: recipientId
            },
            message: {
            text: "Sorry I Can't Understand That",
            metadata: "DEVELOPER_DEFINED_METADATA"
            }
          };
          callSendAPI(messageData);
        } else {
          sendTextMessage(recipientId, messageText + "................");
        }
      } else {
        // Adding Question and Answer to result
        if (count < questions.length){
          var result = "\r\nQ" + count + ": " + Lastq +"\r\n";
          var b = messageText.includes("................");
          if(b){
            var m = messageText.replace("................", "");
            result += "Message: " + m + "\r\n\r\n";
          }else{
              result += "Message: " + messageText + "\r\n\r\n";
          }
        }
      }
      //Checking Sentiment Score

      try{
        score1 = response.sentiment.document.score;
        score = parseFloat(score1);
      //score = parseFloat(response.sentiment.document.score);
      if(score > 0){
        pos = 1;
        neg = 0;
        neu = 0;
      }
      else if(score < 0){
        pos = 0;
        neg = 1;
        neu = 0;
      }
      else {
        pos = 0;
        neg = 0;
        neu = 1;
      }

      result += "Overall Sentiment Score: " + score + "\r\n\r\n";
      }catch(error){
      result = "";
      }
      if(score > 0){
        pos = 1;
        neg = 0;
        neu = 0;
      }
      else if(score < 0){
        pos = 0;
        neg = 1;
        neu = 0;
      }
      else {
        pos = 0;
        neg = 0;
        neu = 1;
      }
      console.log(pos + " pos1");
      console.log(neg + " neg1");
      console.log(neu + " neu1");
      //Checking Keywords
      var j = 0;
      var result2 = "";
      try{
        for(var i = 0; i < response.keywords.length; i++){
          j = i+1;
          result2 += "keyword" + j + ":\r\nSentiment Score: "+ response.keywords[i].sentiment.score + "\r\nSubject: " + response.keywords[i].text+"\r\n\r\n";
        }
        if (i == 0){
          throw Error ("No Keywords");
        }
      }catch(error){
        console.log(pos + " pos2");
        console.log(neg + " neg2");
        console.log(neu + " neu2");
        console.log(""+ score);
        if(neg == 1){

          if (ncount = 0){
            var messageData = {
              recipient: {
              id: recipientId
              },
              message: {
              text: "neg",
              metadata: "DEVELOPER_DEFINED_METADATA"
              }
            };
            callSendAPI(messageData);
            //quick replys
            ncount ++;
            var messageData = {
              recipient: {
              id: recipientId
              },
              message: {
              text: "how can it be improved",
              metadata: "DEVELOPER_DEFINED_METADATA"
              }
            };
            callSendAPI(messageData);
            ncount = -1;
          } else if(ncount = -1){
            NegativeResponse(recipientId, messageText);
            ncount ++;
          }
          else{
            ncount ++;
          }
        }
        else if(pos == 1){
          console.log("hiiiii");
          if(pcount > -1){
            var messageData = {
              recipient: {
              id: recipientId
              },
              message: {
              text: "pos",
              metadata: "DEVELOPER_DEFINED_METADATA"
              }
            };
            callSendAPI(messageData);
            //quick replys
            pcount = -1;
          }else{
          PositiveResponse(recipientId, messageText);
          }
        }
        return;
      }

      if(ncount == 1){
          var messageData = {
            recipient: {
            id: recipientId
            },
            message: {
            text: "how can it be improved",
            metadata: "DEVELOPER_DEFINED_METADATA"
            }
          };
          callSendAPI(messageData);
          ncount = -1;
          count++;
          return;
      }
      var msg = "";
      if(count < questions.length){
        var num = Math.random() * questions[count].length;
        num = num | 0;
        msg = questions[count][num];
        count++;
      }else if(count == questions.length){
        console.log(finalresult);
        msg = "Thank you we're done with our Chatbot survey, you can move to the next one.";
        count++;
      }else{
        msg = "Thank you we're done with our Chatbot survey, you can move to the next one.";
      }
      var messageData = {
        recipient: {
        id: recipientId
        },
        message: {
        text: msg,
        metadata: "DEVELOPER_DEFINED_METADATA"
        }
        };

      callSendAPI(messageData);
  });

}catch(error) {
  var b = messageText.includes("................");
  if(b){
    var messageData = {
      recipient: {
      id: recipientId
      },
      message: {
      text: "Sorry I Can't Understand That",
      metadata: "DEVELOPER_DEFINED_METADATA"
      }
    };
    callSendAPI(messageData);
  } else {
    sendTextMessage(recipientId, messageText + "................");
  }

}
}

function NegativeResponse(recipientId, messageText){
  if (ncount == 0){
    var num = Math.random() * negq[count].length;
    num = num | 0;
    var msg = negq[count][num];

    var messageData = {
      recipient: {
      id: recipientId
      },
      message: {
      text: msg,
      metadata: "DEVELOPER_DEFINED_METADATA"
      }
    };
    Lastq = msg;
    ncount ++;
  }
 callSendAPI(messageData);
}

function PositiveResponse(recipientId, messageText){
  var num = Math.random() * posq[count].length;
  num = num | 0;
  var msg = posq[count][num];
  var messageData = {
    recipient: {
    id: recipientId
    },
    message: {
    text: msg,
    metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  Lastq = msg;
}
/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Trigger Postback",
            payload: "DEVELOPER_DEFINED_PAYLOAD"
          }, {
            type: "phone_number",
            title: "Call Phone Number",
            payload: "+16505551234"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}


function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Action",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type":"text",
          "title":"Comedy",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type":"text",
          "title":"Drama",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}
function sendHiMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Hello! How are you doing?"
    }
  }

  callSendAPI(messageData);
}
// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
